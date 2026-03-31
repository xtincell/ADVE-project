/**
 * Cult Index Engine — Computes the 0-100 Cult Index from 7 weighted dimensions
 * Tiers: GHOST (0-20), FUNCTIONAL (21-40), LOVED (41-60), EMERGING (61-80), CULT (81-100)
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type CultTier = "GHOST" | "FUNCTIONAL" | "LOVED" | "EMERGING" | "CULT";

interface CultDimensions {
  engagementDepth: number;     // 25%
  superfanVelocity: number;    // 20%
  communityCohesion: number;   // 15%
  brandDefenseRate: number;    // 15%
  ugcGenerationRate: number;   // 10%
  ritualAdoption: number;      // 10%
  evangelismScore: number;     // 5%
}

const WEIGHTS: Record<keyof CultDimensions, number> = {
  engagementDepth: 0.25,
  superfanVelocity: 0.20,
  communityCohesion: 0.15,
  brandDefenseRate: 0.15,
  ugcGenerationRate: 0.10,
  ritualAdoption: 0.10,
  evangelismScore: 0.05,
};

export function computeCultIndex(dimensions: CultDimensions): number {
  let score = 0;
  for (const [key, weight] of Object.entries(WEIGHTS) as [keyof CultDimensions, number][]) {
    const value = Math.max(0, Math.min(100, dimensions[key]));
    score += value * weight;
  }
  return Math.round(score * 100) / 100;
}

export function getCultTier(score: number): CultTier {
  if (score <= 20) return "GHOST";
  if (score <= 40) return "FUNCTIONAL";
  if (score <= 60) return "LOVED";
  if (score <= 80) return "EMERGING";
  return "CULT";
}

/**
 * Calculate Cult Index from strategy data and persist snapshot
 */
export async function calculateAndSnapshot(strategyId: string): Promise<{
  score: number;
  tier: CultTier;
  dimensions: CultDimensions;
  snapshotId: string;
}> {
  // Gather data from various sources
  const [devotionSnapshots, communitySnapshots, superfanProfiles] = await Promise.all([
    db.devotionSnapshot.findMany({ where: { strategyId }, orderBy: { measuredAt: "desc" }, take: 1 }),
    db.communitySnapshot.findMany({ where: { strategyId }, orderBy: { measuredAt: "desc" } }),
    db.superfanProfile.findMany({ where: { strategyId } }),
  ]);

  const latestDevotion = devotionSnapshots[0];

  // Calculate dimensions from available data
  const dimensions: CultDimensions = {
    engagementDepth: latestDevotion
      ? (latestDevotion.participant + latestDevotion.engage + latestDevotion.ambassadeur + latestDevotion.evangeliste) * 100
      : 0,
    superfanVelocity: superfanProfiles.length > 0
      ? Math.min(100, (superfanProfiles.filter((s) => s.segment !== "SPECTATEUR").length / superfanProfiles.length) * 100)
      : 0,
    communityCohesion: communitySnapshots.length > 0
      ? communitySnapshots.reduce((sum, c) => sum + c.health, 0) / communitySnapshots.length * 100
      : 0,
    brandDefenseRate: superfanProfiles.filter((s) => s.segment === "EVANGELISTE").length > 0
      ? Math.min(100, (superfanProfiles.filter((s) => s.segment === "EVANGELISTE").length / Math.max(1, superfanProfiles.length)) * 200)
      : 0,
    ugcGenerationRate: 0, // Requires social data integration
    ritualAdoption: latestDevotion ? latestDevotion.engage * 200 : 0,
    evangelismScore: latestDevotion ? latestDevotion.evangeliste * 500 : 0,
  };

  // Clamp all dimensions to 0-100
  for (const key of Object.keys(dimensions) as (keyof CultDimensions)[]) {
    dimensions[key] = Math.max(0, Math.min(100, dimensions[key]));
  }

  const score = computeCultIndex(dimensions);
  const tier = getCultTier(score);

  // Get the previous snapshot to compare tiers
  const previousSnapshot = await db.cultIndexSnapshot.findFirst({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
  });
  const previousTier = previousSnapshot?.tier as CultTier | undefined;

  // Persist snapshot
  const snapshot = await db.cultIndexSnapshot.create({
    data: {
      strategyId,
      ...dimensions,
      compositeScore: score,
      tier,
    },
  });

  // Compare tiers and emit signals on tier change
  if (previousTier && previousTier !== tier) {
    const tierOrder: CultTier[] = ["GHOST", "FUNCTIONAL", "LOVED", "EMERGING", "CULT"];
    const oldIndex = tierOrder.indexOf(previousTier);
    const newIndex = tierOrder.indexOf(tier);

    if (newIndex > oldIndex) {
      // Tier IMPROVED
      await db.signal.create({
        data: {
          strategyId,
          type: "CULT_TIER_UPGRADE",
          data: {
            oldTier: previousTier,
            newTier: tier,
            score,
            snapshotId: snapshot.id,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Record tier change as a knowledge milestone
      await db.knowledgeEntry.create({
        data: {
          entryType: "DIAGNOSTIC_RESULT",
          data: {
            type: "cult_tier_milestone",
            strategyId,
            oldTier: previousTier,
            newTier: tier,
            score,
            achievedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      // Tier DECLINED — signal will feed into feedback-loop when processSignal is called
      await db.signal.create({
        data: {
          strategyId,
          type: "CULT_TIER_DECLINE",
          data: {
            oldTier: previousTier,
            newTier: tier,
            score,
            snapshotId: snapshot.id,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  return { score, tier, dimensions, snapshotId: snapshot.id };
}

/**
 * Get Cult Index history for a strategy
 */
export async function getCultIndexHistory(strategyId: string, limit = 30) {
  return db.cultIndexSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: limit,
  });
}

/**
 * Get Cult Index trend (is it improving?)
 */
export async function getCultIndexTrend(strategyId: string): Promise<{
  current: number;
  previous: number;
  delta: number;
  trend: "UP" | "DOWN" | "STABLE";
}> {
  const snapshots = await db.cultIndexSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: 2,
  });

  const current = snapshots[0]?.compositeScore ?? 0;
  const previous = snapshots[1]?.compositeScore ?? 0;
  const delta = current - previous;

  return {
    current,
    previous,
    delta,
    trend: delta > 2 ? "UP" : delta < -2 ? "DOWN" : "STABLE",
  };
}
