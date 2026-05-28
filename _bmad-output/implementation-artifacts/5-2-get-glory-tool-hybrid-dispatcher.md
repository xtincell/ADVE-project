# Story 5.2: Extend the registry dispatcher for HYBRID (`executeHybridTool`)

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 2/6)
Owning Neter: Artemis (Propulsion — Glory tools engine)
APOGEE OS layer (ADR-0084): Services (dispatch)
BrandAsset.kind produced: none (persists GloryOutput)
Portail target: none (service)
Manual-first parity (ADR-0060): the dispatcher is the single path that selects LLM-or-manual
CODE-MAP grep: extended engine.ts `executeTool` machinery — no parallel registry, no new entity.
```

## Story

As a NEFER operator, I want the Glory dispatcher to route HYBRID tools through a unified path selecting LLM-or-manual at invocation, so orchestrators never call the LLM path directly (HARD-test-enforced) — every consumer goes through `getGloryTool(slug)` then `executeHybridTool` (P22-5).

## Acceptance Criteria

Verbatim from [epics.md L999-1004](../planning-artifacts/epics.md). `executeHybridTool(slug, input, { preferManual? })` ; `preferManual` → manual validation path ; otherwise `executeStructuredLLMCall` (via `executeTool`) + fall back to manual on Zod-invalid after retry-twice ; same output shape regardless of path ; no direct `executeStructuredLLMCall` in orchestrators.

## Tasks / Subtasks

- [x] **Task 1 — `executeHybridTool`** — signature `(toolSlug, strategyId, input, { preferManual?, manualEntry? })` → `HybridToolResult { outputId, output, intentId, path }`.
- [x] **Task 2 — Manual path** — `preferManual` + `manualEntry` → `manualFormSchema.safeParse` → persist GloryOutput + IntentEmission lineage (path `"manual"`) ; on parse failure → `{ status: "FAILED", errorCode: "MANUAL_VALIDATION_FAILED", issues }`.
- [x] **Task 3 — Manual prompt** — `preferManual` without entry → `{ status: "MANUAL_ENTRY_REQUIRED", jsonSchema }` (path `"manual-required"`).
- [x] **Task 4 — LLM path** — delegate to `executeTool` (inherits ADR-0067 `executeStructuredLLMCall` + retry ×2 when `outputSchema` present) ; on `status: "FAILED" / errorCode: "ZOD_VALIDATION_FAILED"` → drop to manual prompt.
- [x] **Task 5 — Serializable form** — `getHybridManualForm(slug)` → `{ slug, name, executionType, jsonSchema }` via `deriveJsonSchemaFromZod` (Zod doesn't cross tRPC).
- [x] **Task 6 — Exports + verification** — both barrels ; tsc clean.

## Dev Notes

**Reuse, don't duplicate.** The LLM half routes through the existing `executeTool` (which already does `executeStructuredLLMCall` + retry + GloryOutput persistence + lineage). This keeps the retry-twice envelope in one place and keeps the dispatcher free of any direct `executeStructuredLLMCall` call — satisfying the Story 5.6 HARD invariant by construction.

**Output-shape invariance.** Manual-path data is validated against `manualFormSchema` (= `outputSchema`), so both paths emit an `outputSchema`-conforming object + `_meta`. Downstream consumers cannot tell which path produced a result — that is the parity guarantee.

### File List
- **EDIT** [src/server/services/artemis/tools/engine.ts](../../src/server/services/artemis/tools/engine.ts)
- **EDIT** [src/server/services/artemis/tools/index.ts](../../src/server/services/artemis/tools/index.ts)
- **EDIT** [src/server/services/glory-tools/index.ts](../../src/server/services/glory-tools/index.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- `manual-required` path lets the UI render the form whether the operator chose manual deliberately or the LLM failed.
- Cap APOGEE 7/7 preserved.

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.2 shipped — `executeHybridTool` + `getHybridManualForm` ; LLM path reuses `executeTool`. tsc green. | NEFER (Claude Opus 4.7) |
