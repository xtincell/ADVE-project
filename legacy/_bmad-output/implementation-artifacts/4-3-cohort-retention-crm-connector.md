# Story 4.3: Extend `superfan-economy.ts` to compute cohort retention from CRM connector

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 3/8)
Owning Neter: Seshat (superfan.stickiness + superfan.crmCapture sub-clusters in campaign-tracker) · Anubis (CRM connector — Credentials Vault, ADR-0021)
APOGEE OS layer (ADR-0084): Layer 4 — Services (campaign-tracker runtime + Anubis façade consumer)
BrandAsset.kind produced: none (measurement only — emits cohort signal, no asset)
Portail target: tRPC procedures consumed by Console campaign-tracker view (Epic 6 Story 6.3)
Manual-first parity (ADR-0060): n/a — this story consumes a connector façade. The peer manual mode for the calibration aggregate lives in Story 4.5 + Epic 6 Story 6.5 ; for raw cohort retention there is no equivalent manual input — by construction, "what fraction of customers are still engaged at J+30" can only be measured against the CRM source of truth.
Mission link: superfan.stickiness + superfan.crmCapture are 2 of the 6 pivot sub-clusters. Moving both off the Phase 19 Anubis legacy path onto the Phase 23 Credentials-Vault façade with exhaustive ConnectorResult switching does two things : (1) honors ship-without-keys (PRD Journey 2) — when CRM credentials are absent, the operator sees an honest "configure connector" state, not a fabricated 0% retention ; (2) makes the cohort-retention signal defensible to a client — every retention rate now traces to a typed LIVE observation from the CRM façade, never a swallow-to-zero.
CODE-MAP grep: searched `fetchCohortSignal`, `CohortRetentionMeasurement`, `CrmCaptureMeasurement`, `SuperfanInsufficientReason` across `src/` + `tests/`. Hits in non-source : ADR-0079 §"Décision", architecture P22-1, epics.md Story 4.3 AC, autopilot-handoff Story 4.3. CRM façade exists in `services/anubis/providers/crm-provider.ts` (Story 2.3, commit `02a488a`). Extension chosen: refactor existing `measureDevotionStickinessCohort` + `captureSuperfansFromCampaign` in `services/campaign-tracker/superfan-economy.ts` (epic spec L884) ; introduce 2 discriminated-union return types ; retire dangling ADR-0054 ref per P22-7.
```

## Story

As an **UPgraders operator**,
I want **`superfan.stickiness` to compute J+30 / J+90 / J+180 cohort retention from real CRM signal**,
so that **the sub-cluster exits its PARTIAL state with traceable data**.

## Acceptance Criteria

Verbatim from [epics.md L875-890](../planning-artifacts/epics.md):

1. **Given** Story 2.3 (CRM façade) and Story 1.3 (`ConnectorResult<T>`)
   **When** `services/campaign-tracker/superfan-economy.ts` is extended
   **Then** the `superfan.stickiness` handler imports `crmProvider.fetchCohortSignal` from `services/anubis/providers/crm-provider` and switches on `ConnectorResult` exhaustively.

2. **And** on `LIVE`, the handler returns the three retention values (J+30/90/180) as a discriminated `OK` branch.

3. **And** on `DEFERRED` or `DEGRADED`, the handler returns `INSUFFICIENT_DATA` — never a fabricated retention value.

4. **And** `superfan.crmCapture` is similarly wired (counts evangelist-like CRM events).

5. **And** `capability-state.ts` for `superfan.stickiness` + `superfan.crmCapture` lifts to `MVP` with `childAdr: "0081"`.

6. **And** Vitest covers all three connector states.

## Tasks / Subtasks

- [x] **Task 1 — Discriminated-union return types** (AC: #2, #3) — *EDIT [src/server/services/campaign-tracker/superfan-economy.ts](../../src/server/services/campaign-tracker/superfan-economy.ts)*.
  - [x] 1.1 — Add `SuperfanInsufficientReason` typed-cause alphabet : `"DEFERRED_AWAITING_CREDENTIALS" | "DEGRADED_INSUFFICIENT_DATA" | "DEGRADED_VENDOR_OUTAGE" | "DEGRADED_RATE_LIMITED" | "DEGRADED_AUTH_REVOKED" | "WINDOW_NOT_REACHED" | "CAMPAIGN_NOT_FOUND" | "TENANT_MISMATCH" | "NO_EVANGELISTS_DETECTED"`. Pattern P22-2 — typed reason, not free-text accumulation.
  - [x] 1.2 — Add `mapDegradationToReason(reason: ConnectorDegradationReason)` — exhaustive switch from the 4 ConnectorDegradationReason flavours to the corresponding `DEGRADED_<flavour>` SuperfanInsufficientReason. No `default` — tsc enforces exhaustiveness.
  - [x] 1.3 — Add `CohortWindowSnapshot` type — `{ cohortSize, retained, retentionRate, observedAt }`. Carried on the OK arm per window.
  - [x] 1.4 — Add `CohortRetentionMeasurement` discriminated union — `OK` arm with J30/J90/J180 snapshots (all required) ; `INSUFFICIENT_DATA` arm with `reason: SuperfanInsufficientReason` + optional `nextReachableAt` (for WINDOW_NOT_REACHED). Partial fills explicitly forbidden — if any window fails to produce LIVE signal, the whole measurement returns INSUFFICIENT_DATA.
  - [x] 1.5 — Add `CrmCaptureMeasurement` discriminated union — `OK` arm with both `localEvangelistCount` (from devotionTransitionsObserved) and `crmCohortSize` (from CRM façade) ; `INSUFFICIENT_DATA` arm preserves `localEvangelistCount` on the branch (always observable).

- [x] **Task 2 — `measureDevotionStickinessCohort` connector wiring** (AC: #1, #2, #3) — *same file*.
  - [x] 2.1 — Replace the legacy `import { measureCohortRetention } from "@/server/services/anubis"` with `import { fetchCohortSignal, type CrmCohortWindow } from "@/server/services/anubis/providers/crm-provider"`.
  - [x] 2.2 — Iterate `COHORT_WINDOWS = ["J+30", "J+90", "J+180"] as const`. For each window, compute `reachableAt = endDate + days` ; if `now < reachableAt`, short-circuit return `INSUFFICIENT_DATA` with `reason: "WINDOW_NOT_REACHED"` and `nextReachableAt: reachableAt.toISOString()` (operator UI renders "measurement pending — Y/M/D").
  - [x] 2.3 — Call `fetchCohortSignal(operatorId, campaignId, window)` — note `brandId === campaign.id` per ADR-0079 (cohort scoped to the specific campaign, not the strategy).
  - [x] 2.4 — Switch on `signal.state` exhaustively : `LIVE` → snapshot stored in per-window record ; `DEFERRED_AWAITING_CREDENTIALS` → short-circuit return INSUFFICIENT_DATA ; `DEGRADED` → short-circuit return INSUFFICIENT_DATA with `mapDegradationToReason(signal.reason)`. No `default` branch — tsc enforces.
  - [x] 2.5 — After the loop, all three windows guaranteed LIVE — return `OK` with the three snapshots.
  - [x] 2.6 — Defensive : `CAMPAIGN_NOT_FOUND` if Prisma returns null ; `TENANT_MISMATCH` if `campaign.strategyId !== input.strategyId` (replace the legacy `throw new Error(...)` with discriminated returns — keeps the consumer boundary P22-1-safe).

- [x] **Task 3 — `captureSuperfansFromCampaign` connector wiring** (AC: #4) — *same file*.
  - [x] 3.1 — Compute `localEvangelistCount` from `devotionTransitionsObserved` (preserve Phase 19 LTV semantic : EVANGELISTE + FIDELE both count). Short-circuit `INSUFFICIENT_DATA` with `reason: "NO_EVANGELISTS_DETECTED"` if 0 — skip CRM call entirely.
  - [x] 3.2 — Call `fetchCohortSignal(operatorId, campaignId, window ?? "J+30")` — cross-check the local count against the CRM cohort size (defensible "we know how many evangelists you have" : when local vs CRM diverge, the operator can spot a segment misalignment).
  - [x] 3.3 — Switch on `signal.state` exhaustively : `LIVE` → OK with `{ localEvangelistCount, crmCohortSize, segmentName, observedAt }` ; `DEFERRED` → INSUFFICIENT_DATA with reason + preserved `localEvangelistCount` on branch ; `DEGRADED` → INSUFFICIENT_DATA with mapped reason + preserved local count.
  - [x] 3.4 — Defensive : `CAMPAIGN_NOT_FOUND` / `TENANT_MISMATCH` returns INSUFFICIENT_DATA with `localEvangelistCount: 0` (no campaign means no transitions).

- [x] **Task 4 — Capability state registry update** (AC: #5) — *EDIT [src/server/services/campaign-tracker/capability-state.ts](../../src/server/services/campaign-tracker/capability-state.ts)*.
  - [x] 4.1 — `superfan.stickiness` : `lifecycle: "MVP"` (was already MVP — no change in lifecycle, but description updated to reflect Phase 23 connector wiring + degradationCodes refreshed to the SuperfanInsufficientReason alphabet) + **add `childAdr: "0081"`** (was undefined).
  - [x] 4.2 — `superfan.crmCapture` : same treatment — description updated, degradationCodes refreshed, `childAdr: "0081"` added.
  - [x] 4.3 — `superfan.attribution` : retire dangling ref `0054-superfan-attribution-model.md` → `0081` per P22-7 (same commit as files touched). Description updated to reference both the Phase 19 heuristic (LTV multiplier) and the Phase 23 calibration path (Stories 4.1+4.2).

- [x] **Task 5 — Vitest connector-state coverage** (AC: #6) — *NEW [tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts](../../tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts)*.
  - [x] 5.1 — Mock `@/lib/db` (Prisma `campaign.findUnique`) + `@/server/services/anubis/providers/crm-provider` (`fetchCohortSignal`). Use `vi.fn()` + `vi.mock(...)` factory pattern (precedent : `tests/unit/services/strategy-presentation/overton-real-signal.test.ts`).
  - [x] 5.2 — `measureDevotionStickinessCohort` coverage : (a) all three LIVE → OK with retention rates ; (b) DEFERRED_AWAITING_CREDENTIALS → INSUFFICIENT_DATA, short-circuit (second window not attempted) ; (c) DEGRADED each of 4 reasons → INSUFFICIENT_DATA with mapped reason (table-driven via `it.each`) ; (d) WINDOW_NOT_REACHED with `nextReachableAt` populated ; (e) CAMPAIGN_NOT_FOUND defensive ; (f) TENANT_MISMATCH defensive.
  - [x] 5.3 — `captureSuperfansFromCampaign` coverage : (a) LIVE → OK with local + CRM counts ; (b) DEFERRED → INSUFFICIENT_DATA with local count preserved on branch ; (c) DEGRADED each of 4 reasons (table-driven) ; (d) NO_EVANGELISTS_DETECTED short-circuit (CRM call skipped) ; (e) CAMPAIGN_NOT_FOUND + TENANT_MISMATCH defensive ; (f) FIDELE transitions counted toward local tally (preserves Phase 19 LTV semantic).
  - [x] 5.4 — P22-7 retirement assertions : (a) all 3 superfan sub-clusters now reference `childAdr: "0081"` ; (b) zero capability has the legacy `0054-superfan-attribution-model` dangling ref. Anti-drift for the retirement.

- [x] **Task 6 — Verification** (AC: covers all).
  - [x] 6.1 — `npx tsc --noEmit` — clean (0 errors ; the return-type change to a discriminated union is structurally compatible with tRPC callers since the procedure output schema is `z.unknown()`).
  - [x] 6.2 — `npx vitest run tests/unit/services/campaign-tracker/` — 57/57 passing (14 Story 4.1 + 22 Story 4.2 + 21 Story 4.3 new).
  - [x] 6.3 — Anti-drift unchanged : `phase22-connector-result.test.ts` HARD 9/9, `neteru-coherence.test.ts` 7/7, `phase22-no-silent-zero.test.ts` HARD 1/1 (Overton scope ; superfan scope = Story 4.8).

## Dev Notes

### Relevant architecture patterns and constraints

**Pattern P22-1 exhaustive ConnectorResult switching.** Both `measureDevotionStickinessCohort` and `captureSuperfansFromCampaign` now switch on `signal.state` with the three arms `LIVE | DEFERRED_AWAITING_CREDENTIALS | DEGRADED` — no `default else`, no swallow-to-LIVE. The `switch` statements are exhaustive per `ConnectorResult<T>` type definition ; if a future revision adds a fourth state, tsc forces every caller to handle it.

**Pattern P22-2 typed INSUFFICIENT_DATA branch.** The `SuperfanInsufficientReason` alphabet is the typed cause carried on the `INSUFFICIENT_DATA` arm — 9 cases covering connector states (4 DEGRADED flavours + 1 DEFERRED) + measurement preconditions (WINDOW_NOT_REACHED, NO_EVANGELISTS_DETECTED) + defensive cases (CAMPAIGN_NOT_FOUND, TENANT_MISMATCH). Each case maps to a distinct operator UI message ; no free-text accumulation that would defeat the discriminator.

**Partial-fill prohibition (defensible MVP).** `measureDevotionStickinessCohort` requires all three windows (J+30 / J+90 / J+180) to return LIVE before the OK arm fires. If any one returns DEFERRED or DEGRADED, the whole measurement returns INSUFFICIENT_DATA with the first non-LIVE reason. Rationale : "two windows visible, one missing" is too ambiguous to defend to a client — the OK arm is "we have full visibility on the cohort". The operator can re-attempt later when the connector is configured / the upstream recovers.

**Local vs CRM cross-check (`captureSuperfansFromCampaign`).** The function returns both `localEvangelistCount` (from `devotionTransitionsObserved`, Phase 19 ground truth) and `crmCohortSize` (from CRM façade, Phase 23 ground truth) on the OK arm. When the two diverge significantly, the operator sees a segment misalignment hint — typical cause : the CRM segment "superfans-{campaignCode}" hasn't been refreshed since the campaign ended, so the CRM count is stale. The local count is preserved on the INSUFFICIENT_DATA arm too — always observable, even without CRM signal.

**Defensive returns replace `throw new Error(...)`.** The legacy Phase 19 implementation threw on `CAMPAIGN_NOT_FOUND` and `TENANT_MISMATCH`. Story 4.3 replaces both with discriminated INSUFFICIENT_DATA returns — keeps the consumer boundary P22-1-safe (façade-style : never throw across the boundary, return typed degradation instead). This is a behavior change but a structural improvement — defensive cases now surface honest UI states instead of "Internal Server Error".

**P22-7 dangling-ref retirement.** `superfan.attribution` previously referenced `childAdr: "0054-superfan-attribution-model.md"` — a phantom ADR that never existed. ADR-0081 (Phase 23 calibration methodology) explicitly supersedes the phantom 0054 per ADR-0081 frontmatter "Supersedes : phantom reference `0054-superfan-attribution-model`". Story 4.3 retires the dangling ref inside the same commit that touches `capability-state.ts` — P22-7 distributed retirement. Anti-drift test in the new test file asserts zero capabilities reference the legacy slug.

**Why iterating over three separate `fetchCohortSignal` calls (not one batch).** The CRM façade's API is per-window — `fetchCohortSignal(operatorId, brandId, window: CrmCohortWindow)`. Each call is a separate Vault credential check + upstream fetch. Three calls instead of one means : (a) the operator can see WHICH window failed (J+30 OK, J+90 DEFERRED, J+180 not attempted) ; (b) a transient outage on one window doesn't poison the others' chance ; (c) the cohort-window math (does this window exist yet?) is naturally per-window. The cost is 3 round-trips instead of 1, but the cohort signal is read at most daily — not a hot path.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/superfan-economy.ts](../../src/server/services/campaign-tracker/superfan-economy.ts) | **EDIT** | Refactor `measureDevotionStickinessCohort` + `captureSuperfansFromCampaign` to consume `crmProvider.fetchCohortSignal` with exhaustive ConnectorResult switching ; add 2 discriminated-union return types + 1 typed-cause alphabet. ~+200 LOC net (replaces the legacy `anubis.measureCohortRetention` / `anubis.createCrmSegment` consumption). |
| [src/server/services/campaign-tracker/capability-state.ts](../../src/server/services/campaign-tracker/capability-state.ts) | **EDIT** | Update 3 sub-cluster entries (`superfan.attribution`, `.stickiness`, `.crmCapture`) — refresh descriptions, refresh degradationCodes, add `childAdr: "0081"`, retire dangling `0054-superfan-attribution-model.md` per P22-7. |
| [tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts](../../tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts) | **NEW** | 21 Vitest tests covering all 3 ConnectorResult states + 4 DEGRADED reasons + defensive cases + P22-7 retirement assertions. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [src/server/services/anubis/providers/crm-provider.ts](../../src/server/services/anubis/providers/crm-provider.ts) — Story 2.3 CRM façade. `fetchCohortSignal` signature + `CrmCohortSignal` payload shape.
- [src/domain/connector-result.ts](../../src/domain/connector-result.ts) — Story 1.3 type. The discriminated union this story switches on.
- [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) — connector façade contract.
- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) — supersedes phantom `0054-superfan-attribution-model`.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — root invariant : never fabricate a score on transient failure.
- [tests/unit/services/strategy-presentation/overton-real-signal.test.ts](../../tests/unit/services/strategy-presentation/overton-real-signal.test.ts) — Vitest mock pattern precedent (Story 3.6).
- [_bmad-output/planning-artifacts/epics.md L875-890](../planning-artifacts/epics.md) — Story 4.3 spec verbatim.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7, untouched.
- [tests/unit/governance/phase22-connector-result.test.ts](../../tests/unit/governance/phase22-connector-result.test.ts) — HARD active since Epic 2 Story 2.5 ; this story extends consumption to 2 more handlers — exhaustive switch enforced by tsc.
- [tests/unit/governance/phase22-no-silent-zero.test.ts](../../tests/unit/governance/phase22-no-silent-zero.test.ts) — HARD active for Overton scope ; superfan scope = Story 4.8. This story ships zero `?? 0` / `|| 0` on the new code paths (the legacy `cohortAtJ30: number | null` shape is REPLACED by the OK-arm `cohortSize: number`).

### Testing standards summary

- **Mocked dependencies** : `@/lib/db` + `@/server/services/anubis/providers/crm-provider`. Vitest `vi.fn()` + `vi.mock()` factory pattern. `afterEach` reset to keep tests isolated.
- **Table-driven DEGRADED reasons** : `it.each([...])` for the 4 ConnectorDegradationReason cases — one test definition, four executions.
- **21 new tests** (15 measurement + 6 capture + 2 retirement) — all green.

### Project Structure Notes

**Alignment with unified project structure:**

- Test file co-located with Stories 4.1/4.2 tests under `tests/unit/services/campaign-tracker/`.
- Source edits within existing campaign-tracker service folder — no new directory.
- No new tRPC procedures (the existing `measureDevotionStickinessCohort` + `captureSuperfansFromCampaign` procedures in `routers/campaign-tracker.ts` continue to work — return shape changed but output schema is `z.unknown()`).

**Detected variances / conflicts:**

- **Behavior change : defensive cases now return INSUFFICIENT_DATA instead of throwing.** Documented above. Considered a structural improvement (consumer boundary now P22-1-safe), not a regression.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L875-890 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0079-external-signal-connectors-credentials-vault.md (connector façade contract)](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md (supersedes phantom 0054)](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (root invariant)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: src/server/services/anubis/providers/crm-provider.ts (Story 2.3 façade)](../../src/server/services/anubis/providers/crm-provider.ts)
- [Source: src/domain/connector-result.ts (Story 1.3 type)](../../src/domain/connector-result.ts)
- [Source: _bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md](./4-1-attribution-result-discriminated-union.md)
- [Source: _bmad-output/implementation-artifacts/4-2-pure-ts-logistic-regression-roc-auc-rmse.md](./4-2-pure-ts-logistic-regression-roc-auc-rmse.md)

### Previous story intelligence

- **Story 4.1 + 4.2 (`AttributionResult` + regression)** — direct architectural precedents for the discriminated-union return pattern. `CohortRetentionMeasurement` mirrors `AttributionResult.OK | INSUFFICIENT_DATA` ; `SuperfanInsufficientReason` is the typed-cause alphabet equivalent of `AttributionResult.INSUFFICIENT_DATA.minSamplesRequired/samplesAvailable`.
- **Story 2.3 (CRM connector façade)** — direct dependency, commit `02a488a`. `fetchCohortSignal` + `CrmCohortSignal` + ConnectorResult contract.
- **Story 1.3 (`ConnectorResult<T>`)** — type backbone consumed by the exhaustive switch.
- **Story 3.6 (`OvertonRealSignal`)** — mock pattern precedent for Vitest `vi.mock()` + `vi.fn()` factory.

### Git intelligence summary

Last 5 commits on `main` (per `git log --oneline -5`) :

```
82e62d0 feat(seshat): phase 23 story 4.2 pure-TS logistic regression + ROC AUC + RMSE
edbe5ec governance(seshat): phase 23 story 4.1 AttributionResult discriminated union (P22-2)
bd7f5a2 docs(governance): phase 23 autopilot handoff 2026-05-28 02:26 (Epic 3 closed)
cc45de4 docs(governance): phase 23 Epic 3 closure doc-sync (8/8 shipped)
9370b99 test(governance): phase 23 story 3.8 activate HARD phase22-no-silent-zero (Epic 3 CLOSED)
```

Pattern observed : Phase 23 Epic 4 progresses via per-structural-concern commits. Story 4.3 is a tight refactor (2 handlers + 1 registry + 1 test file) — shipped in a single commit per the project's cadence.

### Project context reference

This story moves 2 of the 6 pivot sub-clusters (`superfan.stickiness` + `superfan.crmCapture`) off the Phase 19 Anubis-direct path onto the Phase 23 Credentials-Vault façade with exhaustive ConnectorResult switching. After this story, the cohort-retention signal is defensible cliente — every retention rate traces to a typed LIVE observation from the CRM façade, never a swallow-to-zero on connector failure.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) ; for the connector façade contract see [ADR-0079](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md).

## Story completion status

Status: **review**

NEFER context engine analysis completed — Story 2.3 CRM façade signature verified (`fetchCohortSignal(operatorId, brandId, window) → ConnectorResult<CrmCohortSignal>`) ; ConnectorResult contract from Story 1.3 consumed exhaustively ; ADR-0079 façade pattern honored (never throw across boundary) ; ADR-0081 phantom-supersede retirement applied per P22-7 (same commit as files touched). All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona in autopilot mode per `_bmad-output/autopilot-phase-23.md` + `_nefer-facts.md`.

### Debug Log References

- AC #1 (import `crmProvider.fetchCohortSignal` + exhaustive switch) — shipped : see [superfan-economy.ts §"Sous-cluster superfan.stickiness"](../../src/server/services/campaign-tracker/superfan-economy.ts) — `import { fetchCohortSignal, type CrmCohortWindow } from "@/server/services/anubis/providers/crm-provider"` + switch on `signal.state` with three arms LIVE/DEFERRED/DEGRADED, no default.
- AC #2 (LIVE → OK with three values) — shipped : `CohortRetentionMeasurement.OK` arm carries J30/J90/J180 snapshots.
- AC #3 (DEFERRED/DEGRADED → INSUFFICIENT_DATA, no fabricated value) — shipped : `mapDegradationToReason` covers all 4 ConnectorDegradationReason flavours ; INSUFFICIENT_DATA branch never carries a fabricated retentionRate.
- AC #4 (crmCapture similarly wired) — shipped : `captureSuperfansFromCampaign` uses the same exhaustive switch ; returns `CrmCaptureMeasurement` discriminated union with `localEvangelistCount` always preserved.
- AC #5 (capability-state lifts + childAdr: "0081") — shipped : `superfan.stickiness` + `superfan.crmCapture` + `superfan.attribution` all reference `childAdr: "0081"` ; P22-7 retires the dangling `0054-superfan-attribution-model.md` reference.
- AC #6 (Vitest covers all 3 connector states) — shipped : 21 tests in `superfan-economy.connector.test.ts` — `it.each` table-driven for 4 DEGRADED reasons × 2 functions + LIVE + DEFERRED + defensive + retirement assertions.

### Completion Notes List

- **AC #1–6 all shipped** in commit `<filled at commit time>`. Refactor preserves the existing tRPC procedure signatures (output schema is `z.unknown()` so client gets the new discriminated union shape without TS breakage).
- **Defensive returns replace `throw`** — `CAMPAIGN_NOT_FOUND` + `TENANT_MISMATCH` now return INSUFFICIENT_DATA branches instead of throwing. This is a behavior change but structurally aligned with the P22-1 "façade never throws across the consumer boundary" invariant.
- **Two `*AttributionResult` shapes still coexist** — Story 4.1's `AttributionResult` (Phase 23 calibration, `superfan-attribution.ts`) and Phase 19's `SuperfanAttributionResult` (LTV heuristic, `superfan-economy.ts:types.ts:201`). Story 4.3 does NOT unify them ; the Phase 19 `recomputeSuperfanAttribution` function preserves its existing behavior with a docblock pointer to the Phase 23 calibration path.
- **Cap APOGEE 7/7 preserved** — Layer 4 service code, no Neter touched, no new dep added.
- **Manual-first parity (ADR-0060)** : n/a — cohort retention is a CRM-side measurement, no operator can manually input "what fraction of customers are still engaged at J+30" without re-implementing the connector. The peer manual mode for the calibration aggregate lives in Story 4.5 + Epic 6 Story 6.5.
- **Mission link** : 2 of 6 pivot sub-clusters now consume real CRM signal with defensible LIVE/DEFERRED/DEGRADED discrimination. The closure-roadmap target #1 (closure criterion : "6 sub-clusters at MVP/PRODUCTION") moves another notch closer — `superfan.stickiness` + `superfan.crmCapture` MVP-confirmed with ADR-0081 promotion path declared.

### File List

- **EDIT** [src/server/services/campaign-tracker/superfan-economy.ts](../../src/server/services/campaign-tracker/superfan-economy.ts) — refactored : `measureDevotionStickinessCohort` + `captureSuperfansFromCampaign` rewired to `crmProvider.fetchCohortSignal` with exhaustive ConnectorResult switching ; 2 new discriminated-union return types (`CohortRetentionMeasurement` + `CrmCaptureMeasurement`) ; 1 typed-cause alphabet (`SuperfanInsufficientReason`). Phase 19 `recomputeSuperfanAttribution` heuristic preserved with docblock pointer to the Phase 23 calibration path.
- **EDIT** [src/server/services/campaign-tracker/capability-state.ts](../../src/server/services/campaign-tracker/capability-state.ts) — updated 3 sub-cluster entries (description + degradationCodes + `childAdr: "0081"`) ; retired dangling `0054-superfan-attribution-model.md` ref per P22-7.
- **NEW** [tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts](../../tests/unit/services/campaign-tracker/superfan-economy.connector.test.ts) — 21 tests : 15 measurement state coverage + 6 capture state coverage + 2 P22-7 retirement assertions. Vitest `vi.mock()` factory pattern for Prisma + CRM façade.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.12 entry.
- **NEW** [_bmad-output/implementation-artifacts/4-3-cohort-retention-crm-connector.md](./4-3-cohort-retention-crm-connector.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.3 shipped — `measureDevotionStickinessCohort` + `captureSuperfansFromCampaign` refactored to consume `crmProvider.fetchCohortSignal` (Story 2.3 façade) with exhaustive ConnectorResult switching. 2 new discriminated-union return types. `superfan.stickiness` + `superfan.crmCapture` + `superfan.attribution` capability-state entries reference `childAdr: "0081"` ; dangling `0054-superfan-attribution-model.md` ref retired per P22-7. 21 new Vitest tests covering all 3 connector states + 4 DEGRADED reasons + defensive cases + retirement assertions. `tsc --noEmit` clean ; 57/57 campaign-tracker tests passing. Cap APOGEE 7/7 preserved. Phase 23 Epic 4 progress 2/8 → 3/8. | NEFER (Claude Opus 4.7) |
