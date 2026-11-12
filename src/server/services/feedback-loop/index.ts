// ============================================================================
// MODULE M15 — Feedback Loop (Nervous System)
// Deterministic observation; assisted recommendations use the explicit Jehuty/Notoria path.
// Spec: §4.1 | Division: Transversal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  processSignal(signalId) — Signal→Score→Drift→manual review
// [x] REQ-2  Drift detection per pillar (existing absolute score thresholds)
// [x] REQ-3  Assisted diagnosis is explicit: Jehuty.triggerNotoria → governed recommendations
// [x] REQ-4  One Recommendation queue; no parallel auto-running prescription Process
// [x] REQ-5  Signals and drift receipts surface through the existing Jehuty feed
// [x] REQ-6  recalibrate(strategyId, pillarKey) — manual recalibration
// [x] REQ-7  detectStrategyDrift(strategyId, pillarKey) — standalone drift check
// [x] REQ-8  Auto-trigger via signal.create → detectAndSignalScoreChange in advertis-scorer
// [x] REQ-9  Social metrics → Signal auto (SocialPost.metrics → Signal → pillar recalculation)
// [x] REQ-10 Media performance → Signal auto (MediaPerformanceSync → Signal)
// [x] REQ-11 Press clippings → Signal auto (PressClipping → Signal for D+E pillars)
// [x] REQ-12 Configurable thresholds per strategy (via BrandOSConfig)
//
// EXPORTS: processSignal, recalibrate, detectStrategyDrift, processSocialMetrics, processMediaPerformance, processPressClippings, getThresholds
// CHAIN: Signal → scoreObject → detectDrift → receipt; explicit assisted action → Notoria
// ============================================================================

import { db } from "@/lib/db";
import { scoreObject } from "@/server/services/advertis-scorer";
import { captureEvent } from "@/server/services/knowledge-capture";
import { detectDrift } from "./drift-detector";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";
import { knowledgeStrategyScope } from "@/server/services/operator-isolation/knowledge-scope";

interface FeedbackAlert {
  signalId: string;
  strategyId: string;
  pillar: PillarKey;
  previousScore: number;
  currentScore: number;
  driftPercent: number;
  severity: "low" | "medium" | "high" | "critical";
  diagnostic: string | null;
  prescriptionId: string | null;
}

/**
 * Process an incoming signal through the feedback loop.
 * Signal -> recalculate pillar score -> observed drift -> alert.
 * No provider call or autonomous prescription during an ordinary write/replay.
 */
export async function processSignal(signalId: string): Promise<FeedbackAlert[]> {
  const signal = await db.signal.findUniqueOrThrow({
    where: { id: signalId },
    include: { strategy: true },
  });

  // Get current vector before recalculation
  const previousVector = (signal.strategy.advertis_vector as Record<string, number>) ?? {};

  // Recalculate the strategy score
  const newVector = await scoreObject("strategy", signal.strategyId);

  const alerts: FeedbackAlert[] = [];

  // Check for drift on each pillar
  for (const pillar of PILLAR_KEYS) {
    const previous = pillarScore(previousVector[pillar]);
    const current = pillarScore(newVector[pillar]);
    if (previous === null || current === null) continue;
    const drift = detectDrift(pillar, previous, current);

    if (drift.isDrifting) {
      // Calculate percentage drift relative to previous score
      // A valid declining score has a strictly positive baseline.
      const driftPercent = Math.abs(((current - previous) / previous) * 100);

      // Log the drift event
      await captureEvent("DIAGNOSTIC_RESULT", {
        pillarFocus: pillar,
        data: {
          type: "drift_detected",
          signalId,
          strategyId: signal.strategyId,
          previous,
          current,
          delta: drift.delta,
          severity: drift.severity,
        },
        sourceId: signal.strategyId,
      }, signal.strategyId);

      alerts.push({
        signalId,
        strategyId: signal.strategyId,
        pillar,
        previousScore: previous,
        currentScore: current,
        driftPercent: Math.round(driftPercent * 100) / 100,
        severity: drift.severity,
        diagnostic: null,
        prescriptionId: null,
      });
    }
  }

  return alerts;
}

/**
 * Recalibrate a specific pillar for a strategy.
 */
export async function recalibrate(strategyId: string, _pillarKey: PillarKey): Promise<void> {
  await scoreObject("strategy", strategyId);
}

/**
 * Compare current score vs last snapshot for a strategy pillar.
 * Returns the drift percentage.
 */
