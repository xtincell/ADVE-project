import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { accessibleStrategyIds } from "../middleware/strategy-scope";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { db } from "@/lib/db";
import {
  sendBrandEmail,
  brandEmailIsArmed,
  getBrandEmailConnectorView,
  validateBrevoKey,
} from "@/server/services/anubis/brand-email";

export const newsletterRouter = createTRPCRouter({
  // ── Subscribers (CRM Contacts with NEWSLETTER source/tag) ─────────────────

  subscribersList: protectedProcedure
    .input(
      z.object({
        strategyId: z.string().optional(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // ADR-0166 — scope ownership (lien strategyId lâche, pas de relation).
      const ids = await accessibleStrategyIds(ctx.session.user.id);
      const strategyFilter = input.strategyId
        ? { strategyId: ids === null || ids.includes(input.strategyId) ? input.strategyId : "__denied__" }
        : ids !== null
          ? { strategyId: { in: ids } }
          : {};
      return db.crmContact.findMany({
        where: {
          newsletterOptIn: true,
          ...strategyFilter,
          ...(input.tag ? { tags: { has: input.tag } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  subscribersAdd: operatorProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        tags: z.array(z.string()).default([]),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const canonicalTags = Array.from(new Set(["NEWSLETTER_SUBSCRIBER", ...input.tags]));
      
      return db.crmContact.upsert({
        where: { email: input.email },
        create: {
          email: input.email,
          name: input.name ?? null,
          source: "NEWSLETTER",
          newsletterOptIn: true,
          subscribedAt: new Date(),
          tags: canonicalTags,
          strategyId: input.strategyId ?? null,
        },
        update: {
          name: input.name ?? undefined,
          newsletterOptIn: true,
          subscribedAt: new Date(),
          tags: {
            set: canonicalTags,
          },
          strategyId: input.strategyId ?? undefined,
        },
      });
    }),

  subscribersBulkImport: operatorProcedure
    .input(
      z.object({
        csv: z.string(),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Split lines and parse basic email,name CSV structure
      const lines = input.csv.split(/\r?\n/);
      const imported: string[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const [emailRaw, nameRaw] = line.split(",");
        const email = emailRaw?.trim().toLowerCase();
        const name = nameRaw?.trim() || null;
        
        // Simple regex check
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await db.crmContact.upsert({
            where: { email },
            create: {
              email,
              name,
              source: "NEWSLETTER",
              newsletterOptIn: true,
              subscribedAt: new Date(),
              tags: ["NEWSLETTER_SUBSCRIBER"],
              strategyId: input.strategyId ?? null,
            },
            update: {
              name: name ?? undefined,
              newsletterOptIn: true,
              subscribedAt: new Date(),
              strategyId: input.strategyId ?? undefined,
            },
          });
          imported.push(email);
        }
      }
      
      return { count: imported.length, imported };
    }),

  // ── Newsletter Campaigns ──────────────────────────────────────────────────

  newslettersCreate: operatorProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        content: z.string().min(1),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.newsletterCampaign.create({
        data: {
          strategyId: input.strategyId ?? null,
          subject: input.subject,
          bodyHtml: input.content,
          bodyMjml: input.content, // Fallback MJML as same content
          status: "DRAFT",
        },
      });
    }),

  newslettersSend: operatorProcedure
    .input(
      z.object({
        newsletterId: z.string(),
        strategyId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await db.newsletterCampaign.findUniqueOrThrow({
        where: { id: input.newsletterId },
      });

      if (campaign.status === "SENT") {
        throw new Error("Newsletter has already been sent.");
      }

      // Cohérence de marque : une campagne rattachée à une marque ne peut PAS
      // être envoyée à l'audience d'une AUTRE marque (défense anti-cross-marque —
      // l'`input.strategyId` cible les destinataires + arme le provider).
      if (campaign.strategyId && campaign.strategyId !== input.strategyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette campagne appartient à une autre marque.",
        });
      }

      // Pré-vol : aucun provider d'envoi armé pour cette marque → on NE marque
      // PAS SENDING/SENT (pas de faux envoi). Erreur explicite : configurer le
      // connecteur email de la marque (Cockpit → Newsletter → Fournisseur email).
      // La marque provient du sélecteur cockpit (input.strategyId) — les
      // campagnes ne portent pas encore de strategyId propre.
      const strategyId = input.strategyId;
      if (!strategyId || !(await brandEmailIsArmed(strategyId))) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Aucun fournisseur email configuré pour cette marque. Renseignez la clé du fournisseur (ex: Brevo) et un expéditeur vérifié avant d'envoyer.",
        });
      }

      // Fetch all eligible opt-in subscribers
      const recipients = await db.crmContact.findMany({
        where: {
          newsletterOptIn: true,
          unsubscribedAt: null,
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
        },
      });

      if (recipients.length === 0) {
        return db.newsletterCampaign.update({
          where: { id: input.newsletterId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            recipientCount: 0,
            sentCount: 0,
            failedCount: 0,
          },
        });
      }

      // Update state to SENDING
      await db.newsletterCampaign.update({
        where: { id: input.newsletterId },
        data: { status: "SENDING", recipientCount: recipients.length },
      });

      let sentCount = 0;
      let failedCount = 0;
      const html = campaign.bodyHtml ?? "";

      // Envoi RÉEL, destinataire par destinataire (via le compte du client, ex:
      // Brevo). Chaque `crmMessage` reflète le VRAI statut + la ref provider —
      // aucun SENT fabriqué (échec = FAILED + raison loggée).
      for (const recipient of recipients) {
        // List-Unsubscribe (RFC 8058) — one-click via la route de désinscription
        // (token unique par contact, cf. /api/newsletter/unsubscribe?token=…).
        const unsubUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/newsletter/unsubscribe?token=${recipient.unsubscribeToken}`;
        const result = await sendBrandEmail(strategyId, {
          to: recipient.email,
          subject: campaign.subject,
          html,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        await db.crmMessage.create({
          data: {
            contactId: recipient.id,
            direction: "OUT",
            channel: "EMAIL",
            subject: campaign.subject,
            body: html,
            status: result.ok ? "SENT" : "FAILED",
            provider: result.ok ? result.provider : (result.provider ?? "ANUBIS"),
            providerRef: result.ok ? result.providerRef : null,
            error: result.ok ? null : result.error.slice(0, 500),
            sentBy: ctx.session.user.id,
            campaignId: campaign.id,
          },
        });
        if (result.ok) sentCount++;
        else failedCount++;
      }

      // Mark campaign as SENT
      return db.newsletterCampaign.update({
        where: { id: input.newsletterId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentCount,
          failedCount,
        },
      });
    }),

  newslettersList: protectedProcedure
    .input(z.object({ limit: z.number().default(50), strategyId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // ADR-0166 — scope ownership (lien strategyId lâche, pas de relation).
      // Fermait une fuite : la liste renvoyait TOUTES les campagnes, toutes
      // marques confondues. Les campagnes legacy (strategyId null) restent
      // opérateur-only (accessibleStrategyIds=null ⇒ admin, sinon exclues).
      const ids = await accessibleStrategyIds(ctx.session.user.id);
      const strategyFilter = input?.strategyId
        ? { strategyId: ids === null || ids.includes(input.strategyId) ? input.strategyId : "__denied__" }
        : ids !== null
          ? { strategyId: { in: ids } }
          : {};
      return db.newsletterCampaign.findMany({
        where: strategyFilter,
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  newslettersStats: protectedProcedure
    .input(z.object({ newsletterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await db.newsletterCampaign.findUniqueOrThrow({
        where: { id: input.newsletterId },
      });

      // anti-IDOR (ADR-0166) : les emails/noms des destinataires (crmMessage →
      // contact) ne fuient plus cross-marque. Le fondateur consulte SES campagnes
      // (page cockpit) ; l'opérateur/god-mode voit tout ; une campagne legacy
      // (strategyId null) reste opérateur-only. Remplace le stopgap round-6
      // (operatorProcedure) qui cassait la modale « Consulter » du fondateur.
      const ids = await accessibleStrategyIds(ctx.session.user.id);
      if (ids !== null && (!campaign.strategyId || !ids.includes(campaign.strategyId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette campagne." });
      }

      const messages = await db.crmMessage.findMany({
        where: { campaignId: input.newsletterId },
        include: {
          contact: { select: { email: true, name: true } },
        },
      });

      return {
        campaign,
        messages: messages.map((m) => ({
          id: m.id,
          recipient: m.contact.email,
          name: m.contact.name,
          status: m.status,
          sentAt: m.createdAt,
        })),
      };
    }),

  // ── Provider email PAR MARQUE (BrandEmailConnector) ───────────────────────
  // La marque envoie via SON PROPRE compte fournisseur (ex: Brevo). La clé vit
  // en DB (Vault ADR-0021) et n'est JAMAIS renvoyée au client (projection sans
  // `apiKey`).

  emailProviderGet: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return getBrandEmailConnectorView(input.strategyId);
    }),

  /**
   * Enregistre/valide le connecteur email d'une marque. Valide la clé EN RÉEL
   * (Brevo /v3/account) avant d'activer ; refuse un `fromEmail` non vérifié côté
   * fournisseur (sinon l'envoi serait rejeté). Aucune activation optimiste.
   */
  emailProviderSet: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        provider: z.literal("BREVO").default("BREVO"),
        // Optionnelle : si omise, on conserve/re-valide la clé déjà stockée
        // (permet de changer l'expéditeur sans ressaisir la clé).
        apiKey: z.string().min(20).optional(),
        fromEmail: z.string().email(),
        fromName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.brandEmailConnector.findUnique({
        where: { strategyId: input.strategyId },
      });
      const apiKey = input.apiKey ?? existing?.apiKey;
      if (!apiKey) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Clé API requise." });
      }
      const validation = await validateBrevoKey(apiKey);
      if (!validation.ok) {
        // Clé invalide → on persiste en ERROR (diagnostic) sans activer.
        await db.brandEmailConnector.upsert({
          where: { strategyId: input.strategyId },
          create: {
            strategyId: input.strategyId,
            provider: input.provider,
            apiKey,
            fromEmail: input.fromEmail,
            fromName: input.fromName ?? null,
            status: "ERROR",
            lastError: validation.error ?? "Validation échouée.",
            lastTestAt: new Date(),
          },
          update: {
            apiKey,
            fromEmail: input.fromEmail,
            fromName: input.fromName ?? null,
            status: "ERROR",
            lastError: validation.error ?? "Validation échouée.",
            lastTestAt: new Date(),
          },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error ?? "Clé Brevo invalide.",
        });
      }

      const verified = (validation.verifiedSenders ?? []).some(
        (s) => s.email.toLowerCase() === input.fromEmail.toLowerCase() && s.active,
      );
      if (!verified) {
        const list = (validation.verifiedSenders ?? [])
          .map((s) => s.email)
          .join(", ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `L'expéditeur ${input.fromEmail} n'est pas un sender vérifié/actif chez Brevo. Senders disponibles : ${list || "aucun"}.`,
        });
      }

      await db.brandEmailConnector.upsert({
        where: { strategyId: input.strategyId },
        create: {
          strategyId: input.strategyId,
          provider: input.provider,
          apiKey,
          fromEmail: input.fromEmail,
          fromName: input.fromName ?? null,
          status: "ACTIVE",
          lastError: null,
          lastTestAt: new Date(),
        },
        update: {
          apiKey,
          fromEmail: input.fromEmail,
          fromName: input.fromName ?? null,
          status: "ACTIVE",
          lastError: null,
          lastTestAt: new Date(),
        },
      });

      return {
        ok: true,
        accountEmail: validation.accountEmail,
        verifiedSenders: validation.verifiedSenders,
      };
    }),

  /** Re-teste la clé stockée (Brevo /v3/account). Ne renvoie jamais la clé. */
  emailProviderTest: operatorProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const c = await db.brandEmailConnector.findUnique({
        where: { strategyId: input.strategyId },
      });
      if (!c) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Aucun connecteur email configuré." });
      }
      const validation = await validateBrevoKey(c.apiKey);
      await db.brandEmailConnector.update({
        where: { strategyId: input.strategyId },
        data: {
          status: validation.ok ? "ACTIVE" : "ERROR",
          lastError: validation.ok ? null : (validation.error ?? "Test échoué."),
          lastTestAt: new Date(),
        },
      });
      return { ok: validation.ok, error: validation.error, accountEmail: validation.accountEmail };
    }),

  /** Envoie un email de test réel via le connecteur de la marque. */
  emailProviderSendTest: operatorProcedure
    .input(z.object({ strategyId: z.string(), to: z.string().email() }))
    .mutation(async ({ input }) => {
      const armed = await brandEmailIsArmed(input.strategyId);
      if (!armed) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Aucun fournisseur email armé pour cette marque.",
        });
      }
      const result = await sendBrandEmail(input.strategyId, {
        to: input.to,
        subject: "Test — Newsletter La Fusée",
        html: "<p>Ceci est un email de test envoyé depuis votre Cockpit. Si vous le recevez, votre fournisseur email est bien configuré. ✅</p>",
        text: "Ceci est un email de test envoyé depuis votre Cockpit. Si vous le recevez, votre fournisseur email est bien configuré.",
      });
      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return { ok: true, provider: result.provider, providerRef: result.providerRef };
    }),
});
