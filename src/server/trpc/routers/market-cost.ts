/**
 * Market Cost router (ADR-0094) — base de coûts marché × période.
 * Lectures (opérateur), upsert gouverné (THOT), seed baseline.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */
import {
  getMarketCost,
  getMarketCostHistory,
  listMarketCosts,
  upsertMarketCost,
  seedMarketCosts,
} from "@/server/services/market-cost";

const PERIOD_RE = /^(\d{4})(-Q[1-4]|-\d{2})?$/;

function assertOperator(role: string | null | undefined) {
  if (role !== "ADMIN" && role !== "OPERATOR") {
    throw new Error("Accès réservé aux opérateurs UPgraders.");
  }
}

export const marketCostRouter = createTRPCRouter({
  /** Coût d'un marché à une période (ou le plus récent si period omis). */
  getCost: protectedProcedure
    .input(
      z.object({
        countryCode: z.string().length(2),
        sector: z.string().max(120).optional(),
        metric: z.string().min(1).max(60),
        period: z.string().regex(PERIOD_RE).optional(),
      }),
    )
    .query(({ input }) => getMarketCost(input)),

  /** Série historique d'une métrique pour un marché. */
  getHistory: protectedProcedure
    .input(
      z.object({
        countryCode: z.string().length(2),
        sector: z.string().max(120).optional(),
        metric: z.string().min(1).max(60),
      }),
    )
    .query(({ input }) => getMarketCostHistory(input)),

  /** Liste filtrée (console). */
  list: operatorProcedure
    .input(
      z
        .object({
          countryCode: z.string().length(2).optional(),
          sector: z.string().max(120).optional(),
          metric: z.string().max(60).optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .optional(),
    )
    .query(({ input }) => listMarketCosts(input ?? {})),

  /** Upsert opérateur d'un coût daté (gouverné THOT). */
  upsert: governedProcedure({
    kind: "UPSERT_MARKET_COST_SNAPSHOT",
    inputSchema: z.object({
      countryCode: z.string().length(2),
      sector: z.string().max(120).optional(),
      metric: z.string().min(1).max(60),
      period: z.string().regex(PERIOD_RE, "Période attendue : YYYY | YYYY-Qn | YYYY-MM"),
      unit: z.string().max(40).optional(),
      currency: z.string().min(3).max(3).optional(),
      p10: z.number().nonnegative().optional(),
      p50: z.number().nonnegative(),
      p90: z.number().nonnegative().optional(),
      sampleSize: z.number().int().nonnegative().optional(),
      confidence: z.number().min(0).max(1).optional(),
      notes: z.string().max(2000).optional(),
    }),
    caller: "market-cost:upsert",
  }).mutation(async ({ ctx, input }) => {
    assertOperator(ctx.session.user.role);
    return upsertMarketCost({ ...input, source: "OPERATOR" });
  }),

  /** Seed du jeu baseline (opérateur). Idempotent. */
  seedBaseline: operatorProcedure.mutation(async ({ ctx }) => {
    assertOperator(ctx.session.user.role);
    return seedMarketCosts();
  }),
});