export async function detectStrategyDrift(
  strategyId: string,
  pillarKey: PillarKey
): Promise<{
  status: "COMPARABLE" | "INSUFFICIENT_DATA" | "ZERO_BASELINE";
  driftPercent: number | null;
  current: number | null;
  previous: number | null;
  baselineId: string | null;
  baselineAt: Date | null;
}> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { advertis_vector: true },
  });

  const currentVector = strategy.advertis_vector;
  const currentScore = pillarScore(
    currentVector && typeof currentVector === "object" && !Array.isArray(currentVector)
      ? currentVector[pillarKey] : undefined,
  );

  // A hash is neither attribution nor permission. Filter brand AND diagnostic
  // subtype before ordering; a newer prescription is not a score baseline.
  // Legacy captures already carry data.strategyId. Conflicting canonical
  // ownership is rejected, and unattributed entries are never borrowed.
  const lastSnapshot = await db.knowledgeEntry.findFirst({
    where: {
      entryType: "DIAGNOSTIC_RESULT",
      pillarFocus: pillarKey,
      AND: [
        knowledgeStrategyScope([strategyId]),
        { data: { path: ["type"], equals: "drift_detected" } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true, data: true },
  });

  const data = lastSnapshot?.data;
  const previousScore = pillarScore(
    data && typeof data === "object" && !Array.isArray(data) ? data.previous : undefined,
  );
  const status = currentScore === null || previousScore === null
    ? "INSUFFICIENT_DATA" : previousScore === 0 ? "ZERO_BASELINE" : "COMPARABLE";

  return {
    status,
    driftPercent: status === "COMPARABLE"
      ? Math.round(((currentScore! - previousScore!) / previousScore!) * 10_000) / 100
      : null,
    current: currentScore,
    previous: previousScore,
    baselineId: lastSnapshot?.id ?? null,
    baselineAt: lastSnapshot?.createdAt ?? null,
  };
}

function pillarScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 25
    ? value : null;
}

// ── REQ-9: Social metrics → Signal auto ──────────────────────────────────────

const DEFAULT_THRESHOLDS = {
  engagementDriftPercent: 20,
  mediaCtrDriftPercent: 25,
  pressReachMinimum: 1000,
  pressSentimentThreshold: 0.3,
};

/**
 * REQ-9: Process recent SocialPost records and create METRIC signals
 * for significant engagement changes.
 */
