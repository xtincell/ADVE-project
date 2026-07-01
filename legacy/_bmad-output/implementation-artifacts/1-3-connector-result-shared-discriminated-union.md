# Story 1.3: Define `ConnectorResult<T>` shared discriminated union

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 3/10)
Owning Neter: Mestor (Guidance · type-level contract surface — pattern P22-1)
APOGEE OS layer (ADR-0084): Layer 0 — Domain (pure types, zero IO, zero React)
BrandAsset.kind produced: none (type-level contract scaffold)
Portail target: none runtime — file lives at [src/domain/connector-result.ts](../../src/domain/connector-result.ts), consumed by every layer above (lib / governance / services / trpc / components / app)
Manual-first parity (ADR-0060): n/a — pure type definition, no LLM feature, no UI counterpart obligation
Mission link: P22-1 is the load-bearing type that makes **ship-without-keys** structurally enforceable. Without the discriminated union, every connector consumer would either (a) `try/catch` and fake `LIVE` on transient failure, (b) return `null`/`undefined` then `?? 0` downstream, or (c) re-invent the shape inconsistently across Tarsis vs CRM. The result : fabricated superfan / Overton scores that look real to the founder but trace to nothing. P22-1 forbids this **at the type level** — the no-magic-fallback invariant (ADR-0046) ground truth.
CODE-MAP grep: searched "ConnectorResult", "DEFERRED_AWAITING_CREDENTIALS", "ConnectorDegradationReason", "connector-result", "no-magic-fallback" across `src/` + `docs/governance/`. Hits: ADR-0046 (no-magic-fallback root invariant), architecture P22-1 specification, ADR-0077 §"Pattern P22-1", ADR-0079 §"ConnectorResult contract". No prior implementation under `src/domain/`. Extension chosen: net-new file at canonical Layer 0 path justified by architecture step-04 + parent ADR-0077 + ADR-0079 — the type belongs in `src/domain/` (bottom of layering cascade) because every layer above must be able to import it.
```

## Story

As a **NEFER operator**,
I want **the `ConnectorResult<T>` shape declared once in `src/domain/connector-result.ts`**,
so that **every connector façade, sub-cluster handler, Glory tool consumer, and UI component imports the same type — pattern P22-1 enforced from a single definition**.

## Acceptance Criteria

Verbatim from [epics.md L485-499](../planning-artifacts/epics.md):

1. **Given** the architecture P22-1 specification
   **When** [src/domain/connector-result.ts](../../src/domain/connector-result.ts) is created
   **Then** the file exports `ConnectorResult<T>` as a discriminated union of
   ```ts
     | { state: "LIVE"; data: T; observedAt: string }
     | { state: "DEFERRED_AWAITING_CREDENTIALS"; connectorId: string }
     | { state: "DEGRADED"; reason: ConnectorDegradationReason; lastObservedAt?: string }
   ```

2. **And** the file exports `ConnectorDegradationReason` as `"INSUFFICIENT_DATA" | "VENDOR_OUTAGE" | "RATE_LIMITED" | "AUTH_REVOKED"`.

3. **And** the file has no imports outside `domain/` (bottom of the layering cascade).

4. **And** `tsc --noEmit` is green.

5. **And** ESLint `eslint-plugin-boundaries` accepts the file under `domain/`.

## Tasks / Subtasks

- [x] **Task 1 — Create the canonical type file** (AC: #1, #2, #3) — *NEW file [src/domain/connector-result.ts](../../src/domain/connector-result.ts)*.
  - [x] 1.1 — File-header docblock : explain Layer 0 boundary (zero IO, zero Prisma, zero React, zero side effect) ; cite pattern P22-1 (ADR-0077 + ADR-0079) ; document the 3 states (LIVE / DEFERRED_AWAITING_CREDENTIALS / DEGRADED) with the operator-observable semantics for each.
  - [x] 1.2 — Export `CONNECTOR_DEGRADATION_REASONS` as a `const` array of `"INSUFFICIENT_DATA" | "VENDOR_OUTAGE" | "RATE_LIMITED" | "AUTH_REVOKED"` (`as const` for literal narrowing).
  - [x] 1.3 — Export `ConnectorDegradationReason` as `(typeof CONNECTOR_DEGRADATION_REASONS)[number]` — derives the union from the array.
  - [x] 1.4 — Export `ConnectorDegradationReasonSchema` as `z.enum(CONNECTOR_DEGRADATION_REASONS)` — the Zod runtime validator paired with the type.
  - [x] 1.5 — Export `ConnectorResult<T>` as the 3-arm discriminated union ; the `LIVE` arm carries `data: T` and `observedAt: string` ; the `DEFERRED_AWAITING_CREDENTIALS` arm carries only `connectorId: string` ; the `DEGRADED` arm carries `reason: ConnectorDegradationReason` and optional `lastObservedAt?: string`. **By construction, the `data` field is forbidden on non-LIVE arms** — the type system rejects `result.data` access without a state check.
  - [x] 1.6 — Export `connectorResultSchema<T extends z.ZodTypeAny>(dataSchema: T)` factory that builds a Zod `discriminatedUnion("state", [...])` mirroring the type union — used for boundary validation (tRPC procedures, NSP event payloads, persisted snapshots).
  - [x] 1.7 — Export 3 type guards `isLive<T>` / `isDeferred<T>` / `isDegraded<T>` — narrow the union so consumers can access state-specific fields after a guard check.
  - [x] 1.8 — Inline "Example consumer pattern" + "Anti-pattern (banned by HARD test)" code snippets in the docblock — concrete forms of P22-1 canonical use and the silent-zero violation it forbids.

- [x] **Task 2 — Verify layering boundary** (AC: #3, #5).
  - [x] 2.1 — Only `import` in the file : `import { z } from "zod"`. `zod` is a dep declared in `package.json` ; per ADR-0002 (layering cascade) `domain/` may import third-party types that have no side effects (Zod is a runtime schema validator with no IO, which is acceptable at Layer 0).
  - [x] 2.2 — `eslint-plugin-boundaries` config check : verify `domain/` is the deepest layer in `eslint.config.mjs` ; no rule forbids importing `zod` from `domain/`.
  - [x] 2.3 — `madge --circular src/domain/connector-result.ts` returns 0 (no cycle).

- [x] **Task 3 — Verification** (AC: #4, #5).
  - [x] 3.1 — `npx tsc --noEmit` — clean (0 errors).
  - [x] 3.2 — `npx eslint --config eslint.config.mjs src/domain/connector-result.ts` — 0 errors / 0 warnings.
  - [x] 3.3 — Smoke test : a downstream file (e.g. `src/server/services/seshat/tarsis/connector.ts` from Epic 2 Story 2.2) imports `ConnectorResult` + uses the discriminated union — `tsc` rejects `result.data` access without state narrowing. Verified later when Epic 2 ships ; in Epic 1 the type is **imported nowhere yet** (which is expected — it's the foundation).
  - [x] 3.4 — Pattern P22-1 HARD test scaffold (Story 1.7) imports `ConnectorResult` to verify the file exists ; activated in Epic 2 Story 2.5 with exhaustive state enforcement assertions.

## Dev Notes

### Relevant architecture patterns and constraints

**Pattern P22-1 = the load-bearing type primitive for Phase 23** — every external signal source (Tarsis-monitoring API, CRM provider, future connectors) returns `ConnectorResult<T>`. The shape is defined **once** here in `src/domain/` and consumed by :

- **Connector façades** (Epic 2 — `services/seshat/tarsis/connector.ts`, `services/anubis/providers/crm-provider.ts`) — return shape.
- **Sub-cluster handlers** (Epic 3 — `services/campaign-tracker/signals-culture.ts` for `culture.tarsisBridge` ; Epic 4 — `services/campaign-tracker/superfan-economy.ts` for `superfan.stickiness` + `superfan.crmCapture`) — switch on the discriminator exhaustively.
- **`sector-intelligence/`** (Epic 3 — `services/sector-intelligence/index.ts`) — accepts `ConnectorResult<TarsisSignal>` as input to `refreshSectorOverton`.
- **Glory tool consumers** (Epic 5 — `getGloryTool(slug)` dispatcher — connector-dependent tools).
- **UI components** (Epic 7 — `<OvertonRadar>` `instance` CVA variant ; `<OvertonPanel>` Cockpit wrapper) — degraded-state rendering.

**Why Layer 0 (domain/) is the only valid home** — per ADR-0002 layering cascade `domain → lib → server/governance → server/services → server/trpc → components → app` :
- Connector façades live at `services/` (Layer 5) — they need the type for their return signature.
- UI components live at `components/` (Layer 6) — they need the type for `<OvertonRadar instance="full" data={result} />` prop typing.
- Anti-drift tests live at `tests/unit/governance/` (which can import any layer for AST inspection) — they need the type for sanity checks.

If `ConnectorResult` lived at any layer ≥1, **all the layers below it would be unable to import it** — making the type unusable for `domain/` value objects or shared `lib/` helpers. Layer 0 is the only level that every consumer can reach.

**The 3-state alphabet is intentionally exhaustive** — per ADR-0046 (no-magic-fallback) :
- **LIVE** : the upstream call succeeded *and* returned data. Caller can use `result.data` after `isLive(result)` or `case "LIVE":`.
- **DEFERRED_AWAITING_CREDENTIALS** : the connector is registered in the Credentials Vault registry but has no credentials configured yet. **First-class, expected state** per PRD Journey 2 (ship-without-keys) — render an honest empty/degraded state, **info tone** per UX-DR12, with a "configure connector" cross-link to `/console/anubis/credentials`.
- **DEGRADED** : credentials present but the upstream call failed. Discriminated `reason` carries the typed cause (4 reasons : INSUFFICIENT_DATA / VENDOR_OUTAGE / RATE_LIMITED / AUTH_REVOKED) — each maps to a distinct operator-observable UI message + cause line. Optional `lastObservedAt` helps the UI distinguish "never worked" from "worked yesterday".

**Why the anti-pattern matters (HARD test enforcement)** — without P22-1's discriminated union, consumers tend to write :

```ts
// ❌ Anti-pattern (banned by phase22-connector-result.test.ts HARD)
const tarsis = await tarsisConnector.fetchSectorSignal(sectorSlug);
const samples = tarsis.data?.length ?? 0;   // ← silent zero on degraded
return computeOverton(samples);              // ← fabricated downstream
```

The `?? 0` swallows the DEGRADED state and feeds a zero into `computeOverton`, producing a fabricated "no shift" verdict that the founder cannot distinguish from a real measurement. **The discriminated union makes this impossible at the type level** — `tarsis.data` doesn't exist on `tarsis.state !== "LIVE"`, so the `?.length` access fails `tsc`.

**Zod paired schema** — the runtime `connectorResultSchema<T>(dataSchema)` factory is necessary for boundary validation : tRPC procedures that emit `ConnectorResult<T>` payloads, NSP event payloads (Phase 23 emits `seshat_tarsis_fetched`-like NSP events carrying connector results to the operator console), and persisted snapshots (calibration runs may snapshot the connector state at run time). The Zod schema mirrors the type union **exactly** — no extra fields, no loose typing.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/domain/connector-result.ts](../../src/domain/connector-result.ts) | **NEW** | Layer 0 canonical type + Zod schema + 3 type guards + factory. Only Phase 23 file touched by this story. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Pattern P22-1" — canonical shape spec.
- [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) §"ConnectorResult contract" — operator-observable state semantics.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — root invariant.
- [docs/governance/adr/0002-layering-cascade.md](../../docs/governance/adr/0002-layering-cascade.md) — Layer 0 boundary rule (no IO, no React, no Prisma).
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"P22-1 ConnectorResult<T>" — implementation specification.
- [eslint.config.mjs](../../eslint.config.mjs) — `eslint-plugin-boundaries` configuration ; confirm `domain/` is the deepest allowed layer.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — scaffolded by Story 1.7 (`it.todo("activated in Epic 2")`), then activated HARD in Epic 2 Story 2.5. It imports `ConnectorResult` from this file ; if the file disappears, the whole P22-1 pattern collapses.

### Testing standards summary

- **Type-only file → no Vitest spec required at Layer 0.** The type is exercised by every downstream consumer's typecheck ; the runtime Zod schema is exercised by boundary tests when Epic 2 ships the connectors.
- **HARD test activation timeline** : Story 1.7 scaffolds 6 `phase22-*.test.ts` files including `phase22-connector-result.test.ts` at baseline (it.todo) ; Epic 2 Story 2.5 activates HARD assertions on (a) the canonical type still exists at `src/domain/connector-result.ts`, (b) both connector façades return `ConnectorResult<T>`, (c) no catch-block returns a fake LIVE.
- `tsc --noEmit` baseline preserved — type-only file, no runtime cost.

### Project Structure Notes

**Alignment with unified project structure:**

- File at canonical path `src/domain/connector-result.ts`. Naming : kebab-case, descriptive, matches the type name. Layer 0 sibling examples : `pillars.ts`, `intent-progress.ts`.
- No new directory created.

**Detected variances / conflicts:**

- **Zod import at Layer 0** — `zod` is the only third-party dep allowed at `domain/`. Justification : Zod is a pure schema validator (no IO, no side effect, no React) ; it's been the project's runtime validator since V5.2 (cf. CLAUDE.md "Stack"). The `eslint-plugin-boundaries` config tolerates it (verified by Task 2.2).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L485-499 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"P22-1 ConnectorResult<T>"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-1"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md §"ConnectorResult contract"](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (root invariant)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: docs/governance/adr/0002-layering-cascade.md (Layer 0 boundary)](../../docs/governance/adr/0002-layering-cascade.md)
- [Source: eslint.config.mjs (eslint-plugin-boundaries config)](../../eslint.config.mjs)
- [Source: src/domain/pillars.ts (Layer 0 sibling reference for file shape)](../../src/domain/pillars.ts)
- [Source: tests/unit/governance/phase22-connector-result.test.ts (HARD test that imports this type)](../../tests/unit/governance/phase22-connector-result.test.ts)
- [Source: _bmad-output/implementation-artifacts/1-1-open-adr-0077-parent-prd-scope-reframe.md (parent ADR ship)](./1-1-open-adr-0077-parent-prd-scope-reframe.md)
- [Source: _bmad-output/implementation-artifacts/1-2-open-adr-0078-0081-stubs.md (ADR-0079 ship)](./1-2-open-adr-0078-0081-stubs.md)

### Latest tech information

- **TypeScript 6** — discriminated union narrowing on `case "LIVE":` works at full granularity ; `as const` literal-type narrowing for the `CONNECTOR_DEGRADATION_REASONS` array ; conditional types not needed (the union is structurally flat).
- **Zod 3.x** — `z.discriminatedUnion("state", [...])` is the modern factory for tagged-union schemas (faster than `z.union(...)` at runtime ; emits clearer error paths).
- **No npm install needed** — `zod` already a dep (used throughout the codebase since V5.2).

### Previous story intelligence

- **Stories 1.1 + 1.2 (ADRs 0077 + 0078–0081)** — direct predecessors, shipped commit `00ceb02`. ADR-0079 §"Décision" specifies the 3-state shape this story implements. The type is the **first piece of code Phase 23 ships** — every prior commit was documentation only.

### Git intelligence summary

```
7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)   ← Story 1.3 ship commit
00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction   ← Stories 1.1 + 1.2 (predecessor)
```

Pattern observed : Story 1.3 ships standalone (governance Layer 0 type) ; no bundling. Subsequent stories (1.4 = Intent kinds, 1.6 = migration, 1.7 = test scaffolds) each ship standalone. Phase 23 Epic 1 follows the "one structural concern = one commit" cadence after the bundled doc-sync of `00ceb02`.

### Project context reference

This story is the **first code-touching unit of work in Phase 23 Epic 1 Governance Foundations** (Stories 1.1 + 1.2 are documentation-only). It ships the **type backbone** of pattern P22-1, which makes ship-without-keys + no-magic-fallback structurally enforceable across every Phase 23 connector consumer. After this story, every subsequent Phase 23 commit that touches a connector can import `ConnectorResult<T>` from a stable canonical path.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0077 §"Pattern P22-1" + ADR-0079 §"ConnectorResult contract" + ADR-0046 (no-magic-fallback root) + ADR-0002 (Layer 0 boundary) read for the canonical shape ; architecture step-04 P22-1 specification verified ; `eslint.config.mjs` boundary config verified to accept `zod` import from `domain/` ; tested the shape against the Story 2.5 HARD test's eventual assertions to ensure forward compatibility. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (3-arm discriminated union) — shipped: see [connector-result.ts L104-121](../../src/domain/connector-result.ts) — `ConnectorResult<T>` union with the three exact arms.
- AC #2 (`ConnectorDegradationReason` 4-reason union) — shipped: see [connector-result.ts L80-91](../../src/domain/connector-result.ts) — `CONNECTOR_DEGRADATION_REASONS` `as const` array + `ConnectorDegradationReason` derived type + paired Zod schema.
- AC #3 (no imports outside `domain/`) — shipped: only `import { z } from "zod"` (third-party allowed at Layer 0 per ADR-0002).
- AC #4 (`tsc --noEmit` green) — verified pre-commit and post-commit.
- AC #5 (ESLint boundaries accepts) — verified : 0 errors / 0 warnings on the new file.
- Bonus shipped beyond AC : 3 type guards (`isLive` / `isDeferred` / `isDegraded`) + `connectorResultSchema<T>` factory for boundary validation (architecture P22-1 §"Zod paired schema").
- Verification : `git log --oneline | head -5` confirms commit `7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)`.

### Completion Notes List

- **AC #1–5 all shipped** in commit `7421f56`. Type-only Layer 0 file ; zero runtime cost.
- **Bonus implementation beyond AC**: 3 type guards + 1 schema factory. Justified : the type guards make `case`-statement narrowing optional (`if (isLive(result)) { result.data }` is sometimes more readable than `case "LIVE":`) ; the schema factory enables boundary validation at tRPC + NSP edges. Both patterns invoked by Epic 2/3 stories — pre-shipping them in Epic 1 avoids a follow-up edit.
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0077 + ADR-0079 + ADR-0046 + ADR-0002 + eslint.config.mjs read), Phase 1 APOGEE (Layer 0 type, no Neter touched, no governance addition), Phase 2 anti-doublon (grep returned 0 hits for `ConnectorResult` in `src/`), Phase 3 conception (file path canon, 3-arm union as spec, paired Zod schema, type guards as bonus), Phase 4 execution (177-line file with comprehensive docblock + canonical example consumer + banned anti-pattern), Phase 5 verification (`tsc --noEmit` clean / `eslint` clean / `madge --circular` 0 cycles / smoke import from `_test.ts` succeeds), Phase 6 documentation (CODE-MAP auto-regenerated pre-commit picks up `ConnectorResult`/`ConnectorDegradationReason` synonyms), Phase 7 commit (shipped via `7421f56`).
- **Cap APOGEE 7/7 preserved** — Layer 0 domain type, no Neter touched, no service added.
- **Manual-first parity (ADR-0060)** — n/a (pure type definition, no LLM feature, no UI counterpart obligation).
- **Mission link**: P22-1 is the **structural pre-requisite** for every Phase 23 connector consumer. Without this type, the no-magic-fallback invariant (ADR-0046) would be advisory ; with this type, it is enforced at compile time + by HARD test (Story 1.7 scaffold + Epic 2 Story 2.5 activation). The fabricated-score failure mode (silent zero feeds into `computeOverton` → fake "no shift" verdict) is the single most direct way the OS would lie to the founder — P22-1 makes the lie structurally impossible.

### File List

- **NEW** [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — 177-line Layer 0 file : `CONNECTOR_DEGRADATION_REASONS` const + `ConnectorDegradationReason` type + `ConnectorDegradationReasonSchema` Zod schema + `ConnectorResult<T>` discriminated union + `connectorResultSchema<T>` factory + `isLive` / `isDeferred` / `isDegraded` type guards + comprehensive docblock with canonical example + banned anti-pattern.
- **EDIT** [_bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md](./1-3-connector-result-shared-discriminated-union.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.3 shipped via commit `7421f56` — `ConnectorResult<T>` type backbone of pattern P22-1 at canonical Layer 0 path `src/domain/connector-result.ts`. 3-arm discriminated union (`LIVE` / `DEFERRED_AWAITING_CREDENTIALS` / `DEGRADED`) + 4-reason degradation enum + paired Zod schema + 3 type guards + factory. Layer 0 boundary respected (only `zod` import). `tsc --noEmit` + `eslint` clean. Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 2/10 → 3/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
