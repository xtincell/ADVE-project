import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";

export const socialRouter = createTRPCRouter({
  // Connect a social account to a Driver
  connectToDriver: protectedProcedure
    .input(z.object({
      driverId: z.string(),
      platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"]),
      accountId: z.string(),
      accountName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Store connection metadata on the Driver
      const driver = await ctx.db.driver.findUniqueOrThrow({ where: { id: input.driverId } });
      const existing = (driver.constraints as Record<string, unknown>) ?? {};
      return ctx.db.driver.update({
        where: { id: input.driverId },
        data: {
          constraints: {
            ...existing,
            socialConnection: {
              platform: input.platform,
              accountId: input.accountId,
              accountName: input.accountName,
              connectedAt: new Date().toISOString(),
            },
          } as Prisma.InputJsonValue,
        },
      });
    }),

  // Ingest social post metrics → create Signal for feedback loop
  ingestMetrics: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      driverId: z.string().optional(),
      platform: z.string(),
      postId: z.string(),
      metrics: z.object({
        impressions: z.number().default(0),
        reach: z.number().default(0),
        engagement: z.number().default(0),
        likes: z.number().default(0),
        comments: z.number().default(0),
        shares: z.number().default(0),
        saves: z.number().default(0),
        clicks: z.number().default(0),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create a Signal from social metrics
      const engagementRate = input.metrics.reach > 0
        ? (input.metrics.engagement / input.metrics.reach) * 100
        : 0;

      // Determine ADVE impact based on engagement rate
      const adveImpact: Record<string, number> = {
        e: Math.min(25, engagementRate * 2.5), // Engagement pillar
        d: input.metrics.impressions > 10000 ? 2 : 0, // Distinction via visibility
        t: 1, // Track — any measured data is positive
      };

      const signal = await ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "SOCIAL_METRICS",
          data: {
            platform: input.platform,
            postId: input.postId,
            driverId: input.driverId,
            ...input.metrics,
            engagementRate,
          } as Prisma.InputJsonValue,
          advertis_vector: adveImpact as Prisma.InputJsonValue,
        },
      });

      return signal;
    }),

  // Get social performance summary for a strategy
  getPerformance: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      platform: z.string().optional(),
      limit: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const signals = await ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "SOCIAL_METRICS",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Aggregate metrics
      let totalImpressions = 0;
      let totalEngagement = 0;
      let postCount = 0;

      for (const s of signals) {
        const data = s.data as Record<string, number> | null;
        if (data) {
          totalImpressions += data.impressions ?? 0;
          totalEngagement += data.engagement ?? 0;
          postCount++;
        }
      }

      return {
        signals,
        summary: {
          totalImpressions,
          totalEngagement,
          postCount,
          avgEngagementRate: totalImpressions > 0
            ? (totalEngagement / totalImpressions) * 100
            : 0,
        },
      };
    }),
});
