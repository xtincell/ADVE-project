# Story 7.2: Implement A2 Split layout + container queries

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 2/10)
APOGEE OS layer (ADR-0084): Apps (Layer 7)
Mission link: DIRECT_OVERTON — dated concrete evidence above the fold.
```

## Acceptance Criteria

Verbatim [epics.md L1214-1223](../planning-artifacts/epics.md). `instance: "full"` → A2 Split (radar left, dated evidence feed right) ; `instance: "teaser"` → compact (radar shrinks, top evidence = headline) ; reflow via `@container` queries not viewport (UX-DR19) ; stacks below split threshold ; design tokens + CVA only ; Playwright visual baselines `md`/`lg`/`xl` (UX-DR24).

## Tasks / Subtasks

- [x] **Task 1 — A2 Split** — `instance="full"` renders `grid grid-cols-1 @md:grid-cols-2`: `RadarPlot` left, `EvidenceFeed` right (dated imitations list + unpaid-press feed + vocab/embedding metric cells).
- [x] **Task 2 — Teaser reflow** — `instance="teaser"` stacks radar + compact evidence (top claim becomes the headline). Root carries `@container`; reflow is container-driven, not viewport — same component, two instances (UX-DR19).
- [x] **Task 3 — Tokens + CVA** — layout via the CVA `instance` variant + semantic tokens only.
- [ ] **Task 4 — Playwright visual baselines** — spec authored in Story 7.8 (`overton-radar.a11y.spec.ts` + visual regression). **Baseline PNG generation deferred** — needs a running dev server + browser (see RESIDUAL-DEBT Phase 23 closure).

## Dev Notes

**Reconciling the AC's "4 named axes" with the real data model.** epics.md frames the radar's axes as *vocabulary overlap / claim imitation / unpaid press / embedding delta*. The genuine Overton instrument is the **sector-axis polar plot** (`sectorAxis.tags` vs `brandTags`, real `sector-intelligence` data). The 4 Tarsis named signals are surfaced as the **dated evidence feed + metric cells** (right column). This honours both the existing real-data radar and the AC's "dated named evidence above the fold" without fabricating axes. **Arbitrage logged.**

**`streaming-feed` primitive does not exist** — the unpaid-press feed is a semantic `<ul>`/`<time>` list (dated). `timeline` (`src/components/shared/timeline.tsx`) was considered but the inline dated `<ol>` keeps the A2 column compact and token-only. No new primitive (UX-DR3).

### File List
- **EDIT** [src/components/neteru/overton-radar.tsx](../../src/components/neteru/overton-radar.tsx) — A2 split + `@container` + `EvidenceFeed`/`MetricCell`.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc + eslint clean. `@container`/`@md:` confirmed supported (existing use in `campaign-tracker-hub.tsx`).
- Visual-regression baselines = **done-with-debt** (calendar-locked in RESIDUAL-DEBT Phase 23 closure — needs live browser, consistent with prior-epic dev-DB/browser blocker).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.2 — A2 split + container-query reflow shipped ; visual baselines deferred to live run. | NEFER (Claude Opus 4.7) |
