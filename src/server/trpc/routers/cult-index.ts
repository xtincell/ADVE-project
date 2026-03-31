/**
 * Cult Index Router — 0-100 community devotion score
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import * as cultIndex from "@/server/services/cult-index-engine";

export const cultIndexRouter = createTRPCRouter({
  calculate: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(({ input }) => cultIndex.calculateAndSnapshot(input.strategyId)),

  history: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().optional() }))
    .query(({ input }) => cultIndex.getCultIndexHistory(input.strategyId, input.limit)),

  trend: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => cultIndex.getCultIndexTrend(input.strategyId)),
});
