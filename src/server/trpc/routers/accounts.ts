/**
 * Accounts Router — Console Superviseur (Vague 7).
 *
 * « Donne les droits pour promouvoir/rétrograder les comptes selon leur
 * statut (entrepreneur, créateur, agence, partenaire). » ADMIN only, acte
 * gouverné + journalisé (audit trail). Garde-fous : on ne se rétrograde pas
 * soi-même, et on ne touche pas au dernier ADMIN.
 */

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
  createBrandLogin: adminProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        email: z.string().email(),
        name: z.string().min(1).max(120),
        password: z.string().min(8).max(200),
        teamRole: z.enum(TEAM_ROLES).default("DIGITAL_DIRECTOR"),
        accountRole: z.enum(BRAND_LOGIN_ACCOUNT_ROLES).default("FOUNDER"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.session.user;
      const email = input.email.toLowerCase();

      const strategy = await db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { id: true, name: true },
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

        // Rattache le login à la marque — upsert ACTIVE (ADR-0129).
        const collab = await db.strategyCollaborator.upsert({
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
});
