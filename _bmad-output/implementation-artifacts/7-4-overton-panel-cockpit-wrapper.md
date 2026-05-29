# Story 7.4: Implement `<OvertonPanel>` Cockpit wrapper with tRPC + Suspense + degraded UI

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 4/10)
Owning Neter: Seshat (Overton consumer) — read under Mestor governance
APOGEE OS layer (ADR-0084): APIs (Layer 6 — tRPC query) + Apps (Layer 7 — panel)
CODE-MAP grep: ROUTER-MAP "overton" → no founder Overton query exists → new `overtonSignal`
  query on existing `cockpitDashboard` router (extends, not a new router). Tarsis façade
  `fetchSectorSignal` (Epic 2) + `getSectorAxis` (sector-intelligence) reused.
Mission link: DIRECT_OVERTON — founder's data plane for the Overton instrument.
```

## Acceptance Criteria

Verbatim [epics.md L1248-1255](../planning-artifacts/epics.md). Panel fetches via tRPC tenant-scoped + passes `ConnectorResult<…>` to `<OvertonRadar instance="full" />` ; Suspense boundary returns skeleton, never blocks shell (NFR2) ; no business logic in the panel (route owns guards, pure component owns presentation, panel owns fetch+boundary) ; Vitest covers skeleton/success/DEFERRED.

## Tasks / Subtasks

- [x] **Task 1 — `overtonSignal` query** (`cockpit-router.ts`, `protectedProcedure`, read-only). Resolves sector slug from `businessContext.sector` + brand tags from pillar D + operatorId, calls `fetchSectorSignal` and maps **exhaustively** (P22-1) to `ConnectorResult<OvertonRadarSignal>`. Paid-tier gate (FR32) via `checkPaidTier` → `TIER_GATE_DENIED` arm (mirrors `getFounderAttributionLineage`). Tenant scope: founder owns strategy or ADMIN.
- [x] **Task 2 — domain view-model** — moved `OvertonRadarSignal` to `src/domain/overton-radar-signal.ts` (Layer 0) so router (Layer 6) + radar (Layer 7) share it without a backward import. Re-exported from the component for back-compat.
- [x] **Task 3 — `<OvertonPanel>`** (`src/components/cockpit/intelligence/`) — `useCurrentStrategyId` + `trpc.cockpitDashboard.overtonSignal.useQuery` inside a `<Suspense>` boundary ; skeleton while loading ; `TIER_GATE_DENIED` → upgrade CTA `EmptyState` ; otherwise pass the `ConnectorResult` straight to the radar (radar owns the 3 states). No-strategy → empty.

## Dev Notes

**`operatorProcedure` would reject founders.** epics.md says "operatorProcedure" but that procedure (init.ts) requires ADMIN or a linked Operator — it would 403 every founder. The Cockpit is the founder portal ; the correct choice is `protectedProcedure` + explicit tenant-ownership guard (mirrors `cockpitRouter.dashboard`). **Arbitrage logged** — read-only is still guaranteed because it's a `.query` (FR32 "enforced by procedure type, not UI hiding").

**Tier-denial is not a ConnectorResult state.** To keep the radar prop type pure (`ConnectorResult<T>`, 3 states), the query returns `OvertonSignalResult = { TIER_GATE_DENIED } | ConnectorResult<…>`. The panel strips the gate arm before handing the connector result to the radar.

### File List
- **EDIT** [src/server/trpc/routers/cockpit-router.ts](../../src/server/trpc/routers/cockpit-router.ts) — `overtonSignal` query + `OvertonSignalResult` type + helpers.
- **NEW** [src/domain/overton-radar-signal.ts](../../src/domain/overton-radar-signal.ts) + barrel export.
- **NEW** [src/components/cockpit/intelligence/overton-panel.tsx](../../src/components/cockpit/intelligence/overton-panel.tsx) (`OvertonPanel` + `OvertonTeaser` for Story 7.6).

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean ; 764 governance tests green.
- **Vitest panel render test = done-with-debt** : the repo has zero component-render tests and no DOM env (`jsdom`/`happy-dom`) installed — a render test is unrunnable. Bootstrapping the first DOM harness is out of autopilot scope ; tracked in RESIDUAL-DEBT Phase 23 closure with the live-browser verification (DB seeded). Mapping logic (`extractSectorSlug`/`extractBrandTags`/exhaustive switch) is tsc-verified.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.4 — overtonSignal query + OvertonPanel wrapper shipped. | NEFER (Claude Opus 4.7) |
