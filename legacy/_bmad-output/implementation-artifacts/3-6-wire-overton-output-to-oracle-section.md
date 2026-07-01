# Story 3.6: Wire Overton output to Oracle Overton-distinctive section reader

Status: in_progress

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 6/8)
Owning Neter: Seshat (Telemetry §4.3 — Oracle is a Mestor-governed lecture composée over Seshat measurement outputs)
APOGEE OS layer (ADR-0084): Layer 5 — Services (strategy-presentation reader composing campaign-tracker outputs)
BrandAsset.kind produced: OVERTON_WINDOW (Distinctive Oracle section, already promoted via enrich-oracle writeback)
Portail target: Oracle deliverable surface — consumed via `/cockpit/brand/proposition` + Console Oracle export PDF route
Manual-first parity (ADR-0060): the real-signal payload accepts both algorithmic (measureOvertonShift) and operator-tagged (CampaignAction.overtonDeltaManual) inputs uniformly — `degradationCodes` carries `MANUAL_OPERATOR_DELTA` when the override fired. UI render is identical for both sources per ADR-0060.
Mission link: closes the last leg of the chain `sector-intelligence → campaign-tracker.culture.* → Oracle "État Overton sectoriel"`. The deliverable Oracle carries the same instrumented signal the (future, Epic 7) Cockpit OvertonRadar will surface. Closes FR17 ; MISSION §9 ledger checkbox "Every brand's Oracle has a live État Overton sectoriel section maintained by Tarsis" becomes checkable (will flip after direction sign-off post-MVP).
CODE-MAP grep: searched "overtonDistinctive", "État Overton", "section 33", "section 34". Hits: SECTION_REGISTRY entry `overton-distinctive` at types.ts L180 (number "34", not "33" as the PRD/epics state — see Doc-mismatch note below) ; writeback in enrich-oracle.ts L802-811 ; UI consumer in phase13-sections.tsx L576-609. The "section #33" referenced throughout the PRD/architecture/epics is doctrinally the Overton section ; section #33 in the actual SECTION_REGISTRY is `devotion-ladder`. Off-by-one in the planning artefacts. Story 3.6 wires the Overton section regardless of numbering (the PRD/epic intent is the Overton-distinctive section, by name).
```

## Story

As a **founder**,
I want **the Oracle "État Overton sectoriel" section to reflect real Overton measurement output**,
so that **the deliverable Oracle document carries the same instrumented signal the Cockpit shows — not a token-Jaccard placebo (FR17)**.

## Acceptance Criteria

Verbatim from [epics.md L791-804](../planning-artifacts/epics.md):

1. **Given** Stories 3.2 + 3.3 (real Overton wiring) and the existing Oracle generation pipeline (`services/strategy-presentation/`)
   **When** the Oracle Overton-distinctive reader is extended
   **Then** section generation pulls from `sector-intelligence.getSectorAxis` / `detectDrift` results (via `culture.overtonShift|overtonReadiness` outputs) instead of any token-Jaccard heuristic.
   **De-facto in code** : the Overton-distinctive writeback now consumes a pre-fetched `OvertonRealSignal` payload built by `buildOvertonRealSignalForOracle(strategyId, operatorId)` which calls `measureOvertonShift` + `evaluateOvertonReadiness` — both of which already delegate to `sector-intelligence` per Stories 3.2 + 3.3.

2. **And** when those returns are `INSUFFICIENT_DATA`, the section renders an explicit "État Overton sectoriel — signal en attente" content block, not a fabricated narrative.
   **De-facto in code** : `OvertonRealSignal` is a discriminated union with an explicit `state: "INSUFFICIENT_DATA"` branch (reason ∈ `NO_CAMPAIGNS | ALL_DEGRADED`, plus degradationCodes from upstream measurement). The `OvertonDistinctive` React component renders a dedicated INSUFFICIENT_DATA block with the canonical wording.

3. **And** Oracle generation reuses the manual-first parity invariant (the section consumer accepts both algorithmic and manual-delta inputs via Story 3.7).
   **De-facto in code** : `measureOvertonShift` already returns the operator-tagged value when `CampaignAction.overtonDeltaManual` is non-null and marks `degradationCodes` with `MANUAL_OPERATOR_DELTA` (Story 3.2). The realSignal builder propagates degradationCodes unchanged ; the UI renders the same `state: "OK"` block regardless of source — operator-tagged vs algorithmic are indistinguishable downstream except via the auditable degradation code.

4. **And** Vitest test asserts section output reflects `OK` vs `INSUFFICIENT_DATA` correctly.
   **De-facto in code** : `tests/unit/services/strategy-presentation/overton-real-signal.test.ts` covers (a) 0 campaigns with overtonHypothesis → `NO_CAMPAIGNS`, (b) all campaigns degraded → `ALL_DEGRADED`, (c) at least one measurable campaign → `OK` with `meanShiftScore` aggregating non-null shifts only (no silent-zero fold-in of null branches per P22-2).

## Tasks / Subtasks

- [x] **Task 1 — Add `OvertonRealSignal` discriminated union + builder** (AC: #1, #2, #3) — *NEW [src/server/services/strategy-presentation/overton-real-signal.ts]*.
  - [x] 1.1 — Export `OvertonRealSignal` discriminated union (OK | INSUFFICIENT_DATA) with reason codes `NO_CAMPAIGNS` / `ALL_DEGRADED`.
  - [x] 1.2 — Export `buildOvertonRealSignalForOracle(strategyId, operatorId): Promise<OvertonRealSignal>` aggregating up to 10 most-recently-updated campaigns with `overtonHypothesis: { not: null }`.
  - [x] 1.3 — Algorithm honours P22-2 : `meanShiftScore` averages over non-null shift scores only ; never folds null branches as 0.
  - [x] 1.4 — Aggregates `degradationCodes` union across all samples ; the auditable `MANUAL_OPERATOR_DELTA` code propagates from `measureOvertonShift` unchanged.

- [x] **Task 2 — Wire the real signal into the `overton-distinctive` writeback** (AC: #1) — *EDIT [src/server/services/strategy-presentation/enrich-oracle.ts]*.
  - [x] 2.1 — In the sequence-execution branch of `enrichAllSections`, when `sectionId === "overton-distinctive"` : load `Strategy.operatorId`, call `buildOvertonRealSignalForOracle`, inject under `seqOutputs.__realOvertonSignal`.
  - [x] 2.2 — Update the `overton-distinctive` writeback to consume `outputs.__realOvertonSignal` and merge it into the section payload as `{ overtonDistinctive: { axes, maneuvers, realSignal } }`.
  - [x] 2.3 — When the pre-fetch throws (transient DB / measurement error), log via `console.warn` + leave `realSignal` undefined ; the writeback handles the missing key gracefully (UI shows the legacy axes/maneuvers fallback).

- [x] **Task 3 — Extend the UI consumer to render the real-signal block** (AC: #2) — *EDIT [src/components/strategy-presentation/sections/phase13-sections.tsx]*.
  - [x] 3.1 — Read `od.realSignal` from the section payload.
  - [x] 3.2 — When `realSignal.state === "INSUFFICIENT_DATA"` → render a dedicated `Banner tone="info"` block with the canonical wording "État Overton sectoriel — signal en attente" + a one-line cause derived from the reason + degradationCodes. Sits ABOVE the axes/maneuvers (which may also be empty), per UX-DR10 honest-empty-state pattern.
  - [x] 3.3 — When `realSignal.state === "OK"` → render a `Card` summarising `meanShiftScore` (formatted via `Intl.NumberFormat` to 2 decimals), `measurableCampaigns` count, `observedAt` ISO timestamp.
  - [x] 3.4 — When `realSignal === undefined` (e.g. older snapshots persisted before this story) → keep current axes/maneuvers display only (backwards-compatible — no regression on existing Oracle exports).

- [x] **Task 4 — Vitest coverage** (AC: #4) — *NEW [tests/unit/services/strategy-presentation/overton-real-signal.test.ts]*.
  - [x] 4.1 — Stub `db.campaign.findMany` + `measureOvertonShift` + `evaluateOvertonReadiness` via `vi.mock`.
  - [x] 4.2 — Case (a) — 0 matching campaigns → expect `state: "INSUFFICIENT_DATA"`, `reason: "NO_CAMPAIGNS"`.
  - [x] 4.3 — Case (b) — 2 campaigns, both null shift scores → expect `state: "INSUFFICIENT_DATA"`, `reason: "ALL_DEGRADED"`, `degradationCodes` union covers both sources.
  - [x] 4.4 — Case (c) — 2 campaigns, one with score 0.5 + one null → expect `state: "OK"`, `measurableCampaigns: 1`, `meanShiftScore: 0.5` (null is NOT folded as 0).

- [x] **Task 5 — Verification** (AC: all).
  - [x] 5.1 — `tsc --noEmit` clean project-wide.
  - [x] 5.2 — `neteru-coherence.test.ts` 7/7 + `phase22-connector-result.test.ts` HARD 9/9 + new `overton-real-signal.test.ts` 3/3 — all green.
  - [x] 5.3 — Manual code review : the runtime import path `strategy-presentation → campaign-tracker → sector-intelligence` is one-way (Layer 5 → Layer 5 → Layer 5) and respects the architecture §boundaries discipline. No circular import, no governance bypass (the builder reads measurements, doesn't mutate state).

## Dev Notes

### Relevant architecture patterns and constraints

**Discriminated union per P22-2** — `OvertonRealSignal` is `{ state: "OK", ... } | { state: "INSUFFICIENT_DATA", reason, ... }`. Consumers must handle both branches at the type level. The `INSUFFICIENT_DATA` branch is **first-class**, not an exception, not a silent zero. The UI consumer pattern-matches on `state` exhaustively.

**Mean-over-measurable, never fold-null-as-zero** — `meanShiftScore` averages only the non-null `overtonShiftScore` values. Folding null as 0 would be the silent-zero fallback explicitly forbidden by ADR-0046 + P22-2. The denominator is `measurableShifts.length`, not `samples.length`.

**Manual-first parity transparency** — `measureOvertonShift` already returns the operator-tagged value when `CampaignAction.overtonDeltaManual` is non-null and stamps `degradationCodes` with `MANUAL_OPERATOR_DELTA` (Story 3.2). The realSignal builder propagates the codes unchanged ; the UI render is identical for both sources. Per ADR-0060, consumers cannot distinguish operator-tagged from algorithmic without inspecting the audit code — manual-first is structurally indistinguishable from algorithmic downstream.

**Doc-mismatch on section number** — PRD/architecture/epics consistently reference "§33". The actual SECTION_REGISTRY says section #33 is `devotion-ladder` and section #34 is `overton-distinctive`. This story wires the `overton-distinctive` section by name (the intended target) and documents the discrepancy here. Possible Epic 7 closure follow-up : either correct the planning artefacts to "§34" or renumber sections — but this is a 0-LOC governance follow-up, not a Story 3.6 blocker.

**One-way data flow** — `services/strategy-presentation/overton-real-signal.ts` imports from `services/campaign-tracker/signals-culture` ; both modules are in Layer 5. The import direction respects the architecture §boundaries discipline (`strategy-presentation` is downstream of `campaign-tracker` because the Oracle reads measurement outputs, not the other way around). No circular import.

**Graceful degradation on builder failure** — the enrich-oracle loop wraps the pre-fetch in try/catch ; transient errors yield `realSignal: undefined` and the section falls back to the legacy axes/maneuvers display. No fail-stop on transient measurement infrastructure issues — the Oracle still ships, just without the real-signal block for that generation.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/strategy-presentation/overton-real-signal.ts](../../src/server/services/strategy-presentation/overton-real-signal.ts) | **NEW** | Discriminated union + builder ; aggregates `measureOvertonShift` + `evaluateOvertonReadiness` outputs across the strategy's campaigns. |
| [src/server/services/strategy-presentation/enrich-oracle.ts](../../src/server/services/strategy-presentation/enrich-oracle.ts) | **EDIT** | Pre-fetch real signal for `overton-distinctive` in the sequence-execution branch + extend the writeback to consume it. |
| [src/components/strategy-presentation/sections/phase13-sections.tsx](../../src/components/strategy-presentation/sections/phase13-sections.tsx) | **EDIT** | `OvertonDistinctive` renders the realSignal block (INSUFFICIENT_DATA vs OK vs undefined). |
| [tests/unit/services/strategy-presentation/overton-real-signal.test.ts](../../tests/unit/services/strategy-presentation/overton-real-signal.test.ts) | **NEW** | Vitest unit test covering AC #4. |

**Files to READ:**
- [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) — `measureOvertonShift` + `evaluateOvertonReadiness` source.
- [src/server/services/campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts) — `OvertonShiftResult` + `OvertonReadinessResult` shapes.
- [src/server/services/strategy-presentation/types.ts](../../src/server/services/strategy-presentation/types.ts) — `SECTION_REGISTRY` confirms section "overton-distinctive" (#34) is the intended target.

**Anti-drift CI tests that MUST stay green after this story:**
- `neteru-coherence.test.ts` — green (no Neter touched).
- `phase22-connector-result.test.ts` HARD — green (no connector signature touched).
- `phase22-no-silent-zero.test.ts` — Story 3.8 will activate ; this story doesn't introduce silent-zero patterns (mean explicitly skips nulls, INSUFFICIENT_DATA is first-class).

### Testing standards summary

Per the Phase 23 codebase convention, this story adds a per-helper Vitest spec (`overton-real-signal.test.ts`) because the helper is pure logic with mockable DB + measurement deps — easy to test in isolation. UI tests for the OvertonDistinctive component would belong with the broader Oracle UI test suite (existing `tests/unit/governance/oracle-ui-phase13.test.ts`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L791-804](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: _bmad-output/implementation-artifacts/3-2-delegate-overton-shift-to-sector-intelligence.md](./3-2-delegate-overton-shift-to-sector-intelligence.md)
- [Source: _bmad-output/implementation-artifacts/3-3-delegate-overton-readiness-to-sector-axis.md](./3-3-delegate-overton-readiness-to-sector-axis.md)

### Project context reference

**Story 6 of Phase 23 Epic 3.** With Stories 3.1-3.5 in place, the campaign-tracker `culture.*` sub-clusters delegate to `sector-intelligence/` and the MCP ingestion gate-flips on PII classifier. Story 3.6 closes the chain Oracle-side : the deliverable surface now reads the real Overton measurement. Remaining Epic 3 work : Story 3.7 (manual operator-delta UI form, the front-end peer to the algorithmic path) + Story 3.8 (HARD `phase22-no-silent-zero.test.ts` activation).

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **in_progress** — will flip to **done** after the file list lands + verification passes.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`. Autopilot mode active.

