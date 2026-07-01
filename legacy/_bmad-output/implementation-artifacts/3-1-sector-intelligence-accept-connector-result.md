# Story 3.1: Extend `sector-intelligence/` to accept `ConnectorResult<TarsisSignal>`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 1/8)
Owning Neter: Seshat (Telemetry §4.3 ; `sector-intelligence/` is the canonical Overton engine per ADR-0078)
APOGEE OS layer (ADR-0084): Layer 5 — Services (pure data-in/data-out helpers, depends on Layer 0 ConnectorResult + Layer 5 TarsisSignal type-only)
BrandAsset.kind produced: none (Telemetry — persists `Sector` snapshots)
Portail target: none runtime — extension at [src/server/services/sector-intelligence/index.ts](../../src/server/services/sector-intelligence/index.ts) ; consumed at runtime by Story 3.4 `bridgeTarsisToSectorIntelligence`
Manual-first parity (ADR-0060): n/a — Telemetry data pipeline, no LLM, manual peer mode lives on the delta-tagging side (Story 3.7)
Mission link: ADR-0078 §"Décision" makes `sector-intelligence/` the **canonical Overton home**. Without this story, `campaign-tracker/culture.overton*` would have to invent its own connector consumption ; with it, the campaign-tracker layer becomes a thin orchestration over the canonical engine. Removes the Phase 19 Jaccard placebo from the Overton mechanic — the founder's "État Overton sectoriel" stops being placebo at the source. Direct contribution to superfans × Overton.
CODE-MAP grep: searched "refreshSectorOvertonFromConnector", "sector-intelligence accept ConnectorResult", "Overton ingestion" across `src/`. Hits: 0 prior. Pre-existing `refreshSectorOverton(input)` is the legacy seed/test entrypoint — kept unchanged for backward compat per ADR-0078 §"Stratégie de transition". Extension chosen: NEW function `refreshSectorOvertonFromConnector` alongside the legacy ; type-only import of `ConnectorResult<TarsisSignal>` preserves the one-way data flow.
```

## Story

As a **NEFER operator**,
I want **`sector-intelligence/index.ts` extended to consume `ConnectorResult<TarsisSignal>` as input (data-in / data-out, pure)**,
so that **the canonical Overton engine integrates with the Tarsis connector through the standardised shape, without `sector-intelligence/` ever importing the connector module at runtime (one-way data flow per architecture §Architectural Boundaries)**.

## Acceptance Criteria

Verbatim from [epics.md L715-727](../planning-artifacts/epics.md):

1. **Given** Story 2.2 (Tarsis façade) and Story 1.3 (`ConnectorResult<T>`)
   **When** `services/sector-intelligence/index.ts` is extended
   **Then** `refreshSectorOvertonFromConnector(input: { slug; signals: ConnectorResult<TarsisSignal> })` accepts the discriminated union exhaustively (LIVE → updates `Sector` ; DEFERRED → no-op + emits log ; DEGRADED → no-op + emits log).

2. **And** `sector-intelligence/` does NOT import `services/seshat/tarsis/connector` at runtime (asserted by type-only `import type` directive — TypeScript erases at compile time).

3. **And** the manifest is unchanged in this story (no new Intent kind required ; `sector-intelligence/` exposes plain helpers consumed by `campaign-tracker/` orchestrators).

4. **And** existing `getSectorAxis` / `detectDrift` / `computeBrandDeflection` functions are unchanged in signature (Epic 3 wires them, does not refactor them).

5. **And** Vitest unit tests cover the three input states with mocked `Sector` writes.

## Tasks / Subtasks

- [x] **Task 1 — Type-only imports** (AC: #2) — *EDIT [index.ts L1-15](../../src/server/services/sector-intelligence/index.ts)*.
  - [x] 1.1 — `import type { ConnectorResult } from "@/domain"` — type-only, erased at compile time.
  - [x] 1.2 — `import type { TarsisSignal } from "@/server/services/seshat/tarsis/connector"` — type-only ; preserves architecture D2 "no runtime import."

- [x] **Task 2 — `refreshSectorOvertonFromConnector` exhaustive 3-state switch** (AC: #1) — *NEW function*.
  - [x] 2.1 — `LIVE` → map TarsisSignal → legacy signal shape via `tarsisSignalToLegacySignals(signal)` helper → call `computeAxisFromSignals` + `computeNarratives` → persist `Sector` snapshot → return `{ state: "REFRESHED", snapshot }`.
  - [x] 2.2 — `DEFERRED_AWAITING_CREDENTIALS` → return `{ state: "SKIPPED", reason: "AWAITING_CREDENTIALS" }` ; zero DB write.
  - [x] 2.3 — `DEGRADED` → return `{ state: "SKIPPED", reason: "DEGRADED_INPUT" }` ; zero DB write.
  - [x] 2.4 — Discriminated `RefreshFromConnectorResult` return union exported for consumers.

- [x] **Task 3 — `tarsisSignalToLegacySignals` mapper helper** (AC: #1) — *NEW @internal export*.
  - [x] 3.1 — Maps `TarsisSignal { vocabularyOverlap, claimImitations, unpaidPress, embeddingDelta }` → existing `{ tags?, narrative?, weight? }[]` shape consumed by `computeAxisFromSignals`.
  - [x] 3.2 — Minimal mapping (Phase 23 MVP) — can mature post-MVP without breaking the discriminated-union contract.

- [x] **Task 4 — Legacy compatibility** (AC: #4) — *no changes to existing exports*.
  - [x] 4.1 — `refreshSectorOverton(input)` legacy function unchanged ; seed scripts + tests continue to function.
  - [x] 4.2 — `getSectorAxis` / `detectDrift` / `computeBrandDeflection` signatures unchanged.

- [x] **Task 5 — Verification** (AC: all).
  - [x] 5.1 — `tsc --noEmit` clean project-wide.
  - [x] 5.2 — `phase22-connector-result.test.ts` HARD : 9/9 passed in <300ms.
  - [x] 5.3 — `neteru-coherence.test.ts` (Cap APOGEE 7/7) green.
  - [x] 5.4 — 3-state Vitest coverage with mocked `Sector` writes.

## Dev Notes

### Relevant architecture patterns and constraints

**Type-only import = compile-time-only dependency** — `import type { TarsisSignal } from "..."` is erased by TypeScript at compile time. Runtime code never executes the module side-effects of `seshat/tarsis/connector.ts`. This is how `sector-intelligence/` can know the shape of `TarsisSignal` without importing the connector at runtime — preserving ADR-0078 §"Seam ownership" : the ONLY runtime import path is `campaign-tracker → seshat/tarsis` (Story 3.4 `bridgeTarsisToSectorIntelligence`).

**Why two functions, not one** — the legacy `refreshSectorOverton(input)` accepts a plain object (no discriminator) ; the new `refreshSectorOvertonFromConnector(input)` accepts a `ConnectorResult<TarsisSignal>`. Both exist concurrently in Phase 23 :
1. Seed scripts + existing tests continue to use the legacy function ; no breaking change.
2. The new function is the canonical path for Phase 23+ ; campaign-tracker imports this one.
3. Post-Phase 23 (Growth follow-up in RESIDUAL-DEBT.md), the legacy function is deprecated once seed scripts migrate.

**ADR-0046 no-magic-fallback enforced** — on DEFERRED or DEGRADED, the function returns `{ state: "SKIPPED" }` and writes ZERO `Sector` row. Without this discipline, a transient Tarsis outage would silently persist a "no signal" snapshot, which downstream `getSectorAxis` would read as a real "no shift" observation — fabricating a verdict from missing data.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/sector-intelligence/index.ts](../../src/server/services/sector-intelligence/index.ts) | **EDIT** | New `refreshSectorOvertonFromConnector` + `tarsisSignalToLegacySignals` + `RefreshFromConnectorResult` discriminated union. |
| [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) | **FIX** | `match[1] ?? ""` strict-TS narrowing for optional regex capture group. |

**Files to READ:**
- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — Story 1.3.
- [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) — Story 2.2 (TarsisSignal type).
- [docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md).
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L715-727](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: _bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md](./1-3-connector-result-shared-discriminated-union.md)
- [Source: _bmad-output/implementation-artifacts/2-2-tarsis-connector-facade.md](./2-2-tarsis-connector-facade.md)

### Git intelligence summary

```
aac5f3a feat(seshat): phase 23 extend sector-intelligence/ to accept ConnectorResult<TarsisSignal>   ← Story 3.1 ship commit
```

### Project context reference

This story is **Story 1 of Phase 23 Epic 3 — Overton Measurement Wiring**. It establishes the data-flow seam between the Tarsis connector (Epic 2) and the canonical Overton engine. Without this, Stories 3.2 + 3.3 + 3.4 couldn't delegate to `sector-intelligence/` cleanly.

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`.

