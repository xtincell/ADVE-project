# Story 7.1: Extend `<OvertonRadar>` props with `ConnectorResult<T>` + state union + `instance` CVA variant

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 7 · Story 1/10)
Owning Neter: Seshat (Overton instrument consumer) — UI under Mestor governance
APOGEE OS layer (ADR-0084): Apps (Layer 7 — components)
Manual-first parity (ADR-0060): n/a (presentational, read-only)
CODE-MAP grep: "Overton radar" → existing src/components/neteru/overton-radar.tsx (extend, not double) ;
  no JSX consumer in src/ (only neteru/index.ts re-export) → prop change is backward-safe.
Mission link: DIRECT_OVERTON — the founder's instrument for seeing the sector bend around them.
```

## Acceptance Criteria

Verbatim from [epics.md L1198-1206](../planning-artifacts/epics.md). Props `{ signal: ConnectorResult<…>; instance: "full" | "teaser"; density? }` ; `instance` drives layout via CVA (no inline ternary/join — third DS prohibition) ; state machine maps `LIVE`→live, `DEFERRED_AWAITING_CREDENTIALS`→degraded empty, `DEGRADED`→per-reason ; tsc green + existing consumers still compile ; co-located `.manifest.ts` + `.stories.tsx` updated.

## Tasks / Subtasks

- [x] **Task 1 — Typed props** — props driven entirely by `ConnectorResult<OvertonRadarSignal>` (P22-1, `@/domain`). No UI-only "is loading" boolean (UX-DR1). Exhaustive `switch (signal.state)` over all 3 branches (no `default`/`else`).
- [x] **Task 2 — `instance` CVA variant** — `overtonRadarVariants = cva(...)` with `instance: full | teaser` + `density: comfortable | compact`. No inline `.join`/ternary for layout.
- [x] **Task 3 — Manifest** — created `overton-radar.manifest.ts` (`defineComponentManifest`, v2.0.0, `missionContribution: DIRECT_OVERTON`, states union, `instance` variants).
- [x] **Task 4 — Stories** — created `overton-radar.stories.tsx` covering FullLive / TeaserLive / Deferred / Degraded / PerAxisPartial / TeaserDeferred.

## Dev Notes

**Why a component-local view-model, not `TarsisSignal`.** `TarsisSignal` is a Layer-3 server type (`server/services/seshat/tarsis/connector.ts`) — a `"use client"` component cannot import it (layering + client/server boundary). The epics.md AC's literal `ConnectorResult<TarsisSignal & EmbeddingDelta>` is illustrative ; `EmbeddingDelta` is not a real type (it's a field on `TarsisSignal`). The radar therefore consumes a presentational view-model `OvertonRadarSignal` (exported) composed at the tRPC boundary (Story 7.4). `ConnectorResult<T>` itself is Layer-0 (`@/domain`), importable everywhere. **Arbitrage logged** — chose a domain-faithful view-model over an un-importable literal type.

**Backward compat.** Grep found no JSX consumer of `<OvertonRadar>` in `src/` (only the `neteru/index.ts` re-export + a doc-comment mention in `sector-intelligence/index.ts`). The clean prop break is safe — verified by tsc.

### File List
- **EDIT** [src/components/neteru/overton-radar.tsx](../../src/components/neteru/overton-radar.tsx) — full rewrite, ConnectorResult-driven + CVA.
- **NEW** [src/components/neteru/overton-radar.manifest.ts](../../src/components/neteru/overton-radar.manifest.ts)
- **NEW** [src/components/neteru/overton-radar.stories.tsx](../../src/components/neteru/overton-radar.stories.tsx)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- tsc clean ; eslint clean ; DS anti-drift (cascade/canonical/cva) 5/5 green — no zinc/violet introduced.
- Visual verification (live browser) deferred to Story 7.8 (needs running app + seeded session).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Story 7.1 shipped — ConnectorResult-driven props + `instance` CVA variant + manifest + stories. | NEFER (Claude Opus 4.7) |
