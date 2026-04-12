// ============================================================================
// MODULE M42 — DevotionSnapshot + Devotion Ladder
// Score: 65/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §2.2.9 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  snapshot(strategyId) — capture current devotion state
// [x] REQ-2  list, getByStrategy — query snapshots
// [ ] REQ-3  setObjective(strategyId, targetLevel) — set devotion growth target
// [ ] REQ-4  compare(strategyId, date1, date2) — compare snapshots over time
// [ ] REQ-5  6 levels: Spectateur → Curieux → Fidèle → Ambassadeur → Évangéliste → Apôtre
// [ ] REQ-6  DevotionSnapshot model in Prisma (audience distribution per level)
// [ ] REQ-7  Connexion to Cult Index (devotion distribution feeds cult score)
// [ ] REQ-8  AmbassadorProgram reconciliation (ambassadors = level 4-5)
// [ ] REQ-9  Visualization in /cockpit Cult Dashboard (heroic ladder display)
//
// PROCEDURES: snapshot, list, getByStrategy, setObjective, compare
// ============================================================================

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const devotionLadderRouter = createTRPCRouter({
  snapshot: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      spectateur: z.number().min(0).max(100),
      interesse: z.number().min(0).max(100),
      participant: z.number().min(0).max(100),
      engage: z.number().min(0).max(100),
      ambassadeur: z.number().min(0).max(100),
      evangeliste: z.number().min(0).max(100),
      trigger: z.string().default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      const devotionScore = input.engage * 0.2 + input.ambassadeur * 0.3 + input.evangeliste * 0.5;
      return ctx.db.devotionSnapshot.create({
        data: { ...input, devotionScore },
      });
    }),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.limit,
      });
    }),

  getByStrategy: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.devotionSnapshot.findFirst({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
    }),

  setObjective: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      targetDevotionScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { advertis_vector: true },
      });
      const existing = (strategy.advertis_vector as Record<string, unknown>) ?? {};
      return ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: {
          advertis_vector: { ...existing, devotionObjective: input.targetDevotionScore },
        },
      });
    }),

  compare: protectedProcedure
    .input(z.object({ strategyId: z.string(), periods: z.number().default(6) }))
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.periods,
      });
      return snapshots.reverse();
    }),
});
