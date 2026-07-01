# Story 7.7: Wire `cockpitNavGroups` "Intelligence" group entry

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 7/10)
APOGEE OS layer (ADR-0084): Apps (Layer 7 — nav config)
Mission link: DIRECT_OVERTON — MISSION §9 "every founder sees the sectoral Overton axis" needs a deliberate nav path.
```

## Acceptance Criteria

Verbatim [epics.md L1297-1302](../planning-artifacts/epics.md). New "Intelligence" group in `cockpitNavGroups` with one entry → `/cockpit/intelligence/overton` (label "Overton sectoriel", no internal vocabulary leak) ; positioned consistent with portal IA (after Insights, before Settings/Messages) ; active state via existing nav patterns ; keyboard-reachable via existing skip pattern.

## Tasks / Subtasks

- [x] **Task 1 — nav group** — added `{ title: "Intelligence", items: [{ href: "/cockpit/intelligence/overton", label: "Overton sectoriel", icon: Radar }] }` to `cockpitNavGroups` after the "Insights" group, before the trailing Messages group. `Radar` icon already imported.

## Dev Notes

Active state + keyboard nav + skip pattern are provided by the shared sidebar renderer that consumes `NavGroup[]` — no per-entry wiring needed (consistent with all other cockpit nav entries). Label uses founder-facing French ("Overton sectoriel"), not internal terms (Tarsis / connector / sub-cluster).

### File List
- **EDIT** [src/components/navigation/portal-configs.ts](../../src/components/navigation/portal-configs.ts) — `cockpitNavGroups` Intelligence group.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc + eslint clean.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.7 — cockpit "Intelligence" nav group → Overton route. | NEFER (Claude Opus 4.7) |
