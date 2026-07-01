# Story 3.2: Delegate `culture.overtonShift` to `sector-intelligence.detectDrift` + `computeBrandDeflection`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 2/8)
Owning Neter: Seshat (Telemetry §4.3) ; campaign-tracker is the orchestration layer over the canonical Overton engine
APOGEE OS layer (ADR-0084): Layer 5 — Services (campaign-tracker delegation handler)
BrandAsset.kind produced: none (Telemetry computation result, persisted as score on `Campaign` / `CampaignAction` per Story 1.6 fields)
Portail target: none runtime — handler at [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) ; consumed by Console campaign-tracker view (Epic 6) + Cockpit OvertonRadar (Epic 7)
Manual-first parity (ADR-0060): peer mode foundation laid here — `CampaignAction.overtonDeltaManual` (additive field from Story 1.6) is consumed by this handler when non-null, marking the source with `MANUAL_OPERATOR_DELTA` degradation code. Full UI peer mode is Story 3.7.
Mission link: Replaces the Phase 19 Jaccard token-overlap placebo with real sectoral-embedding delta from the canonical Overton engine. The score that feeds into the founder's `<OvertonRadar>` (Epic 7) is now traceable — not fabricated. Direct contribution to superfans × Overton.
CODE-MAP grep: searched "culture.overtonShift", "measureOvertonShift", "Jaccard overlap", "sentimentDelta" across `src/`. Hits: Phase 19 implementation in `signals-culture.ts` with Jaccard placebo + `(sentimentDelta ?? 0)` silent zero. Extension chosen: REPLACE the Jaccard path with `sector-intelligence.detectDrift` + `computeBrandDeflection` delegation ; remove the silent-zero pattern at the same time (Story 3.8 HARD test enforces afterwards).
```

## Story

As an **UPgraders operator**,
I want **`campaign-tracker/culture.overtonShift` to delegate its computation to `sector-intelligence/` instead of the Jaccard placeholder**,
so that **the Overton-shift score becomes a real sectoral-embedding delta rather than token overlap**.

## Acceptance Criteria

Verbatim from [epics.md L729-743](../planning-artifacts/epics.md):

1. **Given** Story 3.1 (sector-intelligence accepts ConnectorResult)
   **When** `services/campaign-tracker/signals-culture.ts` is edited
   **Then** the `culture.overtonShift` handler calls `sector-intelligence.detectDrift({ brandId, sectorSlug })` + `computeBrandDeflection(...)` and returns its `OK | INSUFFICIENT_DATA` result.

2. **And** the Jaccard token-overlap fallback is removed (the placeholder comment `MVP heuristic — vrai algo Overton viendra` is replaced with a reference to ADR-0078).

3. **And** when `sector-intelligence` returns `INSUFFICIENT_DATA`, the sub-cluster returns the same discriminated state — no fabricated zero or "—" placeholder (P22-2).

4. **And** the `capability-state.ts` entry for `culture.overtonShift` lifts from `PARTIAL` to `MVP` ; the `childAdr` field points to ADR-0078 (not the dangling 0055-overton-algo).

5. **And** existing tRPC reads continue to function (signature unchanged from consumer perspective ; only return shape extended to include `INSUFFICIENT_DATA` branch).

## Tasks / Subtasks

- [x] **Task 1 — Type field nullability** (AC: #3) — *EDIT [campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts)*.
  - [x] 1.1 — `OvertonShiftResult.overtonShiftScore : number → number | null`. Null = INSUFFICIENT_DATA branch.

- [x] **Task 2 — Replace Jaccard with `sector-intelligence` delegation** (AC: #1, #2) — *EDIT [signals-culture.ts measureOvertonShift](../../src/server/services/campaign-tracker/signals-culture.ts)*.
  - [x] 2.1 — Call `sector-intelligence.detectDrift({ brandId, sectorSlug })` for the directional/alignment vector.
  - [x] 2.2 — Call `sector-intelligence.computeBrandDeflection(...)` for the magnitude.
  - [x] 2.3 — Score = signed combination of `(1 - alignment) * tanh(magnitude)` — bounded ∈ [-1, +1], differentiable, monotonic.
  - [x] 2.4 — Replace inline comment `MVP heuristic — vrai algo Overton viendra` with reference to ADR-0078.

- [x] **Task 3 — Drop silent-zero patterns** (AC: #3) — *EDIT signals-culture.ts*.
  - [x] 3.1 — Remove `(sentimentDelta ?? 0)` — was a silent-zero that fabricated "no shift" on missing signal.
  - [x] 3.2 — When `sector-intelligence` returns `INSUFFICIENT_SECTOR_AXIS`, set `overtonShiftScore = null` + populate `degradationCode = "INSUFFICIENT_SECTOR_AXIS"`.

- [x] **Task 4 — Manual operator-delta peer-mode foundation** (Story 3.7 link) — *EDIT signals-culture.ts*.
  - [x] 4.1 — If any of the campaign's `CampaignAction.overtonDeltaManual` is non-null, consume the latest value.
  - [x] 4.2 — Mark source with `degradationCode = "MANUAL_OPERATOR_DELTA"` — the Story 4.5 confirmation popover (UX-DR14) will surface this provenance.

- [x] **Task 5 — `capability-state.ts` lifecycle promotion** (AC: #4) — *EDIT [campaign-tracker/capability-state.ts]*.
  - [x] 5.1 — `culture.overtonShift` : `PARTIAL → MVP` ; `childAdr: "0078"` (not the dangling 0055-overton-algo).

- [x] **Task 6 — Verification** (AC: all).
  - [x] 6.1 — `tsc --noEmit` clean project-wide.
  - [x] 6.2 — `phase22-connector-result.test.ts` 9/9 still green.
  - [x] 6.3 — `phase22-no-silent-zero.test.ts` (Story 3.8 activation) — clean-up shipped here so the test passes immediately when activated.

## Dev Notes

### Relevant architecture patterns and constraints

**Score = `(1 - alignment) * tanh(magnitude)`** — choice rationale :
- `tanh(magnitude)` bounds the magnitude term ∈ (-1, +1), preventing one runaway sector from dominating the score.
- `(1 - alignment)` is the "how much the sector moved AWAY from the brand axis" component ; alignment ∈ [0, 1] with 1 = perfect alignment.
- Signed combination preserves direction : +1 = sector moved toward the brand, -1 = sector moved away.
- Differentiable, monotonic, bounded — three properties that make the score amenable to calibration (Epic 6 + Story 4.2 logistic regression).

**P22-2 no-silent-zero structurally enforced** — `overtonShiftScore : number | null` makes the discriminated state visible at the type level. Any consumer that does `score * weight` without a null check fails `tsc`. The Story 3.8 HARD test extends the assertion to "no `?? 0` / `|| 0` patterns on score identifiers in signals-culture.ts" — making the discipline structural.

**Manual operator delta as peer mode foundation** — the `CampaignAction.overtonDeltaManual` field migrated in Story 1.6 ; this story is the **first consumer**. The operator-entry UI surface (Story 3.7) lands the Console form ; this handler already routes through the manual value when present. ADR-0060 manual-first parity : the manual path produces the same downstream `overtonShiftScore` shape as the algorithmic path — consumers cannot distinguish source except via `degradationCode = "MANUAL_OPERATOR_DELTA"` on the result.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts) | **EDIT** | Score field nullable. |
| [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) | **EDIT** | Jaccard → sector-intelligence delegation. |
| `src/server/services/campaign-tracker/capability-state.ts` (or runtime DB equivalent) | **EDIT** | `culture.overtonShift` PARTIAL → MVP, childAdr → 0078. |

### References

- [Source: _bmad-output/planning-artifacts/epics.md L729-743](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: _bmad-output/implementation-artifacts/3-1-sector-intelligence-accept-connector-result.md](./3-1-sector-intelligence-accept-connector-result.md)

### Git intelligence summary

```
0022de0 feat(seshat): phase 23 delegate culture.overton* sub-clusters to sector-intelligence   ← Stories 3.2 + 3.3 + 3.4 ship commit (bundled)
aac5f3a feat(seshat): phase 23 extend sector-intelligence/ to accept ConnectorResult<TarsisSignal>  ← Story 3.1 predecessor
```

### Project context reference

This story is **Story 2 of Phase 23 Epic 3**. With Stories 3.2 + 3.3 + 3.4 all in commit `0022de0`, the three `culture.overton*` sub-clusters move off placebo together — a single review surface for the cross-sub-cluster delegation pattern.

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`.

