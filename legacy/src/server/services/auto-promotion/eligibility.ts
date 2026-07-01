/**
 * src/server/services/auto-promotion/eligibility.ts — eligibility evaluation
 * pour les 3 résidus calendar-locked (cf. ADR-0040 + 0041 + 0042 + 0053).
 *
 * Pure functions : prennent metrics + dates en input, retournent EligibilityResult.
 * Aucune écriture DB.
 */

import { ALL_SEQUENCES } from "@/server/services/artemis/tools/sequences";
import {
  ANCHOR_DATES,
  CYCLE_THRESHOLDS,
  ELIGIBILITY_WINDOWS,
  type EligibilityResult,
} from "./types";
import {
  getSequenceMetrics,
  getQualityGateSoftMetrics,
  listDraftSequences,
} from "./metrics";
import { getQualityGateSoftWiredAt } from "./state";

function getStaticLifecycle(
  sequenceKey: string,
): "DRAFT" | "STABLE" | "DEPRECATED" | "UNKNOWN" {
  const seq = ALL_SEQUENCES.find((s) => s.key === sequenceKey);
  if (!seq) return "UNKNOWN";
  const lifecycle = (seq as { lifecycle?: unknown }).lifecycle;
  if (lifecycle === "DRAFT" || lifecycle === "STABLE" || lifecycle === "DEPRECATED") {
    return lifecycle;
  }
  return "UNKNOWN";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Evaluate DRAFT→STABLE eligibility for a single sequence.
 *
 * Conditions (ADR-0040 §Conséquences + ADR-0041 §4 + ADR-0042 §3) :
 *  1. age >= 30 jours depuis le mégasprint Phase 17a (anchor : 2026-05-04)
 *  2. totalExecutions >= 50
 *  3. recentQualityPassRate === 1.0 sur les 7 derniers jours
 *  4. staticLifecycle === "DRAFT" (sinon déjà promu ou inconnu)
 */
export async function evaluateSequencePromotion(
  sequenceKey: string,
): Promise<EligibilityResult> {
  const anchor = new Date(ANCHOR_DATES.PHASE_17A_MEGASPRINT_MERGE);
  const earliestEligible = new Date(
    anchor.getTime() + ELIGIBILITY_WINDOWS.SEQUENCE_DRAFT_TO_STABLE_DAYS * MS_PER_DAY,
  );
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - anchor.getTime()) / MS_PER_DAY);

  // Short-circuit : si lifecycle !== DRAFT, on n'a pas besoin de hit la DB
  // pour les metrics. Rejet immédiat avec raison claire.
  const staticLifecycle = getStaticLifecycle(sequenceKey);
  if (staticLifecycle !== "DRAFT") {
    return {
      itemKind: sequenceKey.startsWith("WRAP-FW-")
        ? "WRAPPER_DRAFT_TO_STABLE"
        : "SEQUENCE_DRAFT_TO_STABLE",
      itemId: sequenceKey,
      eligible: false,
      reasons: [`lifecycle === "${staticLifecycle}" (déjà promu ou inconnu — pas un candidat)`],
      metrics: { ageDays, staticLifecycle },
      anchorDate: anchor.toISOString(),
      earliestEligibleAt: earliestEligible.toISOString(),
    };
  }

  const metrics = await getSequenceMetrics(
    sequenceKey,
    CYCLE_THRESHOLDS.SEQUENCE_QUALITY_WINDOW_DAYS,
  );

  const reasons: string[] = [];
  let eligible = true;

  if (ageDays < ELIGIBILITY_WINDOWS.SEQUENCE_DRAFT_TO_STABLE_DAYS) {
    eligible = false;
    reasons.push(
      `age ${ageDays}d < ${ELIGIBILITY_WINDOWS.SEQUENCE_DRAFT_TO_STABLE_DAYS}d minimum (target ${earliestEligible.toISOString().slice(0, 10)})`,
    );
  }

  if (metrics.totalExecutions < CYCLE_THRESHOLDS.SEQUENCE_MIN_EXECUTIONS) {
    eligible = false;
    reasons.push(
      `totalExecutions ${metrics.totalExecutions} < ${CYCLE_THRESHOLDS.SEQUENCE_MIN_EXECUTIONS} required`,
    );
  }

  if (metrics.recentQualityPassRate === null) {
    eligible = false;
    reasons.push(
      `aucune exécution dans la fenêtre ${CYCLE_THRESHOLDS.SEQUENCE_QUALITY_WINDOW_DAYS}d (qualité non mesurable)`,
    );
  } else if (metrics.recentQualityPassRate < CYCLE_THRESHOLDS.SEQUENCE_MIN_QUALITY_PASS_RATE) {
    eligible = false;
    reasons.push(
      `recentQualityPassRate ${(metrics.recentQualityPassRate * 100).toFixed(1)}% < ${(CYCLE_THRESHOLDS.SEQUENCE_MIN_QUALITY_PASS_RATE * 100).toFixed(0)}% required`,
    );
  }

  return {
    itemKind: sequenceKey.startsWith("WRAP-FW-")
      ? "WRAPPER_DRAFT_TO_STABLE"
      : "SEQUENCE_DRAFT_TO_STABLE",
    itemId: sequenceKey,
    eligible,
    reasons: eligible ? ["all conditions met"] : reasons,
    metrics: {
      ageDays,
      totalExecutions: metrics.totalExecutions,
      recentExecutions: metrics.recentExecutions,
      recentQualityPassRate: metrics.recentQualityPassRate ?? 0,
      recentQualityFailures: metrics.recentQualityFailures,
      staticLifecycle: metrics.staticLifecycle,
    },
    anchorDate: anchor.toISOString(),
    earliestEligibleAt: earliestEligible.toISOString(),
  };
}

