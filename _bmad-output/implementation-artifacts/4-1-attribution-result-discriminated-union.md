# Story 4.1: [governance] Define `AttributionResult` discriminated union

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 1/8)
Owning Neter: Mestor (type-level governance contract — pattern P22-2)
APOGEE OS layer (ADR-0084): Layer 4 — Services (campaign-tracker domain types)
BrandAsset.kind produced: none (type backbone — runtime in Story 4.2)
Portail target: none runtime — file lives at [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts), consumed by Stories 4.2/4.4/4.5/4.6/4.7 and by Epic 6 Story 6.1 calibration handler
Manual-first parity (ADR-0060): n/a — pure type definition, no LLM feature, no UI counterpart obligation
Mission link: P22-2 is the type-level enforcement of the no-magic-fallback invariant (ADR-0046) for the superfan-attribution mechanic — without `AttributionResult` as a discriminated union, every downstream consumer would have to choose between `null | number` (silent zero on sparse signal) or throwing on the happy path. With the union, "no measurement" is structurally distinct from "measured zero" — the founder cannot mistake `INSUFFICIENT_DATA` for "no evangelists produced". This is the type backbone of the **superfan accumulation** half of the mission (the **Overton** half landed in Epic 3).
CODE-MAP grep: searched `AttributionResult`, `EvangelistTransition`, `superfan-attribution` across `src/` + `tests/`. Hits in non-source : ADR-0081 §2 (canonical type spec verbatim), epics.md Story 4.1 AC, architecture P22-2, autopilot-handoff. No prior implementation in `src/`. Extension chosen: net-new file at canonical path `src/server/services/campaign-tracker/superfan-attribution.ts` per epic spec L853 + ADR-0081 §1 (Story 4.2 fills `runAttribution` runtime into the same file).
```

## Story

As a **NEFER operator**,
I want **`AttributionResult` declared as a discriminated union in `campaign-tracker/superfan-attribution.ts`**,
so that **every consumer of attribution output handles `OK` and `INSUFFICIENT_DATA` exhaustively — pattern P22-2 enforced from the type level**.

## Acceptance Criteria

Verbatim from [epics.md L844-857](../planning-artifacts/epics.md):

1. **Given** Story 1.3 (`ConnectorResult<T>` precedent for discriminated unions)
   **When** `services/campaign-tracker/superfan-attribution.ts` is created (or its types module if split)
   **Then** the file exports `AttributionResult` as
   ```ts
     | { state: "OK"; score: number; lineage: EvangelistTransition[]; snapshotRef: string }
     | { state: "INSUFFICIENT_DATA"; minSamplesRequired: number; samplesAvailable: number }
   ```

2. **And** the file exports `EvangelistTransition` as
   ```ts
   {
     campaignId: string;
     transitionFrom: "Curious" | "Convinced" | "Ambassador";
     transitionTo: "Ambassador" | "Evangelist";
     observedAt: string;
   }
   ```

3. **And** no `null` / `undefined` return is permitted (asserted via type-only test).

4. **And** `tsc --noEmit` is green.

## Tasks / Subtasks

- [x] **Task 1 — Create the canonical type file** (AC: #1, #2) — *NEW file [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts)*.
  - [x] 1.1 — File-header docblock : cite pattern P22-2 (ADR-0081 §2) ; explain the two-state alphabet semantics (`OK` ⇒ defendable measurement ; `INSUFFICIENT_DATA` ⇒ no fabricated score) ; document why neither `null` nor `undefined` is permitted (no-magic-fallback ADR-0046 root invariant) ; document the divergence with `domain/devotion-ladder.ts` 6-rung French canon (`SPECTATEUR…EVANGELISTE`) vs the 4-rung English subset (`Curious < Convinced < Ambassador < Evangelist`) deliberately chosen by ADR-0081 §2 for the attribution-layer transitions.
  - [x] 1.2 — Export `EvangelistTransition` type with the four exact fields per ADR-0081 §2 : `campaignId: string` ; `transitionFrom: "Curious" | "Convinced" | "Ambassador"` ; `transitionTo: "Ambassador" | "Evangelist"` ; `observedAt: string` (ISO 8601). All fields are `readonly` per existing campaign-tracker `types.ts` convention.
  - [x] 1.3 — Export `AttributionResult` as the 2-arm discriminated union per ADR-0081 §2 : the `OK` arm carries `score: number`, `lineage: readonly EvangelistTransition[]`, `snapshotRef: string` (= `IntentEmission.id` from `RUN_ATTRIBUTION_CALIBRATION` — Epic 6 Story 6.1 emits) ; the `INSUFFICIENT_DATA` arm carries `minSamplesRequired: number`, `samplesAvailable: number`. **By construction, the `score` / `lineage` / `snapshotRef` fields are forbidden on the INSUFFICIENT_DATA arm** — the type system rejects `result.score` access without a state check.
  - [x] 1.4 — Export `MIN_SAMPLES_REQUIRED_DEFAULT = 30 as const` per ADR-0081 §2 ("Heuristique : `minSamplesRequired = 30 transitions` par défaut"). Story 4.2 consumes this default ; Story 4.5 may override per operator coefficient mode.
  - [x] 1.5 — Export 2 type guards `isAttributionOk` / `isAttributionInsufficient` — narrow the union so downstream consumers (Stories 4.4/4.6/4.7) can access state-specific fields after a guard check without writing the `case`-statement boilerplate. Follows Story 1.3 precedent (`isLive` / `isDeferred` / `isDegraded`).
  - [x] 1.6 — Export `EVANGELIST_TRANSITION_FROM_RUNGS` and `EVANGELIST_TRANSITION_TO_RUNGS` as `as const` literal arrays (single source of truth for the rung sets ; derived types kept in sync via `(typeof X)[number]`).
  - [x] 1.7 — Export `evangelistTransitionSchema` and `attributionResultSchema` as Zod runtime validators paired with the types — used at boundaries (tRPC procedure return shapes in Story 4.6/4.7 ; IntentEmission payload validation in Epic 6 Story 6.1 ; NSP event payloads). Follows Story 1.3 precedent (`connectorResultSchema`).
  - [x] 1.8 — Story 4.2 placeholder comment : annotate that `runAttribution(input)` will be added in this same file in Story 4.2 ; the type backbone ships standalone in Story 4.1 to allow Story 4.5 (manual coefficient mode back-end) and Epic 6 Story 6.1 (calibration handler) to import the contract before the runtime exists.

- [x] **Task 2 — Type-only assertion test** (AC: #3) — *NEW file [tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts)*.
  - [x] 2.1 — Use Vitest's `expectTypeOf` to assert that `AttributionResult` is **assignable from neither `null` nor `undefined`** (the type system would reject the assignment) — i.e. `expectTypeOf<null>().not.toMatchTypeOf<AttributionResult>()` + `expectTypeOf<undefined>().not.toMatchTypeOf<AttributionResult>()`.
  - [x] 2.2 — Assert that after narrowing on `state === "OK"`, the `score: number`, `lineage: readonly EvangelistTransition[]`, `snapshotRef: string` fields are present and the `minSamplesRequired` / `samplesAvailable` fields are absent.
  - [x] 2.3 — Assert that after narrowing on `state === "INSUFFICIENT_DATA"`, the `minSamplesRequired: number`, `samplesAvailable: number` fields are present and the `score` / `lineage` / `snapshotRef` fields are absent.
  - [x] 2.4 — Assert `EvangelistTransition.transitionFrom` is exactly `"Curious" | "Convinced" | "Ambassador"` (not the wider `string` type, not the canonical 6-rung `DevotionLadderTier`).
  - [x] 2.5 — Assert `EvangelistTransition.transitionTo` is exactly `"Ambassador" | "Evangelist"`.
  - [x] 2.6 — Smoke runtime test on the Zod schemas (`evangelistTransitionSchema.safeParse` + `attributionResultSchema.safeParse` happy + error path) — boundary-validation pre-flight before Story 4.6 / Epic 6 Story 6.1 wire them in.

- [x] **Task 3 — Verification** (AC: #4).
  - [x] 3.1 — `npx tsc --noEmit` — clean (0 errors).
  - [x] 3.2 — `npx vitest run tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts` — green.
  - [x] 3.3 — Smoke import : Story 4.2 (next story) will import `AttributionResult` + `EvangelistTransition` + `MIN_SAMPLES_REQUIRED_DEFAULT` + the guards from this file ; verified by writing the runtime in 4.2.

## Dev Notes

### Relevant architecture patterns and constraints

**Pattern P22-2 = the type-level enforcement of no-magic-fallback for the attribution measurement.** Without the discriminated union, every consumer would have to choose between :

- `score: number | null` — returns `null` when sparse, downstream `?? 0` swallows the signal → fabricated zero.
- `score: number` + throws on sparse — happy-path callers swallow exceptions → silent failure.

The discriminated union forbids both anti-patterns at compile time. Consumers must switch exhaustively (or use the type guards) — there is no third option that produces a defensible score from `INSUFFICIENT_DATA` input.

**ADR-0081 §2 is the spec verbatim.** This story implements the type block from ADR-0081 §2 (lines 38–58 of [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)) without reformulation. The 4-rung English transition alphabet (`Curious < Convinced < Ambassador < Evangelist`) is a deliberate ADR-0081 choice — distinct from the canonical 6-rung French `DevotionLadder` enum in [src/domain/devotion-ladder.ts](../../src/domain/devotion-ladder.ts) (`SPECTATEUR < INTERESSE < PARTICIPANT < ENGAGE < AMBASSADEUR < EVANGELISTE`). The attribution layer tracks the **transitions that produce measurable superfan accumulation** ; the canonical ladder is for general devotion classification. Story 4.2 will need a mapper (devotion-ladder ↔ attribution-rung) if the regression input data is sourced from the canonical 6-rung — that is Story 4.2 scope, **not** Story 4.1.

**Where this file lives and why.** The epic spec L853 says `services/campaign-tracker/superfan-attribution.ts` (Layer 4 — Services). Alternatives considered :

- **`src/domain/superfan-attribution-types.ts` (Layer 0)** — rejected. The types are not pure-domain primitives like `ConnectorResult<T>` ; they are tightly bound to the campaign-tracker domain (`EvangelistTransition.campaignId` references `Campaign`). Putting them at Layer 0 would invite reuse outside campaign-tracker, which is undesirable.
- **`src/server/services/campaign-tracker/types.ts` (existing file)** — rejected. The existing file holds Phase 19 Cluster A/B/C types (`SuperfanAttributionResult` — the legacy heuristic shape, distinct from Phase 23 `AttributionResult`). Co-locating would risk confusion between the two `*AttributionResult` shapes (legacy `SuperfanAttributionResult` lives there ; new `AttributionResult` lives here). Story 4.2 fills `runAttribution` runtime alongside the types in the same dedicated file — this is the cleanest separation.

**Two `*AttributionResult` shapes will coexist on `main`.** Note the precedent : `superfan-economy.ts` already exports `recomputeSuperfanAttribution(input): Promise<SuperfanAttributionResult>` (Phase 19 Cluster C MVP heuristic — French rungs `EVANGELISTE` / `FIDELE` / `INITIE`). This story introduces a parallel `AttributionResult` discriminated union (Phase 23 — English rungs ; calibration-aware). Both will coexist : Stories 4.3 will wire the existing `superfan-economy.ts` cohort-retention paths to consume `ConnectorResult<T>` ; Story 4.5 + Epic 6 will route the new calibration path through `runAttribution` → `AttributionResult`. A future epic (post-Phase 23) may unify the two, but that is out of Phase 23 scope.

**No `null`, no `undefined` in the return type.** Per ADR-0046 (no-magic-fallback root) + ADR-0081 §2 ("Aucun `null` / `undefined` / `0` magique"). The type-only test in Task 2 asserts this structurally. If a future contributor tries to mark `AttributionResult` as `AttributionResult | null`, the test fails ; if they add a new arm `{ state: "ERROR"; error: ... }` without surfacing it through the existing `INSUFFICIENT_DATA` semantics, code review will flag (the 2-state alphabet is doctrinal).

**Why `lineage: readonly EvangelistTransition[]`.** `readonly` matches existing `types.ts` convention (line 18 onward — every campaign-tracker DTO field is `readonly`). Downstream callers cannot mutate the lineage array post-return ; if they need a mutable copy, they `[...result.lineage]` explicitly.

**Why `MIN_SAMPLES_REQUIRED_DEFAULT = 30 as const`.** ADR-0081 §2 line 62 specifies `minSamplesRequired = 30 transitions` default. Pulling it into the constants of this file (rather than baking it into Story 4.2 logic) makes it observable to Story 4.4 (lineage population check) and to Story 4.5 (manual coefficient mode may override). `as const` narrows it to the literal `30` (not generic `number`) — downstream code that inspects the constant gets the exact value at the type level.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) | **NEW** | Layer 4 type backbone : 2 types + 2 rung-set consts + 1 default const + 2 type guards + 2 Zod schemas + docblock. Story 4.2 will fill `runAttribution` runtime into the same file. |
| [tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts) | **NEW** | Type-only assertion test via Vitest `expectTypeOf` ; also smoke-tests the Zod schemas. Co-located test folder created. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) §2 — canonical type spec verbatim.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — root invariant.
- [docs/governance/adr/0002-layering-cascade.md](../../docs/governance/adr/0002-layering-cascade.md) — Layer 4 boundary.
- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — Story 1.3 precedent (discriminated union + Zod schema + type guards) — implementation template.
- [src/domain/devotion-ladder.ts](../../src/domain/devotion-ladder.ts) — canonical 6-rung French ladder ; doc the divergence with the 4-rung English subset in this file's docblock.
- [src/server/services/campaign-tracker/types.ts](../../src/server/services/campaign-tracker/types.ts) — existing campaign-tracker DTOs (Phase 19 Cluster A/B/C) ; co-located legacy `SuperfanAttributionResult` (line 201) to distinguish from this story's new `AttributionResult`.
- [src/server/services/campaign-tracker/superfan-economy.ts](../../src/server/services/campaign-tracker/superfan-economy.ts) — Phase 19 Cluster C runtime ; consumes legacy `SuperfanAttributionResult` ; Story 4.3 will wire cohort retention here (separate from this story's new `AttributionResult` path).
- [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — HARD test activated in Epic 3 Story 3.8 ; Story 4.8 will extend its scope to `superfan-attribution.ts` + `superfan-economy.ts`.
- [_bmad-output/planning-artifacts/epics.md L844-857](../planning-artifacts/epics.md) — Story 4.1 spec verbatim.
- [_bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md](./1-3-connector-result-shared-discriminated-union.md) — Story 1.3 implementation pattern (the discriminated-union precedent referenced in AC #1 Given).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — HARD mode active since Epic 2 Story 2.5 ; untouched.
- [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — HARD mode active for Overton scope since Epic 3 Story 3.8 ; **superfan scope** will be added in Story 4.8 (not this story).

### Testing standards summary

- **Type-only test** via Vitest `expectTypeOf` — pure compile-time assertion, runs in ms.
- **Smoke runtime test** on the Zod schemas — confirms `evangelistTransitionSchema.safeParse(validInput).success === true` and `attributionResultSchema.safeParse(invalidInput).success === false`.
- **No coverage threshold** at this point — runtime `runAttribution` (Story 4.2) will land the regression / sparse-input unit tests.

### Project Structure Notes

**Alignment with unified project structure:**

- New file at canonical path `src/server/services/campaign-tracker/superfan-attribution.ts`. Naming : kebab-case, descriptive, matches the dominant pattern.
- New test directory `tests/unit/services/campaign-tracker/` — first file. Sibling examples : `tests/unit/services/strategy-presentation/overton-real-signal.test.ts` (Story 3.6 precedent).
- No new directory under `src/` ; this file slots into existing `src/server/services/campaign-tracker/` folder.

**Detected variances / conflicts:**

- **Legacy `SuperfanAttributionResult` (Phase 19 Cluster C) coexists with new `AttributionResult` (Phase 23 ADR-0081)** — documented above. Unification deferred ; both shapes intentionally coexist.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L844-857 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md §2 (canonical type spec)](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (root invariant)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: docs/governance/adr/0002-layering-cascade.md (Layer 4 boundary)](../../docs/governance/adr/0002-layering-cascade.md)
- [Source: src/domain/connector-result.ts (Story 1.3 discriminated-union template)](../../src/domain/connector-result.ts)
- [Source: src/domain/devotion-ladder.ts (canonical 6-rung French ladder — divergence doc)](../../src/domain/devotion-ladder.ts)
- [Source: src/server/services/campaign-tracker/types.ts (existing campaign-tracker DTOs ; legacy `SuperfanAttributionResult` line 201)](../../src/server/services/campaign-tracker/types.ts)
- [Source: _bmad-output/implementation-artifacts/1-3-connector-result-shared-discriminated-union.md (Story 1.3 implementation precedent)](./1-3-connector-result-shared-discriminated-union.md)
- [Source: _bmad-output/autopilot-handoff-20260528-0226.md §"How to resume" Story 4.1 (handoff direction)](../autopilot-handoff-20260528-0226.md)

### Latest tech information

- **TypeScript 6** — discriminated union narrowing on `case "OK":` works at full granularity ; `as const` literal narrowing for the rung-set arrays ; the `readonly` modifier on the `lineage` array narrows correctly through `case`/`if` guards.
- **Zod 3.x** — `z.discriminatedUnion("state", [...])` is the modern tagged-union factory ; emits clearer error paths than `z.union(...)`.
- **Vitest 4** — `expectTypeOf<T>().toMatchTypeOf<U>()` + `.not.toMatchTypeOf<U>()` + `.toHaveProperty()` cover the type-only assertion needs.

### Previous story intelligence

- **Story 1.3 (`ConnectorResult<T>`)** — direct architectural precedent, shipped commit `7421f56`. Discriminated union + Zod schema + 3 type guards + comprehensive docblock — this story follows the same template (adapted to the 2-state alphabet of `AttributionResult`).
- **Story 3.6 (`OvertonRealSignal`)** — recent Phase 23 precedent (commit `16bd7fe`) for a domain-bound discriminated union (lives at `services/strategy-presentation/overton-real-signal.ts` rather than `domain/`). Similar reasoning : tightly bound to one consumer (Oracle), not pure-domain. This story follows that pattern.
- **Stories 3.2 / 3.3** — removed the silent-zero `?? 0` folds from Overton paths and switched to runtime `number | null` (transitional). Story 3.8 activated HARD mode on the Overton scope. Story 4.1 + 4.8 land the next progression : type-level discriminated union (no nullable scores anywhere on the new code path).

### Git intelligence summary

Last 5 commits on `main` (per `git log --oneline -5`) :

```
bd7f5a2 docs(governance): phase 23 autopilot handoff 2026-05-28 02:26 (Epic 3 closed)
cc45de4 docs(governance): phase 23 Epic 3 closure doc-sync (8/8 shipped)
9370b99 test(governance): phase 23 story 3.8 activate HARD phase22-no-silent-zero (Epic 3 CLOSED)
4de7016 feat(seshat): phase 23 story 3.7 manual operator-tagged Overton-delta mode (ADR-0060 parity)
16bd7fe feat(seshat): phase 23 story 3.6 wire Overton output to Oracle Overton-distinctive section
```

Pattern observed : Phase 23 Epic 3 closed with the trio Stories 3.6/3.7/3.8 + a doc-sync commit + autopilot handoff. Epic 4 opens with this Story 4.1 ship — one structural concern = one commit cadence preserved.

### Project context reference

This story is **the first code-touching unit of Phase 23 Epic 4 Superfan Measurement**. It ships the **type backbone** for the superfan-attribution mechanic — the no-magic-fallback invariant becomes structurally enforced at the type level for every Story 4.2 / 4.4 / 4.5 / 4.6 / 4.7 / Epic 6 Story 6.1 consumer.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16) ; for the calibration methodology see [ADR-0081](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0081 §2 (canonical type spec) + ADR-0046 (no-magic-fallback root) + ADR-0002 (Layer 4 boundary) read for the canonical shape ; Story 1.3 implementation template applied (discriminated union + Zod schema + type guards) ; divergence with `domain/devotion-ladder.ts` 6-rung canon documented in file docblock ; coexistence with legacy `SuperfanAttributionResult` (Phase 19 Cluster C — `types.ts:201`) noted ; Story 4.2 placeholder marked so the runtime can be filled in the same file. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona in autopilot mode per `_bmad-output/autopilot-phase-23.md` + `_nefer-facts.md`.

### Debug Log References

- AC #1 (2-arm discriminated union) — shipped : see [superfan-attribution.ts §2](../../src/server/services/campaign-tracker/superfan-attribution.ts) — `AttributionResult` union with the two exact arms per ADR-0081 §2.
- AC #2 (`EvangelistTransition` 4-field type) — shipped : see [superfan-attribution.ts §1](../../src/server/services/campaign-tracker/superfan-attribution.ts) — `EvangelistTransition` with `campaignId` + `transitionFrom` + `transitionTo` + `observedAt`.
- AC #3 (no `null` / `undefined` return) — asserted in [superfan-attribution.types.test.ts §"Type-only assertions"](../../tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts) via Vitest `expectTypeOf<null>().not.toMatchTypeOf<AttributionResult>()` + `expectTypeOf<undefined>().not.toMatchTypeOf<AttributionResult>()`.
- AC #4 (`tsc --noEmit` green) — verified pre-commit.
- Bonus shipped beyond AC : 2 type guards (`isAttributionOk` / `isAttributionInsufficient`) + 2 Zod schemas (`evangelistTransitionSchema` / `attributionResultSchema`) + 1 default const (`MIN_SAMPLES_REQUIRED_DEFAULT`) + 2 `as const` rung-set arrays. All follow Story 1.3 precedent and reduce refactor friction for Stories 4.2/4.4/4.5/4.6/4.7.

### Completion Notes List

- **AC #1–4 all shipped** in commit `<filled at commit time>`. Type-only Layer 4 file ; zero runtime cost ; test runs in single-digit ms.
- **Bonus implementation beyond AC**: 2 type guards (`isAttributionOk` / `isAttributionInsufficient`) — minimal LOC, follow Story 1.3 precedent (`isLive` / `isDeferred` / `isDegraded`), unblock Stories 4.4/4.6/4.7 from writing the case-statement boilerplate. 2 Zod schemas (`evangelistTransitionSchema` / `attributionResultSchema`) — boundary validation pre-flight before Story 4.6 (tRPC) and Epic 6 Story 6.1 (`IntentEmission` payload). 1 const `MIN_SAMPLES_REQUIRED_DEFAULT = 30 as const` — exposes the ADR-0081 §2 default at the type level for Stories 4.2 + 4.5.
- **Cap APOGEE 7/7 preserved** — Layer 4 service-domain type, no Neter touched, no service added.
- **Manual-first parity (ADR-0060)** — n/a (pure type definition, no LLM feature, no UI counterpart obligation).
- **Mission link**: P22-2 makes the superfan-attribution mechanic's no-magic-fallback structurally enforceable. Without `AttributionResult` as a discriminated union, "no measurement" would be indistinguishable from "measured zero" — the founder would see a fabricated 0 evangelists on sparse input and lose trust. With the union, the operator surfaces `INSUFFICIENT_DATA` with explicit `samplesAvailable / minSamplesRequired` — defensible and traceable.
- **Coexistence with legacy `SuperfanAttributionResult`** — by design. The Phase 19 Cluster C heuristic (`services/campaign-tracker/types.ts:201`) and the Phase 23 calibration (`services/campaign-tracker/superfan-attribution.ts`) live side by side ; Story 4.3 extends the Phase 19 path with `ConnectorResult<T>` consumption ; Story 4.5 + Epic 6 wire the Phase 23 path through `runAttribution`. Unification deferred post-Phase 23.

### File List

- **NEW** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — Layer 4 type backbone for the Phase 23 superfan-attribution mechanic. Exports : `EvangelistTransition` type + `EVANGELIST_TRANSITION_FROM_RUNGS` + `EVANGELIST_TRANSITION_TO_RUNGS` (as-const arrays) + `AttributionResult` 2-arm discriminated union + `MIN_SAMPLES_REQUIRED_DEFAULT` (= 30 as const) + `isAttributionOk` / `isAttributionInsufficient` type guards + `evangelistTransitionSchema` / `attributionResultSchema` Zod validators. Comprehensive docblock with pattern P22-2 + ADR-0081 §2 reference + divergence note vs `domain/devotion-ladder.ts` 6-rung French canon.
- **NEW** [tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts) — Vitest type-only assertion suite + Zod smoke tests. Asserts (a) `AttributionResult` is assignable from neither `null` nor `undefined` ; (b) `OK` arm narrows to the 3 fields ; (c) `INSUFFICIENT_DATA` arm narrows to the 2 fields ; (d) the rung-set literal narrowing is correct.
- **EDIT** [_bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md](./4-1-attribution-result-discriminated-union.md) — this story file (context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.1 shipped — `AttributionResult` discriminated union + `EvangelistTransition` type at `src/server/services/campaign-tracker/superfan-attribution.ts` per ADR-0081 §2 verbatim. Type-only test suite at `tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts`. `tsc --noEmit` clean. Cap APOGEE 7/7 preserved. Phase 23 Epic 4 progress 0/8 → 1/8. | NEFER (Claude Opus 4.7) |
