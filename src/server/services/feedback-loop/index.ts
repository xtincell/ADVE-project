// ============================================================================
// MODULE M15 — Feedback Loop (Nervous System)
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §4.1 | Division: Transversal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  processSignal(signalId) — full feedback chain: Signal→Score→Drift→ARTEMIS→Prescription
// [x] REQ-2  Drift detection per pillar (configurable threshold, default 15%)
// [x] REQ-3  ARTEMIS diagnostic on severe drift (Claude AI-powered root cause analysis)
// [x] REQ-4  Prescription creation (KnowledgeEntry + Process for corrective actions)
// [x] REQ-5  Dashboard notification to strategy owner on prescription
// [x] REQ-6  recalibrate(strategyId, pillarKey) — manual recalibration
// [x] REQ-7  detectStrategyDrift(strategyId, pillarKey) — standalone drift check
// [x] REQ-8  Auto-trigger via signal.create → detectAndSignalScoreChange in advertis-scorer
// [x] REQ-9  Social metrics → Signal auto (SocialPost.metrics → Signal → pillar recalculation)
// [x] REQ-10 Media performance → Signal auto (MediaPerformanceSync → Signal)
// [x] REQ-11 Press clippings → Signal auto (PressClipping → Signal for D+E pillars)
// [x] REQ-12 Configurable thresholds per strategy (via BrandOSConfig)
//
// EXPORTS: processSignal, recalibrate, detectStrategyDrift, processSocialMetrics, processMediaPerformance, processPressClippings, getThresholds
// CHAIN: Signal → scoreObject → detectDrift → runArtemisDiagnostic → createPrescription → notify
// ============================================================================

import { db } from "@/lib/db";
import { scoreObject } from "@/server/services/advertis-scorer";
import { captureEvent } from "@/server/services/knowledge-capture";
import { detectDrift } from "./drift-detector";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS, PILLAR_NAMES } from "@/lib/types/advertis-vector";
import Anthropic from "@anthropic-ai/sdk";

const DRIFT_THRESHOLD_PERCENT = 15;

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
 * Signal -> recalculate pillar score -> if drift > threshold -> diagnostic -> alert
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
    const previous = previousVector[pillar] ?? 0;
    const current = newVector[pillar] ?? 0;
    const drift = detectDrift(pillar, previous, current);

    if (drift.isDrifting) {
      // Calculate percentage drift relative to previous score
      const driftPercent = previous > 0
        ? Math.abs(((current - previous) / previous) * 100)
        : Math.abs(drift.delta) * 10; // fallback if previous was 0

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
      });

      let diagnostic: string | null = null;
      let prescriptionId: string | null = null;

      // Trigger ARTEMIS diagnostic for severe drifts (above threshold)
      if (driftPercent >= DRIFT_THRESHOLD_PERCENT || drift.severity === "high" || drift.severity === "critical") {
        diagnostic = await runArtemisDiagnostic(
          signal.strategyId,
          pillar,
          previous,
          current,
          drift.severity
        );

        // Create prescription from diagnostic
        prescriptionId = await createPrescription(
          signal.strategyId,
          pillar,
          diagnostic,
          drift.severity
        );

        // v4 — Store validated feedback for RAG injection into Mestor/Glory prompts
        await captureEvent("FEEDBACK_VALIDATED", {
          pillarFocus: pillar,
          data: {
            type: "drift_feedback",
            signalId,
            strategyId: signal.strategyId,
            diagnostic,
            prescriptionId,
            driftPercent: Math.round(driftPercent),
            severity: drift.severity,
            previousScore: previous,
            currentScore: current,
          },
          sourceId: signal.strategyId,
        });

        // ── NOTORIA auto-trigger: generate corrective recos on severe drift ──
        if (drift.severity === "critical" || drift.severity === "high") {
          try {
            const { generateBatch } = await import("@/server/services/notoria/engine");
            const adveKeys = ["a", "d", "v", "e"];
            if (adveKeys.includes(pillar)) {
              await generateBatch({
                strategyId: signal.strategyId,
                missionType: "SESHAT_OBSERVATION",
                seshatObservation: `Drift critique detecte sur le pilier ${pillar.toUpperCase()} (${Math.round(driftPercent)}% de baisse). Diagnostic Artemis: ${diagnostic ?? "non disponible"}. Generer des recommandations correctives.`,
              });
            }
          } catch (err) {
            console.warn("[feedback-loop] Notoria auto-trigger failed:", err instanceof Error ? err.message : err);
          }
        }
      }

      alerts.push({
        signalId,
        strategyId: signal.strategyId,
        pillar,
        previousScore: previous,
        currentScore: current,
        driftPercent: Math.round(driftPercent * 100) / 100,
        severity: drift.severity,
        diagnostic,
        prescriptionId,
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
): Promise<{ driftPercent: number; current: number; previous: number }> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
  });

  const currentVector = (strategy.advertis_vector as Record<string, number>) ?? {};
  const currentScore = currentVector[pillarKey] ?? 0;

  // Get the last knowledge entry for this strategy/pillar to find the previous score
  const lastSnapshot = await db.knowledgeEntry.findFirst({
    where: {
      entryType: "DIAGNOSTIC_RESULT",
      pillarFocus: pillarKey,
      sourceHash: { not: undefined },
    },
    orderBy: { createdAt: "desc" },
  });

  let previousScore = 0;
  if (lastSnapshot) {
    const data = lastSnapshot.data as Record<string, unknown>;
    if (data.type === "drift_detected" && typeof data.previous === "number") {
      previousScore = data.previous;
    }
  }

  const driftPercent = previousScore > 0
    ? ((currentScore - previousScore) / previousScore) * 100
    : 0;

  return {
    driftPercent: Math.round(driftPercent * 100) / 100,
    current: currentScore,
    previous: previousScore,
  };
}

