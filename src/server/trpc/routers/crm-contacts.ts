/**
 * CRM Contacts Router — contacts, messagerie, newsletter (Vague 10).
 *
 * « Crée un CRM pour le backend pour manager la messagerie et la
 * newsletter. » Complète le router `crm` existant (pipeline de Deals) :
 * ici vivent les CONTACTS unifiés (intake/newsletter/client/talent), les
 * messages email réels (email-sender, DEFERRED sans clés) et les campagnes
 * newsletter The Upgrade (opt-in strict, lien de désinscription tokenisé,
 * rendu MJML zéro-dépendance).
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

const BATCH_SIZE = 25;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL ?? "https://lafusee.vercel.app";
}

function withUnsubscribeFooter(html: string, token: string): { html: string; headers: Record<string, string> } {
  const url = `${baseUrl()}/api/newsletter/unsubscribe?token=${token}`;
  return {
    html: `${html}\n<p style="margin-top:32px;font-size:11px;color:#8a8a8a;font-family:sans-serif">Vous recevez cet email car vous êtes inscrit à The Upgrade (La Fusée). <a href="${url}" style="color:#8a8a8a">Se désinscrire en un clic</a>.</p>`,
    headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export const crmContactsRouter = createTRPCRouter({
  // ── Contacts ────────────────────────────────────────────────────────

  listContacts: operatorProcedure
    .input(
      z.object({
        search: z.string().max(120).optional(),
        source: z.enum(["INTAKE", "NEWSLETTER", "CLIENT", "TALENT", "MANUAL", "WEBSITE_CONTACT"]).optional(),
        newsletterOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const items = await db.crmContact.findMany({
        where: {
          ...(input.search
            ? { OR: [{ email: { contains: input.search, mode: "insensitive" } }, { name: { contains: input.search, mode: "insensitive" } }, { company: { contains: input.search, mode: "insensitive" } }] }
            : {}),
          ...(input.source ? { source: input.source } : {}),
          ...(input.newsletterOnly ? { newsletterOptIn: true } : {}),
        },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { messages: true } } },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) nextCursor = items.pop()?.id;
      return { items, nextCursor };
    }),

  stats: operatorProcedure.query(async () => {
    const [total, optIn, bySource, sentMessages] = await Promise.all([
      db.crmContact.count(),
      db.crmContact.count({ where: { newsletterOptIn: true } }),
      db.crmContact.groupBy({ by: ["source"], _count: true }),
      db.crmMessage.count({ where: { status: "SENT" } }),
    ]);
    return { total, optIn, bySource: Object.fromEntries(bySource.map((s) => [s.source, s._count])), sentMessages };
  }),

  upsertContact: operatorProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(120).optional(),
        phone: z.string().max(30).optional(),
        company: z.string().max(120).optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
        newsletterOptIn: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) =>
      db.crmContact.upsert({
        where: { email: input.email.toLowerCase() },
        create: {
          email: input.email.toLowerCase(),
          name: input.name ?? null,
          phone: input.phone ?? null,
          company: input.company ?? null,
          tags: input.tags ?? [],
          source: "MANUAL",
          ...(input.newsletterOptIn ? { newsletterOptIn: true, subscribedAt: new Date() } : {}),
        },
        update: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.company !== undefined ? { company: input.company } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.newsletterOptIn === true ? { newsletterOptIn: true, subscribedAt: new Date(), unsubscribedAt: null } : {}),
          ...(input.newsletterOptIn === false ? { newsletterOptIn: false, unsubscribedAt: new Date() } : {}),
        },
      }),
    ),

  // ── Messagerie ──────────────────────────────────────────────────────

  listMessages: operatorProcedure
    .input(z.object({ contactId: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ input }) =>
      db.crmMessage.findMany({
        where: input.contactId ? { contactId: input.contactId } : {},
        include: { contact: { select: { email: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      }),
    ),

  /** Envoi RÉEL d'un email à un contact (governed). DEFERRED sans clés. */
  sendMessage: governedProcedure({
    kind: "CRM_SEND_MESSAGE",
    inputSchema: z.object({
      contactId: z.string(),
      subject: z.string().min(2).max(200),
      body: z.string().min(2).max(50_000),
    }),
  }).mutation(async ({ input, ctx }) => {
    const contact = await db.crmContact.findUniqueOrThrow({ where: { id: input.contactId } });
    const { sendEmail } = await import("@/server/services/anubis/email-sender");
    const html = input.body.trim().startsWith("<") ? input.body : `<div style="font-family:sans-serif;white-space:pre-wrap">${input.body}</div>`;
    const result = await sendEmail({ to: contact.email, subject: input.subject, html });

    const message = await db.crmMessage.create({
      data: {
        contactId: contact.id,
        direction: "OUT",
        subject: input.subject,
        body: input.body,
        status: result.ok ? "SENT" : "FAILED",
        provider: result.ok ? result.provider : (result.provider ?? null),
        providerRef: result.ok ? result.providerRef : null,
        error: result.ok ? null : result.error,
        sentBy: ctx.session.user.id,
      },
    });
    if (!result.ok) throw new Error(result.error);
    return message;
  }),

  /** Consigner un message ENTRANT (reçu hors plateforme — email, WhatsApp…). */
  logInbound: operatorProcedure
    .input(z.object({ contactId: z.string(), channel: z.enum(["EMAIL", "WHATSAPP", "PHONE", "OTHER"]).default("EMAIL"), body: z.string().min(1).max(50_000), subject: z.string().max(200).optional() }))
    .mutation(({ input, ctx }) =>
      db.crmMessage.create({
        data: {
          contactId: input.contactId,
          direction: "IN",
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          status: "RECEIVED",
          sentBy: ctx.session.user.id,
        },
      }),
    ),

  // ── Newsletter ──────────────────────────────────────────────────────

  listCampaigns: operatorProcedure.query(() =>
    db.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ),

  saveCampaign: operatorProcedure
    .input(z.object({ id: z.string().optional(), subject: z.string().min(2).max(200), bodyMjml: z.string().max(200_000).optional(), bodyHtml: z.string().max(200_000).optional() }))
    .mutation(async ({ input }) => {
      if (!input.bodyMjml && !input.bodyHtml) throw new Error("Corps MJML ou HTML requis.");
      if (input.id) {
        const existing = await db.newsletterCampaign.findUniqueOrThrow({ where: { id: input.id } });
        if (existing.status !== "DRAFT") throw new Error("Seule une campagne DRAFT est éditable.");
        return db.newsletterCampaign.update({
          where: { id: input.id },
          data: { subject: input.subject, bodyMjml: input.bodyMjml ?? null, bodyHtml: input.bodyHtml ?? null },
        });
      }
      return db.newsletterCampaign.create({
        data: { subject: input.subject, bodyMjml: input.bodyMjml ?? null, bodyHtml: input.bodyHtml ?? null },
      });
    }),

  /** Aperçu rendu (MJML → HTML via le renderer zéro-dep) — aucune écriture. */
  previewCampaign: operatorProcedure
    .input(z.object({ bodyMjml: z.string().max(200_000).optional(), bodyHtml: z.string().max(200_000).optional() }))
    .query(async ({ input }) => {
      if (input.bodyHtml) return { html: input.bodyHtml };
      if (!input.bodyMjml) return { html: "" };
      const { renderMjml } = await import("@/server/services/anubis/mjml-render");
      return { html: renderMjml(input.bodyMjml).html };
    }),

  /** Test d'envoi à une adresse unique (statut campagne intouché). */
  sendTest: operatorProcedure
    .input(z.object({ campaignId: z.string(), to: z.string().email() }))
    .mutation(async ({ input }) => {
      const campaign = await db.newsletterCampaign.findUniqueOrThrow({ where: { id: input.campaignId } });
      const html = await renderCampaignHtml(campaign);
      const { sendEmail } = await import("@/server/services/anubis/email-sender");
      const result = await sendEmail({ to: input.to, subject: `[TEST] ${campaign.subject}`, html });
      if (!result.ok) throw new Error(result.error);
      return { ok: true, provider: result.provider };
    }),

  /**
   * Envoi RÉEL aux opt-in (governed, ADMIN). Batch séquentiel, lien de
   * désinscription par contact, stats persistées. Refuse si non-DRAFT.
   */
  sendCampaign: governedProcedure({
    kind: "NEWSLETTER_SEND_CAMPAIGN",
    inputSchema: z.object({ campaignId: z.string() }),
  }).mutation(async ({ input, ctx }) => {
    if (ctx.session.user.role !== "ADMIN") throw new Error("Envoi de campagne réservé aux ADMIN.");
    const campaign = await db.newsletterCampaign.findUniqueOrThrow({ where: { id: input.campaignId } });
    if (campaign.status !== "DRAFT") throw new Error(`Campagne déjà ${campaign.status}.`);

    const recipients = await db.crmContact.findMany({
      where: { newsletterOptIn: true },
      select: { id: true, email: true, unsubscribeToken: true },
    });
    if (recipients.length === 0) throw new Error("Aucun contact opt-in — rien à envoyer.");

    const htmlBase = await renderCampaignHtml(campaign);
    const { sendEmail } = await import("@/server/services/anubis/email-sender");

    await db.newsletterCampaign.update({
      where: { id: campaign.id },
      data: { status: "SENDING", recipientCount: recipients.length, sentBy: ctx.session.user.id },
    });

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      for (const r of batch) {
        const { html, headers } = withUnsubscribeFooter(htmlBase, r.unsubscribeToken);
        const result = await sendEmail({ to: r.email, subject: campaign.subject, html, headers });
        await db.crmMessage.create({
          data: {
            contactId: r.id,
            direction: "OUT",
            subject: campaign.subject,
            body: `[newsletter:${campaign.id}]`,
            status: result.ok ? "SENT" : "FAILED",
            provider: result.ok ? result.provider : (result.provider ?? null),
            providerRef: result.ok ? result.providerRef : null,
            error: result.ok ? null : result.error,
            campaignId: campaign.id,
            sentBy: ctx.session.user.id,
          },
        }).catch(() => null);
        if (result.ok) sent += 1;
        else {
          failed += 1;
          // Aucun provider armé : même refus pour tous — on coupe court.
          if (result.deferred) {
            await db.newsletterCampaign.update({
              where: { id: campaign.id },
              data: { status: "FAILED", sentCount: sent, failedCount: recipients.length - sent },
            });
            throw new Error(result.error);
          }
        }
      }
    }

    const finalStatus = sent > 0 ? "SENT" : "FAILED";
    await db.newsletterCampaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus, sentAt: new Date(), sentCount: sent, failedCount: failed },
    });
    return { sent, failed, recipients: recipients.length, status: finalStatus };
  }),
});

async function renderCampaignHtml(campaign: { bodyHtml: string | null; bodyMjml: string | null }): Promise<string> {
  if (campaign.bodyHtml) return campaign.bodyHtml;
  if (campaign.bodyMjml) {
    const { renderMjml } = await import("@/server/services/anubis/mjml-render");
    return renderMjml(campaign.bodyMjml).html;
  }
  throw new Error("Campagne sans corps (MJML ou HTML requis).");
}
