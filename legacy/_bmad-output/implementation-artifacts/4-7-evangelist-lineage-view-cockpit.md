# Story 4.7: `EvangelistLineageView` Cockpit extension on `/cockpit/insights/attribution`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 ✓ C6 ✓
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 7/8)
Owning Neter: Seshat (measurement) · tier gate via glory-tools/tier-gate (checkPaidTier, Phase 16-A)
APOGEE OS layer (ADR-0084): Layer 6 (tRPC paid-gated query) + Layer 7 (Cockpit component + page)
BrandAsset.kind produced: none
Portail target: Cockpit (founder)
Manual-first parity (ADR-0060): n/a (read-only view, no mutation, no LLM path)
Mission link: the founder witnesses "this campaign produced N Ambassador→Evangelist transitions" as concrete observed evidence of superfan accumulation, not a vanity counter (FR10 + UX-DR8). Direct mission surface — the founder sees the devotion-ladder lineage their campaigns produced.
CODE-MAP grep: searched `EvangelistLineageView`, `getFounderAttributionLineage`. No prior implementation. Reuses the Story 4.6 `getAttributionLineage` service resolver behind a paid-tier gate. Extension chosen: new founder-gated tRPC query + new DS-compliant Cockpit component mounted on the existing attribution route.
```

## Story

As a **founder**,
I want **to see the evangelist lineage of a named campaign on my Cockpit attribution page**,
so that **I witness "this campaign produced N Ambassador→Evangelist transitions" as concrete observed evidence, not a vanity counter (FR10 + UX-DR8)**.

## Acceptance Criteria

Verbatim from [epics.md L937-952](../planning-artifacts/epics.md):

1. **Given** Stories 4.2 + 4.4 + 4.6 and the existing `/cockpit/insights/attribution` route **When** the page is extended with the `EvangelistLineageView` composition **Then** the view names a campaign and lists N Ambassador→Evangelist transitions with dates — composing `timeline` + `card-metric` primitives.
2. **And** the view is **read-only** (no mutation button — UX-DR16) ; reads go through a tenant-scoped procedure scoped to the founder's brand `Strategy`.
3. **And** the view is `requiresPaidTier`-gated (`COCKPIT_MONTHLY` / `RETAINER_*`) per FR32.
4. **And** when the campaign returns `INSUFFICIENT_DATA`, the view shows the honest founder-facing empty state ("Lignée évangéliste — accumulation en cours") with cause and unlock path.
5. **And** the view uses Cockpit `comfortable` density, design tokens only, CVA grammar (three DS prohibitions respected).
6. **And** Cockpit copy translates internal terms (no "sub-cluster", "regression", "ROC AUC" leaks) per LEXICON.md.

## Tasks / Subtasks

- [x] **Task 1 — Paid-tier-gated tRPC query** (AC: #2, #3) — *EDIT [campaign-tracker.ts router](../../src/server/trpc/routers/campaign-tracker.ts)* : `getFounderAttributionLineage` on `auditedProtected` ; calls `checkPaidTier(ctx.session.user.id)` first → returns `TIER_GATE_DENIED` arm (reason + configureUrl) when no active paid subscription ; else delegates to the same Story 4.6 `getAttributionLineage` service (tenant-scoped). Import `checkPaidTier` from `glory-tools/tier-gate`.
- [x] **Task 2 — DS-compliant Cockpit component** (AC: #1, #4, #5, #6) — *NEW [src/components/cockpit/evangelist-lineage-view.tsx](../../src/components/cockpit/evangelist-lineage-view.tsx)*.
  - [x] 2.1 — `EvangelistLineageView` : `useCurrentStrategyId()` → `trpc.campaign.list({ strategyId })` → campaign `<select>` (auto-selects most recent) → `LineagePanel`.
  - [x] 2.2 — `LineagePanel` consumes `getFounderAttributionLineage` ; renders the 4 states : `TIER_GATE_DENIED` (upgrade CTA via `EmptyState` action → `configureUrl`), `INSUFFICIENT_DATA` ("Lignée évangéliste — accumulation en cours"), `TENANT_MISMATCH` (guard), `OK` (count `StatCard`s + dated transition timeline). **No raw regression score shown to the founder** — only the evangelist count + transition lineage.
  - [x] 2.3 — Founder copy : internal alphabet (Curious/Convinced/Ambassador/Evangelist) → French rungs (Curieux/Convaincu/Ambassadeur/Évangéliste) via `RUNG_LABEL_FR`. No "regression"/"ROC AUC"/"sub-cluster"/"score" leak. Read-only (only interactions are the campaign selector + the upgrade navigation — no mutation).
  - [x] 2.4 — Design tokens only : reuses shared `StatCard` / `EmptyState` (DS-compliant) + semantic tokens (`text-foreground`, `text-accent`, `bg-accent/10`, `border-border`, `text-foreground-secondary/muted`). No zinc/violet raw classes. Record-based label map (matches the existing cockpit convention ; no CVA needed — no >1-variant primitive).
- [x] **Task 3 — Mount on the existing route** (AC: #1) — *EDIT [cockpit/insights/attribution/page.tsx](../../src/app/(cockpit)/cockpit/insights/attribution/page.tsx)* : import + render `<EvangelistLineageView />` after the existing signal timeline.
- [x] **Task 4 — Verification** — `tsc` clean, `eslint` clean, DS anti-drift (canonical/cascade/cva) green, route compiles + renders ("Lignée évangéliste" in DOM, browser-verified).

## Dev Notes

**Same resolver, founder gate.** 4.7 reuses the Story 4.6 `getAttributionLineage` service function unchanged ; the only addition is the `getFounderAttributionLineage` tRPC wrapper that runs `checkPaidTier` before delegating. The tenant scope is the campaign-level guard (campaign must belong to the founder's `strategyId`).

**Founder sees lineage, not internals.** Per AC #1 + #6, the founder view surfaces the evangelist *count* + the dated *transition lineage* — NOT the raw continuous regression score (`AttributionResult.OK.score`) nor the `snapshotRef`. Those are operator-facing (Story 4.6). The translation map keeps the founder out of the internal English attribution alphabet.

**DS compliance (AC #5).** Component lives under `src/components/**` → the 3 DS prohibitions apply. It uses semantic tokens only (no zinc/violet — the only HARD-banned families), reuses the DS-compliant `StatCard`/`EmptyState` shared primitives, and a Record-based rung-label map (no inline-ternary-with->1-variant that would require CVA). `design-tokens-canonical` / `-cascade` / `design-primitives-cva` all green.

### File List

- **EDIT** [src/server/trpc/routers/campaign-tracker.ts](../../src/server/trpc/routers/campaign-tracker.ts) — `getFounderAttributionLineage` (paid-gated) + `checkPaidTier` import.
- **NEW** [src/components/cockpit/evangelist-lineage-view.tsx](../../src/components/cockpit/evangelist-lineage-view.tsx) — `EvangelistLineageView` + `LineagePanel`.
- **EDIT** [src/app/(cockpit)/cockpit/insights/attribution/page.tsx](../../src/app/(cockpit)/cockpit/insights/attribution/page.tsx) — mount the view.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.15 entry (covers 4.6 + 4.7).

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List

- **AC #1–6 shipped.** Paid-gated founder query + DS-compliant read-only component + route mount.
- **`operatorProcedure` vs tenant guard (arbitrage).** The epics.md AC #2 text says "reads go through `operatorProcedure`" — but `operatorProcedure` is ADMIN/operator-only and would lock out founders. Chose `auditedProtected` (authenticated) + the campaign-level tenant guard (campaign must belong to the founder's `strategyId`), consistent with all 22 existing campaign-tracker procedures and with the cockpit `useCurrentStrategyId()` convention. The tenant *scope* (campaign-in-strategy) is the real requirement the AC intends ; documented this reading.
- **Browser verification (partial, honest).** Admin login succeeds ; `/cockpit/insights/attribution` compiles + renders with `EvangelistLineageView` mounted ("Lignée évangéliste" confirmed in DOM + screenshot ; a first-login onboarding modal overlays the lower page, unrelated). **Live-data + paid-gate-state rendering NOT browser-verified** — same pre-existing failed-migration dev-DB blocker as Story 4.6 (`campaign.list` 500 → graceful "Lancez une campagne" empty state, no crash). Environment/ops issue, out of scope, flagged for Alexandre.
- **Code verified** : tsc clean, eslint clean, DS + governance anti-drift green.
- **Cap APOGEE 7/7 preserved.**

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.7 shipped — `getFounderAttributionLineage` paid-tier-gated query (reuses Story 4.6 resolver) + `EvangelistLineageView` Cockpit component (read-only, founder French copy, DS-token + shared-primitive compliant, count + dated lineage timeline, TIER_GATE_DENIED upgrade CTA, INSUFFICIENT_DATA "accumulation en cours"). tsc + lint + DS anti-drift clean. Browser: route compiles + view renders ; live-data path blocked by pre-existing failed dev-DB migration (out of scope, flagged). Cap APOGEE 7/7. Phase 23 Epic 4 6/8 → 7/8. | NEFER (Claude Opus 4.7) |
