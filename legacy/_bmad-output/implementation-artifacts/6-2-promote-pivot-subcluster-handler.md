# Story 6.2: Implement `PROMOTE_PIVOT_SUBCLUSTER` handler in `campaign-tracker/lifecycle.ts`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 ✓ (governed Intent, no sister-service mutation)
Phase label: phase/23 (Epic 6 · Story 2/7)
Owning Neter: Mestor (state machine) + Seshat (consumes lifecycle state)
APOGEE OS layer (ADR-0084): Services (campaign-tracker)
BrandAsset.kind produced: none
Manual-first parity (ADR-0060): n/a (governance state machine)
CODE-MAP grep: reads capability-state.ts const registry — no new entity, no DB mutation (PROMOTE_SEQUENCE_LIFECYCLE precedent).
```

## Story

As an UPgraders operator, I want the lifecycle-promotion handler to enforce state-machine ordering and require a `calibrationSnapshotRef` for PRODUCTION, so no sub-cluster reaches PRODUCTION without a traceable snapshot (P22-4).

## Acceptance Criteria

Verbatim from [epics.md L1098-1104](../planning-artifacts/epics.md). Refuses transitions violating `STUB→PARTIAL→MVP→PRODUCTION` (no skip-forward, no reverse without RE_ENTRY — out of scope) ; `toState === "PRODUCTION"` without `calibrationSnapshotRef` refused at handler entry ; on accepted transition updates capability-state (or DB equivalent) + emits IntentEmission recording transition/actor/snapshotRef/reason ; no direct sister-service mutation ; Vitest covers (a) valid linear, (b) skip-forward refused, (c) reverse refused, (d) PRODUCTION without snapshotRef refused.

## Tasks / Subtasks

- [x] **Task 1 — Ladder** — `LIFECYCLE_LADDER = ["STUB","PARTIAL","MVP","PRODUCTION"]` (superset of the 3-state `ClusterLifecycle` ; `PARTIAL` is the explicit intermediate rung).
- [x] **Task 2 — Handler** — `promotePivotSubcluster(intent)` : unknown slug → VETOED ; reverse (toIdx ≤ fromIdx) → REVERSE_TRANSITION_REFUSED ; skip (toIdx ≠ fromIdx+1) → SKIP_FORWARD_REFUSED ; PRODUCTION without ref → MISSING_CALIBRATION_SNAPSHOT_REF ; else OK + output (transition + actor + snapshotRef + reason + promotedAt).
- [x] **Task 3 — No const mutation** — capability-state.ts is a `const` registry (not DB-persisted) ; the accepted promotion is recorded via the `IntentEmission` (mirrors `PROMOTE_SEQUENCE_LIFECYCLE`). A future PR bumps `CLUSTER_CAPABILITIES`.
- [x] **Task 4 — Dispatch** — `artemis/commandant.ts` `PROMOTE_PIVOT_SUBCLUSTER` placeholder replaced by dynamic import of the handler.
- [x] **Task 5 — Tests** — `lifecycle.test.ts` : 6 cases (valid linear / skip / reverse / no-snapshot / unknown / valid intermediate). Pure, no DB.

## Dev Notes

**The const is not mutated — the audit trail is the source.** `capability-state.ts` hard-codes each sub-cluster's lifecycle ; there's no DB column to update. So the IntentEmission (created by `emitIntent`, handler `output` = its payload) records the transition, and the registry stays the current-state source. This is the established `PROMOTE_SEQUENCE_LIFECYCLE` (ADR-0042) pattern.

**Defense-in-depth with the gate.** The handler refuses PRODUCTION-without-ref at entry ; Story 6.3's Mestor pre-flight gate refuses it earlier (before the handler runs). Both layers enforce FR24.

**No LLM, no sister-service call** — pure state-machine assertion. The Story 5.6 `assembler-uses-manual-path` HARD test now scans `lifecycle.ts` and confirms zero forbidden imports.

### File List
- **NEW** [src/server/services/campaign-tracker/lifecycle.ts](../../src/server/services/campaign-tracker/lifecycle.ts)
- **EDIT** [src/server/services/artemis/commandant.ts](../../src/server/services/artemis/commandant.ts)
- **NEW** [tests/unit/services/campaign-tracker/lifecycle.test.ts](../../tests/unit/services/campaign-tracker/lifecycle.test.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- 6/6 tests green. Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.2 shipped — `promotePivotSubcluster` state machine (single-step ladder + PRODUCTION-requires-snapshot) + commandant dispatch. 6/6 tests green. | NEFER (Claude Opus 4.7) |
