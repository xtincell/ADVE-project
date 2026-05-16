/**
 * Phase 23 Pattern P22-4 — PROMOTE_PIVOT_SUBCLUSTER state-machine guards.
 *
 * Activated **HARD** in Epic 6 Story 6.7 against the live handler
 * `services/campaign-tracker/lifecycle.ts` + the Mestor pre-flight gate
 * `services/mestor/gates/calibration-snapshot-required.ts`.
 * Scaffolded here at baseline per Epic 1 Story 1.7.
 *
 * When activated, this test asserts :
 *   1. Every code path that calls `mestor.emitIntent({ kind:
 *      "PROMOTE_PIVOT_SUBCLUSTER", ... })` ultimately reaches the state-machine
 *      guard (no bypass).
 *   2. Integration test fires invalid transitions (skip-forward, reverse) and
 *      asserts they are refused with typed governance errors.
 *   3. `toState === "PRODUCTION"` without `calibrationSnapshotRef` is refused
 *      at the Mestor pre-flight gate (NOT just at the handler).
 *   4. A `calibrationSnapshotRef` pointing to a non-existent or
 *      `INSUFFICIENT_DATA` `IntentEmission` is refused at the gate.
 *   5. Mode HARD.
 *
 * Cf. ADR-0080, architecture P22-4, Epic 6 Stories 6.2 + 6.3.
 */

import { describe, it } from "vitest";

describe("Phase 23 P22-4 — Pivot sub-cluster lifecycle state-machine", () => {
  it.todo("activated Epic 6 Story 6.7 — STUB→PARTIAL→MVP→PRODUCTION ordering enforced");
  it.todo("activated Epic 6 Story 6.7 — skip-forward / reverse transitions refused");
  it.todo("activated Epic 6 Story 6.7 — PRODUCTION without calibrationSnapshotRef refused at Mestor gate");
  it.todo("activated Epic 6 Story 6.7 — invalid calibrationSnapshotRef refused at Mestor gate");
});