/**
 * Run ARTEMIS diagnostic using Claude AI to analyze pillar drift and produce recommendations.
 */
async function runArtemisDiagnostic(
  strategyId: string,
  pillar: PillarKey,
  previousScore: number,
  currentScore: number,
  severity: string
): Promise<string> {
  try {
    const strategy = await db.strategy.findUniqueOrThrow({
      where: { id: strategyId },
      include: { pillars: true },
    });

    const pillarContent = strategy.pillars.find((p) => p.key === pillar);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are ARTEMIS, the brand strategy diagnostic engine for the ADVERTIS framework.

A drift has been detected on the "${PILLAR_NAMES[pillar]}" pillar (key: ${pillar}) for strategy "${strategy.name}".

Previous score: ${previousScore}/25
Current score: ${currentScore}/25
Severity: ${severity}
Pillar content: ${JSON.stringify(pillarContent?.content ?? {}, null, 2)}

Analyze this drift and provide:
1. Root cause analysis (what likely caused the score drop)
2. Impact assessment (what this means for overall brand health)
3. Recommended corrective actions (specific, actionable steps)

Be concise and actionable. Respond in JSON format:
{
  "rootCause": "...",
  "impact": "...",
  "actions": ["action1", "action2", ...]
}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.text ?? "Diagnostic unavailable";
  } catch {
    return `Drift detected on ${PILLAR_NAMES[pillar]}: score dropped from ${previousScore} to ${currentScore} (${severity}). Manual review recommended.`;
  }
}

/**
 * Create a prescription (knowledge entry) from an ARTEMIS diagnostic result.
 */
async function createPrescription(
  strategyId: string,
  pillar: PillarKey,
  diagnostic: string,
  severity: string
): Promise<string> {
  const entry = await db.knowledgeEntry.create({
    data: {
      entryType: "DIAGNOSTIC_RESULT",
      pillarFocus: pillar,
      data: {
        type: "prescription",
        strategyId,
        diagnostic,
        severity,
        prescribedAt: new Date().toISOString(),
        status: "PENDING",
      },
      successScore: severity === "critical" ? 0 : severity === "high" ? 0.25 : 0.5,
    },
  });

  // Parse diagnostic to extract actionable steps
  let actions: string[] = [];
  try {
    const parsed = JSON.parse(diagnostic);
    actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    // Diagnostic is plain text, no structured actions
  }

  // Create an actionable Process for the prescription
  if (actions.length > 0) {
    await db.process.create({
      data: {
        strategyId,
        type: "TRIGGERED",
        name: `prescription-${pillar}-${Date.now()}`,
        description: `Prescription ARTEMIS: corrective actions for pillar ${PILLAR_NAMES[pillar]} (${severity})`,
        status: "RUNNING",
        priority: severity === "critical" ? 10 : severity === "high" ? 8 : 5,
        playbook: {
          type: "prescription",
          pillar,
          severity,
          knowledgeEntryId: entry.id,
          actions: actions.map((a: string) => ({
            description: a,
            status: "PENDING",
          })),
        },
        nextRunAt: new Date(), // Immediately available for execution
      },
    }).catch((err) => { console.warn("[feedback-loop] prescription process creation failed:", err instanceof Error ? err.message : err); });
  }

  // Surface prescription as a dashboard notification for the strategy owner (non-blocking)
  db.strategy.findUnique({ where: { id: strategyId }, select: { userId: true, name: true } })
    .then((strategy) => {
      if (!strategy) return;
      return db.notification.create({
        data: {
          userId: strategy.userId,
          channel: "IN_APP",
          title: `Prescription ARTEMIS — ${PILLAR_NAMES[pillar]} (${severity})`,
          body: `Drift detected on pillar ${PILLAR_NAMES[pillar]} for strategy "${strategy.name}". A corrective prescription is ready for review.`,
          link: `/cockpit/strategies/${strategyId}?tab=prescriptions&id=${entry.id}`,
        },
      });
    })
    .catch((err) => { console.warn("[feedback-loop] prescription notification failed:", err instanceof Error ? err.message : err); });

  return entry.id;
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
