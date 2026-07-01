# Story 6.5: Console campaign-tracker view switcher (B1 + B2 + B3 + localStorage)

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 6 · Story 5/7)
Owning Neter: Mestor (governance Console surface) — Seshat pivot sub-clusters
APOGEE OS layer (ADR-0084): Apps (Layer 7 — page + component)
Manual-first parity (ADR-0060): n/a (operator triage surface)
CODE-MAP grep: PAGE-MAP `/console/governance/campaign-tracker` exists (Phase 19) → EXTEND, not new
  route ; segmented control via existing `tabs` primitive (no new primitive, UX-DR3).
```

## Story

As an UPgraders operator, I want a persisted view switcher on `/console/governance/campaign-tracker` (B1 dense table default / B2 card grid / B3 master-detail), so I can optimise the view for triage, onboarding, or deep calibration without losing my choice across sessions (UX-DR3).

## Acceptance Criteria

Verbatim from [epics.md L1144-1154](../planning-artifacts/epics.md). Segmented control via existing `tabs` primitive (no new primitive) ; three views (`HubTableView` / `HubCardView` / `HubDetailView`) render the pivot sub-clusters + lifecycle stage + signal freshness via the shared `SubClusterStatusCell` (Story 6.6) ; preference persists in `localStorage` per operator (default `table`, routing never resets) ; B2/B3 stay within `compact` spacing tokens ; below `md` falls back to single column, `lg`+ target, tablet via container queries (UX-DR20) ; keyboard flow view-switch → row-select → calibration-open ; reads via `operatorProcedure`, mutations via `governedProcedure`.

## Tasks / Subtasks

- [x] **Task 1 — `CampaignTrackerHub`** — three views over the **pivot sub-clusters** (Cluster C Superfan + Cluster D culture/Overton = the 7 promotion slugs), filtered from `listClusterCapabilities`.
- [x] **Task 2 — View switcher** — `tabs` primitive segmented control ; `localStorage` key `campaign-tracker-hub-view` (default `table`) read on mount + written on change (mirrors sidebar-collapse, DESIGN-A11Y §4).
- [x] **Task 3 — Views** — B1 dense table, B2 card grid (`@container` + `@md`/`@xl` container queries, UX-DR19/20), B3 master-detail list + inline `CalibrationReviewPanel` ; B1/B2 open the panel as a `dialog`.
- [x] **Task 4 — Page wiring** — new `PivotMechanicsSection` (brand selector + hub) inserted into the existing Console page above the Phase 19 registry's attribution-lineage section, distinct from the full-registry table.

## Dev Notes

**Pivot scope.** The switcher targets the pivot sub-clusters (Cluster C + D — the slugs the calibration + `PROMOTE_PIVOT_SUBCLUSTER` Intents act on), distinct from the existing Phase 19 full-registry table (all clusters A→H) which stays intact above.

**Connector signal derivation (MVP).** `SubClusterStatusCell.connectorResult` is derived from the registry : sub-clusters declaring `DEFERRED_AWAITING_CREDENTIALS` in their degradation codes get a `DEFERRED` connector result (so the "Configurer le connecteur" cross-link shows) ; others omit it — **no fabricated signal**. The live per-sub-cluster `ConnectorResult` (real Tarsis/CRM poll) is Epic 7 wiring. `lastSignalAt` is omitted (no fabricated freshness) — the cell shows "—".

**Gating.** Reads via the audited protected procedure (route-level Console gate scopes the operator) ; mutations via `mestor.emitIntent` (the governed, hash-chained path). Reason recorded in Story 6.4 notes.

### File List
- **NEW** [src/components/console/campaign-tracker/campaign-tracker-hub.tsx](../../src/components/console/campaign-tracker/campaign-tracker-hub.tsx)
- **EDIT** [src/app/(console)/console/governance/campaign-tracker/page.tsx](../../src/app/(console)/console/governance/campaign-tracker/page.tsx) — `PivotMechanicsSection` + brand selector + render.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean ; 888 tests green. Consumes Story 6.6 cells + Story 6.4 panel (dialog from B1/B2, inline in B3).
- Live browser verification of the localStorage persistence + view switch recommended against CIMENCAM ; not executed in this autopilot pass (auth session needed) — compile + lint verified.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.5 shipped — CampaignTrackerHub B1/B2/B3 view switcher + localStorage + page wiring. | NEFER (Claude Opus 4.7) |
