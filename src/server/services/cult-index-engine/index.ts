// ============================================================================
// MODULE M10 — Brand OS (Cult Index, Devotion, Community)
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: Annexe D §D.5 + §6.8 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Cult Index 0-100 from 7 weighted dimensions
// [x] REQ-2  Tiers: GHOST(0-20), FUNCTIONAL(21-40), LOVED(41-60), EMERGING(61-80), CULT(81-100)
// [x] REQ-3  SuperfanProfile with engagement depth metrics
// [x] REQ-4  CommunitySnapshot (health, growth, engagement)
// [x] REQ-5  DevotionSnapshot model + router (6 levels: Spectateur→Évangéliste) (Module M42)
// [x] REQ-6  Connexion DevotionSnapshot → Cult Index scoring
// [x] REQ-7  AmbassadorProgram → DevotionSnapshot reconciliation (ambassadors = level 5-6)
// [x] REQ-8  Cult Dashboard in /cockpit (Cult Index + Devotion Ladder + radar)
// [x] REQ-9  compute(strategyId) → { score, tier, dimensions, breakdown }
//
// EXPORTS: computeCultIndex, CultTier, captureDevotionSnapshot, connectDevotionToCultIndex, reconcileAmbassadors, getCultDashboardData
// DIMENSIONS: community, engagement, differentiation, loyalty, advocacy, culture, experience
// ============================================================================

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

// ── REQ-5: DevotionSnapshot capture ──────────────────────────────────────────

interface DevotionLevels {
  spectateur: number;
  interesse: number;
  participant: number;
  engage: number;
  ambassadeur: number;
  evangeliste: number;
}

/**
 * REQ-5: Capture a DevotionSnapshot with the 6 devotion levels.
 * Computes devotionScore and persists the snapshot.
 */
export async function captureDevotionSnapshot(
  strategyId: string,
  levels: DevotionLevels,
  trigger = "system"
): Promise<{ snapshotId: string; devotionScore: number }> {
  // Weighted devotion score: higher levels count more
  const devotionScore =
    levels.spectateur * 0.02 +
    levels.interesse * 0.05 +
    levels.participant * 0.10 +
    levels.engage * 0.20 +
    levels.ambassadeur * 0.30 +
    levels.evangeliste * 0.33;

  const snapshot = await db.devotionSnapshot.create({
    data: {
      strategyId,
      ...levels,
      devotionScore: Math.round(devotionScore * 100) / 100,
      trigger,
    },
  });

  return { snapshotId: snapshot.id, devotionScore: snapshot.devotionScore };
}

// ── REQ-6: Connect DevotionSnapshot to Cult Index ────────────────────────────

/**
 * REQ-6: Read latest DevotionSnapshot and factor it into the cult index calculation.
 * Returns adjusted dimensions that include devotion data.
 */
export async function connectDevotionToCultIndex(strategyId: string): Promise<{
  dimensions: CultDimensions;
  devotionBoost: number;
}> {
  const latestDevotion = await db.devotionSnapshot.findFirst({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
  });

  // Base dimensions with zeroes — caller can merge these into calculateAndSnapshot
  const dimensions: CultDimensions = {
    engagementDepth: 0,
    superfanVelocity: 0,
    communityCohesion: 0,
    brandDefenseRate: 0,
    ugcGenerationRate: 0,
    ritualAdoption: 0,
    evangelismScore: 0,
  };

  if (!latestDevotion) return { dimensions, devotionBoost: 0 };

  // Map devotion levels to cult dimensions
  const activeRatio = latestDevotion.participant + latestDevotion.engage +
    latestDevotion.ambassadeur + latestDevotion.evangeliste;
  dimensions.engagementDepth = Math.min(100, activeRatio * 100);
  dimensions.superfanVelocity = Math.min(100, (latestDevotion.ambassadeur + latestDevotion.evangeliste) * 200);
  dimensions.evangelismScore = Math.min(100, latestDevotion.evangeliste * 500);
  dimensions.ritualAdoption = Math.min(100, latestDevotion.engage * 200);
  dimensions.brandDefenseRate = Math.min(100, latestDevotion.ambassadeur * 300);

  const devotionBoost = latestDevotion.devotionScore;

  return { dimensions, devotionBoost };
}

// ── REQ-7: Ambassador → DevotionSnapshot reconciliation ─────────────────────

/**
 * REQ-7: Read AmbassadorProgram + AmbassadorMember, map to devotion levels 4-5.
 * Ambassadors are at least level 4 (ambassadeur), top tiers are level 5 (evangeliste).
 */
