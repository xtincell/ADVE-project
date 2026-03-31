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
