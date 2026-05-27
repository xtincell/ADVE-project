# Story 3.4: Wire `culture.tarsisBridge` to feed `sector-intelligence.refreshSectorOverton`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 4/8)
Owning Neter: Seshat (Telemetry §4.3) — Tarsis signal flows into the canonical Overton engine through this bridge
APOGEE OS layer (ADR-0084): Layer 5 — Services (campaign-tracker orchestrator)
BrandAsset.kind produced: none (Telemetry — persists `Sector` snapshots via sector-intelligence)
Portail target: none runtime — handler in [signals-culture.ts bridgeTarsisToSectorIntelligence](../../src/server/services/campaign-tracker/signals-culture.ts)
Manual-first parity (ADR-0060): n/a — bridge is signal plumbing
Mission link: The **only runtime import path** `campaign-tracker → seshat/tarsis/connector` lives in this function (architecture §"One-way data flow"). Without it, Stories 3.2 + 3.3 would have nothing real to delegate to — `sector-intelligence` would always see an empty Sector. With it, the Tarsis mock (Phase 23 ship-without-keys) lands a `_mocked: true` empty payload into the canonical engine, downstream readiness/shift see empty axes, render their honest INSUFFICIENT_DATA states. Once real SDK lands in a follow-up PR, the same bridge ingests real Tarsis observations without code change. Direct contribution to superfans × Overton.
CODE-MAP grep: searched "bridgeTarsisToSectorIntelligence", "culture.tarsisBridge", "tarsis bridge function" across `src/`. Hits: 0 prior. Pattern : campaign-tracker is the ONLY module importing seshat/tarsis/connector at runtime (the other Phase 23 consumers — sector-intelligence — use type-only imports per architecture §boundaries).
```

## Story

As an **UPgraders operator**,
I want **`culture.tarsisBridge` to pull signal from the Tarsis connector and hand it to `sector-intelligence.refreshSectorOverton`**,
so that **real sectoral signal accrues into the `Sector` model that `overtonShift`/`overtonReadiness` consume**.

## Acceptance Criteria

Verbatim from [epics.md L760-773](../planning-artifacts/epics.md):

1. **Given** Stories 2.2 (Tarsis façade) + 3.1 (sector-intelligence accepts ConnectorResult)
   **When** `services/campaign-tracker/signals-culture.ts` `culture.tarsisBridge` handler is extended
   **Then** the handler calls `tarsisConnector.fetchSectorSignal(operatorId, sectorSlug)`, switches on `ConnectorResult.state` exhaustively, and on `LIVE` invokes `sector-intelligence.refreshSectorOvertonFromConnector({ slug, signals })`.

2. **And** on `DEFERRED_AWAITING_CREDENTIALS` and `DEGRADED`, the handler emits a telemetry note (via `bestEffort()` per NFR10) and returns `INSUFFICIENT_DATA` — no fake signal injection.

3. **And** the handler imports `tarsisConnector` from `services/seshat/tarsis/connector` ; this is the only place that imports the connector from `campaign-tracker/` (one-way data flow per architecture §boundaries).

4. **And** `capability-state.ts` for `culture.tarsisBridge` lifts to `MVP` with `childAdr: "0078"`.

## Tasks / Subtasks

- [x] **Task 1 — Runtime import (the only one campaign-tracker makes of Tarsis)** (AC: #3) — *EDIT [signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts)*.
  - [x] 1.1 — `import { fetchSectorSignal as tarsisFetchSectorSignal } from "@/server/services/seshat/tarsis/connector"` — runtime, not type-only.

- [x] **Task 2 — `bridgeTarsisToSectorIntelligence(input)` 3-state switch** (AC: #1, #2) — *NEW function*.
  - [x] 2.1 — Call `tarsisFetchSectorSignal(operatorId, sectorSlug)`.
  - [x] 2.2 — Switch on `result.state` exhaustively :
    - `LIVE` → invoke `sectorIntelligence.refreshSectorOvertonFromConnector({ slug: sectorSlug, signals: result })`. Returns `connectorState: "LIVE"`.
    - `DEFERRED_AWAITING_CREDENTIALS` → emit telemetry `bestEffort()` log, return `{ connectorState: "DEFERRED", reason: "AWAITING_CREDENTIALS" }`.
    - `DEGRADED` → emit telemetry `bestEffort()` log, return `{ connectorState: "DEGRADED", reason: result.reason }`.
    - On `SKIPPED` (from refreshSectorOvertonFromConnector) → `connectorState: "SKIPPED"`.
  - [x] 2.3 — `bestEffort()` per NFR10 — telemetry emit failures never fail the underlying Intent.

- [x] **Task 3 — `capability-state.ts` lifecycle promotion** (AC: #4).
  - [x] 3.1 — `culture.tarsisBridge` : `STUB → MVP` ; `childAdr: "0078"`.

- [x] **Task 4 — Verification** (AC: all).
  - [x] 4.1 — `tsc --noEmit` green.
  - [x] 4.2 — `phase22-connector-result.test.ts` 9/9 still green (the bridge file is now in the assertion surface).
  - [x] 4.3 — Smoke test : during Phase 23 mock period, the bridge receives a `_mocked: true` empty TarsisSignal LIVE → invokes sector-intelligence refresh → sector axis remains empty → downstream `measureOvertonShift` sees `INSUFFICIENT_SECTOR_AXIS` → returns `overtonShiftScore: null`. Honest end-to-end empty state.

## Dev Notes

### Relevant architecture patterns and constraints

**The unique seam : campaign-tracker → seshat/tarsis (runtime)** — per ADR-0078 §"Seam ownership" : `sector-intelligence` is canonical, pure data-in/data-out, never imports the connector at runtime. The ONLY runtime import path `campaign-tracker → seshat/tarsis/connector` lives in this bridge. Any other file that runtime-imports the Tarsis connector is a layering violation — covered by `phase22-connector-result.test.ts` HARD assertion scoping.

**`bestEffort()` telemetry pattern (NFR10)** — telemetry emit failures must NEVER fail the underlying Intent. The bridge wraps every telemetry emit in `bestEffort()` ; a NSP server timeout, a logging-service outage, a transient DB issue on the audit trail — none of these can take down the Overton signal pipeline. Inherited from Phase 21 F-E (ADR-0072).

**Phase 23 mock period end-to-end** — when Tarsis mock returns `LIVE + _mocked: true + empty axes`, the bridge correctly invokes `sector-intelligence.refreshSectorOvertonFromConnector`. The engine sees empty signal → persists empty Sector. Downstream `measureOvertonShift` reads the empty sector axis → returns `overtonShiftScore: null + degradationCode: "INSUFFICIENT_SECTOR_AXIS"`. The founder's Cockpit renders "Overton signal en attente d'activation Tarsis" — honest. No fabricated number anywhere in the pipeline.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) | **EDIT** | NEW `bridgeTarsisToSectorIntelligence` + runtime import. |
| capability-state.ts | **EDIT** | `culture.tarsisBridge` STUB → MVP, childAdr 0078. |

### References

- [Source: _bmad-output/planning-artifacts/epics.md L760-773](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md §"Seam ownership"](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: _bmad-output/implementation-artifacts/2-2-tarsis-connector-facade.md](./2-2-tarsis-connector-facade.md)
- [Source: _bmad-output/implementation-artifacts/3-1-sector-intelligence-accept-connector-result.md](./3-1-sector-intelligence-accept-connector-result.md)

### Git intelligence summary

```
0022de0 feat(seshat): phase 23 delegate culture.overton* sub-clusters to sector-intelligence   ← Stories 3.2 + 3.3 + 3.4 bundled ship commit
```

### Project context reference

**Story 4 of Phase 23 Epic 3.** The closing story of the "three culture.overton* sub-clusters at MVP" bundle. With Stories 3.1 + 3.2 + 3.3 + 3.4 all merged, the Overton mechanic is end-to-end honest : Tarsis signal flows through the canonical engine to the campaign-tracker scores ; mock period renders honest empty states ; real SDK landing produces real scores without code change.

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`.

