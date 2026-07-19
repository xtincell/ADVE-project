/**
 * ADR-0157 — Parrainage manual-first. `getMyCode` : tout compte enregistré
 * obtient son code stable (éligibilité « compte ou société enregistrée »).
 * File opérateur : list/markRewarded/reject en adminProcedure — même pattern
 * que manual-subscriptions (v6.27.15) : validation humaine, zéro octroi
 * automatique d'argent.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { getOrCreateReferralCode } from "@/server/services/referral";

export const referralRouter = createTRPCRouter({
  /** Mon code de parrainage (généré à la première demande) + mes filleuls. */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const code = await getOrCreateReferralCode(ctx.session.user.id);
    const referrals = await db.referral.findMany({
      where: { referrerUserId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { status: true, companyName: true, createdAt: true },
    });
    return {
      code,
      // Récompenses affichées côté UI — doctrine ADR-0157 (appliquées par
      // l'opérateur à la validation, jamais automatiques).
      referrals: referrals.map((r) => ({
        status: r.status,
        companyName: r.companyName,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }),

  /** Console — la file de parrainages (opérateur). */
  adminList: adminProcedure
    .input(z.object({ status: z.enum(["PENDING", "CONVERTED", "REWARDED", "REJECTED"]).optional() }).optional())
    .query(async ({ input }) => {
      const rows = await db.referral.findMany({
        where: input?.status ? { status: input.status } : {},
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      const referrerIds = [...new Set(rows.map((r) => r.referrerUserId))];
      const referrers = await db.user.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, name: true, email: true, referralCode: true },
      });
      const byId = new Map(referrers.map((u) => [u.id, u]));
      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        codeUsed: r.codeUsed,
        refereeEmail: r.refereeEmail,
        refereeName: r.refereeName,
        companyName: r.companyName,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        convertedAt: r.convertedAt?.toISOString() ?? null,
        rewardedAt: r.rewardedAt?.toISOString() ?? null,
        referrer: byId.get(r.referrerUserId) ?? null,
      }));
    }),

  /** L'opérateur a APPLIQUÉ les récompenses (à la main) → marque REWARDED. */
  adminMarkRewarded: adminProcedure
    .input(z.object({ id: z.string(), note: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      await db.referral.update({
        where: { id: input.id },
        data: { status: "REWARDED", rewardedAt: new Date(), ...(input.note ? { note: input.note } : {}) },
      });
      return { ok: true };
    }),

  adminReject: adminProcedure
    .input(z.object({ id: z.string(), note: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      await db.referral.update({
        where: { id: input.id },
        data: { status: "REJECTED", ...(input.note ? { note: input.note } : {}) },
      });
      return { ok: true };
    }),

  /**
   * Notre PROPRE funnel de conversion (audit oubliés 2026-07-19, B4) — on
   * capturait l'attribution à l'intake sans jamais la lire : le cordonnier ne
   * se mesurait pas. Reconstruit intake→complété→payé depuis les données DÉJÀ
   * persistées (QuickIntake.status/source/attribution + IntakePayment). 0
   * nouveau tracking, 0 fabriqué (les visites pré-intake ne sont pas comptées
   * — non instrumentées, dit tel quel).
   */
  adminFunnel: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional())
    .query(async ({ input }) => {
      const since = new Date(Date.now() - (input?.days ?? 30) * 24 * 60 * 60 * 1000);
      const [byStatus, paidCount, bySource, referralCounts] = await Promise.all([
        db.quickIntake.groupBy({
          by: ["status"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        db.intakePayment.count({ where: { status: "PAID", createdAt: { gte: since } } }),
        db.quickIntake.groupBy({
          by: ["source"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          orderBy: { _count: { source: "desc" } },
          take: 10,
        }),
        db.referral.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);
      const statusMap = new Map(byStatus.map((r) => [r.status, r._count._all]));
      const started = byStatus.reduce((s, r) => s + r._count._all, 0);
      const completed = (statusMap.get("COMPLETED") ?? 0) + (statusMap.get("CONVERTED") ?? 0);
      return {
        windowDays: input?.days ?? 30,
        started,
        completed,
        converted: statusMap.get("CONVERTED") ?? 0,
        paid: paidCount,
        completionRate: started > 0 ? Math.round((completed / started) * 100) : null,
        paidRate: completed > 0 ? Math.round((paidCount / completed) * 100) : null,
        topSources: bySource.map((r) => ({ source: r.source ?? "direct", count: r._count._all })),
        referrals: referralCounts.map((r) => ({ status: r.status, count: r._count._all })),
      };
    }),
});
