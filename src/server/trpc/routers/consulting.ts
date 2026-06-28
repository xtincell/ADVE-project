/**
 * Consulting — tRPC router (ADR-0109, Phase 24). Acteur Conseil.
 *
 * Priorisation RICE déterministe des recommandations. Lecture = query tenant-scopée
 * triée par riceScore ; mutation gouvernée (`emitIntent`). Barèmes en base seedée.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { setRecommendationRice, sortByRice } from "@/server/services/consulting";
/* lafusee:governed-active */

type Ctx = { session: { user: { id: string; role: string; operatorId?: string | null } } };

async function assertStrategyAccess(ctx: Ctx, strategyId: string) {
  const ok = await canAccessStrategy(strategyId, {
    operatorId: ctx.session.user.operatorId ?? null,
    userId: ctx.session.user.id,
    role: ctx.session.user.role ?? "USER",
  });
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cette stratégie." });
}

export const consultingRouter = createTRPCRouter({
  /** Barème RICE seedé (REACH/IMPACT/CONFIDENCE/EFFORT) pour piloter l'UI. */
  riceScales: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.riceScale.findMany({ orderBy: [{ dimension: "asc" }, { sortOrder: "asc" }] });
  }),

  /** Recommandations d'une stratégie triées par score RICE décroissant. */
  prioritized: protectedProcedure
    .input(z.object({ strategyId: z.string(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      const recos = await ctx.db.recommendation.findMany({
        where: { strategyId: input.strategyId, ...(input.status ? { status: input.status } : {}) },
        select: {
          id: true, targetPillarKey: true, targetField: true, explain: true,
          impact: true, urgency: true, status: true,
          riceReach: true, riceImpact: true, riceConfidence: true, riceEffort: true, riceScore: true,
        },
      });
      return sortByRice(recos);
    }),

  /** Renseigne les entrées RICE d'une reco + calcule le score (déterministe). */
  setRice: governedProcedure({
    kind: "LEGACY_RECOMMENDATION_SET_RICE",
    inputSchema: z.object({
      recommendationId: z.string(),
      reachLabel: z.string().optional(),
      impactLabel: z.string().optional(),
      confidenceLabel: z.string().optional(),
      effortLabel: z.string().optional(),
      reach: z.number().nonnegative().optional(),
      impact: z.number().nonnegative().optional(),
      confidence: z.number().min(0).max(1).optional(),
      effort: z.number().positive().optional(),
    }),
    caller: "consulting:setRice",
  }).mutation(async ({ ctx, input }) => {
    const reco = await ctx.db.recommendation.findUniqueOrThrow({
      where: { id: input.recommendationId },
      select: { strategyId: true },
    });
    await assertStrategyAccess(ctx, reco.strategyId);
    return setRecommendationRice(input);
  }),
});
