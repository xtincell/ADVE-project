/**
 * CALIBRATION_SNAPSHOT_REQUIRED — Mestor pre-flight gate (Phase 23 Epic 6 Story 6.3, ADR-0080/0081).
 *
 * Enforces the structural traceability invariant (FR24, pattern P22-4) at the
 * dispatch layer — BEFORE the `PROMOTE_PIVOT_SUBCLUSTER` handler runs — mirroring
 * the `MANIPULATION_COHERENCE` precedent. A sub-cluster cannot reach PRODUCTION
 * without a calibration snapshot that actually succeeded.
 *
 * Refuses (verdict BLOCK) when, for `PROMOTE_PIVOT_SUBCLUSTER` + `toState === "PRODUCTION"` :
 *   - `calibrationSnapshotRef` is absent ; OR
 *   - it points to no `IntentEmission` ; OR
 *   - it points to an emission whose `intentKind` is not `RUN_ATTRIBUTION_CALIBRATION` ; OR
 *   - that emission did not succeed (its stored `IntentResult.status !== "OK"`) ; OR
 *   - that emission produced an `INSUFFICIENT_DATA` result (no real snapshot).
 *
 * Note on "succeeded" : `emitIntent`'s success path updates `IntentEmission.result`
 * but NOT the `status` column (which stays `PENDING`). So the authoritative success
 * signal is the stored `IntentResult` itself — `result.status === "OK"` AND
 * `result.output.state === "OK"` (a calibration that returned INSUFFICIENT_DATA has
 * `result.status === "OK"` but `result.output.state === "INSUFFICIENT_DATA"`).
 *
 * Uses the canonical `GateResult` alphabet (PASS / BLOCK) from the Story 1.8 gate
 * registry — type-only import, no value cycle.
 */

import { db } from "@/lib/db";
import type { GateResult } from "./gate-types";

export interface CalibrationSnapshotGateInput {
  readonly kind: string;
  readonly toState?: string;
  readonly calibrationSnapshotRef?: string | null;
}

export async function calibrationSnapshotRequiredGate(
  input: CalibrationSnapshotGateInput,
): Promise<GateResult> {
  // Gate is scoped to PRODUCTION promotions of pivot sub-clusters. Everything
  // else passes untouched.
  if (input.kind !== "PROMOTE_PIVOT_SUBCLUSTER" || input.toState !== "PRODUCTION") {
    return { verdict: "PASS" };
  }

  if (!input.calibrationSnapshotRef) {
    return {
      verdict: "BLOCK",
      reason:
        "CALIBRATION_SNAPSHOT_REQUIRED: promotion PRODUCTION refusée — calibrationSnapshotRef absent.",
    };
  }

  const emission = await db.intentEmission.findUnique({
    where: { id: input.calibrationSnapshotRef },
    select: { id: true, intentKind: true, result: true },
  });

  if (!emission) {
    return {
      verdict: "BLOCK",
      reason: `CALIBRATION_SNAPSHOT_REQUIRED: calibrationSnapshotRef "${input.calibrationSnapshotRef}" ne pointe vers aucune IntentEmission.`,
    };
  }

  if (emission.intentKind !== "RUN_ATTRIBUTION_CALIBRATION") {
    return {
      verdict: "BLOCK",
      reason: `CALIBRATION_SNAPSHOT_REQUIRED: la référence pointe vers une émission ${emission.intentKind}, pas RUN_ATTRIBUTION_CALIBRATION.`,
    };
  }

  const result = emission.result as { status?: string; output?: { state?: string } } | null;

  if (!result || result.status !== "OK") {
    return {
      verdict: "BLOCK",
      reason: `CALIBRATION_SNAPSHOT_REQUIRED: l'émission de calibration n'a pas réussi (status ${result?.status ?? "aucun"}).`,
    };
  }

  if (result.output?.state !== "OK") {
    return {
      verdict: "BLOCK",
      reason: `CALIBRATION_SNAPSHOT_REQUIRED: l'émission de calibration a produit un résultat ${result.output?.state ?? "absent"} (INSUFFICIENT_DATA / pas de snapshot) — ne peut justifier une promotion PRODUCTION.`,
    };
  }

  return {
    verdict: "PASS",
    evidence: { calibrationSnapshotRef: input.calibrationSnapshotRef },
  };
}