/**
 * Evaluate quality-gate soft→hard switch eligibility (global, single decision).
 *
 * Conditions (ADR-0041 §4) :
 *  1. age >= 7 jours depuis le wiring soft mode (anchor variable, cf. state.getQualityGateSoftWiredAt)
 *  2. falsePositiveRate < 1% (calibration data clean)
 *  3. totalRuns >= 50 (fenêtre suffisante)
 */
export async function evaluateQualityGateHardSwitch(): Promise<EligibilityResult> {
  const anchor = await getQualityGateSoftWiredAt();
  const earliestEligible = new Date(
    anchor.getTime() + ELIGIBILITY_WINDOWS.QUALITY_GATE_SOFT_TO_HARD_DAYS * MS_PER_DAY,
  );
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - anchor.getTime()) / MS_PER_DAY);

  const metrics = await getQualityGateSoftMetrics(
    ELIGIBILITY_WINDOWS.QUALITY_GATE_SOFT_TO_HARD_DAYS,
  );

  const reasons: string[] = [];
  let eligible = true;

  if (ageDays < ELIGIBILITY_WINDOWS.QUALITY_GATE_SOFT_TO_HARD_DAYS) {
    eligible = false;
    reasons.push(
      `age ${ageDays}d < ${ELIGIBILITY_WINDOWS.QUALITY_GATE_SOFT_TO_HARD_DAYS}d minimum (target ${earliestEligible.toISOString().slice(0, 10)})`,
    );
  }

  if (metrics.totalRuns < CYCLE_THRESHOLDS.SEQUENCE_MIN_EXECUTIONS) {
    eligible = false;
    reasons.push(
      `totalRuns ${metrics.totalRuns} < ${CYCLE_THRESHOLDS.SEQUENCE_MIN_EXECUTIONS} required`,
    );
  }

  if (metrics.falsePositiveRate === null) {
    // No failures in window — gate is silent. Either calibration is perfect
    // or no runs happened. Conservative : not eligible until we have data.
    if (metrics.totalRuns === 0) {
      eligible = false;
      reasons.push("aucune exécution dans la fenêtre (fp-rate non mesurable)");
    }
    // Else : 0 failures = 0 fp = eligible (par définition)
  } else if (
    metrics.falsePositiveRate >= CYCLE_THRESHOLDS.QUALITY_GATE_MAX_FALSE_POSITIVE_RATE
  ) {
    eligible = false;
    reasons.push(
      `falsePositiveRate ${(metrics.falsePositiveRate * 100).toFixed(2)}% >= ${(CYCLE_THRESHOLDS.QUALITY_GATE_MAX_FALSE_POSITIVE_RATE * 100).toFixed(2)}% threshold`,
    );
  }

  return {
    itemKind: "QUALITY_GATE_SOFT_TO_HARD",
    itemId: "global",
    eligible,
    reasons: eligible ? ["all conditions met"] : reasons,
    metrics: {
      ageDays,
      totalRuns: metrics.totalRuns,
      qualityFailures: metrics.qualityFailures,
      qualityFailuresOnStableSequences: metrics.qualityFailuresOnStableSequences,
      falsePositiveRate: metrics.falsePositiveRate ?? 0,
    },
    anchorDate: anchor.toISOString(),
    earliestEligibleAt: earliestEligible.toISOString(),
  };
}

/**
 * Evaluate ALL locked items at once. Used by the daily cron.
 */
export async function evaluateAllLockedItems(): Promise<EligibilityResult[]> {
  const draftSequences = listDraftSequences();
  const results: EligibilityResult[] = [];

  for (const seqKey of draftSequences) {
    results.push(await evaluateSequencePromotion(seqKey));
  }

  results.push(await evaluateQualityGateHardSwitch());

  return results;
}
