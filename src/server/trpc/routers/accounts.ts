/**
 * Accounts Router — Console Superviseur (Vague 7).
 *
 * « Donne les droits pour promouvoir/rétrograder les comptes selon leur
 * statut (entrepreneur, créateur, agence, partenaire). » ADMIN only, acte
 * gouverné + journalisé (audit trail). Garde-fous : on ne se rétrograde pas
 * soi-même, et on ne touche pas au dernier ADMIN.
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
import * as auditTrail from "@/server/services/audit-trail";
/* lafusee:governed-active */

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
});
