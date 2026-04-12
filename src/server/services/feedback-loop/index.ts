// ============================================================================
// MODULE M15 — Feedback Loop (Nervous System)
// Score: 65/100 | Priority: P0 | Status: FUNCTIONAL
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
// [ ] REQ-9  Social metrics → Signal auto (SocialPost.metrics → Signal → pillar recalculation)
// [ ] REQ-10 Media performance → Signal auto (MediaPerformanceSync → Signal)
// [ ] REQ-11 Press clippings → Signal auto (PressClipping → Signal for D+E pillars)
// [ ] REQ-12 Configurable thresholds per strategy (via SystemConfig)
//
// EXPORTS: processSignal, recalibrate, detectStrategyDrift
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
