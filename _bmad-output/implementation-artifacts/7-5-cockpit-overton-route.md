# Story 7.5: New Cockpit route `/cockpit/intelligence/overton` paid-tier + read-only gated

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 5/10)
APOGEE OS layer (ADR-0084): Apps (Layer 7 — route)
CODE-MAP grep: PAGE-MAP "overton" → reserved skeletal entry (Story 1.10) → finalize, no double.
Mission link: DIRECT_OVERTON — durable deliberate path to the sectoral Overton state (FR30).
```

## Acceptance Criteria

Verbatim [epics.md L1264-1271](../planning-artifacts/epics.md). Route mounts `<OvertonPanel />` ; route file = guards only, no business logic ; paid-tier gated (non-paid → upgrade prompt, not blank — FR32) ; reads tenant-scoped + refuses mutations by procedure type ; PAGE-MAP final entry ; Playwright e2e (→ Story 7.8).

## Tasks / Subtasks

- [x] **Task 1 — route** `app/(cockpit)/cockpit/intelligence/overton/page.tsx` — thin client page : header framing + `<OvertonPanel />`. Auth handled by the `(cockpit)` segment layout ; paid-tier gate is server-enforced inside `cockpitDashboard.overtonSignal` ; the query is read-only (`.query`, no mutation exposed) → FR32 "enforced by procedure type".
- [x] **Task 2 — non-paid UX** — handled by the panel's `TIER_GATE_DENIED` → upgrade `EmptyState` (never a blank page).
- [ ] **Task 3 — PAGE-MAP final entry** — folded into Story 7.10 closure map-updates (per epics.md map-updates mapping).
- [ ] **Task 4 — Playwright e2e** — authored in Story 7.8 (`overton-radar.a11y.spec.ts` + route render) ; live run done-with-debt.

## Dev Notes

Mirrors the established founder paid-tier surface pattern from Story 4.7 (`/cockpit/insights/attribution` mounting `EvangelistLineageView`) — gate in the query, CTA in the UI. No new portal-level concept.

### File List
- **NEW** [src/app/(cockpit)/cockpit/intelligence/overton/page.tsx](../../src/app/(cockpit)/cockpit/intelligence/overton/page.tsx)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). NEFER autopilot.

### Completion Notes List
- tsc + eslint clean. Route compiles. PAGE-MAP final entry + Playwright e2e deferred to 7.10 / 7.8 respectively (per epics.md).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.5 — Cockpit Overton route shipped (paid-tier + read-only gated). | NEFER (Claude Opus 4.7) |
