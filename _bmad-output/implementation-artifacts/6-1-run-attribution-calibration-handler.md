# Story 6.1: Implement `RUN_ATTRIBUTION_CALIBRATION` handler in `campaign-tracker/calibration.ts`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 ✓ (governed Intent, no direct service call)
Phase label: phase/23 (Epic 6 — Calibration Review + Governed Lifecycle Promotion · Story 1/7)
Owning Neter: Mestor (Intent dispatcher) + Seshat (Telemetry consumes the snapshot)
APOGEE OS layer (ADR-0084): Services (campaign-tracker) + APIs (NSP SSE)
BrandAsset.kind produced: none (calibration snapshot = IntentEmission payload, P22-6)
Portail target: Console (CalibrationReviewPanel consumes — Story 6.4)
Manual-first parity (ADR-0060): AUTO + MANUAL_COEFFICIENTS peer modes (FR25 peer to FR6)
CODE-MAP grep: extends superfan-attribution.ts (Story 4.2) + nsp event-types — no new Prisma model (P22-6 invariant).
```

## Story

As an UPgraders operator, I want the calibration Intent handler to run the attribution model against real campaign history and produce a versioned snapshot, so I can review evaluation metrics before promoting the sub-cluster — the snapshot is the trace from a future PRODUCTION promotion (FR24).

## Acceptance Criteria

Verbatim from [epics.md L1082-1088](../planning-artifacts/epics.md). Handler accepts the payload, runs the regression per Story 4.2, emits NSP SSE progress (started → progress → done) bestEffort (ADR-0072) ; on success appends a snapshot `{ modelVersion, coefficients, rocAuc, rmse, sampleSize, dataWindow, computedAt }` as the `RUN_ATTRIBUTION_CALIBRATION` IntentEmission (P22-6 — no new table) ; on INSUFFICIENT_DATA completes explicitly (never a fake metric) ; does NOT import `executeStructuredLLMCall`/`executeSequence`/`executeFramework`/`executeTool`/`callLLM` (HARD test Story 5.6) ; SLO p95 ≤ 60s / cost ≤ $0.50 respected.

## Tasks / Subtasks

- [x] **Task 1 — NSP event kinds** — `CalibrationStartedEvent` / `CalibrationProgressEvent` / `CalibrationDoneEvent` + `CalibrationStreamEvent` union added to `NspEvent` (event-types.ts) + re-exported from the nsp barrel.
- [x] **Task 2 — bestEffort emitters** — `calibration-stream-events.ts` (mirror of `oracle-section/stream-events.ts`) : `emitCalibrationStarted/Progress/Done`, never throws.
- [x] **Task 3 — Richer attribution entry** — `runAttributionWithEvaluation` added to `superfan-attribution.ts` (returns `result` + `AttributionEvaluation` + `dataWindow`) ; `runAttribution` refactored to delegate (behaviour-preserving). The evaluation is what `AttributionResult` deliberately omits ("the calibration handler wraps it").
- [x] **Task 4 — Handler** — `calibration.ts` `runAttributionCalibration(intent)` : resolves scope (explicit `campaignIds` or all campaigns under the strategy), VETOES `MANUAL_COEFFICIENTS` without `operatorCoefficients`, emits started→FETCHING→EVALUATING→done, builds the snapshot from the evaluation, returns explicit `INSUFFICIENT_DATA` (no fabricated metric) or `OK` + snapshot. `modelVersion = "attribution-logit-v1"`.
- [x] **Task 5 — Dispatch** — `artemis/commandant.ts` `RUN_ATTRIBUTION_CALIBRATION` placeholder replaced by dynamic import of the handler ; `PROMOTE_PIVOT_SUBCLUSTER` placeholder kept for Story 6.2.
- [x] **Task 6 — Tests** — `calibration.test.ts` (5 cases : VETO / OK-snapshot / INSUFFICIENT_DATA / MANUAL-mode / default-scope) + the Story 5.6 `assembler-uses-manual-path` HARD test now scans `calibration.ts` and confirms zero forbidden LLM imports.

## Dev Notes

**P22-6 — the snapshot is the IntentEmission payload, never a table.** `mestor.emitIntent` already creates a `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission` and stores the handler `output` as its result. So the handler returns the snapshot as `output` ; that emission's `id` becomes the `calibrationSnapshotRef` a future `PROMOTE_PIVOT_SUBCLUSTER` cites (validated by the Story 6.3 gate). No `CalibrationSnapshot` Prisma model — enforced by the Story 6.7 `phase22-no-calibration-table.test.ts`.

**Self-describing output for the gate.** `output.state` discriminates `"OK"` (carries `snapshot`) from `"INSUFFICIENT_DATA"` (carries `minSamplesRequired` / `samplesAvailable`, no snapshot). Story 6.3's gate reads the emission result and refuses a `calibrationSnapshotRef` pointing to an `INSUFFICIENT_DATA` emission.

**`runAttribution` deliberately drops the evaluation.** Rather than change its public return type (Story 4.x consumers), I added `runAttributionWithEvaluation` and made `runAttribution` delegate. The evaluation (`coefficients` / `rocAuc` / `rmse` / `sampleSize` / `mode`) + the observed `dataWindow` (min/max `updatedAt`) are exactly the snapshot fields.

**No LLM.** Calibration is pure-TS logistic regression + DB reads — the SLO (p95 ≤ 60s / cost ≤ $0.50) is trivially met and the manual-first HARD invariant holds by construction (no LLM primitive imported).

### File List
- **EDIT** [src/server/services/nsp/event-types.ts](../../src/server/services/nsp/event-types.ts) + [src/server/services/nsp/index.ts](../../src/server/services/nsp/index.ts)
- **NEW** [src/server/services/campaign-tracker/calibration-stream-events.ts](../../src/server/services/campaign-tracker/calibration-stream-events.ts)
- **NEW** [src/server/services/campaign-tracker/calibration.ts](../../src/server/services/campaign-tracker/calibration.ts)
- **EDIT** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — `runAttributionWithEvaluation` + delegate.
- **EDIT** [src/server/services/artemis/commandant.ts](../../src/server/services/artemis/commandant.ts) — handler dispatch.
- **NEW** [tests/unit/services/campaign-tracker/calibration.test.ts](../../tests/unit/services/campaign-tracker/calibration.test.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Backend-only, headless-verifiable. Verified via tsc + eslint + 5 calibration tests + assembler HARD scan.
- Cap APOGEE 7/7 preserved (Mestor-governed Intent, no new Neter).
- Verified post dev-DB repair (migrate reset + reseed CIMENCAM) — the env that blocked the prior session is healthy.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.1 shipped — `RUN_ATTRIBUTION_CALIBRATION` handler (`calibration.ts`) + `runAttributionWithEvaluation` + NSP calibration events + commandant dispatch. Snapshot = IntentEmission payload (P22-6). 5 tests + assembler HARD scan green. | NEFER (Claude Opus 4.7) |
