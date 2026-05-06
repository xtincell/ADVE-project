/**
 * src/server/services/auto-promotion/index.ts — public API.
 *
 * Module qui évalue automatiquement les conditions de promotion des
 * 3 résidus calendar-locked (DRAFT→STABLE sequences/wrappers, quality-gate
 * soft→hard) et émet les Intents de promotion quand toutes les conditions
 * sont satisfaites (temps + cycle + qualité).
 *
 * Triggers :
 *  - Cron daily : `/api/cron/auto-promotion` (idempotent, dry-run-safe)
 *  - Manuel (admin) : tRPC `governance.autoPromoteEvaluate`
 *  - Auto-test : appel direct depuis tests
 *
 * Le module respecte ADR-0040+0041+0042 strictement : pas de force-promotion.
 * Cf. ADR-0067 pour la décision architecturale.
 */

import {
  evaluateAllLockedItems,
  evaluateSequencePromotion,
  evaluateQualityGateHardSwitch,
} from "./eligibility";
import { promoteSequence, toggleQualityGateMode } from "./actions";
import type { AutoPromotionRunResult, PromotionDecision } from "./types";

export {
  evaluateAllLockedItems,
  evaluateSequencePromotion,
  evaluateQualityGateHardSwitch,
} from "./eligibility";
export { promoteSequence, toggleQualityGateMode } from "./actions";
export { getQualityGateMode, invalidateQualityGateModeCache } from "./state";
export {
  listDraftSequences,
  getSequenceMetrics,
  getQualityGateSoftMetrics,
} from "./metrics";
export type {
  EligibilityResult,
  PromotionDecision,
  AutoPromotionRunResult,
  QualityGateMode,
  LockedItemKind,
} from "./types";

/**
 * Run a full auto-promotion cycle :
 *  1. Evaluate all locked items (sequences DRAFT + quality-gate)
 *  2. For each eligible item : emit promotion Intent (or simulate if dryRun)
 *  3. Return aggregated result with audit trail
 *
 * Idempotent : sequences déjà promues (lifecycle !== "DRAFT") sont skipped.
 * Idempotent : quality-gate déjà HARD est skipped.
 *
 * @param operatorId — qui déclenche (system pour cron, userId pour manuel)
 * @param dryRun — true par défaut. Force false pour exécution réelle.
 */
export async function runAutoPromotion(
  operatorId: string,
  dryRun: boolean = true,
): Promise<AutoPromotionRunResult> {
  const startedAt = new Date().toISOString();
  const evaluations = await evaluateAllLockedItems();
  const decisions: PromotionDecision[] = [];

  for (const evaluation of evaluations) {
    let decision: PromotionDecision;
    if (evaluation.itemKind === "QUALITY_GATE_SOFT_TO_HARD") {
      decision = await toggleQualityGateMode("HARD", evaluation, operatorId, dryRun);
    } else {
      decision = await promoteSequence(evaluation, operatorId, dryRun);
    }
    decisions.push(decision);
  }

  const completedAt = new Date().toISOString();
  const totalEvaluated = decisions.length;
  const totalPromoted = decisions.filter((d) => d.action === "PROMOTE").length;
  const totalSkipped = decisions.filter((d) => d.action === "SKIP").length;
  const totalWaiting = decisions.filter((d) => d.action === "WAIT").length;

  return {
    startedAt,
    completedAt,
    totalEvaluated,
    totalPromoted,
    totalSkipped,
    totalWaiting,
    decisions,
    dryRun,
  };
}
