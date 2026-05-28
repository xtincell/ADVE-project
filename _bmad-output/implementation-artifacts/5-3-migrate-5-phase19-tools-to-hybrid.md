# Story 5.3: Migrate 5 phase19 Glory tools to HYBRID + schema-driven manual forms

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 3/6)
Owning Neter: Artemis (Propulsion — Glory tools)
APOGEE OS layer (ADR-0084): Services
BrandAsset.kind produced: none (measurement outputs)
Portail target: surfaced in Console via Story 5.5
Manual-first parity (ADR-0060): the 5 tools migrate as one structural change — no standalone LLM story
CODE-MAP grep: phase19-tools.ts (ADR-0052 v2) — extended in place, no new tools added (cardinality 56 preserved).
```

## Story

As an UPgraders operator, I want each of the 5 measurement Glory tools to ship as `executionType: "HYBRID"` with a schema-driven manual UI form, so any measurement assessment is producible by hand when the LLM path fails or is rate-limited — indistinguishable downstream (FR27 + FR28).

## Acceptance Criteria

Verbatim from [epics.md L1014-1019](../planning-artifacts/epics.md). All 5 tools (`big-idea-coherence-checker`, `myth-arc-cohesion-evaluator`, `crew-performance-evaluator`, `negative-space-auditor`, `mcp-content-pii-classifier`) carry `executionType: "HYBRID"` + `manualFormSchema` equal to the output schema ; manual form schema-driven (generated from the schema, not hand-coded) ; LLM prompt unchanged ; Vitest asserts structural equality + indistinguishable output.

## Tasks / Subtasks

- [x] **Task 1 — Output schemas** — authored a Zod `outputSchema` per tool from the JSON shape previously described only in each promptTemplate (`bigIdeaCoherenceSchema`, `mythArcCohesionSchema`, `crewPerformanceSchema` (12-dimension `byDimension` object), `negativeSpaceSchema` (findings array of 6-category enum), `piiClassifierSchema`).
- [x] **Task 2 — Migrate via factory** — the 5 tools wrapped in `defineHybridTool({ executionType: "HYBRID", outputSchema, applicableNatures, … })` ; `manualFormSchema` set to `outputSchema` by the factory.
- [x] **Task 3 — Prompts unchanged** — promptTemplates preserved verbatim (migration is type + dispatch, not prompt engineering).
- [x] **Task 4 — `postmortem-12q` untouched** — stays `LLM` (not one of the 5 measurement tools).
- [x] **Task 5 — Schema-driven form** — the manual form is generated in the UI (Story 5.5) from `getHybridManualForm`'s JSON-Schema projection — no per-tool hand-coded form.
- [x] **Task 6 — Verification** — tsc clean ; Story 5.6 test asserts `manualFormSchema === outputSchema` structurally per tool.

## Dev Notes

**`outputFormat` (string label) vs `outputSchema` (Zod).** The phase19 tools' `outputFormat` is a human-readable tag (`"coherence_score_with_rationale"`). The machine contract the manual form must match is the Zod `outputSchema`. These 5 tools had no `outputSchema` before (the per-tool ADR-0067 annotation is closure target #3) ; HYBRID migration introduces it, which also tightens the LLM path (`executeStructuredLLMCall` now enforces the schema with retry ×2).

**`applicableNatures` choices.** 4 of 5 are universal (`ALL_NATURES`) — coherence, crew scoring, negative-space audit and PII classification apply to any brand archetype. `myth-arc-cohesion-evaluator` uses a narrative subset (IP-heavy + PRODUCT/SERVICE/INSTITUTION/PLATFORM) since arc continuity is strongest for narrative brands. (Detail: Story 5.4.)

### File List
- **EDIT** [src/server/services/artemis/tools/phase19-tools.ts](../../src/server/services/artemis/tools/phase19-tools.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Migration is additive : same slugs, same prompts, same EXTENDED registry membership (cardinality 56 untouched — `glory-tools.test.ts` green).
- Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.3 shipped — 5 measurement tools → HYBRID with Zod `outputSchema` ; prompts unchanged ; `postmortem-12q` stays LLM. | NEFER (Claude Opus 4.7) |
