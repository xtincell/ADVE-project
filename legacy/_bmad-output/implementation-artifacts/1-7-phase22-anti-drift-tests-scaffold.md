# Story 1.7: Scaffold 6 `phase22-*.test.ts` anti-drift tests at baseline

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 7/10)
Owning Neter: Mestor (Guidance · anti-drift CI surface)
APOGEE OS layer (ADR-0084): Layer 7 — Tests (governance anti-drift suite)
BrandAsset.kind produced: none (CI scaffold — test files at baseline mode)
Portail target: none runtime — files land at [tests/unit/governance/](../../tests/unit/governance/) (6 new test files)
Manual-first parity (ADR-0060): n/a — pure CI anti-drift scaffold, no LLM feature, no UI
Mission link: each of the 6 Phase 22 patterns (P22-1 through P22-7, minus P22-5 which folds into P22-3's HARD test) is a structural invariant that prevents a class of failure modes from regressing : silent fake-LIVE on connector outage (P22-1), silent zero on insufficient data (P22-2), bypass of manual-first parity (P22-3), bypass of lifecycle state machine (P22-4), no-calibration-table drift (P22-6), dangling phantom ADR refs (P22-7). Without these tests scaffolded **before** the patterns ship, downstream Epics 2–7 would have no anti-drift contract to activate against ; the tests must exist as files (at baseline / `it.todo` mode) from Epic 1 so CI never sees a phase where the test files are missing — only their assertion-strength evolves over time.
CODE-MAP grep: searched "phase22-connector-result", "phase22-no-silent-zero", "phase22-glory-hybrid", "phase22-lifecycle-promotion", "phase22-no-calibration-table", "phase22-no-dangling-adr-refs" across `tests/unit/governance/`. Hits: 0 prior test files at these names. Extension chosen: net-new test files at canonical path `tests/unit/governance/` justified by architecture §"Pattern enforcement" — 6 patterns each get one dedicated HARD test file ; baseline-mode scaffolding (containing `it.todo()` placeholders or simple "file exists" assertions) prevents the "first violation merges silently before the test ships" failure mode.
```

## Story

As a **NEFER operator**,
I want **the six new HARD-mode anti-drift tests to exist as files (in baseline / pending mode) from Epic 1**,
so that **downstream epics activate them as their patterns ship — and CI never sees a phase where the test files are missing**.

## Acceptance Criteria

Verbatim from [epics.md L549-562](../planning-artifacts/epics.md):

1. **Given** the architecture §"Pattern enforcement" specification
   **When** the test files are created under `tests/unit/governance/`
   **Then** the following six files exist as Vitest suites :
   - `phase22-connector-result.test.ts` (P22-1)
   - `phase22-no-silent-zero.test.ts` (P22-2)
   - `phase22-glory-hybrid.test.ts` (P22-3)
   - `phase22-lifecycle-promotion.test.ts` (P22-4)
   - `phase22-no-calibration-table.test.ts` (P22-6)
   - `phase22-no-dangling-adr-refs.test.ts` (P22-7)

2. **And** each file contains a placeholder `it.todo("activated in Epic N")` referencing its owning epic.

3. **And** `pnpm test` (or `npm test`) is green (no `it.todo` counts as failure per project convention).

4. **And** each file has a header comment referencing its owning pattern (P22-1 through P22-7) and the ADR (0077+) that governs it.

## Tasks / Subtasks

- [x] **Task 1 — Scaffold `phase22-connector-result.test.ts` (P22-1)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts)*.
  - [x] 1.1 — Header docblock : cite Pattern P22-1, ADR-0077 §"Pattern P22-1", ADR-0079 §"ConnectorResult contract", `src/domain/connector-result.ts` as the canonical type home, Epic 2 Story 2.5 as the activation point.
  - [x] 1.2 — Placeholder body : at scaffold time, `it.todo("activated in Epic 2 Story 2.5 — assert connector façades return ConnectorResult<T> + no catch-block fakes LIVE")`. Epic 2 Story 2.5 replaces with real AST-grep assertions on connector façade files.
  - [x] 1.3 — Optional sanity assertion at scaffold time : `it("ConnectorResult type exists at canonical path", () => { ... fs.existsSync ... })` — guarantees the file is non-empty + the type backbone is reachable.

- [x] **Task 2 — Scaffold `phase22-no-silent-zero.test.ts` (P22-2)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts)*.
  - [x] 2.1 — Header docblock : cite Pattern P22-2, ADR-0077 §"Pattern P22-2", ADR-0046 (no-magic-fallback root invariant), Epic 3 Story 3.8 as the first activation point (extended to superfan files at Epic 4 Story 4.8).
  - [x] 2.2 — Placeholder : `it.todo("activated in Epic 3 Story 3.8 — AST scan for ?? 0 / || 0 on score/shift/readiness/delta identifiers in services/campaign-tracker/signals-culture.ts + services/sector-intelligence/")`. Epic 3 Story 3.8 ships the real AST/regex scan ; Epic 4 Story 4.8 extends it to superfan files.

- [x] **Task 3 — Scaffold `phase22-glory-hybrid.test.ts` (P22-3 + P22-5)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-glory-hybrid.test.ts](../../tests/unit/governance/phase22-glory-hybrid.test.ts)*.
  - [x] 3.1 — Header docblock : cite Patterns P22-3 (HYBRID Glory tool + `manualFormSchema` = `outputFormat`) + P22-5 (dispatcher via `getGloryTool(slug)`), ADR-0077 §"Pattern P22-3", Epic 5 Story 5.6 as activation point (also extends `assembler-uses-manual-path.test.ts`).
  - [x] 3.2 — Placeholder : `it.todo("activated in Epic 5 Story 5.6 — assert 5 phase19 Glory tools have executionType === 'HYBRID' + manualFormSchema structurally === outputFormat + applicableNatures non-empty")`. Epic 5 Story 5.6 ships the real assertions.

- [x] **Task 4 — Scaffold `phase22-lifecycle-promotion.test.ts` (P22-4)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-lifecycle-promotion.test.ts](../../tests/unit/governance/phase22-lifecycle-promotion.test.ts)*.
  - [x] 4.1 — Header docblock : cite Pattern P22-4, ADR-0077 §"Pattern P22-4", ADR-0080 §"Lifecycle promotion state machine", Epic 6 Story 6.6 as activation point.
  - [x] 4.2 — Placeholder : `it.todo("activated in Epic 6 Story 6.6 — assert lifecycle.ts handler refuses skip-forward, refuses reverse, refuses PRODUCTION without calibrationSnapshotRef")`.

- [x] **Task 5 — Scaffold `phase22-no-calibration-table.test.ts` (P22-6)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-no-calibration-table.test.ts](../../tests/unit/governance/phase22-no-calibration-table.test.ts)*.
  - [x] 5.1 — Header docblock : cite Pattern P22-6, ADR-0077 §"Pattern P22-6", ADR-0080 + ADR-0081 (calibration snapshots = IntentEmission payloads), Epic 6 Story 6.7 as activation point.
  - [x] 5.2 — Placeholder : `it.todo("activated in Epic 6 Story 6.7 — assert no Prisma model with name matching /^Calibration/ exists in schema.prisma")`. Epic 6 ships the real schema-introspection assertion.
  - [x] 5.3 — Optional sanity at scaffold : grep `prisma/schema.prisma` for `^model Calibration` — 0 hits expected (P22-6 already structurally true after Story 1.6 migration which adds no new model).

- [x] **Task 6 — Scaffold `phase22-no-dangling-adr-refs.test.ts` (P22-7)** (AC: #1, #2, #4) — *NEW file [tests/unit/governance/phase22-no-dangling-adr-refs.test.ts](../../tests/unit/governance/phase22-no-dangling-adr-refs.test.ts)*.
  - [x] 6.1 — Header docblock : cite Pattern P22-7, ADR-0077 §"Pattern P22-7" + §"Superseded references" (5 phantom refs `0053-coherence-llm-evaluator` etc.), Epic 7 closure as activation point.
  - [x] 6.2 — Placeholder : `it.todo("activated in Epic 7 — grep for the 5 phantom ADR refs across src/ + docs/ ; must be 0 hits after Phase 23 closure")`.
  - [x] 6.3 — Optional sanity at scaffold : grep current state to record baseline (non-zero hits expected ; counter decreases per Phase 23 commit that touches a `capability-state.ts` entry referencing a phantom ref ; reaches 0 at Epic 7 closure).

- [x] **Task 7 — Verification** (AC: #3).
  - [x] 7.1 — `pnpm test tests/unit/governance/phase22-*.test.ts` — all 6 files pass (no `it.todo` counts as failure per project convention ; either the optional "file exists" assertions cover them or the project's `it.todo` policy is liberal in test count).
  - [x] 7.2 — `pnpm test` (full suite) — green ; no test count regression.
  - [x] 7.3 — Each test file header comment ↔ owning Pattern + ADR cross-reference matches AC #4.

## Dev Notes

### Relevant architecture patterns and constraints

**Why scaffold-then-activate vs ship-when-pattern-lands** — without scaffolded test files at Epic 1, every Epic that ships a pattern would face a coordination burden : "did we remember to write the test?". With scaffolded files at baseline, the test gating is automatic : CI fails the moment a test moves from `it.todo` to a real assertion and the assertion fails. **The test file's existence is itself the invariant.** This is the same pattern as Phase 21 F-A's `executeStructuredLLMCall` migration : baseline tests landed first (G2 / G3 / G7 / G8) in soft mode, then activated as each tool migrated.

**HARD mode vs SOFT/baseline mode** — Vitest doesn't natively distinguish these ; the convention is :
- **SOFT / baseline**: the test exists, ships `it.todo`s or "file exists" assertions ; does not fail on absent behavior. Activated in CI but green by construction.
- **HARD**: real assertions on the invariant ; any violation fails CI. No baseline allowed (no "fix later" exceptions).

The activation transition from SOFT to HARD happens when the Epic-owner story ships : Epic 2 Story 2.5 for P22-1, Epic 3 Story 3.8 for P22-2, Epic 5 Story 5.6 for P22-3/5, Epic 6 Story 6.6 for P22-4, Epic 6 Story 6.7 for P22-6, Epic 7 closure for P22-7.

**Why P22-5 doesn't get its own test file** — P22-5 ("dispatch Glory tools via `getGloryTool(slug)` uniquely") is structurally folded into `phase22-glory-hybrid.test.ts` (P22-3) because both patterns govern the same surface (`services/artemis/tools/registry.ts`) ; splitting them would create coupled test files that fail in lockstep, gaining nothing. Also folded : the extension of `assembler-uses-manual-path.test.ts` (from ADR-0071) which scans Phase 23 handler files for forbidden direct LLM imports.

**Header comment convention** — each test file's docblock answers 4 questions :
1. **What pattern does this enforce?** (P22-1 ↔ ConnectorResult<T>, etc.)
2. **Where is it defined?** (ADR-0077 + child ADR, plus source files)
3. **When does it activate?** (Epic + Story that ships the real assertions)
4. **What does HARD mode look like?** (the AST/regex/file-shape assertions the test will eventually contain)

This makes the SOFT → HARD transition a *fill-in-the-blanks* exercise rather than a *design-from-scratch* exercise.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) | **NEW** | P22-1 scaffold ; HARD activation Epic 2 Story 2.5. |
| [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) | **NEW** | P22-2 scaffold ; HARD activation Epic 3 Story 3.8 + Epic 4 Story 4.8. |
| [tests/unit/governance/phase22-glory-hybrid.test.ts](../../tests/unit/governance/phase22-glory-hybrid.test.ts) | **NEW** | P22-3 + P22-5 scaffold ; HARD activation Epic 5 Story 5.6. |
| [tests/unit/governance/phase22-lifecycle-promotion.test.ts](../../tests/unit/governance/phase22-lifecycle-promotion.test.ts) | **NEW** | P22-4 scaffold ; HARD activation Epic 6 Story 6.6. |
| [tests/unit/governance/phase22-no-calibration-table.test.ts](../../tests/unit/governance/phase22-no-calibration-table.test.ts) | **NEW** | P22-6 scaffold ; HARD activation Epic 6 Story 6.7. |
| [tests/unit/governance/phase22-no-dangling-adr-refs.test.ts](../../tests/unit/governance/phase22-no-dangling-adr-refs.test.ts) | **NEW** | P22-7 scaffold ; HARD activation Epic 7 closure. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Pattern enforcement" — canonical map of P22-1 through P22-7 ↔ test file ↔ activating epic.
- [docs/governance/adr/0078–0081](../../docs/governance/adr/) — pattern owners per ADR (0078 governs P22-2 invariant for sector-intelligence wiring ; 0079 governs P22-1 ; 0080 governs P22-4 + P22-6 ; 0081 governs P22-6 + calibration methodology).
- [tests/unit/governance/](../../tests/unit/governance/) — sibling anti-drift tests (e.g. `neteru-coherence.test.ts`, `phase21-fa-llm-tools-soft.test.ts`) for header comment + scaffold convention reference.
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"Pattern enforcement" — implementation-level mapping.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- The 6 new test files — green at baseline ; activated HARD across Epics 2–7.

### Testing standards summary

- **Vitest 4** (per CLAUDE.md "Stack") — `import { describe, expect, it } from "vitest"`. Project convention : `it.todo("...")` does NOT count as failure when the test file has at least one real `it()` block ; pure-todo files fail the suite ("test must have at least one passing assertion" convention). Workaround : ship a stub `it("file exists at canonical path", () => { ... })` alongside the `it.todo` so the suite counts at least one passing test per file.
- **Mode SOFT** for the scaffold — explicit header comment per file : `// Mode: SOFT/baseline (Phase 23 Epic 1 Story 1.7 scaffold ; HARD activation in <Epic N Story M.K>)`.
- **No fixtures needed** at scaffold time — the placeholder + optional sanity assertions are file-system / import based.

### Project Structure Notes

**Alignment with unified project structure:**

- All 6 files at canonical path `tests/unit/governance/`. Naming convention : `phase22-<kebab-pattern>.test.ts` ; **kept `phase22-*` slug** (not `phase23-*`) because :
  - The patterns are doctrinally numbered P22-1..P22-7 (per ADR-0077 §"Pattern enforcement") regardless of the 2026-05-15 phase rebase.
  - Renaming the slug to `phase23-*` would create a debris field of broken cross-references in commits + ADRs that already cite `phase22-*` (e.g. Story 1.6 migration header comment, Story 1.7 architecture spec, every P22 mention in ADR-0077).
  - The kept-slug convention is documented in ADR-0077 §"Filename slug preservation" (alongside the ADR file itself `0077-phase-22-pivot-mechanics-wiring.md`).

**Detected variances / conflicts:**

- **`it.todo` policy** — depending on the project's Vitest config, `it.todo` may or may not count as failure. The conservative approach (used here) : ship a stub `it("file exists", ...)` per file to guarantee a passing assertion ; the `it.todo` lives alongside as the documentation marker.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L549-562 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Pattern enforcement"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern enforcement"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: tests/unit/governance/neteru-coherence.test.ts (sibling test convention reference)](../../tests/unit/governance/neteru-coherence.test.ts)
- [Source: tests/unit/governance/phase21-fa-llm-tools-soft.test.ts (Phase 21 F-A SOFT/baseline scaffold precedent — if extant)](../../tests/unit/governance/)
- [Source: tests/unit/governance/assembler-uses-manual-path.test.ts (ADR-0071 HARD test, extended by Epic 5 Story 5.6 to Phase 23 handlers)](../../tests/unit/governance/assembler-uses-manual-path.test.ts)

### Latest tech information

- **Vitest 4** — `it.todo("...")` is supported ; counted as a pending test (visible in CI report). Project Vitest config may flag pure-todo files as failures ; the stub `it("file exists", ...)` workaround is robust.
- **`fs.existsSync` for file-system assertions** — Node 22 native ; no npm install. Project tests already use this pattern (cf. `phase22-connector-result.test.ts` already shipped HARD).
- **No npm install needed** — pure test files.

### Previous story intelligence

- **Stories 1.1 / 1.2 / 1.3 / 1.4 / 1.5 / 1.6** — all predecessors that this scaffold story tests against. Each prior story's deliverable is part of the eventual HARD assertion surface of one or more of the 6 test files (e.g. Story 1.3 `ConnectorResult<T>` is asserted by `phase22-connector-result.test.ts` ; Story 1.6 schema has no `Calibration*` model and `phase22-no-calibration-table.test.ts` asserts it).
- **Phase 21 F-A SOFT/baseline scaffold precedent** — same pattern : ship the test file at baseline, activate HARD when the migration completes. Phase 21 had 4 baseline tests (G2/G3/G7/G8) that flipped HARD as Phase 21 F-A consumers shipped.

### Git intelligence summary

```
febfe94 test(governance): scaffold 6 phase22-*.test.ts anti-drift files at baseline   ← Story 1.7 ship commit
3658e8c governance(domain): phase 23 additive migration on Campaign + CampaignAction
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders
```

Pattern observed : Story 1.7 ships standalone (`test(governance):` scope) ; the commit lands the 6 baseline files at once. Subsequent commits (Epic 2 Story 2.5 ships HARD activation for `phase22-connector-result.test.ts` first — already visible in git history as commit `63c7787 test(governance): activate HARD phase22-connector-result.test.ts (P22-1)`).

### Project context reference

This story is **Story 7 of Phase 23 Epic 1 Governance Foundations**. It ships the **anti-drift CI scaffold** for the 7 Phase 22 patterns. After this story, CI hosts 6 baseline test files that get activated HARD as each pattern's owning Epic ships. Without this story, every Epic 2–7 commit would face the "did we remember to write the anti-drift test?" coordination burden ; with it, the gating is automatic.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0077 §"Pattern enforcement" read for the canonical map P22-1..P22-7 ↔ test file ↔ activating epic ; ADR-0078–0081 read for per-pattern ownership ; sibling test conventions verified in `tests/unit/governance/` ; Phase 21 F-A SOFT/baseline scaffold precedent confirmed ; Vitest `it.todo` policy verified (stub `it("file exists", ...)` workaround) ; kept-slug `phase22-*` convention rationale documented. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (6 files exist) — verified : `ls tests/unit/governance/phase22-*.test.ts` returns 6 files (`phase22-connector-result.test.ts`, `phase22-glory-hybrid.test.ts`, `phase22-lifecycle-promotion.test.ts`, `phase22-no-calibration-table.test.ts`, `phase22-no-dangling-adr-refs.test.ts`, `phase22-no-silent-zero.test.ts`).
- AC #2 (each file has `it.todo` referencing its owning epic) — verified : each file's body contains the `it.todo("activated in Epic <N> Story <M.K>")` marker.
- AC #3 (`pnpm test` green at baseline) — verified : the suite passes with the 6 stub `it("file exists", ...)` assertions + 6 `it.todo` markers ; no failures, no error count regression.
- AC #4 (header comment per file references Pattern + ADR) — verified : each file opens with a canonical docblock referencing the Pattern (P22-1..P22-7), the parent ADR (0077), the child ADR (0078/0079/0080/0081), the source files governed, and the HARD activation point.
- Verification : `git log --oneline | grep "scaffold 6 phase22"` confirms commit `febfe94 test(governance): scaffold 6 phase22-*.test.ts anti-drift files at baseline`.
- Subsequent HARD activation tracking : `git log --oneline | grep "activate HARD phase22"` returns `63c7787 test(governance): activate HARD phase22-connector-result.test.ts (P22-1)` — the first activation has already shipped (Epic 2 Story 2.5).

### Completion Notes List

- **AC #1–4 all shipped** in commit `febfe94`. 6 baseline test files at `tests/unit/governance/`, each carrying a header docblock + `it.todo` placeholder + (optional) stub `it("file exists", ...)`.
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0077 §"Pattern enforcement" + 4 child ADRs + sibling test conventions read), Phase 1 APOGEE (Layer 7 tests ; no Neter / service / route added ; cap 7/7 preserved), Phase 2 anti-doublon (grep returned 0 hits for the 6 new test slugs), Phase 3 conception (6 file paths canon, kept-slug `phase22-*` justified, each file's HARD activation point predetermined), Phase 4 execution (6 files created with canonical docblock + scaffold body), Phase 5 verification (`pnpm test` green baseline ; `neteru-coherence.test.ts` 12/12 green), Phase 6 documentation (no canonical map update needed — these are test files, not source entities), Phase 7 commit (shipped via `febfe94`).
- **Cap APOGEE 7/7 preserved** — test files only, no Neter / service / route added.
- **Manual-first parity (ADR-0060)** — n/a (pure CI scaffold).
- **Kept-slug convention `phase22-*`** — documented in the test file headers + ADR-0077. Renaming to `phase23-*` would create a debris field of broken cross-references across the codebase + ADRs ; the pattern numbering (P22-1..P22-7) is doctrinally locked.
- **Mission link**: the 6 test files are the **anti-drift backbone** that makes the 7 Phase 22 patterns enforceable as CI invariants. Without them, each pattern would be advisory ("please respect P22-1") ; with them, each pattern is structural (any violation fails CI). The pattern HARD activations across Epics 2–7 transform Phase 23 from "best-effort wiring" to "structurally invariant superfans × Overton instrumentation" — the difference between *might work* and *cannot drift*.

### File List

- **NEW** [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — P22-1 scaffold ; HARD activation Epic 2 Story 2.5 (already shipped per commit `63c7787`).
- **NEW** [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — P22-2 scaffold ; HARD activation Epic 3 Story 3.8 + Epic 4 Story 4.8.
- **NEW** [tests/unit/governance/phase22-glory-hybrid.test.ts](../../tests/unit/governance/phase22-glory-hybrid.test.ts) — P22-3 + P22-5 scaffold ; HARD activation Epic 5 Story 5.6.
- **NEW** [tests/unit/governance/phase22-lifecycle-promotion.test.ts](../../tests/unit/governance/phase22-lifecycle-promotion.test.ts) — P22-4 scaffold ; HARD activation Epic 6 Story 6.6.
- **NEW** [tests/unit/governance/phase22-no-calibration-table.test.ts](../../tests/unit/governance/phase22-no-calibration-table.test.ts) — P22-6 scaffold ; HARD activation Epic 6 Story 6.7.
- **NEW** [tests/unit/governance/phase22-no-dangling-adr-refs.test.ts](../../tests/unit/governance/phase22-no-dangling-adr-refs.test.ts) — P22-7 scaffold ; HARD activation Epic 7 closure.
- **EDIT** [_bmad-output/implementation-artifacts/1-7-phase22-anti-drift-tests-scaffold.md](./1-7-phase22-anti-drift-tests-scaffold.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.7 shipped via commit `febfe94` — 6 anti-drift test files scaffolded at SOFT/baseline mode at canonical `tests/unit/governance/phase22-*.test.ts` paths (kept-slug convention per ADR-0077). Each file carries header docblock + `it.todo` placeholder + stub assertion. HARD activation tracked per epic-owning Story (Epic 2/3/4/5/6/7). Subsequent HARD activation already shipped for `phase22-connector-result.test.ts` (Epic 2 Story 2.5, commit `63c7787`). Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 6/10 → 7/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
