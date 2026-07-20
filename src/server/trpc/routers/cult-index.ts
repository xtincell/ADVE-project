/**
 * Cult Index Router — 0-100 community devotion score
 *
 * Phase 0 migration v6.18.20 (Sprint 7) — auditedProcedure → governedProcedure
 * (ADR-0004 cible 100% governedProcedure). Intent kind autogéné via
 * scripts/generate-legacy-intent-kinds.ts.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import * as cultIndex from "@/server/services/cult-index-engine";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const cultIndexRouter = createTRPCRouter({
  calculate: governedProcedure({
    kind: "LEGACY_CULT_INDEX_CALCULATE",
    inputSchema: z.object({ strategyId: z.string() }),
    caller: "cult-index:calculate",
  }).mutation(({ input }) => cultIndex.calculateAndSnapshot(input.strategyId)),

  history: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().optional() }))
    .query(({ input }) => cultIndex.getCultIndexHistory(input.strategyId, input.limit)),

  trend: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(({ input }) => cultIndex.getCultIndexTrend(input.strategyId)),
});