### Debug Log References

- AC #1 (real signal pulled from sector-intelligence via culture.overton*) — shipped via `buildOvertonRealSignalForOracle` calling `measureOvertonShift` + `evaluateOvertonReadiness` (both delegate to sector-intelligence per Stories 3.2/3.3).
- AC #2 (INSUFFICIENT_DATA explicit block) — shipped : discriminated union + dedicated Banner tone="info" in OvertonDistinctive component.
- AC #3 (manual-first parity transparent) — shipped : `measureOvertonShift` Story 3.2 already routes operator-tagged delta + stamps `MANUAL_OPERATOR_DELTA` ; realSignal builder propagates degradationCodes unchanged.
- AC #4 (Vitest coverage OK vs INSUFFICIENT_DATA) — shipped : 3-case unit test in `overton-real-signal.test.ts`.

### Completion Notes List

- **AC #1–4 satisfied.**
- **Section number doc mismatch** — PRD/epics say §33, SECTION_REGISTRY says §34 (overton-distinctive). Wired the section by name. Documented as 0-LOC Epic 7 closure follow-up.
- **Mean-over-measurable, no silent zero** — `meanShiftScore` averages non-null shifts only ; denominator is `measurableShifts.length`. No `?? 0` fold-in.
- **NEFER 8-phase compliance**: all 8 ticked.
- **Cap APOGEE 7/7 preserved** — strategy-presentation lecture composée over Seshat measurement outputs ; no new Neter, no governance bypass.
- **Manual-first parity (ADR-0060)** — transparent : the operator-tagged path produces the same OK shape as the algorithmic path ; the audit lives in `degradationCodes` only.
- **Mission link**: closes FR17. The deliverable Oracle and the (future, Epic 7) Cockpit OvertonRadar now read the same instrumented chain.

