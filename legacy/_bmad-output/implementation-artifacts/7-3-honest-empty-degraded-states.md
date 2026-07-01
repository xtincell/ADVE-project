# Story 7.3: Implement honest empty / degraded states across all radar conditions

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 3/10)
APOGEE OS layer (ADR-0084): Apps (Layer 7)
Mission link: DIRECT_OVERTON — "not configured" looks intentional, not broken (FR31).
```

## Acceptance Criteria

Verbatim [epics.md L1231-1240](../planning-artifacts/epics.md). `DEFERRED_AWAITING_CREDENTIALS` → honest empty (cause + situation, no operator action since founders can't configure connectors FR32) ; `DEGRADED` reasons (VENDOR_OUTAGE/RATE_LIMITED/AUTH_REVOKED) each get a cause line ; tone = info not warning (UX-DR12) ; per-axis partial (live axes render, absent axes carry own empty) ; **same footprint** as populated (no layout jump) ; founder-facing copy, no `DEFERRED_AWAITING_CREDENTIALS` string leak ; a11y keyboard + screen-reader cause.

## Tasks / Subtasks

- [x] **Task 1 — `HonestState`** — shared degraded/empty renderer (`role="status"`, icon + title + description, info tone). Min-height matches populated radar (`min-h-[340px]` full / `[220px]` teaser) → no layout jump on DEFERRED ↔ LIVE.
- [x] **Task 2 — DEFERRED copy** — `DEFERRED_COPY` founder-facing FR ("Source signal en attente d'activation"). No internal state string leak. No operator action (FR32).
- [x] **Task 3 — DEGRADED per-reason** — `DEGRADED_COPY` map: 4 `ConnectorDegradationReason`s → distinct title/description/icon. INSUFFICIENT_DATA also used when `sectorAxis` null / 0 tags.
- [x] **Task 4 — Per-axis partial** — within LIVE, absent Tarsis axes (`vocabularyOverlap`/`embeddingDelta` undefined, empty imitation/press lists) render `MetricCell` "en attente" / "Aucune … sur la fenêtre" instead of a fabricated zero (no-magic-fallback, ADR-0046).
- [x] **Task 5 — a11y** — `HonestState` `role="status"`, decorative icon `aria-hidden`; radar `<svg role="img">` + offscreen data table (carried for Story 7.8).

## Dev Notes

**No-magic-fallback (ADR-0046 / P22-2).** Absent metric → italic "en attente", never `0`/"—" the founder could read as a real value.

**`EmptyState` shared primitive** (`src/components/shared/empty-state.tsx`) was considered but its `action.onClick` is a client handler and founders have no connector action — `HonestState` is a thin token-only renderer matching the radar footprint exactly. No new primitive.

### File List
- **EDIT** [src/components/neteru/overton-radar.tsx](../../src/components/neteru/overton-radar.tsx) — `HonestState`, `DEFERRED_COPY`, `DEGRADED_COPY`, `MetricCell` partial state.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc + eslint clean ; DS anti-drift 5/5 green.
- Same-footprint asserted via min-height; visual confirmation in Story 7.8 live run.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.3 — honest DEFERRED/DEGRADED/per-axis states shipped. | NEFER (Claude Opus 4.7) |
