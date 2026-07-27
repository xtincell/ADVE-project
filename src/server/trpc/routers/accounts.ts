/**
 * Accounts Router — Console Superviseur (Vague 7).
 *
 * « Donne les droits pour promouvoir/rétrograder les comptes selon leur
 * statut (entrepreneur, créateur, agence, partenaire). » ADMIN only, acte
 * gouverné + journalisé (audit trail). Garde-fous : on ne se rétrograde pas
 * soi-même, et on ne touche pas au dernier ADMIN.
 */

import crypto from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import * as auditTrail from "@/server/services/audit-trail";
/* lafusee:governed-active */

/** Rôles d'équipe délégués (CampaignTeamRole) — scopent les zones d'écriture du
 *  login de marque via le firewall collaborateur (ADR-0131). */
const TEAM_ROLES = [
  "ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "STRATEGIC_PLANNER", "CREATIVE_DIRECTOR",
  "ART_DIRECTOR", "COPYWRITER", "MEDIA_PLANNER", "MEDIA_BUYER", "SOCIAL_MANAGER",
  "PRODUCTION_MANAGER", "PROJECT_MANAGER", "DATA_ANALYST", "CLIENT", "DIGITAL_DIRECTOR",
] as const;

/** Rôles de compte (User.role) éligibles à un login de marque (accès cockpit). */
const BRAND_LOGIN_ACCOUNT_ROLES = [
  "FOUNDER", "BRAND", "CREATOR", "FREELANCE", "CLIENT_RETAINER", "CLIENT_STATIC",
] as const;

/** Rôles assignables depuis la console superviseur. */
export const ASSIGNABLE_ROLES = [
  "USER",
  "FOUNDER", // entrepreneur
  "BRAND",
  "CREATOR", // créateur
  "FREELANCE",
  "AGENCY", // agence
  "PARTNER", // partenaire
  "CLIENT_RETAINER",
  "CLIENT_STATIC",
  "OPERATOR",
  "ADMIN",
] as const;

