/**
 * Auto-Complete — Mestor-powered gap filling for GLORY sequences
 *
 * Uses actualizePillar() directly — ONE LLM call per pillar that merges
 * existing content with R+T insights to fill missing fields.
 *
 * Much simpler and faster than the old generate-recos → auto-accept flow.
 * Processes max 1 pillar per call to avoid HTTP timeout.
 */

import { actualizePillar } from "@/server/services/mestor/rtis-cascade";
import { scanSequence, type PreflightReport } from "./sequence-executor";
import type { GlorySequenceKey } from "./sequences";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutoCompleteResult {
  sequenceKey: GlorySequenceKey;
  gapsBefore: number;
  gapsAfter: number;
  pillarProcessed: string | null;
  gapsInPillar: number;
  status: "SUCCESS" | "SKIPPED" | "ERROR";
  error?: string;
  readinessAfter: number;
}

// ─── Auto-Complete ───────────────────────────────────────────────────────────

/**
 * Auto-complete missing pillar variables for a sequence.
 *
 * Picks the pillar with the MOST gaps and calls actualizePillar() on it.
 * This is a single LLM call that enriches the pillar content using R+T insights.
 *
 * Processes 1 pillar per call to stay under HTTP timeout (~20s).
 * User clicks multiple times to progressively fill all pillars.
 */
export async function autoCompleteGaps(
  strategyId: string,
  sequenceKey: GlorySequenceKey,
): Promise<AutoCompleteResult> {
  // 1. Scan to get current gaps
  const scan = await scanSequence(sequenceKey, strategyId);
  if (scan.gaps.length === 0) {
    return {
      sequenceKey, gapsBefore: 0, gapsAfter: 0,
      pillarProcessed: null, gapsInPillar: 0,
      status: "SKIPPED", readinessAfter: scan.readiness,
    };
  }

  // 2. Group gaps by pillar, pick the one with most gaps
  const gapsByPillar: Record<string, number> = {};
  for (const gap of scan.gaps) {
    const pillarKey = gap.path.split(".")[0]!;
    gapsByPillar[pillarKey] = (gapsByPillar[pillarKey] ?? 0) + 1;
  }

  const [targetPillar, gapCount] = Object.entries(gapsByPillar)
    .sort(([, a], [, b]) => b - a)[0]!;

  // 3. Actualize that pillar — single LLM call
  console.log(`[auto-complete] Actualizing pillar ${targetPillar.toUpperCase()} for ${sequenceKey} (${gapCount} gaps)...`);

  try {
    const result = await actualizePillar(strategyId, targetPillar.toUpperCase() as "A" | "D" | "E" | "V" | "I" | "T" | "R" | "S");

    if (!result.updated) {
      // Re-scan anyway — maybe the error message is informative
      const scanAfter = await scanSequence(sequenceKey, strategyId);
      return {
        sequenceKey, gapsBefore: scan.gaps.length, gapsAfter: scanAfter.gaps.length,
        pillarProcessed: targetPillar.toUpperCase(), gapsInPillar: gapCount,
        status: "ERROR", error: result.error ?? "Actualization failed",
        readinessAfter: scanAfter.readiness,
      };
    }

    // 4. Re-scan to get updated readiness
    const scanAfter = await scanSequence(sequenceKey, strategyId);
    console.log(`[auto-complete] ${targetPillar.toUpperCase()} done. Readiness: ${scan.readiness}% → ${scanAfter.readiness}%`);

    return {
      sequenceKey, gapsBefore: scan.gaps.length, gapsAfter: scanAfter.gaps.length,
      pillarProcessed: targetPillar.toUpperCase(), gapsInPillar: gapCount,
      status: "SUCCESS", readinessAfter: scanAfter.readiness,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[auto-complete] Error actualizing ${targetPillar.toUpperCase()}:`, msg);

    const scanAfter = await scanSequence(sequenceKey, strategyId);
    return {
      sequenceKey, gapsBefore: scan.gaps.length, gapsAfter: scanAfter.gaps.length,
      pillarProcessed: targetPillar.toUpperCase(), gapsInPillar: gapCount,
      status: "ERROR", error: msg, readinessAfter: scanAfter.readiness,
    };
  }
}
