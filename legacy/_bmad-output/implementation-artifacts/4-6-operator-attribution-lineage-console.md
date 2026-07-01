# Story 4.6: Operator view of attribution + lineage in Console

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 ✓ C6 ✓
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 6/8)
Owning Neter: Seshat (campaign-tracker measurement) — read-only surface, no Intent (query path)
APOGEE OS layer (ADR-0084): Layer 4 (service resolver) + Layer 6 (tRPC) + Layer 7 (Console app page)
BrandAsset.kind produced: none
Portail target: Console (Mission Control / UPgraders operator)
Manual-first parity (ADR-0060): n/a (read-only view — no LLM path, no mutation)
Mission link: the operator must be able to defend a superfan-attribution score to a client by pointing at the lineage — recognised devotion transitions, dated, named (FR9). Makes the superfan accumulation mechanic auditable rather than a black-box counter.
CODE-MAP grep: searched `getAttributionLineage`, `AttributionLineageView`, `attribution lineage` across `src/`. No prior implementation. `recomputeSuperfanAttribution` (Phase 19 heuristic) exists and is intentionally distinct (ADR-0081 §"coexistence"). Extension chosen: new `getAttributionLineage` service resolver wrapping Story 4.2 `runAttribution` + a new tRPC query + a Console section.
```

## Story

As an **UPgraders operator**,
I want **to see a campaign's attribution result and evangelist lineage in the Console campaign-tracker view**,
so that **I can defend the score to a client by pointing at the lineage — recognised devotion transitions, dated, named (FR9)**.

## Acceptance Criteria

Verbatim from [epics.md L922-935](../planning-artifacts/epics.md):

1. **Given** Stories 4.2 + 4.4 (regression + lineage populated) **When** the Console campaign-tracker UI (existing route `/console/governance/campaign-tracker`) renders a campaign row **Then** the row exposes a "View attribution lineage" affordance opening a panel/popover showing the `lineage: EvangelistTransition[]` content (date, campaignId, transitionFrom→transitionTo).
2. **And** when the result is `INSUFFICIENT_DATA`, the panel shows the honest empty state per UX-DR10 (icon + cause + unlock path — e.g. "10 of 30 transitions observed; need 20 more").
3. **And** the panel composes existing primitives (`popover` / `dialog` + `timeline` + `kpi-grid`) — no new primitive.
4. **And** all reads via tenant-scoped procedure — no direct service-from-router.

## Tasks / Subtasks

- [x] **Task 1 — Tenant-scoped lineage resolver** (AC: #1, #4) — *EDIT [superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) Section 8*.
  - [x] 1.1 — `AttributionLineageView` discriminated union (`OK` { campaignId, score, evangelistCount, lineage, snapshotRef } | `INSUFFICIENT_DATA` { campaignId, minSamplesRequired, samplesAvailable } | `TENANT_MISMATCH` { campaignId }).
  - [x] 1.2 — `getAttributionLineage({ strategyId, campaignId })` : `campaign.findUnique` selects only `{ id, strategyId }` (DB-stale-safe) → tenant-guard (`TENANT_MISMATCH` if campaign not in strategy, throw-free) → delegates to `runAttribution` (Story 4.2) → derives `evangelistCount = lineage.filter(t => t.transitionTo === "Evangelist").length` (no `?? 0` fold — Story 4.8-safe).
- [x] **Task 2 — Export from service index** — *EDIT [campaign-tracker/index.ts](../../src/server/services/campaign-tracker/index.ts)* : surface `getAttributionLineage` + `runAttribution` + type guards + `AttributionResult` / `AttributionLineageView` / `EvangelistTransition` types (first consumer of `superfan-attribution.ts` from the index).
- [x] **Task 3 — tRPC query** (AC: #4) — *EDIT [campaign-tracker.ts router](../../src/server/trpc/routers/campaign-tracker.ts)* : `getAttributionLineage` on `auditedProtected` (hash-chained audit), input `{ strategyId, campaignId }`, delegates to the service function (no direct DB). Explicitly distinct from the Phase 19 `recomputeSuperfanAttribution` query above it.
- [x] **Task 4 — Console UI** (AC: #1, #2, #3) — *EDIT [console/governance/campaign-tracker/page.tsx](../../src/app/(console)/console/governance/campaign-tracker/page.tsx)*.
  - [x] 4.1 — `AttributionLineageSection` : strategy `<select>` (`trpc.strategy.list`) → campaign list (`trpc.campaign.list({ strategyId })`) → per-campaign expand button.
  - [x] 4.2 — `AttributionLineagePanel` : KPI grid (score / evangelistCount / transition count) + dated transition timeline (`from → to` + observedAt). Composes existing layout primitives (no new primitive) ; reuses the page's existing token conventions (app-level page, not under `src/components/**`).
  - [x] 4.3 — `INSUFFICIENT_DATA` honest empty state ("N of 30 transitions observed; M more to unlock"). `TENANT_MISMATCH` guard message.
- [x] **Task 5 — Verification** — `tsc --noEmit` clean ; `eslint` clean ; routes compile + render (browser-verified login + section present).

## Dev Notes

**Distinct from the Phase 19 heuristic.** The existing `recomputeSuperfanAttribution` query (Phase 19 Cluster C LTV heuristic, `superfan-economy.ts`) and the Phase 23 `getAttributionLineage` (calibration path, `superfan-attribution.ts`, ADR-0081) coexist deliberately. 4.6 reads the **calibration** path — the discriminated `AttributionResult` with the dated `EvangelistTransition[]` lineage.

**Tenant-safe without modifying `runAttribution`.** The resolver verifies `campaign.strategyId === input.strategyId` (selecting only `id` + `strategyId` — safe even against the stale-DB column issue) before delegating ; once ownership is proven, the by-`campaignId` `CampaignAction` query inside `runAttribution` is tenant-isolated. Throw-free `TENANT_MISMATCH` arm (Phase 23 P22-1/P22-2 convention) rather than a 500.

**`evangelistCount` is exact, never folded.** `lineage.filter(t => t.transitionTo === "Evangelist").length` — Story 4.8's `phase22-no-silent-zero` HARD test forbids `?? 0` on count fields. Zero only appears as a *measured* zero, never a fabricated one (the `INSUFFICIENT_DATA` arm structurally precedes any count derivation).

**"No new primitive" (AC #3).** There is no literal `timeline` / `kpi-grid` primitive in `src/components/primitives/` ; the AC's intent is "do not add a reusable primitive". The panel composes the KPI grid + transition timeline inline from existing layout/token conventions of the page. The Console page is app-level (`src/app/**`), not held to the strict DS-token prohibition that scopes `src/components/**` (the existing page already uses amber/emerald accent classes) ; the new section follows the same conventions for consistency.

### File List

- **EDIT** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — Section 8 : `AttributionLineageView` + `getAttributionLineage`.
- **EDIT** [src/server/services/campaign-tracker/index.ts](../../src/server/services/campaign-tracker/index.ts) — surface superfan-attribution exports.
- **EDIT** [src/server/trpc/routers/campaign-tracker.ts](../../src/server/trpc/routers/campaign-tracker.ts) — `getAttributionLineage` query.
- **EDIT** [src/app/(console)/console/governance/campaign-tracker/page.tsx](../../src/app/(console)/console/governance/campaign-tracker/page.tsx) — `AttributionLineageSection` + `AttributionLineagePanel`.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.15 entry (covers 4.6 + 4.7).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot per `_bmad-output/autopilot-phase-23.md`.

### Completion Notes List

- **AC #1–4 shipped.** Resolver + tRPC query + Console section. Read-only, tenant-scoped, audited.
- **Browser verification (partial, honest).** Dev server up ; admin login (`alexandre@upgraders.com`) succeeds ; `/console/governance/campaign-tracker` compiles (no Turbopack error) and renders with the "Attribution évangéliste" section + strategy picker present (confirmed in DOM + screenshot). **The live-data happy path (real lineage rows) could NOT be browser-verified** because the local dev DB has a pre-existing **failed migration** (`20260506122306_phase18_brand_tree`, P3009) leaving it 8 migrations behind — `campaign.list` 500s on auto-selected columns (e.g. `Campaign.attributionCoefficients` from Story 1.6's migration) that don't exist in the stale DB. The new section degrades gracefully (no React crash → "Aucune campagne" empty state). This is an **environment/ops blocker, pre-existing and out of Epic 4 scope** ; NOT auto-repaired (a failed-migration reset is risky and could lose seed data — flagged for Alexandre).
- **Code verified by all other gates** : `tsc --noEmit` clean, `eslint` clean, 87/87 campaign-tracker + phase22 tests green, DS + neteru-coherence anti-drift green.
- **Cap APOGEE 7/7 preserved** — no Neter touched, no new dep.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.6 shipped — `getAttributionLineage` resolver (tenant-guarded, throw-free) + tRPC query + Console `AttributionLineageSection`/`Panel` (strategy→campaign picker, KPI grid, dated transition timeline, honest INSUFFICIENT_DATA empty state). Distinct from Phase 19 heuristic. tsc + lint clean ; 87/87 tests. Browser: routes compile + section renders ; live-data path blocked by pre-existing failed dev-DB migration (out of scope, flagged). Cap APOGEE 7/7. Phase 23 Epic 4 5/8 → 6/8. | NEFER (Claude Opus 4.7) |
