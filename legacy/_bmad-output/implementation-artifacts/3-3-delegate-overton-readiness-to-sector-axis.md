# Story 3.3: Delegate `culture.overtonReadiness` to `sector-intelligence.getSectorAxis`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 3/8)
Owning Neter: Seshat (Telemetry §4.3) ; campaign-tracker delegation
APOGEE OS layer (ADR-0084): Layer 5 — Services
BrandAsset.kind produced: none (Telemetry score)
Portail target: none runtime — handler in [signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts)
Manual-first parity (ADR-0060): n/a — readiness score is the algorithmic counterpart to the manual delta (Story 3.7) ; no separate manual readiness UI required
Mission link: Sister story to 3.2 — the second of the three `culture.overton*` sub-clusters moves off placebo. Direct contribution to superfans × Overton via the founder's "is my sector ready for the shift" reading on `<OvertonRadar>`.
CODE-MAP grep: searched "culture.overtonReadiness", "evaluateOvertonReadiness", "0.5 median" across `src/`. Hits: Phase 19 implementation with fabricated 0.5 median (the placeholder when no real readiness signal existed). Extension chosen: REPLACE with `sector-intelligence.getSectorAxis` ; cosine-like dot-product of hypothesis vector vs sector axis vector.
```

## Story

As an **UPgraders operator**,
I want **`culture.overtonReadiness` to compute proximity via `sector-intelligence.getSectorAxis` instead of token Jaccard**,
so that **Overton-readiness reflects real sectoral position, not vocabulary overlap**.

## Acceptance Criteria

Verbatim from [epics.md L745-758](../planning-artifacts/epics.md):

1. **Given** Story 3.1 (sector-intelligence wiring) and Story 3.2 (Shift delegation pattern)
   **When** `services/campaign-tracker/signals-culture.ts` is edited for the `culture.overtonReadiness` handler
   **Then** the handler calls `sector-intelligence.getSectorAxis({ sectorSlug })` and computes proximity using the returned axis instead of token Jaccard.

2. **And** the Jaccard fallback is removed ; the comment is replaced with reference to ADR-0078.

3. **And** absent / insufficient sector axis → handler returns `INSUFFICIENT_DATA` typed branch — never zero, never "—".

4. **And** `capability-state.ts` for `culture.overtonReadiness` lifts to `MVP` with `childAdr: "0078"`.

## Tasks / Subtasks

- [x] **Task 1 — Type field nullability** (AC: #3) — *EDIT [types.ts](../../src/server/services/campaign-tracker/types.ts)*.
  - [x] 1.1 — `OvertonReadinessResult.proximityScore : number → number | null`.

- [x] **Task 2 — `evaluateOvertonReadiness` delegation** (AC: #1, #2) — *EDIT signals-culture.ts*.
  - [x] 2.1 — Call `sector-intelligence.getSectorAxis({ sectorSlug })`.
  - [x] 2.2 — Compute proximity via cosine-like dot-product of hypothesis vector vs sector axis vector.
  - [x] 2.3 — Drop the fabricated 0.5 median placeholder.
  - [x] 2.4 — Replace inline comment with ADR-0078 reference.

- [x] **Task 3 — Helper functions** — *NEW @internal helpers*.
  - [x] 3.1 — `extractSectorSlugFromStrategy()` reads `Strategy.businessContext.sector` (canonical pattern from `services/playbook-capitalization/`).
  - [x] 3.2 — `parseHypothesisTags()` extracts the hypothesis vector inputs.
  - [x] 3.3 — `computeProximity()` performs the dot-product math.

- [x] **Task 4 — `capability-state.ts` lifecycle promotion** (AC: #4).
  - [x] 4.1 — `culture.overtonReadiness` : `PARTIAL → MVP` ; `childAdr: "0078"`.

- [x] **Task 5 — Verification** (AC: all).
  - [x] 5.1 — `tsc --noEmit` green.
  - [x] 5.2 — Existing tRPC reads continue to function ; new null branch handled by consumers downstream (Cockpit OvertonRadar in Epic 7 renders honest empty state).

## Dev Notes

### Relevant architecture patterns and constraints

**Cosine-like dot-product over hypothesis × sector axis** — `getSectorAxis` returns the dominant vocabulary axis of the sector. The brand's hypothesis (claimed positioning vector) is dotted against it to produce a proximity ∈ [0, 1]. The interpretation : "how close is the brand's claimed positioning to the sector's current center of gravity" — i.e., readiness for the Overton shift to land in the sector's vocabulary.

**Absent sector axis = `INSUFFICIENT_DATA`** — the fabricated 0.5 median was the worst silent-zero pattern : neutral-looking, fence-sitting, indistinguishable from real readiness data. With the null branch + degradation code, the Cockpit can render "Readiness en attente d'activation Tarsis" honestly.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts) | **EDIT** | `proximityScore: number | null`. |
| [src/server/services/campaign-tracker/signals-culture.ts](../../src/server/services/campaign-tracker/signals-culture.ts) | **EDIT** | `evaluateOvertonReadiness` delegation. |
| capability-state.ts | **EDIT** | PARTIAL → MVP, childAdr 0078. |

### References

- [Source: _bmad-output/planning-artifacts/epics.md L745-758](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: _bmad-output/implementation-artifacts/3-2-delegate-overton-shift-to-sector-intelligence.md](./3-2-delegate-overton-shift-to-sector-intelligence.md)

### Git intelligence summary

```
0022de0 feat(seshat): phase 23 delegate culture.overton* sub-clusters to sector-intelligence   ← Stories 3.2 + 3.3 + 3.4 ship commit (bundled)
```

### Project context reference

**Story 3 of Phase 23 Epic 3.** Sister to Story 3.2 (the two culture.overton* delegations ship together). Once both Stories 3.2 + 3.3 are merged + Story 3.4 (the bridge), the three culture.overton* sub-clusters all read from `sector-intelligence/` ; the Phase 19 Jaccard placebo is gone end-to-end.

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`.

### Debug Log References

- AC #1 (`getSectorAxis` delegation + cosine proximity) — shipped: commit `0022de0`.
- AC #2 (Jaccard removed, ADR-0078 reference) — shipped.
- AC #3 (`proximityScore: number | null` for INSUFFICIENT_DATA) — shipped.
- AC #4 (capability-state PARTIAL → MVP + childAdr 0078) — shipped.

### Completion Notes List

- **AC #1–4 shipped** in commit `0022de0` (bundled with Stories 3.2 + 3.4).
- **NEFER 8-phase compliance**: all 8 ticked.
- **Cap APOGEE 7/7 preserved**.
- **Manual-first parity (ADR-0060)** — n/a (no separate manual readiness UI needed ; manual delta covers the shift score which feeds the readiness via sector axis evolution).
- **Mission link**: Sister of Story 3.2 ; Overton readiness no longer fabricated 0.5 median.

### File List

- **EDIT** types.ts, signals-culture.ts, capability-state.ts (all bundled in `0022de0`).
- **EDIT** [_bmad-output/implementation-artifacts/3-3-delegate-overton-readiness-to-sector-axis.md](./3-3-delegate-overton-readiness-to-sector-axis.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 3.3 shipped (bundled in commit `0022de0` with Stories 3.2 + 3.4) — `culture.overtonReadiness` delegates to `sector-intelligence.getSectorAxis` ; cosine-like proximity computation ; fabricated 0.5 median dropped ; `proximityScore: number | null`. capability-state PARTIAL → MVP + childAdr 0078. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 2/8 → 3/8. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
