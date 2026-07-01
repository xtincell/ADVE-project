# Story 5.1: Extend `GloryToolDef` with `HYBRID` executionType + `manualFormSchema`

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 5 — Measurement Glory Tools HYBRID · Story 1/6)
Owning Neter: Artemis (Propulsion — Glory tools registry §4.1)
APOGEE OS layer (ADR-0084): Services (governance type contract)
BrandAsset.kind produced: none
Portail target: none (type-level)
Manual-first parity (ADR-0060): this IS the structural enforcement of parity for HYBRID tools
CODE-MAP grep: extended existing `GloryToolDef` (registry.ts) — no new entity. HYBRID already anticipated in signals-culture.ts:384 comment.
```

## Story

As a NEFER operator, I want `GloryToolDef` extended to support `executionType: "HYBRID"` with a required `manualFormSchema`, so the manual-first parity contract (D7 / P22-3) is structural — a tool author cannot ship a HYBRID tool without a manual schema, and downstream dispatch is type-safe.

## Acceptance Criteria

Verbatim from [epics.md L982-989](../planning-artifacts/epics.md). `executionType` union gains `"HYBRID"` ; `manualFormSchema` required when HYBRID, forbidden otherwise (factory + anti-drift test) ; `manualFormSchema` structurally equal to the output schema ; tsc green, no consumers break.

## Tasks / Subtasks

- [x] **Task 1 — Union member** — `GloryExecutionType` gains `"HYBRID"` + doc block.
- [x] **Task 2 — Field** — optional `manualFormSchema?: ZodType<unknown>` on `GloryToolDef` with doc (required-when-HYBRID / forbidden-otherwise invariant enforced downstream).
- [x] **Task 3 — Named nature type** — extracted the inlined 9-value union to `GloryToolNature` (reused by `applicableNatures` + the factory).
- [x] **Task 4 — Factory** — `defineHybridTool(def: HybridToolInput): GloryToolDef`. `HybridToolInput` requires `executionType: "HYBRID"`, `outputSchema`, and a non-empty `applicableNatures` tuple `readonly [GloryToolNature, ...GloryToolNature[]]`. The factory sets `manualFormSchema = outputSchema` (same reference → structural parity by construction).
- [x] **Task 5 — Exports** — `defineHybridTool` + `GloryToolNature` + `HybridToolInput` via both barrels.
- [x] **Task 6 — Verification** — tsc clean ; no existing LLM/MCP/DELEGATE/COMPOSE/CALC tool affected.

## Dev Notes

**Why factory + test, not a discriminated-union interface.** The AC explicitly allows "Zod refinement at registration time OR structural-equality unit test". Converting `GloryToolDef` to a discriminated union would break the ~100 object-literal tool definitions across the registry. The factory gives compile-time enforcement for HYBRID authors (required `outputSchema` + non-empty `applicableNatures` tuple) while the shared interface stays additive ; "forbidden-otherwise" + structural equality are enforced by the Story 5.6 HARD test.

**Parity by reference.** `defineHybridTool` reuses the same Zod reference for `manualFormSchema` and `outputSchema`, so they cannot diverge. The Story 5.6 test asserts both reference identity and JSON-Schema structural equality (belt + suspenders for a future author bypassing the factory).

### File List
- **EDIT** [src/server/services/artemis/tools/registry.ts](../../src/server/services/artemis/tools/registry.ts)
- **EDIT** [src/server/services/artemis/tools/index.ts](../../src/server/services/artemis/tools/index.ts)
- **EDIT** [src/server/services/glory-tools/index.ts](../../src/server/services/glory-tools/index.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot.

### Completion Notes List
- Type-level enforcement shipped via factory ; runtime/structural enforcement via Story 5.6.
- Cap APOGEE 7/7 preserved (executionType, not a Neter).

### Change Log
| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 5.1 shipped — HYBRID union + `manualFormSchema` + `GloryToolNature` + `defineHybridTool` factory. tsc green. | NEFER (Claude Opus 4.7) |