export const accountsRouter = createTRPCRouter({
  /** Liste paginée + recherche des comptes, avec stats d'activité légères. */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().max(120).optional(),
        role: z.enum(ASSIGNABLE_ROLES).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.search
          ? {
              OR: [
                { email: { contains: input.search, mode: "insensitive" as const } },
                { name: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(input.role ? { role: input.role } : {}),
      };
      const items = await db.user.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          operatorId: true,
          createdAt: true,
          talentProfile: { select: { tier: true, totalMissions: true, payoutPhone: true } },
          _count: { select: { Strategy: true, missionApplications: true } },
        },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) nextCursor = items.pop()?.id;
      return { items, nextCursor };
    }),

  /** Répartition des comptes par rôle (header de la console). */
  roleStats: adminProcedure.query(async () => {
    const grouped = await db.user.groupBy({ by: ["role"], _count: true });
    return Object.fromEntries(grouped.map((g) => [g.role, g._count]));
  }),

  /**
   * Promotion / rétrogradation d'un compte. Acte gouverné + audit trail.
   * Refus : se modifier soi-même, ou retirer le dernier ADMIN.
   */
  setRole: governedProcedure({
    kind: "ADMIN_SET_USER_ROLE",
    requireOperator: true,
    inputSchema: z.object({
      userId: z.string(),
      role: z.enum(ASSIGNABLE_ROLES),
      reason: z.string().min(3).max(500),
    }),
  }).mutation(async ({ input, ctx }) => {
    const actor = ctx.session.user;
    if (actor.role !== "ADMIN") throw new Error("Seul un ADMIN peut modifier les rôles.");
    if (input.userId === actor.id) {
      throw new Error("Auto-modification refusée — demande à un autre administrateur.");
    }
    const target = await db.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) throw new Error("Compte introuvable.");
    if (target.role === input.role) return { id: target.id, role: target.role, unchanged: true };

    if (target.role === "ADMIN" && input.role !== "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) throw new Error("Impossible de rétrograder le dernier ADMIN.");
    }

    const updated = await db.user.update({
      where: { id: input.userId },
      data: { role: input.role },
      select: { id: true, role: true, email: true },
    });

    auditTrail
      .log({
        action: "UPDATE",
        entityType: "User",
        entityId: target.id,
        oldValue: { role: target.role },
        newValue: { role: input.role, reason: input.reason, actor: actor.id },
      })
      .catch(() => undefined);

    return updated;
  }),

  /** Marques (Strategy) pour le sélecteur du formulaire de login. */
  brands: adminProcedure
    .input(
      z.object({
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(300).default(200),
      }),
    )
    .query(async ({ input }) => {
      return db.strategy.findMany({
        where: input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" as const } },
                { companyName: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {},
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Crée un login personnalisé pour UNE marque : compte (email + mot de passe
   * bcrypt coût 12, parité `auth.register`) rattaché à la Strategy via
   * `StrategyCollaborator` (ADR-0129 ; zones scopées par teamRole, ADR-0131).
   *
   * Un seul acte, gouverné + audité. On N'UTILISE PAS `governedProcedure` :
   * il persisterait l'input verbatim (donc le mot de passe EN CLAIR) dans
   * l'IntentEmission hash-chaînée. On émet donc manuellement via le spine
   * (ADR-0124) avec un payload REDACTÉ (jamais le mot de passe).
   *
   * Refus : email déjà pourvu d'un mot de passe (on ne réinitialise pas ici).
   */
  /**
   * Transfère la PROPRIÉTÉ d'une marque à un compte EXISTANT.
   *
   * `createBrandLogin` crée un compte ; il refuse un email déjà pourvu d'un mot
   * de passe (on ne réinitialise pas un mot de passe par cette voie). Or c'est
   * exactement le cas des dirigeants déjà provisionnés — Lionel sur Motion19 a
   * été créé par l'ancien chemin, donc en **collaborateur délégué**, scopé par
   * le firewall de zones (ADR-0131) alors qu'il est le propriétaire.
   *
   * D'où cette opération distincte : elle ne touche NI au compte NI au mot de
   * passe, elle déplace `Strategy.userId` — la propriété canonique du repo
   * (`canAccessStrategy` et `collaborator-firewall` y court-circuitent tous
   * les deux).
   *
   * L'ancien propriétaire devient collaborateur `DIGITAL_DIRECTOR` : la
   * paternité de la stratégie est conservée et personne ne perd son accès en
   * silence (motif du seed SPAWT).
   */
  transferBrandOwnership: governedProcedure({
    kind: "ADMIN_TRANSFER_BRAND_OWNERSHIP",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: z.string().min(1),
      /** Compte destinataire — doit exister. */
      email: z.string().email(),
    }),
    caller: "accounts:transferBrandOwnership",
  }).mutation(async ({ input, ctx }) => {
    const email = input.email.toLowerCase();
    const strategy = await db.strategy.findUnique({
      where: { id: input.strategyId },
      select: { id: true, name: true, userId: true },
    });
    if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Marque introuvable." });

    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Aucun compte pour ${email}. Créez-le d'abord (« Créer le login »), ou corrigez l'adresse.`,
      });
    }

    if (strategy.userId === user.id) {
      // Idempotent : re-jouer le transfert ne doit ni échouer ni rétrograder
      // le propriétaire en collaborateur de lui-même.
      return { alreadyOwner: true, userId: user.id, email: user.email, brandName: strategy.name };
    }

    const previousOwnerId = strategy.userId;
    await db.strategy.update({ where: { id: strategy.id }, data: { userId: user.id } });

    // Le nouveau propriétaire n'a plus besoin d'une ligne de collaboration —
    // elle serait au mieux redondante, au pire elle donnerait à lire un rôle
    // restrictif sur quelqu'un qui n'est plus restreint.
    await db.strategyCollaborator.deleteMany({ where: { strategyId: strategy.id, userId: user.id } });

    if (previousOwnerId && previousOwnerId !== user.id) {
      await db.strategyCollaborator.upsert({
        where: { strategyId_userId: { strategyId: strategy.id, userId: previousOwnerId } },
        update: { role: "DIGITAL_DIRECTOR", status: "ACTIVE", revokedAt: null },
        create: {
          strategyId: strategy.id,
          userId: previousOwnerId,
          role: "DIGITAL_DIRECTOR",
          scopes: [] as unknown as Prisma.InputJsonValue,
          status: "ACTIVE",
          grantedByUserId: ctx.session.user.id,
          note: "Propriétaire précédent — accès conservé après transfert de propriété.",
        },
      });
    }

    auditTrail
      .log({
        action: "UPDATE",
        entityType: "Strategy",
        entityId: strategy.id,
        oldValue: { ownerUserId: previousOwnerId },
        newValue: { ownerUserId: user.id, email, actor: ctx.session.user.id },
      })
      .catch(() => undefined);

    return {
      alreadyOwner: false,
      userId: user.id,
      email: user.email,
      brandName: strategy.name,
      previousOwnerId,
    };
  }),

  createBrandLogin: adminProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        email: z.string().email(),
        name: z.string().min(1).max(120),
        password: z.string().min(8).max(200),
        teamRole: z.enum(TEAM_ROLES).default("DIGITAL_DIRECTOR"),
        accountRole: z.enum(BRAND_LOGIN_ACCOUNT_ROLES).default("FOUNDER"),
        /**
         * Nature du rattachement à la marque.
         *
         * `COLLABORATOR` (défaut, comportement historique) : accès DÉLÉGUÉ,
         * scopé par `teamRole` et soumis au firewall de zones (ADR-0131) —
         * un community manager opère le calendrier, pas la fondation.
         *
         * `OWNER` : le compte devient PROPRIÉTAIRE (`Strategy.userId`), comme
         * Stéphanie sur SPAWT. Le firewall de zones ne s'applique pas au
         * propriétaire (`collaborator-firewall.ts` sort dès
         * `strategy.userId === userId`) : il a la main sur toute sa marque.
         *
         * La distinction manquait : le mécanisme ne savait produire QUE des
         * collaborateurs, alors qu'un dirigeant à qui l'on remet sa marque
         * n'est pas un délégué de son propre bien.
         */
        attachAs: z.enum(["COLLABORATOR", "OWNER"]).default("COLLABORATOR"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.session.user;
      const email = input.email.toLowerCase();

      const strategy = await db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, name: true, userId: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Marque introuvable." });

      const existing = await db.user.findUnique({
        where: { email },
        select: { id: true, hashedPassword: true },
      });
      if (existing?.hashedPassword) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Un compte avec cet email a déjà un mot de passe. Choisissez un autre email, ou utilisez « mot de passe oublié ».",
        });
      }

      // Émission gouvernée — payload REDACTÉ (spine ADR-0124). Le mot de passe
      // en clair ne doit JAMAIS entrer dans l'IntentEmission hash-chaînée.
      const intentId = await openEmission({
        kind: "ADMIN_CREATE_BRAND_LOGIN",
        strategyId: strategy.id,
        payload: {
          strategyId: strategy.id,
          email,
          name: input.name,
          teamRole: input.teamRole,
          accountRole: input.accountRole,
          attachAs: input.attachAs,
          actor: actor.id,
        },
        caller: "accounts:createBrandLogin",
      });

      try {
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Crée le compte, ou réclame un stub sans mot de passe (parité auth.register).
        // Mot de passe posé par l'admin = provisoire → invitation à le
        // personnaliser (dismissable), levée au 1er changement (Increment 2b).
        const user = existing
          ? await db.user.update({
              where: { id: existing.id },
              data: { name: input.name, hashedPassword, role: input.accountRole, passwordChangeInvited: true },
              select: { id: true, email: true },
            })
          : await db.user.create({
              data: { name: input.name, email, hashedPassword, role: input.accountRole, passwordChangeInvited: true },
              select: { id: true, email: true },
            });

        // ── Propriété (attachAs: "OWNER") ────────────────────────────────
        // `Strategy.userId` EST la propriété : `canAccessStrategy` y court-
        // circuite, et le firewall de zones aussi. On suit le motif Stéphanie
        // (seed SPAWT) : le nouveau propriétaire prend la marque, l'ancien
        // devient collaborateur DIGITAL_DIRECTOR — la paternité de la stratégie
        // est conservée, personne ne perd son accès en silence.
        if (input.attachAs === "OWNER") {
          const previousOwnerId = strategy.userId;
          await db.strategy.update({ where: { id: strategy.id }, data: { userId: user.id } });
          if (previousOwnerId && previousOwnerId !== user.id) {
            await db.strategyCollaborator.upsert({
              where: { strategyId_userId: { strategyId: strategy.id, userId: previousOwnerId } },
              update: { role: "DIGITAL_DIRECTOR", status: "ACTIVE", revokedAt: null },
              create: {
                strategyId: strategy.id,
                userId: previousOwnerId,
                role: "DIGITAL_DIRECTOR",
                scopes: [] as unknown as Prisma.InputJsonValue,
                status: "ACTIVE",
                grantedByUserId: actor.id,
                note: "Propriétaire précédent — accès conservé après transfert de propriété.",
              },
            });
          }
        }

        // Rattache le login à la marque — upsert ACTIVE (ADR-0129).
        //
        // SAUF si le compte vient d'être fait PROPRIÉTAIRE : une ligne de
        // collaboration sur le propriétaire est au mieux redondante (le
        // firewall de zones sort dès `strategy.userId === userId`), au pire
        // elle donne à lire un rôle restrictif sur quelqu'un qui ne l'est
        // plus. `transferBrandOwnership` la supprime déjà explicitement pour
        // cette raison ; ce chemin-ci la reposait juste après, donc les deux
        // voies d'attribution de la propriété ne produisaient pas le même
        // état final.
        const collab =
          input.attachAs === "OWNER"
            ? (await db.strategyCollaborator.deleteMany({
                where: { strategyId: strategy.id, userId: user.id },
              }),
              { role: null as string | null })
            : await db.strategyCollaborator.upsert({
                where: { strategyId_userId: { strategyId: strategy.id, userId: user.id } },
                update: { role: input.teamRole, status: "ACTIVE", revokedAt: null, grantedByUserId: actor.id },
                create: {
                  strategyId: strategy.id,
                  userId: user.id,
                  role: input.teamRole,
                  scopes: [] as unknown as Prisma.InputJsonValue,
                  status: "ACTIVE",
                  grantedByUserId: actor.id,
                },
                select: { id: true, role: true, status: true },
              });

        auditTrail
          .log({
            action: "CREATE",
            entityType: "User",
            entityId: user.id,
            newValue: {
              email,
              accountRole: input.accountRole,
              brand: strategy.name,
              teamRole: collab.role,
              claimed: Boolean(existing),
              actor: actor.id,
            },
          })
          .catch(() => undefined);

        const result = {
          userId: user.id,
          email: user.email,
          brandName: strategy.name ?? strategy.id,
          attachedAs: input.attachAs,
          /** Vrai propriétaire de la marque après cet acte. */
          isOwner: input.attachAs === "OWNER",
          teamRole: collab.role,
          accountRole: input.accountRole,
          claimed: Boolean(existing),
        };
        await closeEmission({ intentId, result, status: "OK" });
        return result;
      } catch (err) {
        await closeEmission({
          intentId,
          result: { error: err instanceof Error ? err.message : String(err) },
          status: "FAILED",
        });
        throw err;
      }
    }),

  /**
   * Inventaire des comptes AVEC leur rattachement aux marques.
   *
   * `list` rend un `_count.Strategy` — un nombre. Il ne dit ni QUELLE marque,
   * ni si le compte en est propriétaire ou simple délégué, ni s'il peut même
   * se connecter (un compte sans `hashedPassword` est un stub OAuth/invitation,
   * pas un identifiant). C'est pourtant exactement ce qu'on doit lire pour
   * remettre ses accès à un dirigeant.
   *
   * Ne rend JAMAIS l'empreinte du mot de passe — seulement `hasPassword`. Le
   * `select` est explicite pour que ce soit structurel et non affaire de
   * discipline (leçon des projections de connecteurs).
   */
  inventory: adminProcedure
    .input(z.object({ search: z.string().max(120).optional(), limit: z.number().int().min(1).max(500).default(200) }))
    .query(async ({ input }) => {
      const users = await db.user.findMany({
        where: input.search
          ? {
              OR: [
                { email: { contains: input.search, mode: "insensitive" as const } },
                { name: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {},
        orderBy: { createdAt: "asc" },
        take: input.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hashedPassword: true, // réduit à un booléen juste en dessous — jamais rendu
          passwordChangeInvited: true,
          createdAt: true,
          Strategy: { select: { id: true, name: true } },
          strategyCollaborations: {
            where: { status: "ACTIVE" },
            select: { role: true, strategy: { select: { id: true, name: true } } },
          },
        },
      });

      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        /** Peut se connecter par email + mot de passe. Faux = stub à provisionner. */
        hasPassword: Boolean(u.hashedPassword),
        /** Mot de passe posé par un admin, pas encore personnalisé. */
        provisionalPassword: u.passwordChangeInvited,
        createdAt: u.createdAt,
        owns: u.Strategy.map((s) => ({ id: s.id, name: s.name })),
        delegatedOn: u.strategyCollaborations.map((c) => ({
          id: c.strategy.id,
          name: c.strategy.name,
          teamRole: c.role,
        })),
      }));
    }),

  /**
   * Pose un mot de passe PROVISOIRE sur un compte existant, et le rend UNE fois.
   *
   * Trou opérationnel que cela comble : les mots de passe sont des empreintes
   * bcrypt, donc **irrécupérables** — ni par l'opérateur, ni par personne. Et
   * `createBrandLogin` REFUSE par construction un email déjà pourvu d'un mot de
   * passe. Un identifiant perdu n'avait donc aucune voie de remplacement depuis
   * la console : il fallait passer par « mot de passe oublié », c'est-à-dire par
   * la boîte mail du dirigeant, qu'on n'a pas toujours sous la main quand on
   * remet ses accès à quelqu'un.
   *
   * `passwordChangeInvited` est reposé : le mot de passe rendu ici est
   * provisoire par nature et l'app invite à le personnaliser.
   *
   * Comme `createBrandLogin`, on N'UTILISE PAS `governedProcedure` — il
   * persisterait le secret verbatim dans l'`IntentEmission` hash-chaînée. On
   * émet manuellement via le spine (ADR-0124) avec un payload redacté.
   */
  resetPassword: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        /** Laisser vide pour en faire générer un — préférable à un mot choisi à la main. */
        password: z.string().min(8).max(200).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.session.user;
      if (actor.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "ADMIN requis." });
      const email = input.email.toLowerCase();

      const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, role: true } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: `Aucun compte pour ${email}.` });

      const generated = !input.password;
      const password = input.password ?? crypto.randomBytes(9).toString("base64url");

      // Le payload ne nomme même pas le champ : `generated` dit qu'un secret a
      // été fabriqué, sans rien en révéler. Le verrou CI interdit toute
      // occurrence de « password » dans cette zone — un booléen dérivé en
      // ligne (`!input.password`) suffirait à la faire passer et rendrait le
      // verrou inutile le jour où quelqu'un y met la vraie valeur.
      const intentId = await openEmission({
        kind: "ADMIN_RESET_USER_PASSWORD",
        payload: { email, targetUserId: user.id, generated, actor: actor.id },
        caller: "accounts:resetPassword",
      });

      try {
        const hashedPassword = await bcrypt.hash(password, 12);
        await db.user.update({
          where: { id: user.id },
          data: { hashedPassword, passwordChangeInvited: true },
          select: { id: true }, // un `update` rend la LIGNE ENTIÈRE sans `select` — donc l'empreinte
        });

        auditTrail
          .log({
            action: "UPDATE",
            entityType: "User",
            entityId: user.id,
            newValue: { passwordReset: true, actor: actor.id },
          })
          .catch(() => undefined);

        // Le secret sort par la RÉPONSE (à transmettre par un canal privé),
        // jamais par l'émission ni par l'audit.
        await closeEmission({ intentId, result: { userId: user.id, email }, status: "OK" });
        return { userId: user.id, email, name: user.name, role: user.role, password, provisional: true };
      } catch (err) {
        await closeEmission({
          intentId,
          result: { error: err instanceof Error ? err.message : String(err) },
          status: "FAILED",
        });
        throw err;
      }
    }),

  /**
   * Supprime un compte créé par erreur (faute de frappe sur l'email, doublon).
   *
   * Fail-closed sur deux fronts, parce qu'une suppression de compte est
   * irréversible et qu'un compte porte des accès :
   *  - il **possède** une marque (`Strategy.userId`) → refus, avec les noms.
   *    La propriété se transfère d'abord (`transferBrandOwnership`) ; sinon on
   *    orphelinerait une marque, et la relation est de toute façon requise côté
   *    base (la suppression échouerait, mais tard et sans explication).
   *  - c'est un compte `ADMIN` ou `OPERATOR` → refus. Cette route ne doit pas
   *    pouvoir se retourner contre la maison.
   *
   * Les lignes `StrategyCollaborator` tombent en cascade (`onDelete: Cascade`) :
   * les accès délégués disparaissent avec le compte, ce qui est le but.
   */
  purgeAccount: governedProcedure({
    kind: "ADMIN_PURGE_USER_ACCOUNT",
    requireOperator: true,
    inputSchema: z.object({
      email: z.string().email(),
      reason: z.string().min(3).max(500),
    }),
    caller: "accounts:purgeAccount",
  }).mutation(async ({ input, ctx }) => {
    const actor = ctx.session.user;
    if (actor.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "ADMIN requis." });
    const email = input.email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        Strategy: { select: { id: true, name: true } },
        strategyCollaborations: { select: { id: true } },
      },
    });
    if (!user) return { deleted: false, reason: "not-found" as const, email };

    if (user.id === actor.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Auto-suppression refusée." });
    }
    if (user.role === "ADMIN" || user.role === "OPERATOR") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${email} est un compte ${user.role} — rétrograde-le d'abord si c'est vraiment l'intention.`,
      });
    }
    if (user.Strategy.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${email} est PROPRIÉTAIRE de ${user.Strategy.map((s) => s.name).join(", ")}. Transfère la propriété avant de supprimer le compte.`,
      });
    }

    const collaborationsRemoved = user.strategyCollaborations.length;
    await db.user.delete({ where: { id: user.id } });

    auditTrail
      .log({
        action: "DELETE",
        entityType: "User",
        entityId: user.id,
        oldValue: { email, role: user.role, collaborationsRemoved },
        newValue: { reason: input.reason, actor: actor.id },
      })
      .catch(() => undefined);

    return { deleted: true, reason: "purged" as const, email, collaborationsRemoved };
  }),
});
