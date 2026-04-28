/**
 * Superfan Router — Active superfan count as THE northstar metric
 * CdC thresholds: engagementDepth ≥ 0.80 qualifies as active superfan
 * (ambassadeur + evangeliste tiers from devotion engine)
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "superfan");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

const ACTIVE_SUPERFAN_THRESHOLD = 0.65; // ambassadeur+ (devotion engine: ≥0.65 = ambassadeur, ≥0.85 = evangeliste)

export const superfanRouter = createTRPCRouter({
  /** Count active superfans for a strategy (THE northstar) */
  count: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const total = await db.superfanProfile.count({
        where: { strategyId: input.strategyId },
      });

      const active = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
        },
      });

      const evangelistes = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: 0.85 },
        },
      });

      return {
        total,
        active,         // ambassadeur + evangeliste
        evangelistes,    // top tier only
        ratio: total > 0 ? Math.round((active / total) * 100) : 0,
      };
    }),

  /** Velocity: new superfans gained in last N days */
  velocity: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - input.days * 2);

      const newActive = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
          createdAt: { gte: since },
        },
      });

      const previousActive = await db.superfanProfile.count({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
          createdAt: { gte: previousPeriodStart, lt: since },
        },
      });

      const delta = newActive - previousActive;
      const trend: "up" | "down" | "stable" = delta > 0 ? "up" : delta < 0 ? "down" : "stable";

      return {
        newActive,
        previousActive,
        delta,
        trend,
        periodDays: input.days,
      };
    }),

  /** Segment breakdown by devotion tier */
  segments: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      const profiles = await db.superfanProfile.findMany({
        where: { strategyId: input.strategyId },
        select: { engagementDepth: true, platform: true },
      });

      const tiers = { spectateur: 0, interesse: 0, participant: 0, engage: 0, ambassadeur: 0, evangeliste: 0 };

      for (const p of profiles) {
        if (p.engagementDepth >= 0.85) tiers.evangeliste++;
        else if (p.engagementDepth >= 0.65) tiers.ambassadeur++;
        else if (p.engagementDepth >= 0.45) tiers.engage++;
        else if (p.engagementDepth >= 0.25) tiers.participant++;
        else if (p.engagementDepth >= 0.10) tiers.interesse++;
        else tiers.spectateur++;
      }

      const platforms: Record<string, number> = {};
      for (const p of profiles) {
        if (p.engagementDepth >= ACTIVE_SUPERFAN_THRESHOLD) {
          platforms[p.platform] = (platforms[p.platform] ?? 0) + 1;
        }
      }

      return { tiers, platforms, total: profiles.length };
    }),

  /** Top superfan profiles (for display) */
  top: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      return db.superfanProfile.findMany({
        where: {
          strategyId: input.strategyId,
          engagementDepth: { gte: ACTIVE_SUPERFAN_THRESHOLD },
        },
        orderBy: { engagementDepth: "desc" },
        take: input.limit,
        select: {
          id: true,
          handle: true,
          platform: true,
          engagementDepth: true,
          segment: true,
          interactions: true,
          lastActiveAt: true,
        },
      });
    }),
});