### Debug Log References

- AC #1 (`detectDrift` + `computeBrandDeflection` delegation) — shipped: see commit `0022de0`.
- AC #2 (Jaccard removed, ADR-0078 reference) — shipped.
- AC #3 (P22-2 `score : number | null`, no silent zero) — shipped: types.ts nullable + signals-culture.ts null branch.
- AC #4 (capability-state PARTIAL → MVP + childAdr 0078) — shipped.
- AC #5 (consumer-facing signature stable, INSUFFICIENT_DATA branch added) — shipped.

### Completion Notes List

- **AC #1–5 shipped** in commit `0022de0` (bundled with Stories 3.3 + 3.4).
- **NEFER 8-phase compliance**: all 8 ticked.
- **Cap APOGEE 7/7 preserved** — delegation handler, no Neter touched.
- **Manual-first parity (ADR-0060)** — back-end foundation shipped here ; UI peer mode is Story 3.7.
- **Mission link**: Replaces Phase 19 Jaccard placebo with real sectoral-embedding delta from canonical Overton engine.

### File List

- **EDIT** [src/server/services/campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts) — `overtonShiftScore: number | null`.
- **EDIT** [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) — `measureOvertonShift` delegation + manual peer-mode foundation.
- **EDIT** capability-state.ts — `culture.overtonShift` PARTIAL → MVP, childAdr 0078.
- **EDIT** [_bmad-output/implementation-artifacts/3-2-delegate-overton-shift-to-sector-intelligence.md](./3-2-delegate-overton-shift-to-sector-intelligence.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 3.2 shipped (bundled in commit `0022de0` with Stories 3.3 + 3.4) — `culture.overtonShift` delegates to `sector-intelligence.detectDrift` + `computeBrandDeflection` ; Jaccard placebo + silent-zero `(sentimentDelta ?? 0)` removed ; nullable score for INSUFFICIENT_DATA branch ; manual operator-delta peer-mode foundation in place. capability-state.ts PARTIAL → MVP + childAdr 0078. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 1/8 → 2/8. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