### Debug Log References

- AC #1 (3-state switch + LIVE invokes refresh) — shipped: commit `0022de0`.
- AC #2 (bestEffort telemetry + INSUFFICIENT_DATA on DEFERRED/DEGRADED) — shipped.
- AC #3 (sole runtime import of tarsis connector) — shipped.
- AC #4 (capability-state STUB → MVP + childAdr 0078) — shipped.

### Completion Notes List

- **AC #1–4 shipped** in commit `0022de0` (bundled with Stories 3.2 + 3.3).
- **NEFER 8-phase compliance**: all 8 ticked.
- **Cap APOGEE 7/7 preserved**.
- **Manual-first parity (ADR-0060)** — n/a (signal plumbing).
- **Mission link**: closes the seam from Tarsis to the canonical Overton engine. Pattern P22-1 is end-to-end live for the Overton mechanic.

### File List

- **EDIT** [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) — NEW `bridgeTarsisToSectorIntelligence` + runtime import of Tarsis connector.
- **EDIT** capability-state.ts — `culture.tarsisBridge` STUB → MVP, childAdr 0078.
- **EDIT** [_bmad-output/implementation-artifacts/3-4-culture-tarsis-bridge.md](./3-4-culture-tarsis-bridge.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 3.4 shipped (bundled in commit `0022de0` with Stories 3.2 + 3.3) — `bridgeTarsisToSectorIntelligence()` : the unique runtime seam from `campaign-tracker` to `seshat/tarsis/connector`. Exhaustive 3-state switch ; `bestEffort()` telemetry per NFR10 ; mock period end-to-end honest empty state. capability-state STUB → MVP + childAdr 0078. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 3/8 → 4/8. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
