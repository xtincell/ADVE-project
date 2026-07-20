import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const attributionRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_ATTRIBUTION_ROUTER_CREATE",

    inputSchema: z.object({ strategyId: z.string(), eventType: z.string(), source: z.string(), value: z.number().optional() }),

    caller: "attribution-router:create",

  })
    .mutation(async ({ ctx, input }) => ctx.db.attributionEvent.create({ data: input })),

  list: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), source: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attributionEvent.findMany({
        where: { strategyId: input.strategyId, ...(input.source ? { source: input.source } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getSummary: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.attributionEvent.findMany({ where: { strategyId: input.strategyId } });
      const byChannel: Record<string, number> = {};
      for (const e of events) { byChannel[e.source] = (byChannel[e.source] ?? 0) + 1; }
      return { total: events.length, byChannel };
    }),
});
