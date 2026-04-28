import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getFinancialContext, getCountryContext } from "@/server/services/financial-engine";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "market-pricing");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const marketPricingRouter = createTRPCRouter({
  /** Reference tarifaire par secteur/positionnement/pays */
  getReference: protectedProcedure
    .input(z.object({ sector: z.string().optional(), country: z.string().optional(), positioning: z.string().optional(), businessModel: z.string().optional() }))
    .query(({ input }) => {
      const ctx = getCountryContext(input.country);
      const financialCtx = getFinancialContext(input.sector, input.country, input.positioning, input.businessModel);
      return { currency: ctx.currency, currencySymbol: ctx.currencySymbol, marketSize: ctx.marketSize, avgIncome: ctx.avgIncome, financialContext: financialCtx };
    }),

  /** Benchmarks sectoriels depuis KnowledgeEntry */
  getSectorBenchmarks: protectedProcedure
    .input(z.object({ sector: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.knowledgeEntry.findMany({
        where: { entryType: "SECTOR_BENCHMARK", ...(input.sector ? { sector: input.sector } : {}) },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      return entries.map((e) => ({ sector: e.sector, market: e.market, sampleSize: e.sampleSize, data: e.data }));
    }),
});
