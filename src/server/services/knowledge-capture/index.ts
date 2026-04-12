import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";

export type CaptureEventType =
  | "DIAGNOSTIC_RESULT"
  | "MISSION_OUTCOME"
  | "BRIEF_PATTERN"
  | "CREATOR_PATTERN"
  | "SECTOR_BENCHMARK"
  | "CAMPAIGN_TEMPLATE";

export interface CaptureContext {
  sector?: string;
  market?: string;
  channel?: string;
  pillarFocus?: string;
  businessModel?: string;
  data: Record<string, unknown>;
  successScore?: number;
  sourceId?: string; // Will be hashed for anonymization
}

/**
 * Passive knowledge capture service.
 * Called as a side-effect from other services to build the Knowledge Graph.
 * Runs from Phase 0 onwards.
 *
 * Entry points:
 *   captureEvent()         — generic event capture (any type)
 *   capturePillarChange()  — called by pillar-gateway on significant changes
 *   captureSignalOutcome() — called by feedback-loop on signal processing
 */

// ── Generic event capture ─────────────────────────────────────────────────

export async function captureEvent(
  type: CaptureEventType,
  context: CaptureContext,
  strategyId?: string,
): Promise<void> {
  try {
    const sourceHash = context.sourceId
      ? crypto.createHash("sha256").update(context.sourceId).digest("hex").substring(0, 16)
      : undefined;

    // Enrich with strategy metadata if strategyId provided
    let enrichedContext = context;
    if (strategyId && (!context.sector || !context.businessModel)) {
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { businessContext: true },
      });
      const bCtx = (strategy?.businessContext as Record<string, unknown>) ?? {};
      enrichedContext = {
        ...context,
        sector: context.sector ?? (bCtx.sector as string | undefined),
        market: context.market ?? (bCtx.market as string | undefined),
        businessModel: context.businessModel ?? (bCtx.businessModel as string | undefined),
      };
    }

    await db.knowledgeEntry.create({
      data: {
        entryType: type,
        sector: enrichedContext.sector,
        market: enrichedContext.market,
        channel: enrichedContext.channel,
        pillarFocus: enrichedContext.pillarFocus,
        businessModel: enrichedContext.businessModel,
        data: enrichedContext.data as Prisma.InputJsonValue,
        successScore: enrichedContext.successScore,
        sourceHash,
      },
    });
  } catch {
    // Knowledge capture is passive — never fail the parent operation
  }
}

// ── Pillar change capture ─────────────────────────────────────────────────
// Called by pillar-gateway when a significant change is detected.

export interface PillarDiff {
  addedFields: string[];
  modifiedFields: string[];
  removedFields: string[];
  significanceScore: number; // 0-1, how significant is this change
}

export async function capturePillarChange(
  strategyId: string,
  pillarKey: string,
  diff: PillarDiff,
): Promise<void> {
  // Only capture if the change is significant enough
  if (diff.significanceScore < 0.2) return;

  await captureEvent(
    "DIAGNOSTIC_RESULT",
    {
      pillarFocus: pillarKey,
      data: {
        changeType: "PILLAR_UPDATE",
        addedFields: diff.addedFields,
        modifiedFields: diff.modifiedFields,
        removedFields: diff.removedFields,
        significance: diff.significanceScore,
        timestamp: new Date().toISOString(),
      },
      successScore: diff.significanceScore,
      sourceId: strategyId,
    },
    strategyId,
  );
}

// ── Signal outcome capture ────────────────────────────────────────────────
// Called by feedback-loop when a signal is processed and its outcome is known.

export interface SignalOutcome {
  signalType: string;
  wasPositive: boolean;
  impactMetric?: number; // e.g. engagement delta, conversion change
  pillarAffected?: string;
  details?: Record<string, unknown>;
}

export async function captureSignalOutcome(
  signalId: string,
  outcome: SignalOutcome,
): Promise<void> {
  try {
    // Resolve strategy from signal
    const signal = await db.signal.findUnique({
      where: { id: signalId },
      select: { strategyId: true, type: true },
    });
    if (!signal) return;

    const successScore = outcome.wasPositive
      ? Math.min(1, 0.6 + (outcome.impactMetric ?? 0) * 0.4)
      : Math.max(0, 0.3 - (outcome.impactMetric ?? 0) * 0.3);

    await captureEvent(
      "MISSION_OUTCOME",
      {
        pillarFocus: outcome.pillarAffected,
        channel: outcome.signalType,
        data: {
          signalId,
          signalType: signal.type,
          outcome: outcome.wasPositive ? "POSITIVE" : "NEGATIVE",
          impactMetric: outcome.impactMetric,
          details: outcome.details ?? {},
          timestamp: new Date().toISOString(),
        },
        successScore,
        sourceId: signal.strategyId,
      },
      signal.strategyId,
    );

    // Update success scores on related KnowledgeEntries for ML ranking
    if (outcome.wasPositive && outcome.pillarAffected) {
      await updateRelatedSuccessScores(signal.strategyId, outcome.pillarAffected, successScore);
    }
  } catch {
    // Passive — never fail the parent operation
  }
}

// ── ML ranking helper ─────────────────────────────────────────────────────

async function updateRelatedSuccessScores(
  strategyId: string,
  pillarKey: string,
  newScore: number,
): Promise<void> {
  try {
    const sourceHash = crypto.createHash("sha256").update(strategyId).digest("hex").substring(0, 16);

    // Find recent entries for this strategy + pillar, apply exponential moving average
    const related = await db.knowledgeEntry.findMany({
      where: {
        sourceHash,
        pillarFocus: pillarKey,
        successScore: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const ALPHA = 0.3; // EMA weight for new observations
    for (const entry of related) {
      const current = entry.successScore ?? 0.5;
      const updated = ALPHA * newScore + (1 - ALPHA) * current;
      await db.knowledgeEntry.update({
        where: { id: entry.id },
        data: {
          successScore: Math.round(updated * 1000) / 1000,
          sampleSize: entry.sampleSize + 1,
        },
      });
    }
  } catch {
    // Non-blocking
  }
}
