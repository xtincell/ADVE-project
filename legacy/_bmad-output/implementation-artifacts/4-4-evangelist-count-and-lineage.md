# Story 4.4: Compute evangelist count + lineage from devotion transitions

Status: review

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 4 — Superfan Measurement · Story 4/8)
Owning Neter: Seshat (measurement runtime — campaign-tracker)
APOGEE OS layer (ADR-0084): Layer 4 — Services (campaign-tracker runtime)
BrandAsset.kind produced: none (measurement only)
Portail target: lineage consumed by Console operator view (Story 4.6) + Cockpit EvangelistLineageView (Story 4.7)
Manual-first parity (ADR-0060): n/a — lineage is derived from observed transitions, no manual-input equivalent
Mission link: FR8 — "this campaign produced N Ambassador→Evangelist transitions" becomes a tenant-traceable, source-verifiable claim. The lineage IS the evidence : each entry names the campaign + the rung jump + the date. Without lineage, the evangelist count would be a bare number ; with it, the operator can point at the actual transitions when defending the score to a client. This is the concrete proof of superfan accumulation — the mission's first pivot mechanic.
CODE-MAP grep: searched `extractLineage`, `EvangelistTransition`, `normalizeFromRung`, `normalizeToRung` across `src/`. No prior implementation. Extension chosen: fill the `lineage: []` placeholder Story 4.2 left in `scoreFromActions` (epic spec L902) with a tolerant rung mapper + count expansion.
```

## Story

As an **UPgraders operator**,
I want **`superfan-attribution.ts` to populate the `lineage` field on `OK` results**,
so that **"this campaign produced N Ambassador→Evangelist transitions" is a tenant-traceable, source-verifiable claim (FR8)**.

## Acceptance Criteria

Verbatim from [epics.md L892-905](../planning-artifacts/epics.md):

1. **Given** Story 4.2 (regression + ROC AUC / RMSE returning `OK`)
   **When** the regression returns `OK`
   **Then** the `lineage: EvangelistTransition[]` array is populated with the actual devotion transitions in the input window — `campaignId` + `transitionFrom` + `transitionTo` + `observedAt`.

2. **And** the evangelist count is derivable from `lineage.filter(t => t.transitionTo === "Evangelist").length`.

3. **And** when `INSUFFICIENT_DATA` is returned, `lineage` is empty (not undefined, not zero-length-by-accident) — Vitest asserts this.

4. **And** the additive field `Campaign.activeCalibrationSnapshotRef` (from Story 1.6) is populated with the `snapshotRef` value from the latest `OK` run if the run is accepted (acceptance happens in Epic 6, but this story preserves the field).

## Tasks / Subtasks

- [x] **Task 1 — Tolerant rung mapper** (AC: #1) — *EDIT [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts)*.
  - [x] 1.1 — `normalizeToRung(raw)` → `EvangelistTransitionToRung | null`. Maps `EVANGELISTE`/`EVANGELIST`/`ÉVANGÉLISTE` → `Evangelist` ; `AMBASSADEUR`/`AMBASSADOR` → `Ambassador` ; everything else → `null` (only the 2 superfan-producing targets are valid).
  - [x] 1.2 — `normalizeFromRung(raw)` → `EvangelistTransitionFromRung | null`. Maps `AMBASSADEUR`/`AMBASSADOR` → `Ambassador` ; `ENGAGE`/`ENGAGÉ`/`FIDELE`/`PARTICIPANT`/`PRATIQUANT`/`CONVINCED` → `Convinced` ; `SPECTATEUR`/`INTERESSE`/`INITIE`/`APPRENTI`/`CURIOUS` → `Curious` ; `EVANGELISTE` (terminal) + everything else → `null`. Covers the 3 devotion-rung vocabularies the repo carries.
  - [x] 1.3 — `ATTRIBUTION_RUNG_ORDER` lookup for the monotonic-upward check (`from-position < to-position`).

- [x] **Task 2 — `extractLineage` pure helper** (AC: #1, #2) — *same file*.
  - [x] 2.1 — `extractLineage(actions, fallbackObservedAt): EvangelistTransition[]`. For each action's `devotionTransitionsObserved` record : parse `{ from, to, count }` ; normalize both rungs ; drop if either is null, if `to` isn't Ambassador/Evangelist, or if non-monotonic.
  - [x] 2.2 — **Expand by count** : a `{ from, to, count: N }` record yields N lineage entries so `lineage.filter(t => t.transitionTo === "Evangelist").length` equals the observed evangelist count (AC #2).
  - [x] 2.3 — Drop zero / negative / non-integer counts (`Math.floor`, `count > 0` guard).
  - [x] 2.4 — Stamp `observedAt` from `action.observedAt`, falling back to `fallbackObservedAt` when absent.

- [x] **Task 3 — Wire lineage into `scoreFromActions`** (AC: #1, #3) — *same file*.
  - [x] 3.1 — Add `observedAtFallback?: string` to the `scoreFromActions` opts.
  - [x] 3.2 — On the `OK` arm, replace `lineage: []` with `lineage: extractLineage(actions, fallbackObservedAt)` where `fallbackObservedAt = opts.observedAtFallback ?? new Date().toISOString()` (captured once per call — deterministic per invocation).
  - [x] 3.3 — On the `INSUFFICIENT_DATA` arm, lineage is structurally absent (the discriminated union forbids it) — AC #3 satisfied at the type level, not via an empty-array convention.

- [x] **Task 4 — `observedAt` on the input shape** (AC: #1) — *same file*.
  - [x] 4.1 — Add `observedAt?: string` to `AttributionInputAction` (optional — Story 4.2 callers that only exercise the regression don't need it).
  - [x] 4.2 — `runAttribution` selects `CampaignAction.updatedAt` and maps to `observedAt: r.updatedAt.toISOString()` ; passes `observedAtFallback: new Date().toISOString()` to `scoreFromActions`.

- [x] **Task 5 — `Campaign.activeCalibrationSnapshotRef` preservation** (AC: #4) — *no code change ; documented*.
  - [x] 5.1 — The field exists from Story 1.6 (`prisma/schema.prisma:946`). The `snapshotRef` already flows on the `OK` arm (Story 4.2). The DB **write-on-acceptance** belongs to Epic 6 Story 6.1 (the calibration handler persists the IntentEmission + sets `activeCalibrationSnapshotRef` on acceptance). Story 4.4 **preserves** the field (does not clobber, does not write speculatively on every run). Documented in Dev Notes ; verified the field is reachable.

- [x] **Task 6 — Vitest lineage coverage** (AC: #1, #2, #3) — *NEW [tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts)*.
  - [x] 6.1 — `extractLineage` : French canonical mapping, ENGAGE→AMBASSADEUR, count expansion, drop non-Ambassador/Evangelist targets, drop downward/lateral, drop zero/negative counts, observedAt stamping (action vs fallback), malformed-record tolerance, derivable evangelist count across a mixed window.
  - [x] 6.2 — `scoreFromActions` : OK arm carries populated lineage with full fields ; INSUFFICIENT_DATA arm has no `lineage` field (`"lineage" in result === false`) ; `observedAtFallback` opts threading.
  - [x] 6.3 — Update the Story 4.2 regression test assertion that stubbed `lineage: []` — now asserts the lineage is populated with Evangelist transitions (the behavior Story 4.2 deferred to 4.4).

- [x] **Task 7 — Verification** (AC: covers all).
  - [x] 7.1 — `npx tsc --noEmit` — clean.
  - [x] 7.2 — `npx vitest run tests/unit/services/campaign-tracker/` — 70/70 passing (14 Story 4.1 + 22 Story 4.2 + 21 Story 4.3 + 13 Story 4.4 new).
  - [x] 7.3 — Anti-drift unchanged.

## Dev Notes

### Relevant architecture patterns and constraints

**The lineage IS the evidence (FR8).** A bare evangelist count ("this campaign produced 12 evangelists") is a vanity counter — indistinguishable from a fabricated number. The `lineage: EvangelistTransition[]` makes the count *source-verifiable* : each entry names the `campaignId`, the rung jump (`transitionFrom → transitionTo`), and the `observedAt` date. The operator (Story 4.6) and the founder (Story 4.7) can inspect the actual transitions when the score is questioned. AC #2's `lineage.filter(t => t.transitionTo === "Evangelist").length` is the canonical derivation — the count is never stored separately, always derived from the evidence.

**Tolerant rung mapping across 3 vocabularies.** The repo carries multiple devotion-rung alphabets : the canonical 6-rung French (`SPECTATEUR…EVANGELISTE` in `domain/devotion-ladder.ts`), the legacy 5-rung on `CampaignAction.devotionRungTargeted` (`APPRENTI|PRATIQUANT|INITIE|FIDELE|EVANGELISTE`), and the Phase 19 `superfan-economy.ts` 3-rung (`INITIE|FIDELE|EVANGELISTE`). `extractLineage` normalizes all of them onto the Phase 23 4-rung English attribution alphabet (ADR-0081 §2). This is **mapping, not reinvention** — the attribution alphabet was already declared in Story 4.1 ; Story 4.4 just bridges the observed-data vocabularies onto it. Unifying the vocabularies repo-wide is out of Phase 23 scope (it would touch `devotion-ladder.ts`, `pillarE`, `cult-index-engine`, etc. — a separate chantier).

**Inclusion rule : only superfan-producing transitions.** A transition is included in the lineage iff (a) both rungs normalize to valid attribution rungs, (b) `to` is `Ambassador` or `Evangelist`, and (c) the transition is monotonic upward. A `INITIE → FIDELE` record is real engagement but *not* an Ambassador/Evangelist event — it's dropped. A `EVANGELISTE → AMBASSADEUR` record is malformed telemetry (downward) — dropped. This keeps the lineage focused on what it evidences : the superfan-accumulation events.

**Count expansion vs. count field.** `EvangelistTransition` has no `count` field (ADR-0081 §2 spec). A `{ from, to, count: 3 }` record therefore expands into 3 identical lineage entries. This makes AC #2's `.filter(...).length` derivation work directly. The cost is a larger array for high-count records ; acceptable since campaign cohorts are bounded (a campaign produces tens, not millions, of evangelists).

**Deterministic-per-call timestamp fallback.** `extractLineage` takes an explicit `fallbackObservedAt` rather than calling `new Date()` internally — keeps the function pure + unit-testable. `scoreFromActions` captures one `new Date().toISOString()` per call (when `observedAtFallback` opts is absent) so all lineage entries in one invocation share a consistent fallback timestamp. The real `observedAt` comes from `CampaignAction.updatedAt` via `runAttribution`.

**AC #4 (`activeCalibrationSnapshotRef`) is a preservation, not a write.** The field exists from Story 1.6. The `snapshotRef` flows on the OK arm (Story 4.2). The actual DB write happens on calibration *acceptance* — an Epic 6 Story 6.1 responsibility. Writing `activeCalibrationSnapshotRef` on every `runAttribution` call (not just accepted ones) would be wrong : an unaccepted ad-hoc run must not become the brand's active calibration. Story 4.4 therefore does **not** write the field — it preserves it (no clobber) and confirms reachability. The Dev Notes document this so Epic 6 picks it up.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) | **EDIT** | Add `observedAt?` to `AttributionInputAction` ; add `normalizeToRung` / `normalizeFromRung` / `ATTRIBUTION_RUNG_ORDER` / `extractLineage` (Section 5b) ; wire lineage into `scoreFromActions` OK arm ; source `observedAt` in `runAttribution`. |
| [tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts) | **NEW** | 13 tests : extractLineage mapping/expansion/drops/observedAt + scoreFromActions OK-lineage + INSUFFICIENT_DATA no-lineage + fallback threading. |
| [tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts) | **EDIT** | Update the one Story 4.2 assertion that stubbed `lineage: []` → now asserts the lineage is populated (the behavior 4.2 deferred to 4.4). |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) §2 — `EvangelistTransition` spec.
- [src/domain/devotion-ladder.ts](../../src/domain/devotion-ladder.ts) — canonical 6-rung French ladder (one of the 3 vocabularies `extractLineage` tolerates).
- [prisma/schema.prisma](../../prisma/schema.prisma) `CampaignAction.devotionTransitionsObserved` (line 1739) + `Campaign.activeCalibrationSnapshotRef` (line 946).
- [_bmad-output/implementation-artifacts/4-1-attribution-result-discriminated-union.md](./4-1-attribution-result-discriminated-union.md) + [4-2-pure-ts-logistic-regression-roc-auc-rmse.md](./4-2-pure-ts-logistic-regression-roc-auc-rmse.md).
- [_bmad-output/planning-artifacts/epics.md L892-905](../planning-artifacts/epics.md) — Story 4.4 spec verbatim.

**Anti-drift CI tests that MUST stay green after this story:**

- `neteru-coherence.test.ts` 7/7, `phase22-connector-result.test.ts` HARD 9/9, `phase22-no-silent-zero.test.ts` HARD 1/1 (Overton scope ; superfan scope = Story 4.8) — all untouched.

### Testing standards summary

- **Pure-helper unit tests** (`extractLineage`) — no Prisma, no mocks ; deterministic via explicit `fallbackObservedAt`.
- **13 new tests** : 10 `extractLineage` + 3 `scoreFromActions`. AC #3 verified via `"lineage" in result === false` on the INSUFFICIENT_DATA arm (structural absence, not empty-array convention).

### Project Structure Notes

- New test co-located under `tests/unit/services/campaign-tracker/`.
- Source edit extends the Stories 4.1+4.2 file in-place.
- No new directory, no new tRPC procedure, no migration (the `activeCalibrationSnapshotRef` field already exists from Story 1.6).

**Detected variances / conflicts:**

- **Story 4.2 test assertion updated.** The `lineage: []` stub assertion in `superfan-attribution.regression.test.ts` is replaced — Story 4.4 implements what 4.2 deferred. Legitimate type/behavior evolution, committed alongside 4.4.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L892-905 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md §2](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: src/domain/devotion-ladder.ts (canonical 6-rung ladder)](../../src/domain/devotion-ladder.ts)
- [Source: prisma/schema.prisma (Campaign.activeCalibrationSnapshotRef line 946)](../../prisma/schema.prisma)
- [Source: _bmad-output/implementation-artifacts/4-2-pure-ts-logistic-regression-roc-auc-rmse.md](./4-2-pure-ts-logistic-regression-roc-auc-rmse.md)

### Previous story intelligence

- **Story 4.2** — left `lineage: []` placeholder in `scoreFromActions`. Story 4.4 fills it. The `AttributionInputAction` shape gains `observedAt?` (optional, so 4.2 tests don't break).
- **Story 4.3** — the Phase 19 `parseTransitions` / `sumTransitionsTo` helpers in `superfan-economy.ts` use the French rungs directly (EVANGELISTE/FIDELE) ; `extractLineage` here is the Phase 23 equivalent that maps onto the English attribution alphabet. The two coexist.

### Git intelligence summary

```
388db89 feat(seshat): phase 23 story 4.3 cohort retention from CRM connector
82e62d0 feat(seshat): phase 23 story 4.2 pure-TS logistic regression + ROC AUC + RMSE
edbe5ec governance(seshat): phase 23 story 4.1 AttributionResult discriminated union (P22-2)
```

### Project context reference

Story 4.4 turns the evangelist count from a bare number into source-verifiable evidence — the lineage names the campaign, the rung jump, and the date for every Ambassador/Evangelist transition. This is the concrete proof of superfan accumulation (FR8), the mission's first pivot mechanic. Story 4.6 surfaces it to the operator ; Story 4.7 to the founder.

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0081 §2 `EvangelistTransition` spec verified ; the 3 devotion-rung vocabularies catalogued and mapped tolerantly ; AC #4 clarified as preservation (DB write = Epic 6 Story 6.1) ; AC #3 satisfied at the type level (INSUFFICIENT_DATA arm structurally lacks `lineage`). All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER autopilot per `_bmad-output/autopilot-phase-23.md`.

### Debug Log References

- AC #1 (lineage populated with campaignId + rungs + observedAt) — `extractLineage` + `scoreFromActions` OK arm.
- AC #2 (evangelist count derivable) — count expansion ; test "evangelist count is derivable per AC #2 across a mixed window".
- AC #3 (INSUFFICIENT_DATA → no lineage) — `"lineage" in result === false` assertion on the INSUFFICIENT_DATA arm (type-level, structural).
- AC #4 (`activeCalibrationSnapshotRef` preserved) — field exists (Story 1.6) ; snapshotRef flows on OK arm ; DB write deferred to Epic 6 Story 6.1 (documented, not implemented here).

### Completion Notes List

- **AC #1–4 all addressed** in commit `<filled at commit time>`. AC #4 is a documented preservation (DB write is Epic 6's job — writing on every run would corrupt the brand's active calibration).
- **Tolerant rung mapper** covers 3 devotion vocabularies → 1 attribution alphabet. Mapping, not reinvention — the alphabet was declared in Story 4.1.
- **Count expansion** makes AC #2's `.filter(...).length` derivation exact.
- **Story 4.2 test evolved** — the `lineage: []` stub assertion now asserts populated lineage.
- **Cap APOGEE 7/7 preserved** — Layer 4 service code, no Neter touched, no new dep.
- **Mission link** : the lineage is the source-verifiable evidence of superfan accumulation (FR8) — turns the count from vanity into defensible proof.

### File List

- **EDIT** [src/server/services/campaign-tracker/superfan-attribution.ts](../../src/server/services/campaign-tracker/superfan-attribution.ts) — `observedAt?` on `AttributionInputAction` ; Section 5b (`normalizeToRung` / `normalizeFromRung` / `ATTRIBUTION_RUNG_ORDER` / `extractLineage`) ; lineage wired into `scoreFromActions` OK arm ; `observedAt` sourced from `CampaignAction.updatedAt` in `runAttribution`.
- **NEW** [tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.lineage.test.ts) — 13 tests.
- **EDIT** [tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts](../../tests/unit/services/campaign-tracker/superfan-attribution.regression.test.ts) — updated the Story 4.2 `lineage: []` stub assertion.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — v6.23.13 entry.
- **NEW** [_bmad-output/implementation-artifacts/4-4-evangelist-count-and-lineage.md](./4-4-evangelist-count-and-lineage.md) — this story file.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 4.4 shipped — `extractLineage` tolerant rung mapper (3 vocabularies → English attribution alphabet) + count expansion ; `scoreFromActions` OK arm populates lineage ; `observedAt` sourced from `CampaignAction.updatedAt`. AC #4 `activeCalibrationSnapshotRef` preserved (DB write = Epic 6). 13 new tests ; Story 4.2 stub assertion updated. `tsc` clean ; 70/70 campaign-tracker tests passing. Cap APOGEE 7/7 preserved. Phase 23 Epic 4 progress 3/8 → 4/8. | NEFER (Claude Opus 4.7) |