### File List

- **NEW** [src/server/services/strategy-presentation/overton-real-signal.ts](../../src/server/services/strategy-presentation/overton-real-signal.ts) — `OvertonRealSignal` discriminated union + `buildOvertonRealSignalForOracle` aggregator.
- **EDIT** [src/server/services/strategy-presentation/enrich-oracle.ts](../../src/server/services/strategy-presentation/enrich-oracle.ts) — pre-fetch real signal for `overton-distinctive` + writeback merges it.
- **EDIT** [src/components/strategy-presentation/sections/phase13-sections.tsx](../../src/components/strategy-presentation/sections/phase13-sections.tsx) — `OvertonDistinctive` renders realSignal block.
- **NEW** [tests/unit/services/strategy-presentation/overton-real-signal.test.ts](../../tests/unit/services/strategy-presentation/overton-real-signal.test.ts) — 3 unit test cases covering OK / NO_CAMPAIGNS / ALL_DEGRADED branches.
- **NEW** [_bmad-output/implementation-artifacts/3-6-wire-overton-output-to-oracle-section.md](./3-6-wire-overton-output-to-oracle-section.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 3.6 shipped — Oracle Overton-distinctive section consumes real `culture.overtonShift|overtonReadiness` outputs (which delegate to sector-intelligence per Stories 3.2/3.3). Discriminated `OvertonRealSignal` union + dedicated INSUFFICIENT_DATA banner per UX-DR10. Mean-over-measurable aggregation (no silent zero). Manual-first parity transparent (operator-tagged shifts propagate as OK + MANUAL_OPERATOR_DELTA audit code). 3 Vitest cases. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 5/8 → 6/8. | NEFER (Claude Opus 4.7) |
