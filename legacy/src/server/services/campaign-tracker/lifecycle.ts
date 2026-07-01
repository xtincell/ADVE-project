/**
 * PROMOTE_PIVOT_SUBCLUSTER — handler (Phase 23 Epic 6 Story 6.2, ADR-0080).
 *
 * Promotes a pivot sub-cluster along the `STUB → PARTIAL → MVP → PRODUCTION`
 * lifecycle ladder. Enforces the state machine at the handler entry (pattern
 * P22-4) :
 *   - single-step forward only (no skip-forward) ;
 *   - no reverse (RE_ENTRY is out of scope for Phase 23) ;
 *   - `toState === "PRODUCTION"` REQUIRES a `calibrationSnapshotRef` — refused
 *     at the handler (not just the UI), mirrored by the Mestor pre-flight gate
 *     `calibration-snapshot-required.ts` (Story 6.3, defense-in-depth).
 *
 * Lifecycle state is a `const` registry (`capability-state.ts CLUSTER_CAPABILITIES`),
 * not a DB column — so an accepted promotion is recorded via the `IntentEmission`
 * (created by `mestor.emitIntent`, the handler `output` is its payload) ; the const
 * remains the current-state source and a future PR bumps it. This mirrors the
 * `PROMOTE_SEQUENCE_LIFECYCLE` precedent (ADR-0042). No sister-service mutation is
 * called directly — all governance side-effects flow through `mestor.emitIntent()`.
 *
 * Manual-first invariant (ADR-0071 / Story 5.6 HARD test) : this file must NOT
 * import `executeStructuredLLMCall` / `executeSequence` / `executeFramework` /
 * `executeTool` / `callLLM`. Promotion is a pure state-machine assertion — no LLM.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import { getClusterCapability } from "./capability-state";

/**
 * Canonical promotion ladder (ADR-0080). Ordered — index defines adjacency.
 * Superset of the 3-state `ClusterLifecycle` (STUB/MVP/PRODUCTION) : `PARTIAL`
 * is an explicit intermediate rung for the promotion path.
 */
export const LIFECYCLE_LADDER = ["STUB", "PARTIAL", "MVP", "PRODUCTION"] as const;
export type LifecycleLadderState = (typeof LIFECYCLE_LADDER)[number];

type PromoteIntent = Extract<Intent, { kind: "PROMOTE_PIVOT_SUBCLUSTER" }>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason"
>;

export async function promotePivotSubcluster(
  intent: PromoteIntent,
): Promise<HandlerResult> {
  const { subClusterSlug, fromState, toState, calibrationSnapshotRef, reason, operatorId } = intent;

  const cap = getClusterCapability(subClusterSlug);
  if (!cap) {
    return {
      status: "VETOED",
      tool: "campaign-tracker",
      summary: `Sous-cluster inconnu : ${subClusterSlug}.`,
      reason: "UNKNOWN_SUBCLUSTER",
    };
  }

  const fromIdx = LIFECYCLE_LADDER.indexOf(fromState);
  const toIdx = LIFECYCLE_LADDER.indexOf(toState);

  // Reverse (or no-op) — refused. RE_ENTRY out of scope for Phase 23.
  if (toIdx <= fromIdx) {
    return {
      status: "VETOED",
      tool: "campaign-tracker",
      summary: `Transition arrière refusée : ${fromState} → ${toState} (RE_ENTRY hors scope Phase 23).`,
      reason: "REVERSE_TRANSITION_REFUSED",
    };
  }

  // Skip-forward — refused (single-step ladder only).
  if (toIdx !== fromIdx + 1) {
    return {
      status: "VETOED",
      tool: "campaign-tracker",
      summary:
        `Saut d'étape refusé : ${fromState} → ${toState}. ` +
        `Promotion d'un seul cran à la fois (${LIFECYCLE_LADDER.join(" → ")}).`,
      reason: "SKIP_FORWARD_REFUSED",
    };
  }

  // PRODUCTION requires a calibration snapshot reference — refused at handler entry.
  if (toState === "PRODUCTION" && !calibrationSnapshotRef) {
    return {
      status: "VETOED",
      tool: "campaign-tracker",
      summary:
        `Promotion PRODUCTION refusée pour ${subClusterSlug} : ` +
        `calibrationSnapshotRef requis (snapshot RUN_ATTRIBUTION_CALIBRATION justifiant la promotion).`,
      reason: "MISSING_CALIBRATION_SNAPSHOT_REF",
    };
  }

  // Accepted — the IntentEmission (created by emitIntent) records the transition,
  // actor, snapshot ref and reason. The const registry is not mutated here
  // (PROMOTE_SEQUENCE_LIFECYCLE precedent) — a future PR bumps CLUSTER_CAPABILITIES.
  const promotedAt = new Date().toISOString();
  return {
    status: "OK",
    tool: "campaign-tracker",
    summary:
      `${subClusterSlug} promu ${fromState} → ${toState}` +
      (calibrationSnapshotRef ? ` (snapshot ${calibrationSnapshotRef})` : "") +
      ` — ${reason}`,
    output: {
      subClusterSlug,
      cluster: cap.cluster,
      fromState,
      toState,
      calibrationSnapshotRef: calibrationSnapshotRef ?? null,
      actor: operatorId,
      reason,
      promotedAt,
    },
  };
}
