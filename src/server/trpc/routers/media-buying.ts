import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const mediaBuyingRouter = createTRPCRouter({
  // Sync media performance data → Signal for feedback loop
  syncPerformance: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      campaignId: z.string().optional(),
      platform: z.string(),
      data: z.object({
        spend: z.number(),
        impressions: z.number(),
        clicks: z.number(),
        conversions: z.number().default(0),
        cpm: z.number().optional(),
        cpc: z.number().optional(),
        cpa: z.number().optional(),
        roas: z.number().optional(),
      }),
      period: z.object({
        start: z.string(),
        end: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const ctr = input.data.impressions > 0
        ? (input.data.clicks / input.data.impressions) * 100
        : 0;

      // Create Signal with ADVE impact
      const adveImpact: Record<string, number> = {
        t: Math.min(25, ctr * 5), // Track — measurable performance
        i: input.data.conversions > 0 ? 3 : 1, // Implementation — executing
        d: input.data.impressions > 50000 ? 2 : 0, // Distinction via reach
      };

      const signal = await ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "MEDIA_PERFORMANCE",
          data: {
            platform: input.platform,
            campaignId: input.campaignId,
            ...input.data,
            ctr,
            period: input.period,
          } as Prisma.InputJsonValue,
          advertis_vector: adveImpact as Prisma.InputJsonValue,
        },
      });

      return signal;
    }),

  // Get media performance summary
  getSummary: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      platform: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const signals = await ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "MEDIA_PERFORMANCE",
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      for (const s of signals) {
        const data = s.data as Record<string, number> | null;
        if (data) {
          totalSpend += data.spend ?? 0;
          totalImpressions += data.impressions ?? 0;
          totalClicks += data.clicks ?? 0;
          totalConversions += data.conversions ?? 0;
        }
      }

      return {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
        avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      };
    }),
});
