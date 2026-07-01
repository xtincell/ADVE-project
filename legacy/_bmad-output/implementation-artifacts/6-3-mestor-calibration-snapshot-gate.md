# Story 6.3: Mestor pre-flight gate for `calibrationSnapshotRef` on PRODUCTION promotion

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 ✓ (gate runs inside emitIntent pre-flight)
Phase label: phase/23 (Epic 6 · Story 3/7)
Owning Neter: Mestor (pre-flight gate)
APOGEE OS layer (ADR-0084): Services système (Mestor gate, Layer 5)
Manual-first parity (ADR-0060): n/a
CODE-MAP grep: extends services/mestor/gates/ (manipulation-coherence precedent) — no new entity.
```

## Story

As a NEFER operator, I want a Mestor pre-flight gate refusing PRODUCTION promotion without a valid `calibrationSnapshotRef`, so the FR24 traceability invariant is enforced **before** the handler runs (mirroring `MANIPULATION_COHERENCE`).

## Acceptance Criteria

Verbatim from [epics.md L1114-1118](../planning-artifacts/epics.md). Gate `calibration-snapshot-required.ts` runs in the pre-flight chain before the handler ; refuses if `kind === "PROMOTE_PIVOT_SUBCLUSTER" && toState === "PRODUCTION" && !calibrationSnapshotRef` ; validates a present ref points to a succeeded `RUN_ATTRIBUTION_CALIBRATION` emission (refuses missing / failed / wrong-kind) ; Vitest covers (a) missing ref, (b) non-existent emission, (c) INSUFFICIENT_DATA emission, (d) valid ref → PASS.

## Tasks / Subtasks

- [x] **Task 1 — Gate** — `calibration-snapshot-required.ts` returns the canonical `GateResult` (PASS/BLOCK). Scoped to PROMOTE→PRODUCTION ; everything else PASS.
- [x] **Task 2 — Validity check** — looks up the emission by id ; BLOCK on missing / wrong `intentKind` / `result.status !== "OK"` / `result.output.state !== "OK"`.
- [x] **Task 3 — Wire pre-flight** — `preflightCalibrationSnapshot(intent)` wrapper in `mestor/intents.ts` + invoked in `emitIntent` right after the MANIPULATION_COHERENCE check (same VETOED-recording pattern, `reason: "CALIBRATION_SNAPSHOT_REQUIRED"`).
- [x] **Task 4 — Tests** — `calibration-snapshot-required.test.ts` : 7 cases (missing / non-existent / INSUFFICIENT_DATA / valid / wrong-kind / non-PRODUCTION skip / status≠OK). Mocks `@/lib/db`.

## Dev Notes

**"Succeeded" is read from the stored IntentResult, not `emission.status`.** `emitIntent`'s success path updates `IntentEmission.result` but NOT the `status` column (which stays `PENDING`). So the gate reads the stored `IntentResult` : `result.status === "OK"` (handler succeeded) AND `result.output.state === "OK"` (real snapshot, not INSUFFICIENT_DATA). An INSUFFICIENT_DATA calibration has `result.status === "OK"` but `result.output.state === "INSUFFICIENT_DATA"` — correctly refused.

**Canonical `GateResult`, not the legacy alphabet.** New gate → canonical PASS/BLOCK (Story 1.8 `gates/index.ts`), type-only import (no value cycle). Not registered in `mestorGates` (that registry is a Phase 24 scaffold not yet wired into runtime) — enforcement is the direct `emitIntent` pre-flight call, like the legacy manipulation/narrative gates.

### File List
- **NEW** [src/server/services/mestor/gates/calibration-snapshot-required.ts](../../src/server/services/mestor/gates/calibration-snapshot-required.ts)
- **EDIT** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) — `preflightCalibrationSnapshot` + emitIntent wiring.
- **NEW** [tests/unit/services/mestor/calibration-snapshot-required.test.ts](../../tests/unit/services/mestor/calibration-snapshot-required.test.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- 7/7 tests green. Defense-in-depth with the Story 6.2 handler-entry check. Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.3 shipped — `calibration-snapshot-required` Mestor pre-flight gate + emitIntent wiring. 7/7 tests green. | NEFER (Claude Opus 4.7) |
