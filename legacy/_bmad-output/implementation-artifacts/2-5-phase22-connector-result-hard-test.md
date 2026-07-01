# Story 2.5: Activate HARD test `phase22-connector-result.test.ts`

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 2 — External Signal Connectors via Credentials Vault · Story 5/5 — Epic closure)
Owning Neter: Mestor (Guidance — anti-drift CI enforcement) ; Seshat + Anubis as observed governors of the connector façades being asserted
APOGEE OS layer (ADR-0084): Layer 8 — Tests (anti-drift CI ; meta-layer that polices code at all other layers)
BrandAsset.kind produced: none (test artefact)
Portail target: none runtime — test at [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) ; gates every Phase 23+ PR through husky + GitHub Actions
Manual-first parity (ADR-0060): n/a — test scaffold
Mission link: HARD test activation is the moment Pattern P22-1 transitions from "specification" to "structural invariant." Before this test, a future PR could introduce `try { fetch(...) } catch { return { state: "LIVE", data: { score: 0 } } }` and ship — silently breaking the no-magic-fallback root invariant (ADR-0046). After this test, that PR's CI is RED. This is the **first anti-drift HARD activation** of Phase 23, setting the precedent for Stories 3.8 / 5.6 / 6.7 / 7.X test activations. Each HARD test makes a class of fabricated-score failure structurally impossible. Direct contribution to superfans × Overton via the trust-and-verifiability pillar.
CODE-MAP grep: searched "phase22-connector-result", "ConnectorResult AST", "no fake LIVE", "connector exhaustiveness" across `tests/`. Hits: scaffold from Story 1.7 (`it.todo("activated in Epic 2")`). Extension chosen: ACTIVATE the scaffolded test with real assertions ; no new test file created (the file exists from Epic 1).
```

## Story

As a **NEFER operator**,
I want **the connector-result exhaustiveness test in HARD mode**,
so that **any future code path that swallows a transient connector failure into a `LIVE` result, or returns `null`/`undefined` from a connector-dependent capability, fails CI on the offending PR**.

## Acceptance Criteria

Verbatim from [epics.md L691-704](../planning-artifacts/epics.md):

1. **Given** Stories 2.2 + 2.3 (façades return `ConnectorResult<T>`)
   **When** `tests/unit/governance/phase22-connector-result.test.ts` is filled in (replacing the `it.todo` from Story 1.7)
   **Then** the test asserts : every export under `services/seshat/tarsis/` and `services/anubis/providers/` whose name matches a connector-fetch pattern returns a `ConnectorResult<T>` type (or compatible discriminated union).

2. **And** the test asserts : no file under `services/seshat/tarsis/` or `services/anubis/providers/` contains a `try`/`catch` swallowing a transport error into a `LIVE` result (pattern check via AST or regex).

3. **And** the test is configured `mode: "HARD"` (no baseline) — any new violation fails CI.

4. **And** `pnpm test` is green ; the test runs in < 2s.

## Tasks / Subtasks

- [x] **Task 1 — Replace `it.todo` scaffold from Story 1.7 with real assertions** (AC: #1, #3) — *EDIT [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts)*.
  - [x] 1.1 — Remove `it.todo("activated in Epic 2 Story 2.5")` placeholder.
  - [x] 1.2 — Add `describe("phase22-connector-result HARD", () => { ... })` block.
  - [x] 1.3 — File-header docblock cites Pattern P22-1 + ADR-0077 + ADR-0079 + the activation story (this story).

- [x] **Task 2 — Assertion : façade exports return `ConnectorResult<T>`** (AC: #1) — *AST inspection or import-and-check*.
  - [x] 2.1 — Glob `services/seshat/tarsis/*.ts` + `services/anubis/providers/*.ts` for files matching connector-fetch patterns (`fetch*`, `*Connector*`).
  - [x] 2.2 — For each match, assert at runtime that exported functions matching the pattern have return shapes compatible with `ConnectorResult<T>` (calling with mock args + asserting `.state` is one of the 3 canonical values).
  - [x] 2.3 — Or via TypeScript signature inspection : assert `tsc --emitDeclarationOnly` output contains `ConnectorResult<` in the signature.

- [x] **Task 3 — Assertion : no try/catch swallowing into LIVE** (AC: #2) — *Regex / AST scan*.
  - [x] 3.1 — For each file under the two directories, AST-scan or regex-scan for the anti-pattern : `catch (...) { return { state: "LIVE", ... } }`.
  - [x] 3.2 — Assert : 0 matches across all scanned files.
  - [x] 3.3 — The anti-pattern check covers both explicit `state: "LIVE"` in the catch return and indirect violations (returning a `ConnectorResult` constant or builder that resolves to LIVE inside a catch).

- [x] **Task 4 — Mode HARD configuration** (AC: #3) — *test config*.
  - [x] 4.1 — Mode `HARD` per repo convention : test file has no `baseline` constant ; every violation fails CI immediately.
  - [x] 4.2 — Document the mode at the top of the file : "HARD mode — no baseline — every new violation fails CI."

- [x] **Task 5 — Performance verification** (AC: #4) — *test runtime budget*.
  - [x] 5.1 — Test runtime < 2s on the developer machine + < 5s on CI. AST scan + import check are sub-second operations.

- [x] **Task 6 — Verification** (AC: all).
  - [x] 6.1 — `pnpm test tests/unit/governance/phase22-connector-result.test.ts` green.
  - [x] 6.2 — Full `pnpm test` suite green.
  - [x] 6.3 — Smoke test : introduce a deliberate violation locally (e.g. `catch { return { state: "LIVE", data: {} as TarsisSignal } }` in a test branch) → confirm test FAILS. Revert.

## Dev Notes

### Relevant architecture patterns and constraints

**HARD mode vs SOFT mode** — repo convention :
- **SOFT mode** = test has a `baseline` constant (e.g. `expect(violations.length).toBeLessThanOrEqual(BASELINE)`) ; existing violations are grandfathered ; only NEW violations fail CI. Used during migrations (e.g. design-tokens migration).
- **HARD mode** = no baseline ; every violation fails CI. Used for invariants that must be 0-violation from day one. Phase 23 Pattern P22-1 is HARD mode because the entire pattern's value depends on zero violations.

The transition SOFT → HARD requires either (a) full migration of existing violations OR (b) zero pre-existing violations (the Phase 23 case — pattern P22-1 is brand-new, the only consumers are the Phase 23 façades, so HARD is the natural mode).

**The two assertions are complementary**, not redundant :
- Assertion 1 (`ConnectorResult<T>` return shape) catches the case "someone forgot the pattern entirely and returned a plain object."
- Assertion 2 (no try/catch swallowing into LIVE) catches the case "someone knew the pattern but defeated it via exception-handling."

A façade can pass Assertion 1 (returns `ConnectorResult<T>`) while failing Assertion 2 (swallows into LIVE). The pair makes the pattern structurally sound.

**Why AST scan over runtime mock-and-check** — the runtime approach (call each connector with mock args, observe state) would require building a mock-Vault-and-mock-network harness in the test file. The AST scan approach reads the source code and pattern-matches — faster, no harness setup, deterministic. The trade-off : AST scan can miss edge cases where the LIVE branch is reached via a helper function ; the test combines both approaches (runtime check for the canonical export shape + AST scan for the anti-pattern).

**Pre-existing scaffolds and how this story consumes them** :
- Story 1.7 scaffolded all 6 `phase22-*.test.ts` files with `it.todo` placeholders. Story 2.5 is the FIRST activation of one of those 6 files. Stories 3.8 / 5.6 / 6.7 / 7.X activate the others.
- The activation pattern is now canonical for Phase 23 : replace `it.todo` with real `it("assertion", () => { ... })` blocks, switch to HARD mode, document at the file head.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) | **EDIT** (activate from Story 1.7 scaffold) | Replace `it.todo` with real HARD-mode assertions. |

**Files to READ (must read before drafting):**

- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — type the test imports.
- [src/server/services/seshat/tarsis/connector.ts](../../src/server/services/seshat/tarsis/connector.ts) — Story 2.2 asserted file.
- [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) — Story 2.3 asserted file.
- Other existing HARD anti-drift tests in `tests/unit/governance/` for pattern reference (e.g. `assembler-uses-manual-path.test.ts`).

**Anti-drift CI tests in the same family that this story precedes:**

- `phase22-no-silent-zero.test.ts` — activated Story 3.8 (Overton silent-zero ban) + extended Story 4.8 (Superfan).
- `phase22-glory-hybrid.test.ts` — activated Story 5.6 (HYBRID Glory tool dispatcher).
- `phase22-lifecycle-promotion.test.ts` — activated Story 6.7 (lifecycle state machine).
- `phase22-no-calibration-table.test.ts` — activated Story 6.7 (no new Prisma table).
- `phase22-no-dangling-adr-refs.test.ts` — activated Story 7.X (closure work).

### Testing standards summary

- HARD mode — no baseline.
- Two complementary assertions (return-shape + anti-pattern AST).
- Runtime < 2s local / < 5s CI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L691-704 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Pattern P22-1 enforcement"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-1"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: tests/unit/governance/assembler-uses-manual-path.test.ts (HARD test pattern reference)](../../tests/unit/governance/assembler-uses-manual-path.test.ts)
- [Source: _bmad-output/implementation-artifacts/1-7-phase22-anti-drift-tests-scaffold.md (test family scaffold)](./1-7-phase22-anti-drift-tests-scaffold.md)
- [Source: _bmad-output/implementation-artifacts/2-2-tarsis-connector-facade.md (asserted code)](./2-2-tarsis-connector-facade.md)
- [Source: _bmad-output/implementation-artifacts/2-3-crm-provider-facade.md (asserted code)](./2-3-crm-provider-facade.md)

### Previous story intelligence

- **Story 1.7** — scaffolded all 6 `phase22-*.test.ts` files with `it.todo`. This story replaces one `it.todo`.
- **Stories 2.2 + 2.3** — the façades whose code this story asserts.
- **Story 1.3** — the `ConnectorResult<T>` type the test imports.

### Git intelligence summary

```
63c7787 test(governance): activate HARD phase22-connector-result.test.ts (P22-1)   ← Story 2.5 ship commit (Epic 2 closure)
b8ed770 feat(console): phase 23 Credentials Vault UI extension for Tarsis + CRM    ← Story 2.4 predecessor
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)        ← Stories 2.1-2.3 predecessor
```

Pattern observed : test activation ships as a standalone commit AFTER its asserted code lands. This sequencing means the test enters CI green from commit 1, never as a baseline of pre-existing violations.

### Project context reference

This story is **Story 5 of Phase 23 Epic 2 — the epic closure story**. With this story merged, Epic 2 (External Signal Connectors via Credentials Vault) is 5/5 stories shipped. Pattern P22-1 is now structurally enforced ; every Phase 23+ PR that touches a connector goes through this HARD test.

**Epic 2 closure unlocks Epic 3** (Overton Measurement Wiring) — `culture.tarsisBridge` (Story 3.4) can now import `tarsisConnector.fetchSectorSignal` with confidence that the return shape obeys P22-1.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (return shape assertion) — shipped: see test file in commit `63c7787`.
- AC #2 (no swallow-into-LIVE assertion) — shipped : AST/regex scan of `services/seshat/tarsis/` + `services/anubis/providers/`.
- AC #3 (HARD mode, no baseline) — shipped : test file has no `BASELINE` constant.
- AC #4 (runtime < 2s) — verified : test runs in ~50ms local.

### Completion Notes List

- **AC #1–4 all shipped** in commit `63c7787`.
- **First Phase 23 HARD anti-drift activation** — sets the precedent for Stories 3.8 / 5.6 / 6.7 / 7.X activations.
- **NEFER 8-phase protocol compliance** : all 8 phases ticked.
- **Cap APOGEE 7/7 preserved** — test, no Neter touched.
- **Manual-first parity (ADR-0060)** — n/a (test).
- **Mission link**: structural enforcement of no-magic-fallback (ADR-0046) at the connector boundary. Every Overton / Superfan fabricated-number failure mode hinges on this test staying green.

### File List

- **EDIT** [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — replaced Story 1.7 `it.todo` scaffold with HARD-mode assertions on `ConnectorResult<T>` return shape + no-try/catch-swallow-into-LIVE anti-pattern.
- **EDIT** [_bmad-output/implementation-artifacts/2-5-phase22-connector-result-hard-test.md](./2-5-phase22-connector-result-hard-test.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-26 | Story 2.5 shipped via commit `63c7787` — HARD-mode activation of `phase22-connector-result.test.ts` ; two complementary assertions (`ConnectorResult<T>` return shape + no-swallow-into-LIVE anti-pattern) over `services/seshat/tarsis/` + `services/anubis/providers/`. Runtime ~50ms. **First Phase 23 HARD anti-drift activation.** **Epic 2 CLOSED (5/5 stories shipped).** Cap APOGEE 7/7 preserved. Phase 23 Epic 2 progress 4/5 → 5/5. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
