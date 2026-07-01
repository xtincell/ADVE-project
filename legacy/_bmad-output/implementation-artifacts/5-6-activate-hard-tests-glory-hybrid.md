# Story 5.6: Activate HARD tests `phase22-glory-hybrid` + extend `assembler-uses-manual-path`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 6/6 — EPIC 5 CLOSE)
Owning Neter: governance (anti-drift CI) — no Neter touched
APOGEE OS layer (ADR-0084): test layer
BrandAsset.kind produced: none
Portail target: none (CI guard)
Manual-first parity (ADR-0060): the assembler extension enforces it on the Epic 6 orchestrators
CODE-MAP grep: phase22-glory-hybrid.test.ts (Story 1.7 scaffold) + assembler-uses-manual-path.test.ts (ADR-0071) — extended, no new entity.
```

## Story

As a NEFER operator, I want the HYBRID + dispatcher discipline enforced in HARD mode, so no Phase 23 orchestrator can call `executeStructuredLLMCall` directly on a measurement Glory tool, and no LLM-only path can be reintroduced for the 5 tools.

## Acceptance Criteria

Verbatim from [epics.md L1061-1066](../planning-artifacts/epics.md). `phase22-glory-hybrid.test.ts` activated : the 5 tools are HYBRID, `manualFormSchema` structurally equals the output schema, `applicableNatures` non-empty ; `assembler-uses-manual-path.test.ts` extended to scan `campaign-tracker/lifecycle.ts` + `calibration.ts` ; both HARD ; `pnpm test` green.

## Tasks / Subtasks

- [x] **Task 1 — Activate HYBRID test** — replaced the 3 `it.todo` (Story 1.7) with HARD assertions : `it.each` over the 5 slugs (executionType HYBRID, `manualFormSchema === outputSchema` by reference AND `deriveJsonSchemaFromZod` deep-equality, non-empty `applicableNatures`).
- [x] **Task 2 — Forbidden-otherwise** — added a HARD assertion that no non-HYBRID tool in `EXTENDED_GLORY_TOOLS` carries a `manualFormSchema`, and every HYBRID tool has `manualFormSchema` + `outputSchema` + non-empty `applicableNatures`.
- [x] **Task 3 — Extend assembler scan** — new `describe` scanning `campaign-tracker/lifecycle.ts` + `calibration.ts` for the same `FORBIDDEN_PATTERNS` (`executeStructuredLLMCall`, `executeSequence(`, `executeFramework(`, `executeTool(`, `callLLM(`, `callLLMAndParse(`), **existence-guarded**.
- [x] **Task 4 — Verification** — `phase22-glory-hybrid` + `assembler-uses-manual-path` + `glory-tools` cardinality = 67/67 ; DS + coherence + no-silent-zero = 77/77.

## Dev Notes

**The Epic 6 files don't exist yet — existence-guarded scan.** The epic text assumed Epic 1 scaffolded `lifecycle.ts` / `calibration.ts` as `NOT_YET_IMPLEMENTED` stubs ; it did not (the calibration/lifecycle intent kinds + SLOs exist from Epic 1, but the handler files are Epic 6). Rather than fabricate Epic 6 stubs (NEFER : no scaffolding for hypothetical futures), the extended scan is guarded by `fs.existsSync` : it passes now (files absent) and becomes enforcing the moment Epic 6 creates them. This avoids a RED gap while still wiring the invariant in advance.

**Structural-equality strategy.** `defineHybridTool` makes `manualFormSchema` and `outputSchema` the same reference, so `toBe` (reference identity) is the strongest check ; the additional `deriveJsonSchemaFromZod` deep-equality (`toEqual`) catches any future author who sets them as separate-but-equal schemas.

### File List
- **EDIT** [tests/unit/governance/phase22-glory-hybrid.test.ts](../../tests/unit/governance/phase22-glory-hybrid.test.ts) — 3 `it.todo` → HARD assertions + forbidden-otherwise + HYBRID-completeness.
- **EDIT** [tests/unit/governance/assembler-uses-manual-path.test.ts](../../tests/unit/governance/assembler-uses-manual-path.test.ts) — existence-guarded scan of `lifecycle.ts` + `calibration.ts`.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Both tests HARD ; backend-only, fully headless-verifiable.
- Epic 5 CLOSED 6/6. Cap APOGEE 7/7 preserved (test-only).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.6 shipped — `phase22-glory-hybrid` HARD (5 tools HYBRID + parity + natures + forbidden-otherwise) + assembler scan extended to Epic 6 orchestrators (existence-guarded). 67/67 green. Phase 23 Epic 5 5/6 → 6/6 — EPIC 5 CLOSED. | NEFER (Claude Opus 4.7) |
