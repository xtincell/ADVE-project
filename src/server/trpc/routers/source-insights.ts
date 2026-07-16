import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { assertStrategyRead } from "./_strategy-read-guard";

// Audit 2026-07-16 `legacy-read-procedures-cross-tenant` : lectures gardées
// par le chokepoint ADR-0129 (tout compte authentifié lisait n'importe quelle marque).
export const sourceInsightsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), type: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      return ctx.db.signal.findMany({
        where: { strategyId: input.strategyId, ...(input.type ? { type: input.type } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getSummary: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const signals = await ctx.db.signal.findMany({ where: { strategyId: input.strategyId } });
      const byType: Record<string, number> = {};
      for (const s of signals) { byType[s.type] = (byType[s.type] ?? 0) + 1; }
      return { total: signals.length, byType };
    }),
});
