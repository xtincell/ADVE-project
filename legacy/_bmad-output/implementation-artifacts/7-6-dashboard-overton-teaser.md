# Story 7.6: Compact `<OvertonRadar>` teaser in `/cockpit` dashboard bento

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 6/10)
APOGEE OS layer (ADR-0084): Apps (Layer 7)
Mission link: DIRECT_OVERTON — contextual discovery (Journey 3) ; founder notices sector movement.
```

## Acceptance Criteria

Verbatim [epics.md L1281-1287](../planning-artifacts/epics.md). Compact `<OvertonRadar instance="teaser" />` in the dashboard bento (container-query reflow) ; "new activity" cue + one-line headline when signal moved ; click-through to `/cockpit/intelligence/overton` ; compact honest empty state when degraded (same footprint) ; respects Cockpit `comfortable` density.

## Tasks / Subtasks

- [x] **Task 1 — `OvertonTeaser`** (exported from `overton-panel.tsx`) — reuses `cockpitDashboard.overtonSignal` query, renders `<OvertonRadar instance="teaser" />` wrapped in a `next/link` to the full route ; focus-visible ring.
- [x] **Task 2 — new-activity cue** — "Nouveau" badge when LIVE evidence carries a dated claim-imitation (the top claim is the headline inside the teaser). Returns `null` on no-strategy / no-data / tier-denied (the dashboard already gates content) → no bento jump.
- [x] **Task 3 — wire into dashboard** — inserted in the radar/intelligence column of `/cockpit` (`showSection("radar")`), after the Oracle access link.

## Dev Notes

**"New activity" cue is MVP-derived, not last-visit-tracked.** A per-founder last-visit timestamp would need persistence (a `FounderSurfaceVisit` model or a localStorage hook). For MVP the cue derives from the presence of dated evidence (a claim-imitation) — honest (the sector did echo the brand) without new schema. A true since-last-visit diff is **deferred** (RESIDUAL-DEBT Phase 23 closure, Growth carry-over). **Arbitrage logged.**

The teaser reuses the radar's `instance="teaser"` CVA variant (Story 7.2) — one component, two instances, container-query reflow (UX-DR19) ; no divergent teaser component.

### File List
- **EDIT** [src/components/cockpit/intelligence/overton-panel.tsx](../../src/components/cockpit/intelligence/overton-panel.tsx) — `OvertonTeaser`.
- **EDIT** [src/app/(cockpit)/cockpit/page.tsx](../../src/app/(cockpit)/cockpit/page.tsx) — teaser in the radar column.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc + eslint clean ; governance suite green.
- Live browser verification of the bento placement deferred (RESIDUAL-DEBT Phase 23 closure, DB seeded).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.6 — dashboard Overton teaser + new-activity cue shipped. | NEFER (Claude Opus 4.7) |
