import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const sourceInsightsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), type: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findMany({
        where: { strategyId: input.strategyId, ...(input.type ? { type: input.type } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getSummary: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const signals = await ctx.db.signal.findMany({ where: { strategyId: input.strategyId } });
      const byType: Record<string, number> = {};
      for (const s of signals) { byType[s.type] = (byType[s.type] ?? 0) + 1; }
      return { total: signals.length, byType };
    }),
});
