/**
 * src/server/services/auto-promotion/actions.ts — promotion actions.
 *
 * Émet les Intents de promotion. Tous les writes traversent
 * `mestor.emitIntent` (Pilier 1 NEFER).
 */

import type { EligibilityResult, PromotionDecision, QualityGateMode } from "./types";
import { invalidateQualityGateModeCache } from "./state";

/**
 * Promote a single sequence DRAFT → STABLE via PROMOTE_SEQUENCE_LIFECYCLE Intent.
 *
 * @param result Eligibility result (must be `eligible: true`)
 * @param operatorId — emitter ID (system or user)
 * @param dryRun — if true, just simulate (return decision without emitting)
 */
export async function promoteSequence(
  result: EligibilityResult,
  operatorId: string,
  dryRun: boolean,
): Promise<PromotionDecision> {
  if (!result.eligible) {
    return {
      evaluation: result,
      action: "WAIT",
      reason: result.reasons.join(" ; "),
    };
  }

  if (dryRun) {
    return {
      evaluation: result,
      action: "PROMOTE",
      reason: "[DRY RUN] would emit PROMOTE_SEQUENCE_LIFECYCLE",
    };
  }

  const { emitIntent } = await import("@/server/services/mestor/intents");
  const intentResult = await emitIntent(
    {
      kind: "PROMOTE_SEQUENCE_LIFECYCLE",
      strategyId: "(governance)",
      sequenceKey: result.itemId,
      fromLifecycle: "DRAFT",
      toLifecycle: "STABLE",
      operatorId,
      justification: `Auto-promotion v6.18.22 — eligibility met : ${JSON.stringify(result.metrics)}`,
    },
    { caller: "auto-promotion:promote-sequence" },
  );

  return {
    evaluation: result,
    action: intentResult.status === "OK" ? "PROMOTE" : "SKIP",
    reason:
      intentResult.status === "OK"
        ? "PROMOTE_SEQUENCE_LIFECYCLE emitted successfully"
        : `Intent failed : ${intentResult.summary}`,
    emittedIntentId: intentResult.intentKind,
  };
}

/**
 * Toggle the global quality-gate mode via TOGGLE_QUALITY_GATE_MODE Intent.
 * The runtime reads the latest emission to determine current mode (cf. state.ts).
 */
export async function toggleQualityGateMode(
  targetMode: QualityGateMode,
  result: EligibilityResult,
  operatorId: string,
  dryRun: boolean,
): Promise<PromotionDecision> {
  if (!result.eligible) {
    return {
      evaluation: result,
      action: "WAIT",
      reason: result.reasons.join(" ; "),
    };
  }

  if (dryRun) {
    return {
      evaluation: result,
      action: "PROMOTE",
      reason: `[DRY RUN] would emit TOGGLE_QUALITY_GATE_MODE → ${targetMode}`,
    };
  }

  const { emitIntent } = await import("@/server/services/mestor/intents");
  const intentResult = await emitIntent(
    {
      kind: "TOGGLE_QUALITY_GATE_MODE",
      strategyId: "(governance)",
      operatorId,
      mode: targetMode,
      reason: `Auto-promotion v6.18.22 — eligibility met : ${JSON.stringify(result.metrics)}`,
    },
    { caller: "auto-promotion:toggle-quality-gate" },
  );

  if (intentResult.status === "OK") {
    invalidateQualityGateModeCache();
  }

  return {
    evaluation: result,
    action: intentResult.status === "OK" ? "PROMOTE" : "SKIP",
    reason:
      intentResult.status === "OK"
        ? `TOGGLE_QUALITY_GATE_MODE → ${targetMode} emitted successfully`
        : `Intent failed : ${intentResult.summary}`,
    emittedIntentId: intentResult.intentKind,
  };
}
