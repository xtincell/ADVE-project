# Story 1.8: Scaffold BRIEF_VS_ADVE_COHERENCE governance gate

Status: ready-for-dev

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations)
Owning Neter: Mestor (gate registry · Guidance sub-system, APOGEE §4.2)
APOGEE OS layer (ADR-0084): Layer 5 — Services système (Mestor daemon)
BrandAsset.kind produced: none (governance scaffold, no deliverable)
Portail target: none runtime (server-side gate · Console gate-status dashboard deferred to Phase 24 closure-target #14)
Manual-first parity (ADR-0060): pure backend governance scaffold — no UI counterpart required at scaffold stage. Full enforcement in Phase 24 will pair LLM-assisted coherence check with manual operator override mode in `/console/strategy-operations/brief-ingest` (existing surface).
Mission link: every brief that enters the OS must be coherent with the brand's ADVE noyau before any RTIS / production action — this gate is the most direct contributor to "superfans × Overton" (the noyau ADVE is the source-of-truth from which superfan-generating production cascades; a non-coherent brief poisons the entire cascade).
CODE-MAP grep: searched "BRIEF_VS_ADVE", "briefVsAdve", "brief-vs-adve", "coherence-gate", "PILLAR_COHERENCE", "brief-coherence" across `src/` + `docs/governance/`. Hits: ADR-0023 §"4. Gate PILLAR_COHERENCE" (sibling gate, governs ADVE *editing* — different surface), ADR-0049 (Brief mandatory gate, governs brief *presence* — different layer), STATE_FINAL_BLUEPRINT §21.2 D-3.1 (this gate, marked CRITIQUE ABSENT), ADR-0085 §"couplé closure-target #14". No code hit — gate is **net-new**. Extension chosen: net-new gate file, justified by ADR-0049 (mandatory presence) + ADR-0023 (ADVE write enforcement) being orthogonal layers — this gate is *content coherence between brief and ADVE pillars*, a distinct concern.
```

## Story

As a **NEFER operator**,
I want **the `BRIEF_VS_ADVE_COHERENCE` gate type + handler stub registered in Mestor's gate registry from Phase 23 Epic 1**,
so that **subsequent ingestion flows (Phase 24 closure-target #14) can plug into a stable contract, and the governance foundation that blueprint §3 + §21.2 (drift D-3.1 CRITIQUE) calls for is laid alongside the lifecycle Intent scaffolding in the same epic**.

## Acceptance Criteria

Verbatim from [epics.md L564-583](../planning-artifacts/epics.md#story-18-scaffold-brief_vs_adve_coherence-governance-gate):

1. **Given** [STATE_FINAL_BLUEPRINT §3](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (ADVE = brand noyau) + §21.2 (D-3.1 CRITICAL gate absent) + [ADR-0023](../../docs/governance/adr/0023-operator-amend-pillar.md) (OPERATOR_AMEND_PILLAR as unique ADVE write path) + [ADR-0049](../../docs/governance/adr/0049-brief-mandatory-gate.md) (Brief Mandatory Gate)
   **When** [src/server/services/mestor/gates/brief-vs-adve-coherence.ts](../../src/server/services/mestor/gates/brief-vs-adve-coherence.ts) is created
   **Then** the file exports a `briefVsAdveCoherenceGate` function with signature
   ```ts
   (
     input: { strategyId: string; brief: { content: string; pillarBindings?: PillarKey[] } },
     ctx: GateContext,
   ) => Promise<GateResult>
   ```
   where `GateResult` is the canonical `{ verdict: "PASS" | "BLOCK" | "WARN"; reason?: string; evidence?: unknown }` discriminated union.

2. **And** the gate stub body throws `NOT_YET_IMPLEMENTED("BRIEF_VS_ADVE_COHERENCE enforcement deferred to closure-target #14 Phase 24")` — same scaffolding pattern as Stories 1.4/1.5 Intent kind handlers.

3. **And** the gate is registered in [services/mestor/gates/index.ts](../../src/server/services/mestor/gates/index.ts) under the canonical `MestorGates` map type, with `governor: MESTOR` per [ADR-0084](../../docs/governance/adr/0084-os-architecture-8-canonical-layers.md) Layer 5 boundary.

4. **And** a new anti-drift test [tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts](../../tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts) asserts the gate is exported, registered in the map, and currently throws `NOT_YET_IMPLEMENTED` (so production code referencing it pre-Phase-24 fails fast).

5. **And** [ADR-0049](../../docs/governance/adr/0049-brief-mandatory-gate.md) is cross-referenced from the new gate file header — this gate is the *coherence* enforcement layer that sits on top of ADR-0049's *mandatory* enforcement layer.

6. **And** [closure-roadmap.md](../planning-artifacts/closure-roadmap.md) target #14 entry is annotated `Phase 23 Story 1.8 scaffold shipped` once this story merges.

7. **And** `tsc --noEmit` + `lint` are green.

## Tasks / Subtasks

- [ ] **Task 1 — Define the canonical Mestor gate primitives** (AC: #1, #3) — *NEW file [src/server/services/mestor/gates/index.ts](../../src/server/services/mestor/gates/index.ts)* — the file does NOT exist today; create it as the canonical home for the `GateResult`, `GateContext`, and `MestorGates` map types so this story and all future gates plug into a single registry.
  - [ ] 1.1 — Export `GateResult` as `{ verdict: "PASS" | "BLOCK" | "WARN"; reason?: string; evidence?: unknown }` discriminated union (literal `verdict` discriminator).
  - [ ] 1.2 — Export `GateContext` interface holding the read-side fields gates need: `{ db?: PrismaClient; operatorId?: string; intentEmissionId?: string }` (optional fields — gates that need none can ignore; injection-friendly for tests).
  - [ ] 1.3 — Export `MestorGates` map type — a `Record<MestorGateKey, MestorGateHandler<any>>`-shaped registry. `MestorGateKey` is a literal union starting with `"BRIEF_VS_ADVE_COHERENCE"` (more keys added by later stories — leave the union open by re-exporting the keys array so consumers can iterate).
  - [ ] 1.4 — Export `mestorGates` const (the registry instance) — initially `{ BRIEF_VS_ADVE_COHERENCE: briefVsAdveCoherenceGate }`. Each entry typed as `{ handler: MestorGateHandler<...>; governor: typeof MESTOR }` — `governor` field per ADR-0084 Layer 5 contract.
  - [ ] 1.5 — Re-export the two pre-existing gate functions (`applyManipulationCoherenceGate`, `applyNarrativeCoherenceGate`) from this index as a non-breaking facade — they continue to be dispatched via the legacy `intents.ts` dynamic-import path (do NOT migrate them in this story; Phase 24 will absorb them under `MestorGates`).
  - [ ] 1.6 — Module header comment cites this story, ADR-0084 (Layer 5 boundary), ADR-0049, and ADR-0023.

- [ ] **Task 2 — Create the BRIEF_VS_ADVE_COHERENCE gate stub** (AC: #1, #2, #5) — *NEW file [src/server/services/mestor/gates/brief-vs-adve-coherence.ts](../../src/server/services/mestor/gates/brief-vs-adve-coherence.ts)*.
  - [ ] 2.1 — File header comment (matches conventions of [narrative-coherence.ts](../../src/server/services/mestor/gates/narrative-coherence.ts) + [manipulation-coherence.ts](../../src/server/services/mestor/gates/manipulation-coherence.ts)) — reference STATE_FINAL_BLUEPRINT §3 + §21.2 (drift D-3.1 CRITIQUE), ADR-0023 (OPERATOR_AMEND_PILLAR unique ADVE write path), [ADR-0049](../../docs/governance/adr/0049-brief-mandatory-gate.md) (mandatory presence layer below this coherence layer), closure-roadmap target #14 (Phase 24 enforcement scope).
  - [ ] 2.2 — Import `PillarKey` from [@/domain/pillars](../../src/domain/pillars.ts) — canonical pillar enum, do NOT hardcode `"A"|"D"|"V"|"E"`.
  - [ ] 2.3 — Import `GateResult` + `GateContext` types from `./index` (forward import is fine — gate file imports types only, no value cycle).
  - [ ] 2.4 — Export `briefVsAdveCoherenceGate` with the exact signature from AC #1: `(input: { strategyId: string; brief: { content: string; pillarBindings?: PillarKey[] } }, ctx: GateContext) => Promise<GateResult>`.
  - [ ] 2.5 — Body throws `new NotYetImplementedError("BRIEF_VS_ADVE_COHERENCE enforcement deferred to closure-target #14 Phase 24")` — define `NotYetImplementedError` inline in this file (or in `index.ts` if you prefer a shared scaffold error — keep it local to gates, do NOT pollute domain). The error message string is part of the contract; the anti-drift test (Task 3) asserts on the literal substring `"NOT_YET_IMPLEMENTED"` and the closure-target reference, so include both. Story 1.4 + 1.5 use a thrown-string pattern (`throw new Error("NOT_YET_IMPLEMENTED ...")`); follow the same shape — `class NotYetImplementedError extends Error { constructor(message: string) { super(\`NOT_YET_IMPLEMENTED: ${message}\`); this.name = "NotYetImplementedError"; } }`.

- [ ] **Task 3 — Anti-drift scaffold test** (AC: #4) — *NEW file [tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts](../../tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts)*.
  - [ ] 3.1 — Follow the file-shape assertion pattern from [phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) (Story 2.5 reference): import the gate, import the registry, assert on filesystem + module exports + runtime throw.
  - [ ] 3.2 — Test 1: `briefVsAdveCoherenceGate` is exported from `src/server/services/mestor/gates/brief-vs-adve-coherence.ts`.
  - [ ] 3.3 — Test 2: `mestorGates.BRIEF_VS_ADVE_COHERENCE.handler === briefVsAdveCoherenceGate` (identity check — confirms registry wires the same reference).
  - [ ] 3.4 — Test 3: `mestorGates.BRIEF_VS_ADVE_COHERENCE.governor === "MESTOR"` (governor constant — sourced from `BRAINS` per [manifest.ts:23](../../src/server/governance/manifest.ts)).
  - [ ] 3.5 — Test 4: calling the gate with a minimal input rejects with an error whose `message` contains `"NOT_YET_IMPLEMENTED"` AND `"closure-target #14"` (literal substrings — guarantees the scaffold-deferral signal cannot silently drift).
  - [ ] 3.6 — Test mode: **soft baseline** with explicit comment `Mode: SOFT (pending Phase 24 closure-target #14 — flip to HARD when enforcement ships)`. Match the convention used in Phase 21 F-A tests.
  - [ ] 3.7 — Header comment: cite Phase 23 Story 1.8, closure-target #14, ADR-0049, ADR-0084 Layer 5 boundary.

- [ ] **Task 4 — Closure-roadmap annotation** (AC: #6) — *EDIT [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md)*.
  - [ ] 4.1 — Locate target #14 row (BRIEF_VS_ADVE_COHERENCE gate + 3 ingestion gates). Append to its `Status` cell: ` · Phase 23 Story 1.8 scaffold shipped <YYYY-MM-DD>` (use today's date when shipping).
  - [ ] 4.2 — Confirm no other closure-roadmap row needs touching (target #14 is the only one this story partially advances).

- [ ] **Task 5 — Verification** (AC: #7).
  - [ ] 5.1 — `pnpm tsc --noEmit` (or `npm run typecheck`) — must be green.
  - [ ] 5.2 — `pnpm lint` — must be green. Pay attention to `eslint-plugin-boundaries` — the new files live under `server/services/mestor/gates/` (Layer 5 per [ADR-0002](../../docs/governance/adr/0002-layering-cascade.md) + [ADR-0084](../../docs/governance/adr/0084-os-architecture-8-canonical-layers.md)) and may only import from `domain/`, `lib/`, `server/governance/`, and sibling `server/services/`. No imports from `server/trpc/`, `components/`, or `app/`.
  - [ ] 5.3 — `pnpm test tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts` — all 4 tests pass.
  - [ ] 5.4 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — anti-drift suite stays green (cap APOGEE 7/7 preserved, no new Neter).
  - [ ] 5.5 — Smoke-import check: `pnpm tsx -e "import('@/server/services/mestor/gates').then(m => console.log(Object.keys(m.mestorGates)))"` — outputs `[ 'BRIEF_VS_ADVE_COHERENCE' ]` (plus any re-exported legacy names if Task 1.5 added them).

## Dev Notes

### Relevant architecture patterns and constraints

**Three orthogonal brief/ADVE governance layers (do NOT conflate):**

| Layer | ADR | What it gates | Surface |
|---|---|---|---|
| ADVE editing | [ADR-0023](../../docs/governance/adr/0023-operator-amend-pillar.md) | Mutations *of* the ADVE pillars (PATCH_DIRECT / LLM_REPHRASE / STRATEGIC_REWRITE modes). Has its own `PILLAR_COHERENCE` gate. | `OPERATOR_AMEND_PILLAR` Intent only. |
| Brief presence | [ADR-0049](../../docs/governance/adr/0049-brief-mandatory-gate.md) | Production actions cannot start without a `CampaignBrief` attached to the parent `Campaign`. | `createActionFromType`, `mission.create` (campaign-scoped). |
| **Brief content coherence (this story scaffolds)** | STATE_FINAL_BLUEPRINT §21.2 D-3.1 + closure-target #14 | Whether a brief's content is *coherent* with the brand's ADVE pillars (no contradiction with Authenticité/Distinction/Valeur/Engagement). | `INGEST_BRIEF`-emitting flows in Phase 24. |

This story scaffolds layer 3 only. Do NOT modify ADR-0023's `PILLAR_COHERENCE` gate (different surface) or ADR-0049's `assertCampaignHasBrief` (different layer).

**Mestor gate dispatch — current state of the repo:**

- Two gates exist today: [`narrative-coherence.ts`](../../src/server/services/mestor/gates/narrative-coherence.ts) and [`manipulation-coherence.ts`](../../src/server/services/mestor/gates/manipulation-coherence.ts).
- They are dispatched via **direct dynamic import** from [`intents.ts:1106`](../../src/server/services/mestor/intents.ts) (`const { applyManipulationCoherenceGate } = await import("./gates/manipulation-coherence")`). There is NO `index.ts`, no `MestorGates` map, no shared `GateResult` discriminated union.
- Each existing gate ships its own bespoke verdict shape (`NarrativeCoherenceVerdict.status: "OK" | "DOWNGRADED" | "VETOED"`, `ManipulationCoherenceVerdict.status: "OK" | "DOWNGRADED" | "VETOED"`). They are NOT structurally identical to the new `GateResult { verdict: "PASS" | "BLOCK" | "WARN" }` shape.
- **This story introduces the canonical `MestorGates` registry alongside the new gate.** Do NOT migrate the two existing gates onto `MestorGates` in this story (out-of-scope — Phase 24 closure-target #14 will absorb them when full enforcement lands). The new index.ts re-exports them as a non-breaking facade (Task 1.5).

**Why the new gate uses a different verdict alphabet (`PASS`/`BLOCK`/`WARN`):**

The epic spec mandates this exact shape (AC #1 verbatim). It aligns with the *gate-as-typed-contract* doctrine of the upcoming Phase 24 sibling gates (`PRODUCTION_OUTPUT_VS_BRIEF`, `BROADCAST_VS_AUDIENCE_FIT`) — closure-target #14 will ship three gates with one shared verdict alphabet. The pre-existing `OK/DOWNGRADED/VETOED` alphabet was bespoke per-gate; the new alphabet is intentionally portal/UI-friendly (PASS = ship, BLOCK = stop, WARN = surface but proceed).

**Layer 5 boundary (ADR-0084):**

Gates live at Layer 5 (Services système). Permitted imports per [ADR-0002 layering cascade](../../docs/governance/adr/0002-layering-cascade.md):

```
domain → lib → server/governance → server/services → server/trpc → components → app
```

This means the new files may import from:
- `@/domain/pillars` (for `PillarKey`) ✓
- `@/lib/...` (e.g., `@/lib/db` if needed — but the stub does NOT touch DB) ✓
- `@/server/governance/manifest` (for `BRAINS.MESTOR` constant) ✓
- Sibling `@/server/services/...` (avoid cross-Neter — the gate file should be self-contained at scaffold stage) ✓

They may NOT import from `@/server/trpc/`, `@/components/`, `@/app/`. `eslint-plugin-boundaries` enforces this.

**Manual-first parity (ADR-0060):**

ADR-0060 mandates that every LLM feature has a manual UI counterpart. This gate scaffold has NO LLM behavior yet (it throws). When Phase 24 ships full enforcement, the LLM-assisted coherence check (Claude prompt comparing brief content vs ADVE pillars) MUST be paired with a manual operator override path at `/console/strategy-operations/brief-ingest` (existing surface, ADR-0049 §2.4). **This story does NOT need to ship the UI** — pure backend scaffold. Note this fact in the gate file header so the Phase 24 dev agent does not re-discover the parity requirement.

**Mission link (NEFER §3, MISSION.md drift test):**

The brief is the contract between the brand's ADVE noyau and the production cascade that generates superfan-shifting work. A brief that contradicts ADVE poisons everything downstream: the Glory tools forge assets misaligned with the brand identity, Anubis broadcasts them to the wrong audience, Seshat measures noise. The `BRIEF_VS_ADVE_COHERENCE` gate is therefore the single most direct contributor to the superfans × Overton mechanic at the ingestion frontier — every brief that passes it strengthens the cascade, every brief it blocks prevents poison entering the system.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/mestor/gates/index.ts](../../src/server/services/mestor/gates/index.ts) | **NEW** | Canonical home for `GateResult`, `GateContext`, `MestorGates` map type, and `mestorGates` registry. Does not exist today. |
| [src/server/services/mestor/gates/brief-vs-adve-coherence.ts](../../src/server/services/mestor/gates/brief-vs-adve-coherence.ts) | **NEW** | The gate stub. Throws `NOT_YET_IMPLEMENTED`. |
| [tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts](../../tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts) | **NEW** | Soft-baseline anti-drift test (flip to HARD in Phase 24). |
| [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) | **UPDATE** | Annotate target #14 row with `Phase 23 Story 1.8 scaffold shipped <date>`. |

**Files to READ (must read fully before coding) — they will influence dev choices but must NOT be modified by this story:**

- [src/server/services/mestor/gates/narrative-coherence.ts](../../src/server/services/mestor/gates/narrative-coherence.ts) — current state, includes the bespoke verdict shape and the legacy dispatch convention. UNCHANGED by this story.
- [src/server/services/mestor/gates/manipulation-coherence.ts](../../src/server/services/mestor/gates/manipulation-coherence.ts) — same. UNCHANGED.
- [src/server/services/mestor/intents.ts:1100-1130](../../src/server/services/mestor/intents.ts) — dynamic-import dispatch convention. UNCHANGED.
- [src/domain/pillars.ts](../../src/domain/pillars.ts) — `PillarKey` source. UNCHANGED.
- [src/server/governance/manifest.ts](../../src/server/governance/manifest.ts) — `BRAINS` const (canonical Neter codes including `MESTOR`). UNCHANGED.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — reference for file-shape assertion style (HARD mode shape; this story uses SOFT mode, same structure).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap. This story adds no Neter; should pass untouched.
- [tests/unit/governance/phase22-*.test.ts](../../tests/unit/governance/) — Story 1.7 scaffold. Adds zero risk of regression.
- `pnpm lint` `eslint-plugin-boundaries` — new files respect Layer 5 boundaries.

### Testing standards summary

- **Framework**: Vitest 4 (project uses Vitest, not Jest — see [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) imports: `import { describe, expect, it } from "vitest"`).
- **Test mode SOFT**: explicit header comment `// Mode: SOFT (pending Phase 24 closure-target #14)`. The test asserts the stub throws — once enforcement lands, the assertions on `NOT_YET_IMPLEMENTED` will be replaced with assertions on the real verdict shapes. No baseline file (this is a scaffold test, not a drift-baseline test).
- **Naming**: `brief-vs-adve-coherence-scaffold.test.ts` (matches the file under test + `-scaffold` suffix used elsewhere in governance/ — see also the `phase22-*` family).
- **No mocks of DB / LLM** — the stub throws before touching either. Tests should call the gate with a stub input (e.g., `{ strategyId: "test", brief: { content: "" } }` + a minimal `GateContext`) and `await expect(...).rejects.toThrow(/NOT_YET_IMPLEMENTED/)`.

### Project Structure Notes

**Alignment with unified project structure:**

- New files land at canonical paths `services/mestor/gates/` (matches existing sibling gates) and `tests/unit/governance/` (matches existing anti-drift test family). No new directory created.
- `index.ts` introduction for `gates/` is a structural improvement that the codebase deferred until now (only 2 gates pre-existed, dispatched ad-hoc). With this story adding a third gate, an index becomes warranted. Phase 24 (closure-target #14) will harvest this index when it migrates the legacy 2 gates onto the `MestorGates` map.
- Layering boundary preserved: Layer 5 → Layer 0/1/3 imports only. `eslint-plugin-boundaries` will reject any drift.

**Detected variances / conflicts (with rationale):**

- The `GateResult` shape chosen (`PASS/BLOCK/WARN`) differs from the legacy `OK/DOWNGRADED/VETOED` used by the pre-existing 2 gates. This is **intentional** and **mandated by AC #1**; the legacy verdict alphabet is grandfathered (Phase 24 will reconcile). Do not refactor the legacy gates' verdict shapes in this story.
- `GateContext` is introduced as a new interface even though the legacy gates do not consume one — they each independently import `db`, `resolveEffectivePillars`, etc. The new `GateContext` is the canonical injection point going forward; the legacy gates may be retrofitted in Phase 24. This story ships the type contract only.

### References

- [Source: docs/governance/STATE_FINAL_BLUEPRINT.md §3 (ADVE = brand noyau)](../../docs/governance/STATE_FINAL_BLUEPRINT.md)
- [Source: docs/governance/STATE_FINAL_BLUEPRINT.md §21.2 (D-3.1 CRITIQUE — gate absent)](../../docs/governance/STATE_FINAL_BLUEPRINT.md)
- [Source: docs/governance/adr/0023-operator-amend-pillar.md §4 (PILLAR_COHERENCE gate — sibling surface)](../../docs/governance/adr/0023-operator-amend-pillar.md)
- [Source: docs/governance/adr/0049-brief-mandatory-gate.md (mandatory presence — sibling layer)](../../docs/governance/adr/0049-brief-mandatory-gate.md)
- [Source: docs/governance/adr/0084-os-architecture-8-canonical-layers.md (Layer 5 boundary for Services)](../../docs/governance/adr/0084-os-architecture-8-canonical-layers.md)
- [Source: docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md §"couplé closure-target #14"](../../docs/governance/adr/0085-refresh-cascade-stop-at-jehuty.md)
- [Source: docs/governance/adr/0002-layering-cascade.md (eslint-plugin-boundaries enforcement)](../../docs/governance/adr/0002-layering-cascade.md)
- [Source: docs/governance/adr/0060 (manual-first parity — applies in Phase 24 not this scaffold)](../../docs/governance/adr/)
- [Source: _bmad-output/planning-artifacts/epics.md L564-583 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/closure-roadmap.md target #14 row](../planning-artifacts/closure-roadmap.md)
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md §"Change 7"](../planning-artifacts/sprint-change-proposal-2026-05-16.md)
- [Source: src/server/services/mestor/gates/narrative-coherence.ts (pattern reference — UNCHANGED)](../../src/server/services/mestor/gates/narrative-coherence.ts)
- [Source: src/server/services/mestor/gates/manipulation-coherence.ts (pattern reference — UNCHANGED)](../../src/server/services/mestor/gates/manipulation-coherence.ts)
- [Source: src/server/services/mestor/intents.ts L1100-1130 (legacy dispatch convention)](../../src/server/services/mestor/intents.ts)
- [Source: src/domain/pillars.ts (canonical PillarKey)](../../src/domain/pillars.ts)
- [Source: src/server/governance/manifest.ts (BRAINS const including MESTOR)](../../src/server/governance/manifest.ts)
- [Source: tests/unit/governance/phase22-connector-result.test.ts (file-shape test pattern reference)](../../tests/unit/governance/phase22-connector-result.test.ts)
- [Source: CLAUDE.md "Phase status" → Phase 23 Epic 1 → 7/10 stories shipped](../../CLAUDE.md)

### Latest tech information

- **Vitest 4** — `import { describe, expect, it } from "vitest"`. `it.todo("text")` counts as test failure under project Vitest config (per Story 1.7 AC). For this story, use real `it("...", async () => {...})` blocks — no `it.todo` needed since the assertions are real (assert the throw).
- **TypeScript 6** (per CLAUDE.md "Stack" + Story 1.9 spec) — `as const` literal-type narrowing fully supported; use `const MESTOR_GATE_KEYS = ["BRIEF_VS_ADVE_COHERENCE"] as const` to derive `MestorGateKey = (typeof MESTOR_GATE_KEYS)[number]`.
- **Prisma 7** — not used in this story (stub throws before touching DB).

### Previous story intelligence (Phase 23 Epic 1 stories 1.4 / 1.5 — Intent kind scaffolds)

Stories 1.4 and 1.5 (Intent kind registrations for `PROMOTE_PIVOT_SUBCLUSTER` and `RUN_ATTRIBUTION_CALIBRATION`) established the **scaffold-throws-NOT_YET_IMPLEMENTED** convention this story mirrors:

- Use a placeholder handler that throws (Story 1.4 used `throw new Error("NOT_YET_IMPLEMENTED ...")`). This story does the same — wrapped in a named error class for clearer test assertions.
- Pin the error message to a literal string the anti-drift test can grep — prevents silent placeholder drift across renames.
- The corresponding handler implementation lives in a later epic (Story 6.1 / 6.2 for those Intent kinds; closure-target #14 Phase 24 for this gate). The scaffold story's job is to ship the contract, NOT the behavior.

### Git intelligence summary (recent Phase 23 Epic 1 commits — same epic context)

```
ed7d686 governance(governance): align planning + ADRs with blueprint canon
af75515 docs(governance): phase 23 CLAUDE.md state + reserve PAGE/ROUTER/SERVICE/COMPONENT-MAP entries
febfe94 test(governance): scaffold 6 phase22-*.test.ts anti-drift files at baseline
3658e8c governance(domain): phase 23 additive migration on Campaign + CampaignAction
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders
7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)
00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction
355b7db docs(governance): phase 23 epics + 53 stories breakdown (closure-roadmap target #1)
```

Pattern observed:
- Phase 23 stories use scopes `governance:` and `governance(<sub>):` (matches `_nefer-commit.md` canonical scopes).
- Scaffold stories (Intent kinds, ConnectorResult, anti-drift tests) ship as small focused commits — no bundled work.
- Commits include `phase 23` in the message body for grep-ability.

### Project context reference

This story is a unit of work in **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton)**, Epic 1 Governance Foundations. The epic ships **no user-visible behaviour change** — its purpose is to lay the typed-contract foundation that Epics 2-7 plug into. This story specifically lays the gate foundation that Phase 24 closure-roadmap target #14 will fully enforce.

The story was inserted into Epic 1 on 2026-05-16 via [sprint-change-proposal-2026-05-16.md](../planning-artifacts/sprint-change-proposal-2026-05-16.md) (post-STATE_FINAL_BLUEPRINT canonization). Pre-blueprint, the epic was 9 stories ; post-blueprint, 10 stories with the existing 1.8 / 1.9 renumbered to 1.9 / 1.10.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **ready-for-dev**

NEFER context engine analysis completed — Mestor gates inspection, ADR cross-references, Layer 5 boundary mapping, manual-first parity classification, scaffold-throws-NOT_YET_IMPLEMENTED pattern alignment with Stories 1.4 / 1.5, anti-drift test pattern alignment with [phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts), and CODE-MAP grep for `BRIEF_VS_ADVE` synonyms across `src/` + `docs/governance/` all documented above.

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

### Completion Notes List

### File List

(to be filled by dev agent — expected: 2 new src files + 1 new test file + 1 closure-roadmap edit)
