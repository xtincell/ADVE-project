/**
 * Auto-Complete — Mestor-powered gap filling for GLORY sequences
 *
 * When a sequence scan reveals missing pillar variables, this module
 * uses Mestor to auto-generate the missing values:
 *
 *   ADVE pillars (A/D/V/E) → generateADVERecommendations + auto-accept gaps
 *   RTIS pillars (R/T/I/S) → actualizePillar (re-run cascade for that pillar)
 *
 * The operator can review after the fact — values are in pendingRecos audit trail.
 */

import {
  generateADVERecommendations,
  applyAcceptedRecommendations,
  actualizePillar,
} from "@/server/services/mestor/rtis-cascade";
import { scanSequence, type PreflightReport } from "./sequence-executor";
import type { GlorySequenceKey } from "./sequences";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutoCompleteResult {
  sequenceKey: GlorySequenceKey;
  /** Total gaps before auto-complete */
  gapsBefore: number;
  /** Gaps remaining after (couldn't fill) */
  gapsAfter: number;
  /** Fields auto-filled per pillar */
  filled: Array<{ pillar: string; field: string; source: "MESTOR_RECO" | "RTIS_CASCADE" }>;
  /** Errors encountered */
  errors: string[];
  /** New readiness % after auto-complete */
  readinessAfter: number;
}

// ─── Auto-Complete ───────────────────────────────────────────────────────────

/**
 * Auto-complete missing pillar variables for a sequence using Mestor.
 *
 * For ADVE gaps: generates recommendations via R+T insights, then auto-accepts
 * the fields that match the scan gaps.
 *
 * For RTIS gaps: re-runs the cascade for that specific pillar.
 */
export async function autoCompleteGaps(
  strategyId: string,
  sequenceKey: GlorySequenceKey,
): Promise<AutoCompleteResult> {
  // 1. Scan to get current gaps
  const scan = await scanSequence(sequenceKey, strategyId);
  if (scan.gaps.length === 0) {
    return {
      sequenceKey,
      gapsBefore: 0,
      gapsAfter: 0,
      filled: [],
      errors: [],
      readinessAfter: scan.readiness,
    };
  }

  // 2. Group gaps by pillar
  const gapsByPillar: Record<string, string[]> = {};
  for (const gap of scan.gaps) {
    const pillarKey = gap.path.split(".")[0]!;
    if (!gapsByPillar[pillarKey]) gapsByPillar[pillarKey] = [];
    // Extract the field name (first level after pillar key)
    const fieldPath = gap.path.split(".").slice(1).join(".");
    const topField = gap.path.split(".")[1]!; // Top-level field for accept
    gapsByPillar[pillarKey].push(topField);
  }

  const filled: AutoCompleteResult["filled"] = [];
  const errors: string[] = [];

  // 3. Process ADVE pillars — generate recos + auto-accept gap fields
  const advePillars = ["a", "d", "v", "e"] as const;
  for (const pillarKey of advePillars) {
    const gapFields = gapsByPillar[pillarKey];
    if (!gapFields || gapFields.length === 0) continue;

    const upperKey = pillarKey.toUpperCase() as "A" | "D" | "V" | "E";

    try {
      // Generate recommendations from Mestor (uses R+T insights)
      const recoResult = await generateADVERecommendations(strategyId, upperKey);

      if (recoResult.error) {
        errors.push(`${upperKey}: ${recoResult.error}`);
        continue;
      }

      if (recoResult.recommendations.length === 0) {
        errors.push(`${upperKey}: Mestor n'a pas pu generer de recommandations`);
        continue;
      }

      // Auto-accept only the fields that are in the gap list
      const recoFields = recoResult.recommendations.map((r) => r.field);
      const fieldsToAccept = [...new Set(gapFields)].filter((f) => recoFields.includes(f));

      if (fieldsToAccept.length > 0) {
        const applyResult = await applyAcceptedRecommendations(strategyId, upperKey, fieldsToAccept);
        if (applyResult.error) {
          errors.push(`${upperKey} apply: ${applyResult.error}`);
        } else {
          for (const field of fieldsToAccept) {
            filled.push({ pillar: upperKey, field, source: "MESTOR_RECO" });
          }
        }
      }
    } catch (err) {
      errors.push(`${upperKey}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Process RTIS pillars — re-actualize via cascade
  const rtisPillars = ["r", "t", "i", "s"] as const;
  for (const pillarKey of rtisPillars) {
    const gapFields = gapsByPillar[pillarKey];
    if (!gapFields || gapFields.length === 0) continue;

    try {
      const result = await actualizePillar(strategyId, pillarKey.toUpperCase());
      if (result.updated) {
        for (const field of [...new Set(gapFields)]) {
          filled.push({ pillar: pillarKey.toUpperCase(), field, source: "RTIS_CASCADE" });
        }
      } else if (result.error) {
        errors.push(`${pillarKey.toUpperCase()}: ${result.error}`);
      }
    } catch (err) {
      errors.push(`${pillarKey.toUpperCase()}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Re-scan to get updated readiness
  const scanAfter = await scanSequence(sequenceKey, strategyId);

  return {
    sequenceKey,
    gapsBefore: scan.gaps.length,
    gapsAfter: scanAfter.gaps.length,
    filled,
    errors,
    readinessAfter: scanAfter.readiness,
  };
}
