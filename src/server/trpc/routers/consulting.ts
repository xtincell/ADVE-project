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
import * as consulting from "@/server/services/consulting";
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

  // ── Chaîne de preuve (ADR-0113) ────────────────────────────────────────────

  /** Catalogue de frameworks seedé. */
  frameworks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.frameworkReference.findMany({ orderBy: [{ family: "asc" }, { label: "asc" }] });
  }),

  /** Missions de conseil d'une stratégie (avec hypothèses + évidences). */
  engagements: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyAccess(ctx, input.strategyId);
      return ctx.db.consultingEngagement.findMany({
        where: { strategyId: input.strategyId },
        include: { hypotheses: { include: { evidence: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  createEngagement: governedProcedure({
    kind: "LEGACY_CONSULTING_CREATE_ENGAGEMENT",
    inputSchema: z.object({ strategyId: z.string(), title: z.string().min(1).max(200), objective: z.string().max(2000).optional() }),
    caller: "consulting:createEngagement",
  }).mutation(async ({ ctx, input }) => {
    await assertStrategyAccess(ctx, input.strategyId);
    return consulting.createEngagement(input);
  }),

  addHypothesis: governedProcedure({
    kind: "LEGACY_CONSULTING_ADD_HYPOTHESIS",
    inputSchema: z.object({ engagementId: z.string(), statement: z.string().min(1).max(1000) }),
    caller: "consulting:addHypothesis",
  }).mutation(async ({ ctx, input }) => {
    const eng = await ctx.db.consultingEngagement.findUniqueOrThrow({ where: { id: input.engagementId }, select: { strategyId: true } });
    await assertStrategyAccess(ctx, eng.strategyId);
    return consulting.addHypothesis(input);
  }),

  addEvidence: governedProcedure({
    kind: "LEGACY_CONSULTING_ADD_EVIDENCE",
    inputSchema: z.object({
      hypothesisId: z.string(),
      stance: z.enum(["SUPPORTS", "REFUTES"]),
      weight: z.number().min(0).max(1).optional(),
      summary: z.string().min(1).max(2000),
      sourceType: z.string().max(40).optional(),
      sourceUrl: z.string().url().max(2000).optional(),
      marketSourceId: z.string().optional(),
    }),
    caller: "consulting:addEvidence",
  }).mutation(async ({ ctx, input }) => {
    const hyp = await ctx.db.hypothesis.findUniqueOrThrow({ where: { id: input.hypothesisId }, select: { engagement: { select: { strategyId: true } } } });
    await assertStrategyAccess(ctx, hyp.engagement.strategyId);
    return consulting.addEvidence(input);
  }),

  linkRecommendation: governedProcedure({
    kind: "LEGACY_CONSULTING_LINK_RECO",
    inputSchema: z.object({ recommendationId: z.string(), hypothesisId: z.string() }),
    caller: "consulting:linkRecommendation",
  }).mutation(async ({ ctx, input }) => {
    const reco = await ctx.db.recommendation.findUniqueOrThrow({ where: { id: input.recommendationId }, select: { strategyId: true } });
    await assertStrategyAccess(ctx, reco.strategyId);
    return consulting.linkRecommendationToHypothesis(input);
  }),
});
