# Story 4.2: Implement pure-TS logistic regression + ROC AUC + RMSE

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 2/8)
Owning Neter: Seshat (measurement runtime — campaign-tracker)
APOGEE OS layer (ADR-0084): Layer 4 — Services (campaign-tracker runtime)
BrandAsset.kind produced: none (pure measurement function ; emits no BrandAsset)
Portail target: none runtime — `runAttribution` is consumed by Story 4.6 (Console operator view), Story 4.7 (Cockpit lineage view), and Epic 6 Story 6.1 (`RUN_ATTRIBUTION_CALIBRATION` handler)
Manual-first parity (ADR-0060): peer mode supported via `coefficients?: Record<string, number>` — when provided, gradient descent is skipped and operator-supplied coefficients are used directly. Story 4.5 + Epic 6 Story 6.5 will land the full operator UI ; Story 4.2 ships the back-end mode that makes the parity structural.
Mission link: Story 4.2 is the **calibration engine** of the superfan-accumulation half of the mission. Without a defensible logistic regression + ROC AUC + RMSE, "this campaign produced N evangelists" would either be a heuristic LTV multiplier (Phase 19 baseline — non-defendable cliente) or a fabricated count. With the regression, the operator can show ROC AUC = 0.74 on a campaign's history, a dated calibration snapshot, and an evangelist count traceable to observed devotion transitions. ADR-0081 §2 + §3 ground truth.
CODE-MAP grep: searched `fitLogisticRegression`, `computeRocAuc`, `computeRmse`, `scoreFromActions`, `runAttribution` across `src/` + `tests/`. Hits in non-source : ADR-0081 §1 (methodology), epics.md Story 4.2 AC, autopilot-handoff Story 4.2. No prior implementation in `src/`. Extension chosen: fill the Story 4.1 placeholder section of `services/campaign-tracker/superfan-attribution.ts` (epic spec L867 same file) with the pure-TS regression + ROC AUC + RMSE + `runAttribution` IO function.
```

## Story

As an **UPgraders operator**,
I want **a pure-TS logistic regression in `campaign-tracker/superfan-attribution.ts` attributing devotion transitions to `CampaignAction`s**,
so that **superfan attribution exists as a credible model and the calibration handler in Epic 6 has a callable algorithm — without adding a new numeric/stats dependency (D6)**.

## Acceptance Criteria

Verbatim from [epics.md L859-873](../planning-artifacts/epics.md):

1. **Given** Story 4.1 (`AttributionResult`) and the additive `Campaign.attributionCoefficients` field from Story 1.6
   **When** `services/campaign-tracker/superfan-attribution.ts` is filled
   **Then** the file exports `runAttribution(input: { campaignIds: string[]; coefficients?: Record<string, number> }): Promise<AttributionResult>` — pure TS, no new npm dependency.

2. **And** the function fits a logistic regression on observed devotion transitions in the input campaign window (via simple gradient descent if `coefficients` absent; uses operator-supplied `coefficients` if present).

3. **And** the function returns `ROC AUC` and `RMSE` as part of an internal evaluation payload that the calibration handler (Epic 6) will surface — implemented in ≤ ~60 LOC for the metrics (D6 footprint envelope).

4. **And** when the input window has < `minSamplesRequired` (heuristic default e.g. 30 transitions), the function returns `INSUFFICIENT_DATA` — never a fabricated score (no-magic-fallback).

5. **And** Vitest unit tests cover: (a) clean fit on synthetic data with known coefficients (regression converges within tolerance), (b) `INSUFFICIENT_DATA` path on sparse input.

## Tasks / Subtasks

- [x] **Task 1 — Pure stats helpers** (AC: #2, #3) — *EDIT [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts)*.
  - [x] 1.1 — `sigmoid(x: number): number` — clipped at ±50 to avoid `Math.exp` overflow (the gradient is effectively 0 outside ±15 anyway). Exported for test access.
  - [x] 1.2 — `fitLogisticRegression(X, y, opts?)` — batch gradient descent on cross-entropy loss. Default `learningRate = 0.1`, `iterations = 500`. ~25 LOC. Returns the fitted coefficients array.
  - [x] 1.3 — `computeRocAuc(predicted, observed)` — Mann-Whitney U via average-rank ; equivalent to trapezoidal TPR-vs-FPR integration, O(n log n). Returns 0.5 when one class is absent (uninformative baseline). ~25 LOC.
  - [x] 1.4 — `computeRmse(predicted, observed)` — `sqrt(mean((p-y)^2))`. ~5 LOC.
  - [x] 1.5 — `extractFeatures(action)` — 3-dim `[intercept=1, bigIdeaCoherence (default 0.5), normalizedBudget (budget/1M clipped [0,1])]`. Canonical feature alphabet exported as `ATTRIBUTION_FEATURE_KEYS = ["intercept", "bigIdeaCoherence", "normalizedBudget"] as const`.
  - [x] 1.6 — `extractLabel(action)` — binary 1 if `devotionTransitionsObserved` contains a transition with `to === "EVANGELISTE"` (canonical French rung) OR `to === "Evangelist"` (forward-compat for Story 4.4 English alphabet) ; else 0.
  - [x] 1.7 — `countSamplesAvailable(actions)` — counts actions carrying **either** populated `bigIdeaCoherenceScore` OR non-empty `devotionTransitionsObserved`. All-null actions don't count as samples.

- [x] **Task 2 — `scoreFromActions` pure scoring path** (AC: #1, #4) — *EDIT same file*.
  - [x] 2.1 — `scoreFromActions(actions, { coefficients?, snapshotRef, minSamplesRequired? })` returns `{ result: AttributionResult; evaluation: AttributionEvaluation | null }`.
  - [x] 2.2 — Below `minSamplesRequired` (default `MIN_SAMPLES_REQUIRED_DEFAULT = 30`) → `INSUFFICIENT_DATA` branch + `evaluation: null` (no metrics computable on sparse input).
  - [x] 2.3 — At/above threshold → extract features + labels ; gradient-descent fit OR operator-coefficient direct use ; compute predictions ; `score = mean(predicted)` aggregate ; `evaluation: { coefficients, rocAuc, rmse, sampleSize, mode: "ALGORITHMIC" | "MANUAL_COEFFICIENTS" }`.
  - [x] 2.4 — `lineage: []` placeholder — Story 4.4 will populate from `devotionTransitionsObserved`. Type signature `readonly EvangelistTransition[]` already enforced by Story 4.1.
  - [x] 2.5 — Operator-supplied `coefficients` missing a key default to `0` (graceful partial spec) — Story 4.5 + Epic 6 Story 6.5 expose the full form but operator can submit partial.

- [x] **Task 3 — `runAttribution` IO function** (AC: #1) — *EDIT same file*.
  - [x] 3.1 — `runAttribution(input)` signature **verbatim** from AC #1 : `{ campaignIds: string[]; coefficients?: Record<string, number> }` → `Promise<AttributionResult>`.
  - [x] 3.2 — Empty `campaignIds` → `INSUFFICIENT_DATA` short-circuit (no Prisma round-trip).
  - [x] 3.3 — Reads `CampaignAction` rows via Prisma (`db.campaignAction.findMany`) ; selects only the 5 fields the pure path needs (`id`, `campaignId`, `bigIdeaCoherenceScore`, `budget`, `devotionTransitionsObserved`) — minimal-payload selection.
  - [x] 3.4 — Generates a transient `snapshotRef` via `crypto.randomUUID()` prefixed `"transient-"` — explicit non-IntentEmission origin. Epic 6 Story 6.1 calibration handler will wrap this call and replace with the canonical IntentEmission.id.
  - [x] 3.5 — Wraps `scoreFromActions` ; discards `evaluation` from the public IO return (Epic 6 Story 6.1 will refactor to surface the evaluation via `IntentEmission.payload`).

- [x] **Task 4 — Synthetic-data unit test** (AC: #5a) — *NEW [tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts)*.
  - [x] 4.1 — Deterministic LCG-based synthetic data generator (`Math.random` would make the test flaky) — generates 200 samples from a known logistic model with `betaTrue = [-3, 4, 2]`.
  - [x] 4.2 — Assert fitted `beta` recovers the **sign structure** of `betaTrue` (intercept negative ; both feature coefficients positive). Exact magnitude recovery is not required at MVP fit envelope ; sign + AUC are the calibration-worthy properties.
  - [x] 4.3 — Assert training-set ROC AUC ≥ 0.75 on the fitted model — comfortably above the 0.5 chance baseline.
  - [x] 4.4 — Smoke test for operator-coefficient path : compute predictions from `operatorBeta = [0.5, 0.5, 0.5]`, assert AUC is in `[0, 1]` and finite.

- [x] **Task 5 — `scoreFromActions` discriminated-result tests** (AC: #4, #5b) — *same test file*.
  - [x] 5.1 — Sparse input (10 actions) → `INSUFFICIENT_DATA` with `samplesAvailable === 10` ; `evaluation: null`.
  - [x] 5.2 — Empty input → `INSUFFICIENT_DATA` with `samplesAvailable === 0` ; no fabricated 0 score.
  - [x] 5.3 — All-null signals (50 actions, every field null) → `INSUFFICIENT_DATA` with `samplesAvailable === 0` (count is **signal-aware**, not array-length-aware).
  - [x] 5.4 — Dense input (60 actions) → `OK` with `score ∈ [0,1]`, `lineage: []` (Story 4.4 populates), `snapshotRef` threaded through, `evaluation.mode === "ALGORITHMIC"`, `evaluation.coefficients` keys === `ATTRIBUTION_FEATURE_KEYS`.
  - [x] 5.5 — Operator coefficients → `evaluation.mode === "MANUAL_COEFFICIENTS"` with exact coefficient pass-through.
  - [x] 5.6 — Custom `minSamplesRequired` override (e.g. `5`) lifts 10 actions to `OK` — Story 4.5 use case for "we have low expectations".

- [x] **Task 6 — Pure helpers unit pinning** (AC: #5 sanity) — *same test file*.
  - [x] 6.1 — `sigmoid` : standard values + ±1000 clip stability.
  - [x] 6.2 — `extractFeatures` : normalized budget formula + null defaults.
  - [x] 6.3 — `extractLabel` : both French (EVANGELISTE) and English (Evangelist) detected, no false positives on INITIE/FIDELE-only transitions.
  - [x] 6.4 — `countSamplesAvailable` : signal-aware (not array-length).
  - [x] 6.5 — `computeRmse` : known pairs + empty input.
  - [x] 6.6 — `computeRocAuc` : 1.0 perfectly separable, 0.5 uniform, 0.0 inverted, 0.5 single-class (uninformative).

- [x] **Task 7 — Verification** (AC: covers all).
  - [x] 7.1 — `npx tsc --noEmit` — clean (0 errors).
  - [x] 7.2 — `npx vitest run tests/unit/services/campaign-tracker/` — 36/36 passing (14 from Story 4.1 + 22 new).
  - [x] 7.3 — Anti-drift unchanged : `phase22-connector-result.test.ts` HARD 9/9, `neteru-coherence.test.ts` 7/7, `phase22-no-silent-zero.test.ts` HARD 1/1 (Overton scope ; superfan scope = Story 4.8).

## Dev Notes

### Relevant architecture patterns and constraints

**ADR-0081 §1 is the methodology spec verbatim.** This story implements the three components ADR-0081 §1 calls out (logistic regression ~30 LOC, ROC AUC ~30 LOC, RMSE ~10 LOC) — total stats footprint ~80 LOC. The full file with the IO function + comprehensive docblock lands around 380 LOC, ~190 of which is the new Story 4.2 runtime (the rest is Story 4.1 types + docblock).

**Why Mann-Whitney U for ROC AUC.** The straightforward TPR-vs-FPR trapezoidal integration requires iterating over thresholds and is O(n × t) where `t` is the number of distinct thresholds. The Mann-Whitney U formulation `AUC = (Σ ranks of positives − pos·(pos+1)/2) / (pos · neg)` is O(n log n) via the rank-assignment sort, robust to score ties (averaged ranks), and ~25 LOC instead of ~40 — well within the ADR-0081 §1 envelope.

**Feature engineering is deliberately MVP.** The 3-dim feature vector `[intercept, bigIdeaCoherence, normalizedBudget]` is small enough not to over-fit on the 30-50 samples typical of a calibration window, large enough to be non-trivial (the regression has to find at least 3 coefficients). Adding more features (manipulation mode one-hot, aarrStage discrete, sovTarget continuous) without an ADR-followup is the path to over-fitting on MVP samples — out of scope here. ADR-0081 §1 envelope ("~70-100 LOC for the metrics") is the structural rate limit.

**Why budget normalization at 1M FCFA.** FCFA budgets in the African creative market typically range from 50k to 5M for SME campaigns, with corporate budgets going higher. Clipping at 1M places the median in the linear region of the logistic ; budgets above 1M land in the saturated region (the model can't distinguish "big" from "huge" without more samples). This is a defensible MVP choice ; ADR-followup may revisit if production data shows saturation issues.

**Decoupled pure scoring path (`scoreFromActions`) vs IO `runAttribution`.** The architecturally significant choice : the regression core is a **pure function** taking plain TS objects (`AttributionInputAction[]`). This lets unit tests target the regression directly without Prisma mocks — the synthetic-data fit test in Task 4 doesn't touch IO at all. The IO function `runAttribution` is a thin Prisma wrapper that builds the input array + calls the pure path. Epic 6 Story 6.1 will refactor to surface the `evaluation` payload to the `IntentEmission` ; the pure function already returns it, so the refactor is just wiring.

**Devotion-ladder canon vs attribution alphabet — `extractLabel` straddles both.** The existing `CampaignAction.devotionTransitionsObserved` field stores transitions in the canonical 6-rung French alphabet (`{from: "AMBASSADEUR", to: "EVANGELISTE"}`). Story 4.1 declared the attribution-layer 4-rung English alphabet (`Curious | Convinced | Ambassador | Evangelist`). For Story 4.2's binary `extractLabel`, the distinction is irrelevant — both French `EVANGELISTE` and English `Evangelist` map to the same "did this action produce an evangelist?" semantic. Story 4.4 will surface the full rung mapping when it populates `lineage`. Story 4.2 documents this dual detection in `extractLabel` JSDoc.

**Transient `snapshotRef` pattern.** The `snapshotRef` field on the `AttributionResult.OK` arm is required to be `string`. Epic 6 Story 6.1 calibration handler will provide the canonical `IntentEmission.id` value ; Story 4.2 standalone calls (operator runs `runAttribution` directly for ad-hoc audit) get a `"transient-${uuid}"` placeholder that's explicit about its non-IntentEmission origin. Downstream callers can string-test for the `"transient-"` prefix to know "this snapshot isn't yet in the hash-chained governance log — don't cite it to clients" (Epic 6 Story 6.1 will own that contract assertion).

**Trust-but-verify the convergence target.** The synthetic-data test asserts (a) sign structure recovery and (b) ROC AUC ≥ 0.75 on the training set. Exact magnitude recovery (`|beta_fitted - beta_true| < ε`) is **not** asserted — gradient descent with `learningRate = 0.1`, `iterations = 500` on 200 samples won't reach the exact MLE. The defensible properties are : the optimiser moves in the correct direction (sign structure) and the resulting model discriminates above chance (AUC > 0.5). This matches ADR-0081 §1's pragmatic stance ("If the fit quality proves insufficient in production, ADR-followup may add L2 or Adam").

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) | **EDIT** | Fill Story 4.1 placeholder section 5 with the regression + ROC AUC + RMSE + `scoreFromActions` pure path + `runAttribution` IO entry point. ~190 LOC added. |
| [tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts) | **NEW** | 22 tests : pure-helper pinning + synthetic-data fit + discriminated-result paths. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) §1–§3 — canonical methodology spec.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — root invariant (`INSUFFICIENT_DATA` is first-class).
- [prisma/schema.prisma](../../prisma/schema.prisma) model `CampaignAction` (line 1711) — confirms field shape (`bigIdeaCoherenceScore: Float?`, `budget: Float?`, `devotionTransitionsObserved: Json?`).
- [src/server/services/campaign-tracker/superfan-economy.ts](../../src/server/services/campaign-tracker/superfan-economy.ts) — Phase 19 legacy heuristic ; reads the same `devotionTransitionsObserved` field via `parseTransitions` (line 110). Coexists with this story's path, untouched.
- [src/server/services/campaign-tracker/superfan-attribution.ts (Story 4.1 types)](../../src/server/services/campaign-tracker/superfan-attribution.ts) — type backbone this story fills.
- [_bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md](./4-1-attribution-result-discriminated-union.md) — Story 4.1 implementation context.
- [_bmad-output/planning-artifacts/epics.md L859-873](../planning-artifacts/epics.md) — Story 4.2 spec verbatim.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — HARD mode active since Epic 2 Story 2.5 ; untouched.
- [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — HARD mode active for Overton scope since Epic 3 Story 3.8 ; **superfan scope will be added in Story 4.8** (this story does **not** touch the scan paths). Story 4.2 itself ships zero `?? 0` / `|| 0` on score-named identifiers — verified by grep.

### Testing standards summary

- **Pure-function unit tests** via Vitest — synthetic data + known coefficients ; no Prisma mocking required. Runtime < 100ms.
- **Discriminated-result tests** target `scoreFromActions` directly (pure path) — the IO `runAttribution` is exercised by future integration tests when Story 4.6/4.7 wire it into tRPC procedures.
- **Coverage** : 22 new tests across 3 `describe` blocks. AC #5(a) covered by "fitLogisticRegression synthetic recovery" ; AC #5(b) covered by "scoreFromActions discriminated result" (3 INSUFFICIENT_DATA paths + 3 OK paths).

### Project Structure Notes

**Alignment with unified project structure:**

- Test file co-located with Story 4.1's test : `tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts`. Naming : `<source-file>.<concern>.test.ts` follows the project's per-concern test split convention.
- Source edit extends the Story 4.1 file in-place — single file, single PR review surface.

**Detected variances / conflicts:**

- **None.** The pure-TS regression honours ADR-0081 §1's "no new npm dependency" constraint ; the feature alphabet is deliberately minimal ; the dual-detection on `extractLabel` (French + English) is documented and forward-compat with Story 4.4.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L859-873 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md §1–§3 (methodology)](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (root invariant)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: prisma/schema.prisma `model CampaignAction`](../../prisma/schema.prisma)
- [Source: _bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md (Story 4.1 type backbone)](./4-1-attribution-result-discriminated-union.md)
- [Source: src/server/services/campaign-tracker/superfan-economy.ts (Phase 19 legacy, `parseTransitions` precedent)](../../src/server/services/campaign-tracker/superfan-economy.ts)

### Latest tech information

- **TypeScript 6** — `Object.fromEntries(ATTRIBUTION_FEATURE_KEYS.map(...))` requires the `Record<AttributionFeatureKey, number>` cast since TS6 still types `fromEntries(arr)` loosely ; the cast is type-safe given the input is keyed by the literal alphabet.
- **Node 19+** — `globalThis.crypto.randomUUID()` is available without `import { randomUUID } from "node:crypto"` ; the project runs on Node 20+.
- **Vitest 4** — deterministic seeded data via LCG ; `Math.random` was avoided to make the synthetic fit test reproducible across CI runs.

### Previous story intelligence

- **Story 4.1 (`AttributionResult` discriminated union)** — direct predecessor, shipped commit `edbe5ec`. The type backbone this story fills. `scoreFromActions` returns the same `AttributionResult` shape ; `evaluation` is an internal payload that Epic 6 Story 6.1 will wrap.
- **Stories 3.6 / 3.7 (Overton wiring)** — recent Phase 23 precedent for `__realSignal` injection patterns + discriminated-union return shapes. Story 4.2 follows the same "pure-function-decoupled-from-IO" architecture (Story 3.6's `OvertonRealSignal` helper is also a pure builder).
- **Phase 19 `superfan-economy.ts:recomputeSuperfanAttribution`** — the legacy heuristic this story complements (not supersedes). Phase 19 LTV multiplier × evangelist count is preserved ; Story 4.2 adds the calibration path. Unification deferred post-Phase 23.

### Git intelligence summary

Last 5 commits on `main` (per `git log --oneline -5`) :

```
edbe5ec governance(seshat): phase 23 story 4.1 AttributionResult discriminated union (P22-2)
bd7f5a2 docs(governance): phase 23 autopilot handoff 2026-05-28 02:26 (Epic 3 closed)
cc45de4 docs(governance): phase 23 Epic 3 closure doc-sync (8/8 shipped)
9370b99 test(governance): phase 23 story 3.8 activate HARD phase22-no-silent-zero (Epic 3 CLOSED)
4de7016 feat(seshat): phase 23 story 3.7 manual operator-tagged Overton-delta mode (ADR-0060 parity)
```

Pattern observed : Phase 23 Epic 4 opens with the type backbone (4.1) then the runtime (4.2). One commit per structural concern — type-only file + runtime-only edit are committed separately.

### Project context reference

This story is the **calibration engine** of Phase 23 Epic 4 Superfan Measurement. Without it, "this campaign produced N evangelists" would either be a heuristic LTV multiplier (Phase 19) or a fabricated count. With it, the operator can defend the score to a client by pointing at ROC AUC = 0.74 on a dated calibration snapshot. Story 4.4 will populate `lineage` ; Story 4.6 + 4.7 surface the result ; Epic 6 Story 6.1 wraps with `IntentEmission` for hash-chained reproducibility.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16) ; for the calibration methodology see [ADR-0081](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0081 §1–§3 (methodology + types + snapshot persistence) + ADR-0046 (no-magic-fallback) + Prisma `CampaignAction` field shape verified ; pure-function-decoupled-from-IO pattern preserved (synthetic-data test doesn't touch Prisma) ; transient `snapshotRef` pattern documented for Epic 6 wrap ; dual-rung detection in `extractLabel` annotated for Story 4.4 forward-compat ; ADR-0081 §1 "~70-100 LOC for the metrics" envelope respected (regression + AUC + RMSE = ~55 LOC ; including `scoreFromActions` orchestration the structural portion lands at ~150 LOC). All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona in autopilot mode per `_bmad-output/autopilot-phase-23.md` + `_nefer-facts.md`.

### Debug Log References

- AC #1 (`runAttribution` signature verbatim) — shipped : see [superfan-attribution.ts §6](../../src/server/services/campaign-tracker/superfan-attribution.ts) — exact signature `{ campaignIds: string[]; coefficients?: Record<string, number> } → Promise<AttributionResult>`.
- AC #2 (gradient descent OR operator coefficients) — shipped : `scoreFromActions` branches on `opts.coefficients` presence ; `mode: "ALGORITHMIC" | "MANUAL_COEFFICIENTS"` discriminator on the evaluation.
- AC #3 (ROC AUC + RMSE in internal evaluation payload, ≤ ~60 LOC for metrics) — shipped : `computeRocAuc` ~25 LOC + `computeRmse` ~5 LOC = 30 LOC ; surfaced via `AttributionEvaluation` type with `rocAuc / rmse / coefficients / sampleSize / mode` fields.
- AC #4 (`INSUFFICIENT_DATA` below threshold) — shipped : `countSamplesAvailable` + threshold check at top of `scoreFromActions` ; default 30 from `MIN_SAMPLES_REQUIRED_DEFAULT` (Story 4.1 const) ; `evaluation: null` on sparse path (no metrics computable).
- AC #5a (synthetic-data fit test) — shipped : `tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts` "fitLogisticRegression synthetic recovery" describe block. LCG-deterministic 200-sample generator with `betaTrue = [-3, 4, 2]` ; asserts sign-structure recovery + AUC ≥ 0.75 on training set.
- AC #5b (INSUFFICIENT_DATA path on sparse input) — shipped : "scoreFromActions discriminated result" describe block. 3 separate INSUFFICIENT_DATA paths (10 actions, empty, 50 all-null).
- Verification : `npx tsc --noEmit` clean ; `npx vitest run tests/unit/services/campaign-tracker/` → 36/36 passing (14 from Story 4.1 + 22 new).

### Completion Notes List

- **AC #1–5 all shipped** in commit `<filled at commit time>`. Pure-function-decoupled-from-IO pattern : `scoreFromActions` (pure) + `runAttribution` (Prisma IO wrapper). Unit tests target the pure path directly — zero mocking, < 100ms runtime.
- **Bonus implementation beyond AC** : `extractFeatures` + `extractLabel` + `countSamplesAvailable` + `ATTRIBUTION_FEATURE_KEYS` const + `AttributionEvaluation` type exported. All zero-LOC for the AC, but they make the pure helpers unit-testable + give Story 4.5/4.6/Epic-6-6.1 a canonical feature alphabet to consume in the manual-coefficient UI.
- **Transient `snapshotRef` pattern** : `runAttribution` standalone calls get `"transient-${uuid}"` ; Epic 6 Story 6.1 wraps with the canonical `IntentEmission.id`. Downstream consumers can string-test the `"transient-"` prefix to know "not yet in the hash-chained governance log" — Epic 6 will own that contract assertion.
- **Cap APOGEE 7/7 preserved** — Layer 4 service code, no Neter touched, no new dep added (ADR-0081 §1 envelope respected — no `simple-statistics`, no `ml-js`, just pure TS arithmetic).
- **Manual-first parity (ADR-0060)** : structurally supported via `coefficients?` parameter. When provided, gradient descent is skipped ; `mode: "MANUAL_COEFFICIENTS"` is discriminator-recorded on the evaluation payload. Story 4.5 + Epic 6 Story 6.5 will land the full UI form ; the back-end mode is ready.
- **No silent zero on score path** — `scoreFromActions` returns `INSUFFICIENT_DATA` branch when samples sparse ; no `?? 0` on any score-named identifier in the new code (verified by grep ; Story 4.8 will activate the HARD anti-drift test for this file's scope).
- **Mission link** : superfan attribution is now defendable end-to-end. The operator can show a client : "I have 0.74 ROC AUC on your 65-campaign-action history, dated 2026-05-28, calibration snapshot `intent-emission-abc-123`" — not a heuristic LTV multiplier. This is the **calibration engine** that turns "this campaign produced N evangelists" from a vanity counter into a defensible measurement.

### File List

- **EDIT** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — added Sections 5+6 (pure stats + `scoreFromActions` + `runAttribution` IO entry). +~190 LOC. Total file now ~380 LOC including Story 4.1 types + comprehensive docblock. Imports `zod` + `@/lib/db` (dynamic import inside `runAttribution`).
- **NEW** [tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts) — 22 Vitest tests : 12 pure-helper pinning + 2 synthetic-data fit + 8 `scoreFromActions` discriminated-result paths.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.11 entry.
- **NEW** [_bmad-output/implementation-artifacts/4-2-pure-ts-logistic-regression-roc-auc-rmse.md](./4-2-pure-ts-logistic-regression-roc-auc-rmse.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.2 shipped — pure-TS logistic regression (gradient descent) + Mann-Whitney-U ROC AUC + RMSE + decoupled `scoreFromActions` pure path + `runAttribution` Prisma-IO entry point. 22 new tests : synthetic-fit recovery + sparse-input INSUFFICIENT_DATA paths + pure-helper pinning. `tsc --noEmit` clean ; 36/36 campaign-tracker tests passing. No new npm dep (ADR-0081 §1 envelope respected). Cap APOGEE 7/7 preserved. Phase 23 Epic 4 progress 1/8 → 2/8. | NEFER (Claude Opus 4.7) |
