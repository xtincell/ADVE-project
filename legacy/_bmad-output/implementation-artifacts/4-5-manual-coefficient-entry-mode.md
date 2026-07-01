# Story 4.5: Ship manual coefficient-entry mode (FR25 — manual peer to FR6)

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 ✓
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 5/8)
Owning Neter: Seshat (campaign-tracker measurement) · Mestor (RUN_ATTRIBUTION_CALIBRATION Intent — payload registered Story 1.5)
APOGEE OS layer (ADR-0084): Layer 4 — Services
BrandAsset.kind produced: none
Portail target: back-end mode only ; the Console manual-coefficient form lands Epic 6 Story 6.5
Manual-first parity (ADR-0060): THIS STORY IS the parity peer — operator judgement (manual coefficients) is an equal-status path to the gradient-descent fit. Both paths return the identical AttributionResult.OK shape ; only AttributionEvaluation.mode discriminates.
Mission link: ADR-0060 parity is structural for the superfan-attribution mechanic. When the regression can't fit (signal too sparse, or the operator disagrees with the auto-fit), the operator enters coefficients directly and gets the same defensible AttributionResult — the algorithm is never the only path to a score.
CODE-MAP grep: searched `attributionCoefficientsSchema`, `persistAttributionCoefficients`, `loadAttributionCoefficients` across `src/`. No prior implementation. The RUN_ATTRIBUTION_CALIBRATION payload (mode + operatorCoefficients) already exists from Story 1.5 ; runAttribution already skips gradient descent on coefficients from Story 4.2. Extension chosen: add the canonical Zod schema + persistence helpers in `superfan-attribution.ts` Section 7.
```

## Story

As an **UPgraders operator**,
I want **to enter attribution-model coefficients manually as a peer mode to the regression**,
so that **ADR-0060 parity is structural for the superfan-attribution mechanic — operator judgement is an equal-status path to the algorithm**.

## Acceptance Criteria

Verbatim from [epics.md L907-920](../planning-artifacts/epics.md):

1. **Given** Story 4.2 (regression accepts optional `coefficients`) and Story 1.6 (`Campaign.attributionCoefficients` field)
   **When** the Console campaign-tracker surface exposes a manual coefficient-entry form (peer tab in the calibration panel — full UI lands in Epic 6 Story 6.5; this story ships the back-end mode)
   **Then** the form's Zod schema equals the regression `coefficients` shape (`Record<string, number>`) — not a parallel schema.

2. **And** the back-end `RUN_ATTRIBUTION_CALIBRATION` Intent payload (registered in Story 1.5) supports `mode: "MANUAL_COEFFICIENTS"` + `operatorCoefficients: Record<string, number>` — the handler in Epic 6 will invoke `runAttribution` with these coefficients and skip the gradient descent.

3. **And** entries persist to `Campaign.attributionCoefficients`; downstream readers cannot distinguish "ran the regression and got these" from "operator entered these" except via the `IntentEmission` payload's `source` discriminator.

4. **And** Vitest asserts both code paths return the same `AttributionResult.OK` shape.

## Tasks / Subtasks

- [x] **Task 1 — Canonical coefficient Zod schema** (AC: #1) — *EDIT [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) Section 7*.
  - [x] 1.1 — `attributionCoefficientsSchema = z.record(z.string(), z.number().finite()).refine(keys ⊆ ATTRIBUTION_FEATURE_KEYS)`. Type infers to `Record<string, number>` — **equals the runtime coefficients shape, not a parallel schema**. Allows partial entry (missing keys default to 0 at the runtime per Story 4.2) ; rejects unknown keys via refine ; rejects non-finite values.
  - [x] 1.2 — `AttributionCoefficients = z.infer<typeof attributionCoefficientsSchema>` exported for the Epic 6 form + the calibration handler.

- [x] **Task 2 — Verify the Intent payload (Story 1.5)** (AC: #2) — *no change ; confirmed*.
  - [x] 2.1 — `RUN_ATTRIBUTION_CALIBRATION` payload in `services/mestor/intents.ts` already declares `mode: "AUTO" | "MANUAL_COEFFICIENTS"` + `operatorCoefficients?: Record<string, number>` (Story 1.5, verified via grep). SLO declared in `slos.ts` (p95 60s, cost $0.50). Manifest `acceptsIntents` includes the kind. No edit needed — Story 4.5 is the consuming back-end mode, not the registration.
  - [x] 2.2 — `runAttribution` (Story 4.2) already branches : `if (opts.coefficients) { use directly + mode = "MANUAL_COEFFICIENTS" } else { fitLogisticRegression + mode = "ALGORITHMIC" }`. No edit — the manual path was structurally ready since Story 4.2.

- [x] **Task 3 — Persistence helpers** (AC: #3) — *same file*.
  - [x] 3.1 — `persistAttributionCoefficients({ strategyId, campaignId, coefficients })` → discriminated `PersistCoefficientsResult` (`OK | REJECTED`). Validates with `attributionCoefficientsSchema` first (REJECTED/INVALID_COEFFICIENTS) ; tenant-guards via `strategyId` (REJECTED/CAMPAIGN_NOT_FOUND | TENANT_MISMATCH) ; writes `Campaign.attributionCoefficients`. Never throws across the boundary (Story 4.3 façade pattern).
  - [x] 3.2 — `loadAttributionCoefficients(campaignId)` → `AttributionCoefficients | null`. Reads `Campaign.attributionCoefficients` ; re-validates with the schema (defensive — a malformed JSON blob returns null rather than feeding garbage into the regression).

- [x] **Task 4 — `source` discriminator** (AC: #3) — *no new code ; confirmed*.
  - [x] 4.1 — The `AttributionEvaluation.mode` field (`"ALGORITHMIC" | "MANUAL_COEFFICIENTS"`, Story 4.2) IS the discriminator. The Epic 6 Story 6.1 handler writes this onto the `IntentEmission.payload.source`. Downstream readers see the identical `AttributionResult.OK` shape ; the only distinguisher is the evaluation mode / IntentEmission source. Verified by the parity test (Task 5.2).

- [x] **Task 5 — Vitest coverage** (AC: #4) — *NEW [tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts)*.
  - [x] 5.1 — `attributionCoefficientsSchema` : full record, partial record, empty record, unknown-key rejection, non-finite/non-number rejection, key-alphabet pinning.
  - [x] 5.2 — Parity : manual + auto `scoreFromActions` return the **same OK key set** (`["lineage", "score", "snapshotRef", "state"]`) ; only `evaluation.mode` differs (`MANUAL_COEFFICIENTS` vs `ALGORITHMIC`).
  - [x] 5.3 — `persistAttributionCoefficients` : OK write path + 3 REJECTED reasons (INVALID_COEFFICIENTS short-circuits before any DB read ; CAMPAIGN_NOT_FOUND ; TENANT_MISMATCH).
  - [x] 5.4 — `loadAttributionCoefficients` : valid parse, null on absent, null on malformed.

- [x] **Task 6 — Verification** (AC: covers all).
  - [x] 6.1 — `npx tsc --noEmit` clean.
  - [x] 6.2 — `npx vitest run tests/unit/services/campaign-tracker/` — 84/84 passing (14 + 22 + 21 + 13 + 14 new).
  - [x] 6.3 — Anti-drift unchanged.

## Dev Notes

### Relevant architecture patterns and constraints

**Most of the back-end mode was already in place — Story 4.5 closes the parity loop.** Story 1.5 registered the `RUN_ATTRIBUTION_CALIBRATION` payload with `mode` + `operatorCoefficients`. Story 4.2's `scoreFromActions`/`runAttribution` already branch on `opts.coefficients` (skip gradient descent → `mode: "MANUAL_COEFFICIENTS"`). What was missing : (a) the canonical Zod schema the Epic 6 form derives from, and (b) the persistence helpers that store the operator's judgement on the brand. Story 4.5 ships exactly those two — no new Intent, no new runtime branch.

**"Equals the coefficients shape, not a parallel schema" (FR25 / AC #1).** The runtime consumes `coefficients[k] ?? 0` for each `k` in `ATTRIBUTION_FEATURE_KEYS`, where `coefficients: Record<string, number>`. The schema `z.record(z.string(), z.number().finite())` infers to exactly `Record<string, number>` — the same type the runtime accepts. The `.refine(keys ⊆ ATTRIBUTION_FEATURE_KEYS)` guards against typos / unknown features without diverging from the `Record<string, number>` shape. A keyed-object schema (`z.object({ intercept: z.number(), ... })`) was rejected : it would be a *parallel* schema that drifts if the feature alphabet changes. The refine-based approach stays pinned to `ATTRIBUTION_FEATURE_KEYS` (single source of truth).

**The parity invariant is structural, not advisory (ADR-0060).** AC #4's "both code paths return the same `AttributionResult.OK` shape" is the heart of manual-first parity. The test asserts the OK arm has the identical key set (`lineage`, `score`, `snapshotRef`, `state`) regardless of path. Downstream readers — the Console operator view (Story 4.6), the Cockpit lineage view (Story 4.7) — cannot tell whether a score came from the regression or from operator judgement, except by inspecting `AttributionEvaluation.mode` (or the `IntentEmission.payload.source` the Epic 6 handler writes). The operator's judgement is genuinely an equal-status path, not a degraded fallback.

**Persistence is throw-free + tenant-guarded.** `persistAttributionCoefficients` follows the Story 4.3 façade pattern : it returns a discriminated `PersistCoefficientsResult` (`OK | REJECTED`) rather than throwing. Validation happens before any DB read (INVALID_COEFFICIENTS short-circuits) ; the tenant guard (`strategyId`) prevents one brand's coefficients leaking onto another's campaign. `loadAttributionCoefficients` re-validates on read — a malformed stored blob (e.g. from a manual DB edit) returns `null` rather than feeding garbage into the regression (no-magic-fallback, ADR-0046).

**Why no tRPC procedure in Story 4.5.** The AC scopes this story to "the back-end mode" — the Console form is explicitly Epic 6 Story 6.5. The tRPC mutation that calls `persistAttributionCoefficients` + emits `RUN_ATTRIBUTION_CALIBRATION` (mode MANUAL_COEFFICIENTS) lands with the form in Epic 6. Story 4.5 ships the reusable building blocks (schema + persistence) the form will consume.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) | **EDIT** | Section 7 : `attributionCoefficientsSchema` + `AttributionCoefficients` type + `persistAttributionCoefficients` + `loadAttributionCoefficients`. ~+90 LOC. |
| [tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts) | **NEW** | 14 tests : schema validation + parity (same OK shape) + persist/load with mocked Prisma. |

**C6 variable-bible cross-check.** AC #1's coefficient fields land on `Campaign.attributionCoefficients` (a Json blob — model-level), NOT on `Strategy` / `BrandContextNode` / pillar payload. Per `_nefer-checks.md` C6, the variable-bible classification applies only to editable fields on those three. `Campaign.attributionCoefficients` is a calibration artefact, not a pillar-editable field — C6 cross-check confirms no variable-bible entry is required.

**Files to READ (must read before drafting) — UNCHANGED:**

- [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) `RUN_ATTRIBUTION_CALIBRATION` payload (line 842) — confirms `mode` + `operatorCoefficients` already registered (Story 1.5).
- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) §5 — manual-first peer mode spec.
- [docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md](../../docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md) — parity invariant.
- [prisma/schema.prisma](../../prisma/schema.prisma) `Campaign.attributionCoefficients` (line 941).
- [_bmad-output/planning-artifacts/epics.md L907-920](../planning-artifacts/epics.md) — Story 4.5 spec verbatim.

**Anti-drift CI tests that MUST stay green:** `neteru-coherence` 7/7, `phase22-connector-result` HARD 9/9, `phase22-no-silent-zero` HARD 1/1 (Overton scope ; superfan = Story 4.8). All untouched.

### Testing standards summary

- **14 new tests** : 5 schema + 2 parity + 4 persist + 3 load. Prisma mocked via `vi.mock("@/lib/db")`.
- The parity test (5.2) is the AC #4 anchor — same OK key set across both paths.

### Project Structure Notes

- New test co-located under `tests/unit/services/campaign-tracker/`. Source extends `superfan-attribution.ts` Section 7.
- No new tRPC procedure (Epic 6 Story 6.5). No migration (`attributionCoefficients` exists from Story 1.6).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L907-920](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md §5](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md (parity)](../../docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md)
- [Source: src/server/services/mestor/intents.ts (RUN_ATTRIBUTION_CALIBRATION payload, Story 1.5)](../../src/server/services/mestor/intents.ts)
- [Source: _bmad-output/implementation-artifacts/4-2-pure-ts-logistic-regression-roc-auc-rmse.md](./4-2-pure-ts-logistic-regression-roc-auc-rmse.md)

### Previous story intelligence

- **Story 1.5** — registered the `RUN_ATTRIBUTION_CALIBRATION` payload with `mode` + `operatorCoefficients`. Story 4.5 consumes it (no re-registration).
- **Story 4.2** — `runAttribution`/`scoreFromActions` already branch on `opts.coefficients`. Story 4.5 adds the schema + persistence around that existing branch.
- **Story 4.3** — the façade-pattern discriminated-result-not-throw convention reused by `persistAttributionCoefficients`.

### Git intelligence summary

```
07e959a feat(seshat): phase 23 story 4.4 evangelist count + lineage from devotion transitions
388db89 feat(seshat): phase 23 story 4.3 cohort retention from CRM connector
82e62d0 feat(seshat): phase 23 story 4.2 pure-TS logistic regression + ROC AUC + RMSE
```

### Project context reference

Story 4.5 makes manual-first parity structural for the superfan-attribution mechanic. The operator's judgement (manual coefficients) and the algorithm (gradient descent) produce the identical `AttributionResult.OK` shape — the algorithm is never the only path to a defensible score. Epic 6 Story 6.5 builds the Console form on top of this back-end mode.

## Story completion status

Status: **review**

NEFER context engine analysis completed — confirmed Story 1.5 already registered the Intent payload + Story 4.2 already wired the runtime branch ; the missing pieces (canonical schema + persistence) shipped ; the "equals the coefficients shape, not parallel" requirement satisfied via `z.record(z.string(), z.number()).refine(...)` pinned to `ATTRIBUTION_FEATURE_KEYS` ; C6 cross-check confirms `Campaign.attributionCoefficients` is a calibration artefact, not a variable-bible pillar field. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot per `_bmad-output/autopilot-phase-23.md`.

### Debug Log References

- AC #1 (schema equals coefficients shape) — `attributionCoefficientsSchema` infers `Record<string, number>` ; refine pins keys to `ATTRIBUTION_FEATURE_KEYS`. Tests : full/partial/empty accept, unknown-key reject, non-finite reject.
- AC #2 (Intent payload supports mode + operatorCoefficients) — verified Story 1.5 registration (no edit) ; runAttribution branch verified (Story 4.2).
- AC #3 (persist to Campaign.attributionCoefficients + source discriminator) — `persistAttributionCoefficients` writes the field ; `AttributionEvaluation.mode` is the discriminator.
- AC #4 (both paths same OK shape) — parity test asserts identical OK key set (`lineage`, `score`, `snapshotRef`, `state`) ; only `evaluation.mode` differs.

### Completion Notes List

- **AC #1–4 all shipped** in commit `<filled at commit time>`. Most of the back-end mode (Intent payload + runtime branch) pre-existed from Stories 1.5 + 4.2 — Story 4.5 added the canonical schema + persistence helpers + the parity test.
- **Schema design** — `z.record(z.string(), z.number()).refine(...)` chosen over `z.object({...})` to stay pinned to the runtime `Record<string, number>` shape (a keyed object would be a parallel schema that drifts).
- **Throw-free persistence** — `PersistCoefficientsResult` discriminated union, validation before DB read, tenant guard via strategyId. `loadAttributionCoefficients` re-validates (defensive null on malformed).
- **No tRPC procedure** — back-end mode only ; the Console form + mutation land Epic 6 Story 6.5.
- **Cap APOGEE 7/7 preserved** — Layer 4 service edit, no Neter touched, no new dep.
- **Mission link** — manual-first parity is now structural for superfan attribution : operator judgement and algorithm produce the identical defensible result shape.

### File List

- **EDIT** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — Section 7 : `attributionCoefficientsSchema` + `AttributionCoefficients` + `PersistCoefficientsResult` + `persistAttributionCoefficients` + `loadAttributionCoefficients`.
- **NEW** [tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.coefficients.test.ts) — 14 tests.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.14 entry.
- **NEW** [_bmad-output/implementation-artifacts/4-5-manual-coefficient-entry-mode.md](./4-5-manual-coefficient-entry-mode.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.5 shipped — `attributionCoefficientsSchema` (equals the `Record<string, number>` coefficients shape, pinned to `ATTRIBUTION_FEATURE_KEYS` via refine) + `persistAttributionCoefficients` (throw-free, tenant-guarded, writes `Campaign.attributionCoefficients`) + `loadAttributionCoefficients` (defensive re-validation). RUN_ATTRIBUTION_CALIBRATION payload + runtime branch pre-existed (Stories 1.5 + 4.2). 14 new tests incl. the AC #4 parity anchor (manual + auto same OK shape). `tsc` clean ; 84/84 campaign-tracker tests passing. Cap APOGEE 7/7 preserved. Phase 23 Epic 4 progress 4/8 → 5/8. | NEFER (Claude Opus 4.7) |
