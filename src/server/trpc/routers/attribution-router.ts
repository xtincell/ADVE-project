import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "attribution-router");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const attributionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ strategyId: z.string(), eventType: z.string(), source: z.string(), value: z.number().optional() }))
    .mutation(async ({ ctx, input }) => ctx.db.attributionEvent.create({ data: input })),

  list: protectedProcedure
    .input(z.object({ strategyId: z.string(), source: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attributionEvent.findMany({
        where: { strategyId: input.strategyId, ...(input.source ? { source: input.source } : {}) },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getSummary: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.attributionEvent.findMany({ where: { strategyId: input.strategyId } });
      const byChannel: Record<string, number> = {};
      for (const e of events) { byChannel[e.source] = (byChannel[e.source] ?? 0) + 1; }
      return { total: events.length, byChannel };
    }),
});
