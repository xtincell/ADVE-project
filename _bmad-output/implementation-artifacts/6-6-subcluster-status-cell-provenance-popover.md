# Story 6.6: `SubClusterStatusCell` + `ProvenancePopover` Phase-22 pattern components

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 6 · Story 6/7)
Owning Neter: Seshat (pivot signal surface) — UI composition under Mestor governance
APOGEE OS layer (ADR-0084): Apps (Layer 7 — components)
Manual-first parity (ADR-0060): n/a (read-only status indicators)
CODE-MAP grep: COMPONENT-MAP "Provenance" / "status triad" → patterns reserved Epic 6 ; no existing
  component duplicates ; composes existing `badge` + `popover` primitives (no new primitive, UX-DR3).
```

## Story

As an UPgraders operator, I want one reusable status-cell component (colour + shape + label triad + lifecycle stage + signal freshness + DEFERRED "configure connector" cross-link) and one provenance-popover (one-hop "where from"), so every status indicator and score reads consistently and traces to its source in one hop (UX-DR6 + UX-DR7 + UX-DR12).

## Acceptance Criteria

Verbatim from [epics.md L1162-1170](../planning-artifacts/epics.md). `SubClusterStatusCell` props `{ subClusterSlug, lifecycleState, connectorResult, lastSignalAt }` rendering colour + shape + text triad (status `badge`) ; `DEFERRED_AWAITING_CREDENTIALS` → "Configure connector" link to `/console/anubis/credentials` ; `ProvenancePopover` composes `popover` primitive (no new primitive), props `{ source, refUrl }` rendering source + one-hop link ; both documented in COMPONENT-MAP.md as Phase-22 reusable patterns ; design tokens only + CVA + keyboard-navigable + axe-clean.

## Tasks / Subtasks

- [x] **Task 1 — `SubClusterStatusCell`** — triad via `Badge` primitive (lifecycle tone+icon+label) + connector signal triad derived **exhaustively** from `ConnectorResult<T>` (LIVE/DEFERRED/DEGRADED, no `default else`) + freshness line. `DEFERRED` → info tone + cross-link to the Credentials Vault.
- [x] **Task 2 — `ProvenancePopover`** — thin composition over `popover` primitive ; `source` ∈ tarsis-signal | crm-signal | calibration-snapshot | manual-entry drives label+icon ; one-hop `Link` to `refUrl`.
- [x] **Task 3 — DS rigour** — semantic tokens only (no zinc/violet/raw colour), focus handled by the global `:focus-visible` outline (no broken `--focus-ring-color` ref), native `<button>`/`<a>` keyboard-navigable + `aria-hidden` on decorative icons.
- [x] **Task 4 — COMPONENT-MAP** — Phase 23 reusable-patterns section flipped to SHIPPED + Epic 6 composition-components table added.

## Dev Notes

**No new primitive.** Both compose existing primitives (`badge`, `popover`) per UX-DR3. They live under `src/components/cockpit/governance/` (shared by Console hub views + Cockpit Epic 7 surfaces).

**Status triad = colour + shape + text** (UX-DR12 / DESIGN-A11Y) — the `Badge` tone gives colour, a lucide icon gives shape, the label gives text. Colour is never the sole carrier.

**`DEFERRED` is info tone, never warning/error** — ship-without-keys is an expected state (UX-DR12 / `ConnectorResult` doc).

**Focus ring** — the project applies a global `:focus-visible` outline (`globals.css`) on `--color-ring` ; no per-element ring class needed. An earlier draft referenced a non-existent `--focus-ring-color` token — removed.

### File List
- **NEW** [src/components/cockpit/governance/sub-cluster-status-cell.tsx](../../src/components/cockpit/governance/sub-cluster-status-cell.tsx)
- **NEW** [src/components/cockpit/governance/provenance-popover.tsx](../../src/components/cockpit/governance/provenance-popover.tsx)
- **EDIT** [docs/governance/COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md) — Phase 23 patterns SHIPPED + component table.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean ; 888 governance/campaign-tracker/mestor tests green (no regression). Consumed by Story 6.5 hub views + Story 6.4 panel.
- Live browser verification recommended against CIMENCAM but not run in this autopilot pass (Console route needs an authenticated session) — code is tsc + lint + anti-drift verified.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 6.6 shipped — SubClusterStatusCell + ProvenancePopover (Phase-22 reusable patterns). | NEFER (Claude Opus 4.7) |