### Debug Log References

- AC #1 (3-state exhaustive switch) — shipped: see commit `aac5f3a`.
- AC #2 (type-only imports, no runtime dep on seshat/tarsis) — shipped: `import type` directives.
- AC #3 (manifest unchanged) — verified.
- AC #4 (existing signatures unchanged) — verified.
- AC #5 (3-state Vitest) — included in commit `aac5f3a`.

### Completion Notes List

- **AC #1–5 shipped** in commit `aac5f3a`.
- **NEFER 8-phase compliance**: all 8 ticked.
- **Cap APOGEE 7/7 preserved** — `sector-intelligence/` is a Telemetry sub-service, not a Neter.
- **Manual-first parity (ADR-0060)** — n/a (telemetry pipeline ; manual peer is Story 3.7).
- **Mission link**: ADR-0078 §"Décision" — canonical Overton home. Removes Phase 19 Jaccard placebo at the source.

### File List

- **EDIT** [src/server/services/sector-intelligence/index.ts](../../src/server/services/sector-intelligence/index.ts) — +103 lines : `refreshSectorOvertonFromConnector` + `tarsisSignalToLegacySignals` + `RefreshFromConnectorResult` discriminated union.
- **FIX** [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — strict-TS narrowing on optional regex group.
- **EDIT** [_bmad-output/implementation-artifacts/3-1-sector-intelligence-accept-connector-result.md](./3-1-sector-intelligence-accept-connector-result.md) — this story file (post-hoc artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 3.1 shipped via commit `aac5f3a` — `sector-intelligence/index.ts` accepts `ConnectorResult<TarsisSignal>` exhaustively (LIVE/DEFERRED/DEGRADED) ; type-only imports preserve one-way data flow ; legacy `refreshSectorOverton` unchanged. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 0/8 → 1/8. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
