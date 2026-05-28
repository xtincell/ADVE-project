/**
 * RUN_ATTRIBUTION_CALIBRATION — handler (Phase 23 Epic 6 Story 6.1, ADR-0081 + ADR-0072).
 *
 * Runs the pure-TS logistic regression (`superfan-attribution.ts`, Story 4.2)
 * against real campaign history and produces a **versioned calibration snapshot**
 * `{ modelVersion, mode, coefficients, rocAuc, rmse, sampleSize, dataWindow, computedAt }`
 * (ADR-0081 §3). The snapshot is returned as the handler `output` ; `mestor.emitIntent`
 * persists it into the `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` — **the emission
 * payload IS the snapshot (P22-6, zero new Prisma table)**. A future
 * `PROMOTE_PIVOT_SUBCLUSTER` references it via `calibrationSnapshotRef` = that
 * emission's id, validated by the Epic 6 Story 6.3 Mestor pre-flight gate.
 *
 * Two modes (manual-first parity ADR-0060, FR25 peer to FR6) :
 *   - AUTO                : fit logistic regression via gradient descent.
 *   - MANUAL_COEFFICIENTS : skip the fit, use operator-supplied coefficients,
 *                           only compute ROC AUC / RMSE for review.
 *
 * On INSUFFICIENT_DATA the handler completes with an explicit insufficient-data
 * result — it NEVER silently succeeds with a fabricated metric (ADR-0046
 * no-magic-fallback, P22-2 INSUFFICIENT_DATA first-class).
 *
 * Progress streams over NSP SSE (started → progress → done) bestEffort (NFR10) —
 * a publish failure never breaks a calibration that succeeded.
 *
 * Manual-first invariant (ADR-0071 / Story 5.6 HARD test) : this file must NOT
 * import `executeStructuredLLMCall` / `executeSequence` / `executeFramework` /
 * `executeTool` / `callLLM`. Calibration is pure regression + DB reads — no LLM.
 */

import { db } from "@/lib/db";
import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import {
  runAttributionWithEvaluation,
  isAttributionOk,
} from "./superfan-attribution";
import {
  emitCalibrationStarted,
  emitCalibrationProgress,
  emitCalibrationDone,
} from "./calibration-stream-events";

/** Canonical model identifier stamped on every snapshot (ADR-0081 §3). */
export const ATTRIBUTION_MODEL_VERSION = "attribution-logit-v1" as const;

type CalibrationIntent = Extract<Intent, { kind: "RUN_ATTRIBUTION_CALIBRATION" }>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason"
>;

export async function runAttributionCalibration(
  intent: CalibrationIntent,
): Promise<HandlerResult> {
  const { strategyId, operatorId, mode, campaignIds, operatorCoefficients } = intent;
  const startedAt = Date.now();

  if (mode === "MANUAL_COEFFICIENTS" && !operatorCoefficients) {
    return {
      status: "VETOED",
      tool: "campaign-tracker",
      summary: "Mode MANUAL_COEFFICIENTS sans operatorCoefficients — saisie requise.",
      reason: "MISSING_OPERATOR_COEFFICIENTS",
    };
  }

  // Resolve scope : explicit campaignIds, else every campaign under the strategy.
  let resolvedCampaignIds: string[];
  if (campaignIds && campaignIds.length > 0) {
    resolvedCampaignIds = [...campaignIds];
  } else {
    const campaigns = await db.campaign.findMany({
      where: { strategyId },
      select: { id: true },
    });
    resolvedCampaignIds = campaigns.map((c) => c.id);
  }

  emitCalibrationStarted({ userId: operatorId, strategyId, mode, campaignCount: resolvedCampaignIds.length });
  emitCalibrationProgress({ userId: operatorId, strategyId, stage: "FETCHING" });

  const { result, evaluation, dataWindow } = await runAttributionWithEvaluation({
    campaignIds: resolvedCampaignIds,
    coefficients: mode === "MANUAL_COEFFICIENTS" ? operatorCoefficients : undefined,
  });

  emitCalibrationProgress({ userId: operatorId, strategyId, stage: "EVALUATING" });

  // INSUFFICIENT_DATA — explicit, no fabricated metric (P22-2 / ADR-0046).
  if (!isAttributionOk(result) || !evaluation) {
    const insufficient = result.state === "INSUFFICIENT_DATA"
      ? { minSamplesRequired: result.minSamplesRequired, samplesAvailable: result.samplesAvailable }
      : { minSamplesRequired: 0, samplesAvailable: 0 };
    emitCalibrationDone({
      userId: operatorId,
      strategyId,
      state: "INSUFFICIENT_DATA",
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "OK",
      tool: "campaign-tracker",
      summary:
        `Calibration ${mode} : données insuffisantes ` +
        `(${insufficient.samplesAvailable}/${insufficient.minSamplesRequired} échantillons requis). ` +
        `Aucun snapshot produit — promotion PRODUCTION restera refusée.`,
      output: {
        state: "INSUFFICIENT_DATA" as const,
        modelVersion: ATTRIBUTION_MODEL_VERSION,
        mode,
        campaignCount: resolvedCampaignIds.length,
        ...insufficient,
      },
    };
  }

  // OK — produce the canonical snapshot (the IntentEmission payload, P22-6).
  const snapshot = {
    modelVersion: ATTRIBUTION_MODEL_VERSION,
    mode: evaluation.mode,
    coefficients: evaluation.coefficients,
    rocAuc: evaluation.rocAuc,
    rmse: evaluation.rmse,
    sampleSize: evaluation.sampleSize,
    dataWindow,
    computedAt: new Date().toISOString(),
  };

  emitCalibrationDone({
    userId: operatorId,
    strategyId,
    state: "OK",
    rocAuc: snapshot.rocAuc,
    rmse: snapshot.rmse,
    sampleSize: snapshot.sampleSize,
    durationMs: Date.now() - startedAt,
  });

  return {
    status: "OK",
    tool: "campaign-tracker",
    summary:
      `Calibration ${evaluation.mode} : ROC AUC ${snapshot.rocAuc.toFixed(3)} · ` +
      `RMSE ${snapshot.rmse.toFixed(3)} · ${snapshot.sampleSize} échantillons. ` +
      `Snapshot ${ATTRIBUTION_MODEL_VERSION} produit — référençable par PROMOTE_PIVOT_SUBCLUSTER.`,
    output: {
      state: "OK" as const,
      score: result.score,
      snapshot,
    },
  };
}
