/**
 * Devotion Engine — Calculates devotion tier distribution from engagement data
 * Maps real engagement metrics to the 6-level devotion hierarchy:
 * SPECTATEUR → INTERESSE → PARTICIPANT → ENGAGE → AMBASSADEUR → EVANGELISTE
 */

import { db } from "@/lib/db";

interface DevotionDistribution {
  spectateur: number;    // Passive audience (views, impressions)
  interesse: number;     // Curious (follows, subscribes, light interaction)
  participant: number;   // Active engagement (likes, comments, shares)
  engage: number;        // Committed (repeat purchases, event attendance)
  ambassadeur: number;   // Advocates (referrals, UGC, testimonials)
  evangeliste: number;   // Brand missionaries (community leaders, co-creators)
}

interface DevotionMetrics {
  totalAudience: number;
  distribution: DevotionDistribution;
  score: number;          // Weighted score 0-100
  momentum: "rising" | "stable" | "declining";
  topContributors: Array<{
    profileId: string;
    handle: string;
    platform: string;
    segment: string;
    engagementDepth: number;
  }>;
}

const TIER_WEIGHTS = {
  spectateur: 0.05,
  interesse: 0.08,
  participant: 0.15,
  engage: 0.25,
  ambassadeur: 0.35,
  evangeliste: 0.50,
};

// Map SuperfanProfile segments to devotion tiers based on engagementDepth thresholds
const ENGAGEMENT_THRESHOLDS = {
  evangeliste: 0.85,
  ambassadeur: 0.65,
  engage: 0.45,
  participant: 0.25,
  interesse: 0.10,
  spectateur: 0,
} as const;

function classifyEngagement(engagementDepth: number): keyof DevotionDistribution {
  if (engagementDepth >= ENGAGEMENT_THRESHOLDS.evangeliste) return "evangeliste";
  if (engagementDepth >= ENGAGEMENT_THRESHOLDS.ambassadeur) return "ambassadeur";
  if (engagementDepth >= ENGAGEMENT_THRESHOLDS.engage) return "engage";
  if (engagementDepth >= ENGAGEMENT_THRESHOLDS.participant) return "participant";
  if (engagementDepth >= ENGAGEMENT_THRESHOLDS.interesse) return "interesse";
  return "spectateur";
}

/**
 * Calculate devotion metrics for a strategy based on real engagement data
 */