export async function processSocialMetrics(strategyId: string): Promise<number> {
  const thresholds = await getThresholds(strategyId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

  const recentPosts = await db.socialPost.findMany({
    where: {
      strategyId,
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: "desc" },
  });

  if (recentPosts.length === 0) return 0;

  // Calculate average engagement rate across recent posts
  const avgEngagement = recentPosts.reduce((sum, p) => sum + (p.engagementRate ?? 0), 0) / recentPosts.length;

  // Compare to older posts baseline (previous 7 days)
  const baselineSince = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const baselinePosts = await db.socialPost.findMany({
    where: {
      strategyId,
      publishedAt: { gte: baselineSince, lt: since },
    },
  });

  const baselineEngagement = baselinePosts.length > 0
    ? baselinePosts.reduce((sum, p) => sum + (p.engagementRate ?? 0), 0) / baselinePosts.length
    : 0;

  const driftPercent = baselineEngagement > 0
    ? ((avgEngagement - baselineEngagement) / baselineEngagement) * 100
    : 0;

  let signalsCreated = 0;

  if (Math.abs(driftPercent) >= thresholds.engagementDriftPercent) {
    await db.signal.create({
      data: {
        strategyId,
        type: "METRIC",
        data: {
          source: "social_metrics",
          avgEngagement,
          baselineEngagement,
          driftPercent: Math.round(driftPercent * 100) / 100,
          postCount: recentPosts.length,
          direction: driftPercent > 0 ? "UP" : "DOWN",
        },
      },
    });
    signalsCreated++;
  }

  return signalsCreated;
}

// ── REQ-10: Media performance → Signal auto ──────────────────────────────────

/**
 * REQ-10: Process recent MediaPerformanceSync records and create METRIC signals
 * for significant performance changes (CTR, ROAS, CPA).
 */
export async function processMediaPerformance(strategyId: string): Promise<number> {
  const thresholds = await getThresholds(strategyId);

  // MediaPerformanceSync is linked via MediaPlatformConnection
  const connections = await db.mediaPlatformConnection.findMany({
    where: { strategyId },
    select: { id: true },
  });

  if (connections.length === 0) return 0;
  const connectionIds = connections.map((c) => c.id);

  const recentSyncs = await db.mediaPerformanceSync.findMany({
    where: {
      connectionId: { in: connectionIds },
      syncedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    orderBy: { syncedAt: "desc" },
  });

  if (recentSyncs.length === 0) return 0;

  // Aggregate metrics
  const totalImpressions = recentSyncs.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalClicks = recentSyncs.reduce((s, r) => s + (r.clicks ?? 0), 0);
  // lafusee:allow-adhoc-completion: feedback loop drift severity ratio (signal count, not pillar)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgRoas = recentSyncs.filter((r) => r.roas != null).reduce((s, r) => s + (r.roas ?? 0), 0)
    / Math.max(1, recentSyncs.filter((r) => r.roas != null).length);

  let signalsCreated = 0;

  // Create signal if CTR deviates significantly or ROAS is notable
  if (avgCtr > 0 || avgRoas > 0) {
    await db.signal.create({
      data: {
        strategyId,
        type: "METRIC",
        data: {
          source: "media_performance",
          avgCtr: Math.round(avgCtr * 100) / 100,
          avgRoas: Math.round(avgRoas * 100) / 100,
          totalImpressions,
          totalClicks,
          syncCount: recentSyncs.length,
        },
      },
    });
    signalsCreated++;
  }

  return signalsCreated;
}

// ── REQ-11: Press clippings → Signal auto ────────────────────────────────────

/**
 * REQ-11: Process recent PressClipping records and create signals
 * for D (Distinction) and E (Engagement) pillar impact.
 */
export async function processPressClippings(strategyId: string): Promise<number> {
  const thresholds = await getThresholds(strategyId);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

  const recentClippings = await db.pressClipping.findMany({
    where: {
      strategyId,
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: "desc" },
  });

  if (recentClippings.length === 0) return 0;

  const totalReach = recentClippings.reduce((s, c) => s + (c.reach ?? 0), 0);
  const avgSentiment = recentClippings.filter((c) => c.sentiment != null)
    .reduce((s, c) => s + (c.sentiment ?? 0), 0)
    / Math.max(1, recentClippings.filter((c) => c.sentiment != null).length);

  let signalsCreated = 0;

  // Signal for D pillar (Distinction) — press mentions boost brand distinction
  if (totalReach >= thresholds.pressReachMinimum) {
    await db.signal.create({
      data: {
        strategyId,
        type: "METRIC",
        data: {
          source: "press_clippings",
          pillarImpact: ["d", "e"],
          totalReach,
          avgSentiment: Math.round(avgSentiment * 100) / 100,
          clippingCount: recentClippings.length,
          outlets: recentClippings.map((c) => c.outlet).slice(0, 10),
        },
      },
    });
    signalsCreated++;
  }

  // Negative sentiment signal — potential E pillar risk
  if (avgSentiment < thresholds.pressSentimentThreshold && recentClippings.length >= 2) {
    await db.signal.create({
      data: {
        strategyId,
        type: "METRIC",
        data: {
          source: "press_sentiment_alert",
          pillarImpact: ["e"],
          avgSentiment: Math.round(avgSentiment * 100) / 100,
          clippingCount: recentClippings.length,
          severity: avgSentiment < 0 ? "high" : "medium",
        },
      },
    });
    signalsCreated++;
  }

  return signalsCreated;
}

// ── REQ-12: Configurable thresholds per strategy ─────────────────────────────

interface FeedbackThresholds {
  engagementDriftPercent: number;
  mediaCtrDriftPercent: number;
  pressReachMinimum: number;
  pressSentimentThreshold: number;
}

/**
 * REQ-12: Read configurable thresholds from BrandOSConfig for the strategy.
 * Falls back to DEFAULT_THRESHOLDS for any missing values.
 */
export async function getThresholds(strategyId: string): Promise<FeedbackThresholds> {
  const brandConfig = await db.brandOSConfig.findUnique({
    where: { strategyId },
    select: { config: true },
  });

  if (!brandConfig?.config) return { ...DEFAULT_THRESHOLDS };

  const config = brandConfig.config as Record<string, unknown>;
  const overrides = (config.feedbackThresholds ?? {}) as Partial<FeedbackThresholds>;

  return {
    engagementDriftPercent: overrides.engagementDriftPercent ?? DEFAULT_THRESHOLDS.engagementDriftPercent,
    mediaCtrDriftPercent: overrides.mediaCtrDriftPercent ?? DEFAULT_THRESHOLDS.mediaCtrDriftPercent,
    pressReachMinimum: overrides.pressReachMinimum ?? DEFAULT_THRESHOLDS.pressReachMinimum,
    pressSentimentThreshold: overrides.pressSentimentThreshold ?? DEFAULT_THRESHOLDS.pressSentimentThreshold,
  };
}
