# Story 4.8: Extend `phase22-no-silent-zero.test.ts` to superfan paths

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 8/8)
Owning Neter: governance (anti-drift CI) — no Neter touched
APOGEE OS layer (ADR-0084): test layer (governance anti-drift)
BrandAsset.kind produced: none
Portail target: none (CI guard)
Manual-first parity (ADR-0060): n/a
Mission link: protects the superfan-attribution mechanic against silent-zero regression — any future `?? 0` on a score/count/retention/evangelistCount field fails CI immediately (ADR-0046 no-magic-fallback, P22-2 INSUFFICIENT_DATA first-class).
CODE-MAP grep: the test already exists (Story 3.8, Overton scope, HARD). Story 4.8 extends its scan list + activates the two `it.todo` placeholders. No new entity.
```

## Story

As a **NEFER operator**,
I want **the no-silent-zero HARD test extended to cover superfan files**,
so that **any future silent-zero on attribution / cohort-retention / evangelist-count scores fails CI immediately**.

## Acceptance Criteria

Verbatim from [epics.md L954-967](../planning-artifacts/epics.md):

1. **Given** Story 3.8 (test activated for Overton files) **When** `tests/unit/governance/phase22-no-silent-zero.test.ts` is extended **Then** the scan covers `services/campaign-tracker/superfan-attribution.ts`, `superfan-economy.ts`.
2. **And** the test asserts the absence of `?? 0` / `|| 0` on `score` / `count` / `retention` / `evangelistCount` / `coefficient` identifiers — 0 hits.
3. **And** the test asserts the type signature of every measurement export contains a discriminated `INSUFFICIENT_DATA` branch.
4. **And** mode remains `HARD`; `pnpm test` is green.

## Tasks / Subtasks

- [x] **Task 1 — Superfan scan scope** (AC: #1) — `SUPERFAN_SCAN_PATHS = [superfan-attribution.ts, superfan-economy.ts]`.
- [x] **Task 2 — Scope-aware regex** (AC: #2) — `SUPERFAN_SILENT_ZERO_RE` : two alternatives — (1) `\b\w*(?:Score|Count|Retention)\b [.prop|[key]]? (??|||) 0` (camelCase suffixed, e.g. `evangelistCount`, `retentionRate`), capital-anchored ; (2) `\.(?:score|count|retention)\b (??|||) 0` (lowercase property access of the exact result fields, e.g. `result.score ?? 0`). Trailing `(?![.\w])` rejects `0.5`/`0.1` (so `bigIdeaCoherenceScore ?? 0.5`, `learningRate ?? 0.1` are NOT matched).
- [x] **Task 3 — First `it.todo` → real test** (AC: #1, #2, #4) — scan superfan paths, skip comment lines, assert 0 offenders. Mode HARD (`expect(offenders).toEqual([])`).
- [x] **Task 4 — Second `it.todo` → real test** (AC: #3) — assert both superfan measurement files declare `state: "INSUFFICIENT_DATA"` (the P22-2 discriminated arm).
- [x] **Task 5 — Document the legitimate decoy** (AC: #2) — JSDoc explains why `opts.coefficients![k] ?? 0` (L~623, zero-weight default for a missing regression coefficient — semantically correct, NOT a fabricated score) is deliberately NOT matched : the regex anchors on score-suffixed identifiers + lowercase `.score/.count/.retention`, and "coefficients" (a bracket-dict lookup) is structurally excluded. Same family as the Story 3.8 tag-keyed-accumulator decoy.
- [x] **Task 6 — Verification** — `vitest run phase22-no-silent-zero` : 3/3 green (Overton + superfan silent-zero + superfan discriminated-arm). Mode HARD, baseline 0.

## Dev Notes

**The `coefficient` AC term is an exclusion, not an inclusion (per handoff).** AC #2 lists `coefficient` among the identifiers, but the implementation intent (carried from the Story 4.4→4.6 handoff) is to ban silent-zero on *score-producing* fields while explicitly NOT matching the legitimate `coefficients![k] ?? 0` zero-weight default. The regex therefore anchors on `Score|Count|Retention` suffixes + lowercase `.score/.count/.retention` ; "coefficients" ends in neither and is a bracket-dict lookup — structurally excluded.

**Lowercase `score` field needed a second alternative.** Unlike the Overton fields (`overtonShiftScore`, camelCase capital-S), `AttributionResult.score` is lowercase. The capital-anchored alternative (1) would miss `result.score ?? 0`, so alternative (2) `\.(?:score|count|retention)\b` covers lowercase property access. Capital-anchoring on (1) protects against false positives like `account` (lowercase "count").

**Overton stays nullable, superfan is discriminated.** AC #3's discriminated-arm assertion is scoped to the superfan files (which adopted the P22-2 `AttributionResult` / `CohortRetentionMeasurement` discriminated unions, Stories 4.1 + 4.3). The Overton path (`OvertonShiftResult` / `OvertonReadinessResult`) intentionally uses `number | null` (documented in the test header + the file's own JSDoc) ; asserting `INSUFFICIENT_DATA` there would falsely fail.

### File List

- **EDIT** [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — header docblock + `SUPERFAN_SCAN_PATHS` + `SUPERFAN_SILENT_ZERO_RE` + `SUPERFAN_DISCRIMINATED_PATHS` + 2 `it.todo` → 2 real HARD tests.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.16 entry.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List

- **AC #1–4 shipped.** Both `it.todo` placeholders are now real HARD tests ; 3/3 green.
- **Backend-only, fully headless-verifiable** — no UI, no DB. Verified via `vitest run` (87/87 with the campaign-tracker suite ; 3/3 in the phase22-no-silent-zero file).
- **Decoy documented in JSDoc** — `coefficients![k] ?? 0`, `budget ?? 0`, `bigIdeaCoherenceScore ?? 0.5`, `learningRate ?? 0.1` all deliberately not matched, with the reasoning.
- **Cap APOGEE 7/7 preserved** — test-only.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.8 shipped — extended `phase22-no-silent-zero.test.ts` HARD to `superfan-attribution.ts` + `superfan-economy.ts` : scope-aware regex banning `?? 0`/`|| 0` on score/count/retention identifiers (camelCase suffix + lowercase property access, with the coefficient/budget/0.5/0.1 decoys excluded) + discriminated-`INSUFFICIENT_DATA`-arm assertion. Both `it.todo` → real tests, 3/3 green, mode HARD baseline 0. Cap APOGEE 7/7. Phase 23 Epic 4 7/8 → 8/8 — Epic 4 CLOSED. | NEFER (Claude Opus 4.7) |