export async function calculateDevotion(strategyId: string): Promise<DevotionMetrics> {
  const [
    superfanProfiles,
    missions,
    signals,
    reviews,
    communitySnapshots,
    previousSnapshot,
  ] = await Promise.all([
    // Superfan profiles linked to strategy
    db.superfanProfile.findMany({
      where: { strategyId },
    }),

    // Completed missions (engagement through deliverables)
    db.mission.findMany({
      where: { strategyId, status: { in: ["COMPLETED", "IN_REVIEW"] } },
      select: { id: true, assigneeId: true, status: true },
    }),

    // Positive signals (community engagement)
    db.signal.findMany({
      where: { strategyId, type: { in: ["SCORE_IMPROVEMENT", "CULT_TIER_UPGRADE"] } },
      select: { id: true, type: true, createdAt: true },
    }),

    // Quality reviews (content quality = devotion proxy)
    db.qualityReview.findMany({
      where: { deliverable: { mission: { strategyId } } },
      select: { overallScore: true, reviewerId: true },
    }),

    // Community health data
    db.communitySnapshot.findMany({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
      take: 1,
    }),

    // Previous devotion snapshot for momentum calculation
    db.devotionSnapshot.findFirst({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
    }),
  ]);

  // Calculate tier distribution from superfan profiles using engagementDepth
  const tierCounts: DevotionDistribution = {
    spectateur: 0,
    interesse: 0,
    participant: 0,
    engage: 0,
    ambassadeur: 0,
    evangeliste: 0,
  };

  for (const sf of superfanProfiles) {
    const tier = classifyEngagement(sf.engagementDepth);
    tierCounts[tier]++;
  }

  // Boost tiers based on mission completion
  const activeCreators = new Set(missions.map((m) => m.assigneeId).filter(Boolean));
  tierCounts.engage += activeCreators.size;

  // High-quality reviews indicate ambassador-level devotion
  const highQualityReviews = reviews.filter((r) => r.overallScore >= 80);
  tierCounts.ambassadeur += Math.floor(highQualityReviews.length / 3);

  // Positive signals boost interesse/participant tiers
  const recentSignals = signals.length;
  tierCounts.interesse += Math.floor(recentSignals / 5);

  // Community health boosts: high activeRate suggests more participants
  const latestCommunity = communitySnapshots[0];
  if (latestCommunity) {
    const communityBoost = Math.floor(latestCommunity.size * latestCommunity.activeRate / 100);
    tierCounts.participant += communityBoost;
  }

  // Total audience
  const totalAudience = Object.values(tierCounts).reduce((sum, v) => sum + v, 0) || 1;

  // Distribution as percentages
  const distribution: DevotionDistribution = {
    spectateur: Math.round((tierCounts.spectateur / totalAudience) * 100),
    interesse: Math.round((tierCounts.interesse / totalAudience) * 100),
    participant: Math.round((tierCounts.participant / totalAudience) * 100),
    engage: Math.round((tierCounts.engage / totalAudience) * 100),
    ambassadeur: Math.round((tierCounts.ambassadeur / totalAudience) * 100),
    evangeliste: Math.round((tierCounts.evangeliste / totalAudience) * 100),
  };

  // Weighted devotion score (higher tiers contribute more)
  const rawScore =
    (tierCounts.spectateur * TIER_WEIGHTS.spectateur +
     tierCounts.interesse * TIER_WEIGHTS.interesse +
     tierCounts.participant * TIER_WEIGHTS.participant +
     tierCounts.engage * TIER_WEIGHTS.engage +
     tierCounts.ambassadeur * TIER_WEIGHTS.ambassadeur +
     tierCounts.evangeliste * TIER_WEIGHTS.evangeliste) /
    Math.max(1, totalAudience) * 100;

  const score = Math.min(100, Math.round(rawScore));

  // Momentum: compare with previous snapshot
  let momentum: "rising" | "stable" | "declining" = "stable";
  if (previousSnapshot) {
    const prevScore = previousSnapshot.devotionScore;
    if (score > prevScore + 3) momentum = "rising";
    else if (score < prevScore - 3) momentum = "declining";
  }

  // Top contributors (highest engagementDepth superfan profiles)
  const topContributors = [...superfanProfiles]
    .sort((a, b) => b.engagementDepth - a.engagementDepth)
    .slice(0, 5)
    .map((sf) => ({
      profileId: sf.id,
      handle: sf.handle,
      platform: sf.platform,
      segment: sf.segment,
      engagementDepth: sf.engagementDepth,
    }));

  return { totalAudience, distribution, score, momentum, topContributors };
}

/**
 * Calculate and persist a devotion snapshot
 */
export async function calculateAndSnapshot(
  strategyId: string,
  trigger = "engine"
): Promise<string> {
  const metrics = await calculateDevotion(strategyId);

  const snapshot = await db.devotionSnapshot.create({
    data: {
      strategyId,
      spectateur: metrics.distribution.spectateur,
      interesse: metrics.distribution.interesse,
      participant: metrics.distribution.participant,
      engage: metrics.distribution.engage,
      ambassadeur: metrics.distribution.ambassadeur,
      evangeliste: metrics.distribution.evangeliste,
      devotionScore: metrics.score,
      trigger,
    },
  });

  return snapshot.id;
}

/**
 * Get devotion trend over time (last N snapshots)
 */
export async function getDevotionTrend(
  strategyId: string,
  periods = 6
): Promise<Array<{ date: string; score: number; distribution: DevotionDistribution }>> {
  const snapshots = await db.devotionSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: periods,
  });

  return snapshots.reverse().map((s) => ({
    date: s.measuredAt.toISOString(),
    score: s.devotionScore,
    distribution: {
      spectateur: s.spectateur,
      interesse: s.interesse,
      participant: s.participant,
      engage: s.engage,
      ambassadeur: s.ambassadeur,
      evangeliste: s.evangeliste,
    },
  }));
}

/**
 * Calculate momentum across all strategies (useful for dashboards)
 */
export async function getBulkMomentum(
  strategyIds: string[]
): Promise<Record<string, "rising" | "stable" | "declining">> {
  const snapshots = await db.devotionSnapshot.findMany({
    where: { strategyId: { in: strategyIds } },
    orderBy: { measuredAt: "desc" },
  });

  const result: Record<string, "rising" | "stable" | "declining"> = {};

  for (const id of strategyIds) {
    const stratSnapshots = snapshots.filter((s) => s.strategyId === id);
    if (stratSnapshots.length < 2) {
      result[id] = "stable";
      continue;
    }
    const latest = stratSnapshots[0]!.devotionScore;
    const previous = stratSnapshots[1]!.devotionScore;
    if (latest > previous + 3) result[id] = "rising";
    else if (latest < previous - 3) result[id] = "declining";
    else result[id] = "stable";
  }

  return result;
}