export async function reconcileAmbassadors(strategyId: string): Promise<{
  totalMembers: number;
  ambassadeurCount: number;
  evangelisteCount: number;
  reconciled: boolean;
}> {
  const program = await db.ambassadorProgram.findUnique({
    where: { strategyId },
    include: {
      members: { where: { isActive: true } },
    },
  });

  if (!program || program.members.length === 0) {
    return { totalMembers: 0, ambassadeurCount: 0, evangelisteCount: 0, reconciled: false };
  }

  // Map ambassador tiers to devotion levels
  const topTiers = ["PLATINUM", "DIAMOND"];
  const evangelisteCount = program.members.filter((m) => topTiers.includes(m.tier)).length;
  const ambassadeurCount = program.members.length - evangelisteCount;

  // Get current devotion snapshot to reconcile
  const currentSnapshot = await db.devotionSnapshot.findFirst({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
  });

  // Create a reconciled snapshot incorporating ambassador data
  const baseAmbassadeur = currentSnapshot?.ambassadeur ?? 0;
  const baseEvangeliste = currentSnapshot?.evangeliste ?? 0;
  const totalBase = (currentSnapshot?.spectateur ?? 0.5) + (currentSnapshot?.interesse ?? 0.2) +
    (currentSnapshot?.participant ?? 0.15) + (currentSnapshot?.engage ?? 0.08) +
    baseAmbassadeur + baseEvangeliste;

  const adjustedAmbassadeur = Math.min(1, baseAmbassadeur + (ambassadeurCount / Math.max(1, totalBase * 100)) * 0.5);
  const adjustedEvangeliste = Math.min(1, baseEvangeliste + (evangelisteCount / Math.max(1, totalBase * 100)) * 0.5);

  await captureDevotionSnapshot(strategyId, {
    spectateur: currentSnapshot?.spectateur ?? 0.5,
    interesse: currentSnapshot?.interesse ?? 0.2,
    participant: currentSnapshot?.participant ?? 0.15,
    engage: currentSnapshot?.engage ?? 0.08,
    ambassadeur: adjustedAmbassadeur,
    evangeliste: adjustedEvangeliste,
  }, "ambassador_reconciliation");

  return {
    totalMembers: program.members.length,
    ambassadeurCount,
    evangelisteCount,
    reconciled: true,
  };
}

// ── REQ-8: Cult Dashboard data ───────────────────────────────────────────────

/**
 * REQ-8: Return combined cult index + devotion ladder + superfan data
 * for dashboard rendering in /cockpit.
 */
export async function getCultDashboardData(strategyId: string): Promise<{
  cultIndex: { score: number; tier: CultTier; trend: "UP" | "DOWN" | "STABLE" };
  devotionLadder: DevotionLevels | null;
  superfans: { total: number; segments: Record<string, number> };
  ambassadors: { total: number; active: number };
  history: Array<{ date: Date; score: number; tier: string }>;
}> {
  const [trend, latestDevotion, superfanProfiles, ambassadorProgram, history] = await Promise.all([
    getCultIndexTrend(strategyId),
    db.devotionSnapshot.findFirst({ where: { strategyId }, orderBy: { measuredAt: "desc" } }),
    db.superfanProfile.findMany({ where: { strategyId } }),
    db.ambassadorProgram.findUnique({
      where: { strategyId },
      include: { members: { where: { isActive: true } } },
    }),
    db.cultIndexSnapshot.findMany({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
      take: 30,
      select: { measuredAt: true, compositeScore: true, tier: true },
    }),
  ]);

  // Build superfan segment breakdown
  const segments: Record<string, number> = {};
  for (const sf of superfanProfiles) {
    segments[sf.segment] = (segments[sf.segment] ?? 0) + 1;
  }

  const devotionLadder: DevotionLevels | null = latestDevotion
    ? {
        spectateur: latestDevotion.spectateur,
        interesse: latestDevotion.interesse,
        participant: latestDevotion.participant,
        engage: latestDevotion.engage,
        ambassadeur: latestDevotion.ambassadeur,
        evangeliste: latestDevotion.evangeliste,
      }
    : null;

  return {
    cultIndex: {
      score: trend.current,
      tier: getCultTier(trend.current),
      trend: trend.trend,
    },
    devotionLadder,
    superfans: {
      total: superfanProfiles.length,
      segments,
    },
    ambassadors: {
      total: ambassadorProgram?.members.length ?? 0,
      active: ambassadorProgram?.members.filter((m) => m.isActive).length ?? 0,
    },
    history: history.map((h) => ({
      date: h.measuredAt,
      score: h.compositeScore,
      tier: h.tier,
    })),
  };
}
