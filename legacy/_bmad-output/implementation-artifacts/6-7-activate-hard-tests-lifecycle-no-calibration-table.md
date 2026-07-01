# Story 6.7: Activate HARD tests `phase22-lifecycle-promotion` + `phase22-no-calibration-table`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 6 · Story 7/7)
Owning Neter: governance (anti-drift CI)
APOGEE OS layer (ADR-0084): test layer
Manual-first parity (ADR-0060): n/a
CODE-MAP grep: activates Story 1.7 scaffolds — no new entity.
```

## Story

As a NEFER operator, I want the lifecycle state-machine + the "no new calibration table" invariant in HARD mode, so no future PR can introduce a calibration Prisma model (sidestepping P22-6) or break the promotion state machine.

## Acceptance Criteria

Verbatim from [epics.md L1180-1184](../planning-artifacts/epics.md). `phase22-lifecycle-promotion.test.ts` asserts every `emitIntent({kind:"PROMOTE_PIVOT_SUBCLUSTER"})` path reaches the state-machine guard + fires invalid transitions and asserts refusals ; `phase22-no-calibration-table.test.ts` asserts `schema.prisma` has no `CalibrationSnapshot`/`CalibrationRun`/`ModelSnapshot`/`AttributionSnapshot` model + no `CREATE TABLE "calibration*"` migration ; both HARD ; `pnpm test` green.

## Tasks / Subtasks

- [x] **Task 1 — lifecycle-promotion HARD** — replaced 4 `it.todo` : single-step ladder accepted (3 transitions) ; skip/reverse refused with typed reasons ; PRODUCTION-without-ref refused at the gate ; invalid ref (non-existent + INSUFFICIENT_DATA) refused at the gate ; source-scan asserts `emitIntent` wires `preflightCalibrationSnapshot` (no bypass) + commandant dispatches to `promotePivotSubcluster`.
- [x] **Task 2 — no-calibration-table HARD** — replaced 2 `it.todo` : regex scan of `schema.prisma` for the 4 forbidden models (0 hits) + scan of every `prisma/migrations/**/migration.sql` for `CREATE TABLE "<forbidden>"` / `"calibration*"` (0 hits).
- [x] **Task 3 — Verification** — 4 files (6.2 + 6.3 + the 2 activated) = 21/21 ; full governance + campaign-tracker + mestor run 888/889 (1 unrelated todo), exit 0.

## Dev Notes

**"No bypass" via source-scan.** Exhaustively proving every caller reaches the guard at runtime is intractable ; instead the test asserts the single dispatch funnel (`emitIntent` → `preflightCalibrationSnapshot` → handler) is wired in source — the gate runs before dispatch and the handler re-checks at entry. Combined with the runtime invalid-transition refusals, the state machine cannot be bypassed.

**P22-6 enforced both ways.** Schema model regex + migration `CREATE TABLE` regex — a future PR adding any calibration table fails CI. The snapshot stays an `IntentEmission` payload.

### File List
- **EDIT** [tests/unit/governance/phase22-lifecycle-promotion.test.ts](../../tests/unit/governance/phase22-lifecycle-promotion.test.ts)
- **EDIT** [tests/unit/governance/phase22-no-calibration-table.test.ts](../../tests/unit/governance/phase22-no-calibration-table.test.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Both HARD, green. Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.7 shipped — activated `phase22-lifecycle-promotion` (6 tests) + `phase22-no-calibration-table` (2 tests) HARD. Epic 6 governance core (6.1/6.2/6.3/6.7) complete ; UI 6.4-6.6 remain. | NEFER (Claude Opus 4.7) |
