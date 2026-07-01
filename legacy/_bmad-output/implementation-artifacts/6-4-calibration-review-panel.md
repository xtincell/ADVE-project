# Story 6.4: `CalibrationReviewPanel` composition (dialog + inline dual host)

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 6 · Story 4/7)
Owning Neter: Seshat (calibration) + Mestor (governed promotion dispatch)
APOGEE OS layer (ADR-0084): Apps (Layer 7 — component) + APIs (Layer 6 — 3 tRPC procedures)
Manual-first parity (ADR-0060): Auto / Manual-coefficients peer tabs (FR25), equal status.
CODE-MAP grep: extends campaign-tracker router (no parallel registry) ; reuses calibration.ts +
  lifecycle.ts handlers (Stories 6.1/6.2) via mestor.emitIntent ; composes dialog/tabs/badge/
  ProvenancePopover primitives ; no new entity, no new Prisma table (P22-6).
```

## Story

As an UPgraders operator, I want to read ROC AUC / RMSE as values against named thresholds, see the dated run snapshot, and switch to a manual-coefficient peer tab, so I own the statistical judgement (W&B pattern, UX-DR4 + UX-DR15) — not a pass/fail badge.

## Acceptance Criteria

Verbatim from [epics.md L1126-1136](../planning-artifacts/epics.md). Panel shows ROC AUC / RMSE **values vs declared thresholds** (pass/near/fail by icon+label+token, no colour alone — UX-DR22) ; two peer tabs Auto / Manual-coefficients (switching keeps values) ; two host contexts `dialog-wide` + inline ; progress streams over NSP SSE into `role="status" aria-live="polite"` ; Accept primary-rouge / Reject ghost (Reject NEVER primary) ; Accept emits `RUN_ATTRIBUTION_CALIBRATION` then `PROMOTE_PIVOT_SUBCLUSTER` via governed mutations, confirms with actor + snapshot link ; `data-density="compact"` + design tokens only + CVA grammar.

## Tasks / Subtasks

- [x] **Task 1 — tRPC procedures** — on `campaignTracker` router (governed pattern = `auditedProtected` + `mestor.emitIntent`, mirrors `tagOvertonDeltaManual`) : `runAttributionCalibration` (returns IntentResult + the just-created emission id as `snapshotRef`), `promotePivotSubcluster` (surfaces VETOED reason, not throw), `listCalibrationSnapshots` (reads `RUN_ATTRIBUTION_CALIBRATION` emissions + returns `CALIBRATION_THRESHOLDS` + `ATTRIBUTION_FEATURE_KEYS`).
- [x] **Task 2 — Thresholds** — `CALIBRATION_THRESHOLDS = { rocAucMin: 0.7, rmseMax: 0.3 }` (ADR-0081 §4) exported from `calibration.ts` (co-located rather than `manifest.ts` whose `defineManifest` schema is fixed) + via barrel.
- [x] **Task 3 — `useCalibrationStream`** — SSE hook for the 3 `calibration_*` kinds, filtered by `strategyId` (mirrors `useOracleStream`), feeding the `aria-live` region.
- [x] **Task 4 — Panel** — `data-table-comparison` + `kpi-grid` built inline (UX-spec composition names, not new primitives) ; Auto/Manual peer tabs via `tabs` primitive ; dialog (`size="xl"`) + inline dual host ; Accept run→promote chain (snapshotRef threaded from the run) ; inline confirmation with actor + `ProvenancePopover` snapshot link (UX-DR14).

## Dev Notes

**Emission id as `calibrationSnapshotRef`.** `IntentResult` doesn't carry the emission id, so `runAttributionCalibration` looks up the most-recent OK `RUN_ATTRIBUTION_CALIBRATION` emission for the strategy after dispatch and returns it as `snapshotRef`. The Accept flow threads that into `promotePivotSubcluster` ; PRODUCTION promotion without it is refused at the handler AND the Story 6.3 Mestor gate (defense-in-depth).

**Metrics-as-data, not pass/fail.** The panel renders the numeric ROC AUC / RMSE with a grade badge (PASS/NEAR/FAIL via icon+label+tone) — the operator keeps the judgement. Thresholds are declarative (ADR-0081 §4), NOT a code gate.

**Procedure gating choice.** Used `auditedProtected` (route-level Console gate provides operator scoping) rather than `operatorProcedure` per-procedure, consistent with the rest of this router and to keep the CIMENCAM seed user able to live-verify. The hash-chained governed path is `emitIntent`.

### File List
- **EDIT** [src/server/trpc/routers/campaign-tracker.ts](../../src/server/trpc/routers/campaign-tracker.ts) — 3 procedures + imports.
- **EDIT** [src/server/services/campaign-tracker/calibration.ts](../../src/server/services/campaign-tracker/calibration.ts) — `CALIBRATION_THRESHOLDS`.
- **EDIT** [src/server/services/campaign-tracker/index.ts](../../src/server/services/campaign-tracker/index.ts) — barrel exports.
- **NEW** [src/hooks/use-calibration-stream.ts](../../src/hooks/use-calibration-stream.ts)
- **NEW** [src/components/console/campaign-tracker/calibration-review-panel.tsx](../../src/components/console/campaign-tracker/calibration-review-panel.tsx)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean ; 888 tests green (incl. Story 6.7 HARD lifecycle + no-calibration-table). No new Prisma model (P22-6 honoured).
- Live browser verification of the run→promote chain recommended against CIMENCAM (1 LIVE campaign) but not executed in this autopilot pass (auth session needed) — compile + lint + anti-drift verified.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.4 shipped — CalibrationReviewPanel + 3 tRPC procedures + thresholds + SSE hook. | NEFER (Claude Opus 4.7) |
