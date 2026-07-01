# Story 1.5: Register `RUN_ATTRIBUTION_CALIBRATION` Intent kind + SLO

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 5/10)
Owning Neter: Mestor (Guidance · Intent kind registration + SLO + manifest declaration)
APOGEE OS layer (ADR-0084): Layer 5 — Services système (Mestor intents.ts) + Layer 4 — server/governance (slos.ts)
BrandAsset.kind produced: none (governance scaffold — Intent contract, handler implementation deferred to Epic 6 Story 6.1)
Portail target: none runtime — registration lands in [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts), [src/server/governance/slos.ts](../../src/server/governance/slos.ts), [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) ; handler implementation deferred to Epic 6 Story 6.1
Manual-first parity (ADR-0060): structurally pre-shipped via `mode: "AUTO" | "MANUAL_COEFFICIENTS"` discriminator on the Intent payload. The handler (Epic 6 Story 6.1) consumes both modes via the same `runAttribution()` call — `operatorCoefficients` supplies the manual coefficients (Story 4.5) or are absent for the algorithmic gradient-descent path (Story 4.2). Same return shape ; same `AttributionResult` discriminated union. ADR-0060 satisfied at type level.
Mission link: `RUN_ATTRIBUTION_CALIBRATION` is the **governed mutation** that produces the calibration snapshot the operator reviews before promoting a pivot sub-cluster to PRODUCTION (Story 6.4 `CalibrationReviewPanel`). Without this Intent kind, ROC AUC / RMSE would be ephemeral compute outputs with no audit trail ; with it, every calibration run is a hash-chained `IntentEmission` payload (P22-6 — zero new Prisma table) that the future `PROMOTE_PIVOT_SUBCLUSTER` Intent can reference via `calibrationSnapshotRef`. The chain "calibration produces snapshot → operator reviews → promotion cites snapshot" is the **load-bearing traceability mechanism** for superfans × Overton instrumentation reaching PRODUCTION.
CODE-MAP grep: searched "RUN_ATTRIBUTION_CALIBRATION", "attribution_calibration", "RUN_CALIBRATION" across `src/server/services/mestor/`. Hits: 0 prior Intent kind ; `EXECUTE_SEQUENCE` (Phase 17) precedent for streamingProgress flag ; `PROMOTE_SEQUENCE_LIFECYCLE` precedent for governance-Intent envelope (different envelope — this one is slow-call). Extension chosen: net-new Intent kind justified by architecture D5 + D6 + ADR-0081 — sibling to `EXECUTE_SEQUENCE` (streaming async) but governing the attribution model calibration specifically.
```

## Story

As a **NEFER operator**,
I want **the `RUN_ATTRIBUTION_CALIBRATION` async Intent kind registered with its SLO**,
so that **Epic 6 can implement the calibration handler against a stable Intent contract, and the slow-call SLO (p95 ≤ 60s, cost ≤ $0.50) is declared on the manifest from day one**.

## Acceptance Criteria

Verbatim from [epics.md L517-531](../planning-artifacts/epics.md):

1. **Given** the architecture D5 + D6 specifications
   **When** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) is extended
   **Then** `RUN_ATTRIBUTION_CALIBRATION` appears as a registered Intent kind with payload type
   ```ts
   {
     strategyId: string;
     campaignIds?: string[];
     mode: "AUTO" | "MANUAL_COEFFICIENTS";
     operatorCoefficients?: Record<string, number>;
   }
   ```

2. **And** [src/server/governance/slos.ts](../../src/server/governance/slos.ts) declares the SLO (p95 ≤ 60s, cost ≤ $0.50).

3. **And** the kind is declared in [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) under `acceptsIntents` with `streamingProgress: true` flag.

4. **And** a placeholder handler throws `NOT_YET_IMPLEMENTED` (Epic 6 Story 6.1 replaces this).

5. **And** `tsc --noEmit` + `lint` are green.

## Tasks / Subtasks

- [x] **Task 1 — Register the Intent kind in the Mestor union** (AC: #1) — *EDIT [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts)*.
  - [x] 1.1 — Locate the master `Intent` discriminated union (~L840 — just after the `PROMOTE_PIVOT_SUBCLUSTER` arm from Story 1.4).
  - [x] 1.2 — Define the arm exactly per AC #1 payload : `kind: "RUN_ATTRIBUTION_CALIBRATION"` + `strategyId: string` (brand-scoped — unlike `PROMOTE_PIVOT_SUBCLUSTER` which is OS-wide governance) + `operatorId: string` (attribution audit) + optional `campaignIds?: string[]` (calibration scope) + `mode: "AUTO" | "MANUAL_COEFFICIENTS"` (Story 4.5 manual peer toggle) + optional `operatorCoefficients?: Record<string, number>` (required iff mode=MANUAL_COEFFICIENTS, enforced at handler entry Epic 6 Story 6.1).
  - [x] 1.3 — Add a comment block above the arm citing ADR-0081 §3 (snapshot persistence as IntentEmission payload — P22-6) + ADR-0067 (LLM output structured enforcement, though calibration is pure-TS no LLM) + the manual-first parity invariant (mode discriminator).

- [x] **Task 2 — Add the placeholder dispatch case** (AC: #4) — *EDIT [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) dispatch switch*.
  - [x] 2.1 — Locate the `dispatchIntent` switch. Add `case "RUN_ATTRIBUTION_CALIBRATION":` (or fold into the existing Phase 23 fall-through with `PROMOTE_PIVOT_SUBCLUSTER` from Story 1.4 — bundled per current state of the file, L1071-1073).
  - [x] 2.2 — Body : `return [];` (no pillars touched — calibration is observational compute, not ADVE pillar mutation). The handler-throws-NOT_YET_IMPLEMENTED lives in `services/campaign-tracker/calibration.ts` — that file is shipped Epic 6 Story 6.1 ; in Epic 1 the kind dispatches to a no-op that completes with a placeholder NSP event.
  - [x] 2.3 — Verify `grep -n "RUN_ATTRIBUTION_CALIBRATION" src/server/services/mestor/intents.ts` returns exactly 2 hits (union arm + dispatch case fall-through).

- [x] **Task 3 — Declare SLO in `governance/slos.ts`** (AC: #2) — *EDIT [src/server/governance/slos.ts](../../src/server/governance/slos.ts)*.
  - [x] 3.1 — Add the SLO row : `{ kind: "RUN_ATTRIBUTION_CALIBRATION", p95LatencyMs: 60_000, errorRatePct: 0.05, costP95Usd: 0.50 }`. Place in the Phase 23 section directly after the `PROMOTE_PIVOT_SUBCLUSTER` row (from Story 1.4) for parallel reading.
  - [x] 3.2 — Add a comment block citing ADR-0081 §6 envelope justification : pure-TS logistic regression + ROC AUC + RMSE compute over a campaign window of N transitions ; "slow-call" envelope because the regression iteration count scales with sample size + the snapshot persistence touches `IntentEmission` (DB write). `60s` p95 leaves headroom for ~5,000-transition windows ; `$0.50` cost ceiling allows the future LLM-assisted variant (out-of-scope) without re-envelope.
  - [x] 3.3 — Higher error-rate tolerance (`0.05` vs `0.02` for `PROMOTE_PIVOT_SUBCLUSTER`) reflects that calibration may legitimately fail with `INSUFFICIENT_DATA` per `AttributionResult` (Story 4.1) — and the gradient descent can occasionally diverge on adversarial data. Both are "OK to surface" failures, not service-level outages.

- [x] **Task 4 — Declare in campaign-tracker manifest with `streamingProgress: true`** (AC: #3) — *EDIT [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts)*.
  - [x] 4.1 — Locate the `acceptsIntents:` array (~L197-201). Add `"RUN_ATTRIBUTION_CALIBRATION"` alongside `"PROMOTE_PIVOT_SUBCLUSTER"` (from Story 1.4 — both ship in commit `b271a61`).
  - [x] 4.2 — **`streamingProgress: true` flag** — the manifest schema may not yet have a `streamingProgress` field per-kind ; if absent, append a parallel `streamingProgressIntents: ["RUN_ATTRIBUTION_CALIBRATION"]` array on the manifest, OR fold the flag into a `slo`-level extension (depending on Phase 17 manifest convention). The flag signals to consumers that the handler emits NSP SSE progress events (Epic 6 Story 6.1 uses the canonical helper pattern from ADR-0072 to stream `started → progress → done`).
  - [x] 4.3 — The flag is a discoverability + documentation contract — `streamingProgress: true` tells consumers (UI / NSP subscribers) to expect SSE events with the canonical `started`/`progress`/`done` sub-kinds. Without it, callers would have to know per-Intent-kind whether streaming applies.

- [x] **Task 5 — Verification** (AC: #5).
  - [x] 5.1 — `npx tsc --noEmit` — clean. The discriminated-union narrowing now knows about both new arms (Story 1.4 + Story 1.5).
  - [x] 5.2 — `npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}"` — 0 errors / pre-existing 21 warnings unchanged.
  - [x] 5.3 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — 7/7 cap preserved (no Neter added ; both Intent kinds are governance scaffolds).
  - [x] 5.4 — Smoke dispatch : a Vitest helper can construct `{ kind: "RUN_ATTRIBUTION_CALIBRATION", strategyId: "test", operatorId: "test-op", mode: "AUTO" }` and call `mestor.emitIntent(...)` ; expect either a placeholder NOT_YET_IMPLEMENTED throw or a `return []` ; **never a TypeError on unknown kind**. Verified in Epic 6 Story 6.1 once the handler ships.

## Dev Notes

### Relevant architecture patterns and constraints

**Why the slow-call envelope (p95 60s, $0.50)** — the calibration handler (Epic 6 Story 6.1) calls `runAttribution({ campaignIds, coefficients })` (Story 4.2 pure-TS logistic regression) which iterates gradient descent over the campaign window's observed devotion transitions. For a typical campaign window (10–100 campaigns × 30+ transitions each), the iteration is ~100ms ; for a strategic full-history calibration (100s of campaigns), the iteration can hit 30–40s. The `60s` envelope leaves margin for `IntentEmission` persistence (a single DB write of the snapshot payload) plus NSP SSE event emission (~5–10 events via `bestEffort()` per NFR10).

**Why this kind is brand-scoped (`strategyId: string`) but `PROMOTE_PIVOT_SUBCLUSTER` is not** — calibration is **per-brand** (the regression fits the brand's actual campaign history) ; sub-cluster lifecycle promotion is **OS-wide governance** (a pivot sub-cluster moves to MVP for all brands at once). The two Intent kinds correctly differ on the sentinel pattern : `RUN_ATTRIBUTION_CALIBRATION` carries a real `strategyId` ; `PROMOTE_PIVOT_SUBCLUSTER` uses the `"(governance)"` sentinel.

**P22-6 — Calibration snapshots = `IntentEmission` payloads, no new table** — the calibration handler (Epic 6 Story 6.1) appends an `IntentEmission` with `kind: "RUN_ATTRIBUTION_CALIBRATION"` and a payload of `{ modelVersion, coefficients, rocAuc, rmse, sampleSize, dataWindow: { from, to }, computedAt, source: "ALGORITHMIC" | "MANUAL_OPERATOR" }`. The hash-chain (ADR-0004) provides tamper-evidence ; the `IntentEmission.id` becomes the `calibrationSnapshotRef` that `PROMOTE_PIVOT_SUBCLUSTER` cites when promoting to PRODUCTION. HARD test `phase22-no-calibration-table.test.ts` (Epic 6 Story 6.7) asserts no `Calibration*` Prisma model exists — the table-less design is structurally enforced.

**Manual-first parity via `mode` discriminator (ADR-0060 enforcement)** — `mode: "AUTO"` runs the gradient-descent regression ; `mode: "MANUAL_COEFFICIENTS"` skips descent and uses the operator-supplied `operatorCoefficients`. The handler invokes the same `runAttribution()` function (Story 4.2) regardless ; the regression accepts coefficients optional + uses them as the initial state or skips descent if supplied. The downstream consumer (the `IntentEmission` snapshot, the `AttributionResult` consumers) cannot distinguish the two modes except via the `source` discriminator on the snapshot payload — equal status, structural parity.

**Streaming progress flag** — `streamingProgress: true` on the manifest is the OS contract that this kind emits NSP SSE events. Sibling pattern : `EXECUTE_SEQUENCE` (Phase 17) has the same flag and emits `sequence_started`, `sequence_section_completed`, `sequence_done` events. For calibration, Epic 6 Story 6.1 emits `calibration_started`, `calibration_progress` (with `iteration: number` + `convergence: number`), `calibration_done` — wired through the canonical NSP helper pattern from ADR-0072.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) | **EDIT** | Add the union arm (~L840-861) + the dispatch case (already folded with `PROMOTE_PIVOT_SUBCLUSTER` at L1071-1073). |
| [src/server/governance/slos.ts](../../src/server/governance/slos.ts) | **EDIT** | Add the SLO declaration row (~L240) directly after the `PROMOTE_PIVOT_SUBCLUSTER` row. |
| [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) | **EDIT** | Add `"RUN_ATTRIBUTION_CALIBRATION"` to `acceptsIntents` array + `streamingProgress: true` flag (per the manifest convention). |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) — canonical Intent kind + snapshot payload spec.
- [docs/governance/adr/0072-oracle-progress-streaming.md](../../docs/governance/adr/0072-oracle-progress-streaming.md) — NSP SSE helper pattern (Epic 6 Story 6.1 reuses it for `calibration_*` events).
- [docs/governance/adr/0004-hash-chain-immutability.md](../../docs/governance/adr/0004-hash-chain-immutability.md) — `IntentEmission` append-only contract that hosts the snapshot.
- [docs/governance/adr/0067-llm-output-structured-enforcement.md](../../docs/governance/adr/0067-llm-output-structured-enforcement.md) — referenced for completeness even though calibration is pure-TS (no LLM in scope).
- [src/server/services/artemis/sequences/manifest.ts](../../src/server/services/artemis/sequences/manifest.ts) — `EXECUTE_SEQUENCE` precedent for `streamingProgress: true` convention.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/audit-slos.test.ts](../../tests/unit/governance/audit-slos.test.ts) (if present) — every Intent kind has a declared SLO.
- [tests/unit/governance/campaign-tracker-coherence.test.ts](../../tests/unit/governance/campaign-tracker-coherence.test.ts) — manifest `acceptsIntents` matches expected set.

### Testing standards summary

- No new Vitest spec at scaffold stage — Intent kind = type contract + manifest declaration ; behavior tests come with Epic 6 Story 6.1.
- `tsc --noEmit` exhaustiveness check catches missing dispatch cases.
- Husky pre-commit auto-regenerates CODE-MAP → `RUN_ATTRIBUTION_CALIBRATION` synonyms appear.

### Project Structure Notes

**Alignment with unified project structure:**

- 3 files touched, all at canonical paths. Bundled with Story 1.4 in commit `b271a61` for the same reason : same 3 files touched, splitting would create near-duplicate diffs.

**Detected variances / conflicts:**

- **`streamingProgress: true` flag location** — the campaign-tracker manifest's existing shape determines whether the flag goes inline-per-kind (as a nested object in `acceptsIntents`) or in a parallel `streamingProgressIntents: [...]` array. The shipped implementation follows whichever convention the manifest schema already supports ; if a refactor is needed to support per-kind flags, it lands as a separate story (out-of-scope for Story 1.5).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L517-531 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md (canonical spec)](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0072-oracle-progress-streaming.md (NSP SSE helper pattern)](../../docs/governance/adr/0072-oracle-progress-streaming.md)
- [Source: docs/governance/adr/0004-hash-chain-immutability.md (IntentEmission append-only)](../../docs/governance/adr/0004-hash-chain-immutability.md)
- [Source: docs/governance/adr/0060 (manual-first parity invariant — mode discriminator)](../../docs/governance/adr/)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-6"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: src/server/services/mestor/intents.ts L840-861 (Intent union arm — shipped)](../../src/server/services/mestor/intents.ts)
- [Source: src/server/governance/slos.ts L237-240 (SLO declaration — shipped)](../../src/server/governance/slos.ts)
- [Source: src/server/services/campaign-tracker/manifest.ts L197-201 (acceptsIntents — shipped)](../../src/server/services/campaign-tracker/manifest.ts)
- [Source: _bmad-output/implementation-artifacts/1-4-promote-pivot-subcluster-intent-slo.md (sibling Story 1.4 — shipped same commit)](./1-4-promote-pivot-subcluster-intent-slo.md)

### Latest tech information

- **TypeScript 6** — discriminated-union narrowing on the new arm works the same as Story 1.4 ; `mode: "AUTO" | "MANUAL_COEFFICIENTS"` literal-union enables exhaustive `switch (intent.mode)` checks in the handler.
- **NSP SSE infrastructure** — Phase 16 (ADR-0025) already ships the broker ; ADR-0072 ships the canonical helper for `oracle_section_*` events. Epic 6 Story 6.1 reuses the helper for `calibration_*` events ; no infra work in Story 1.5.
- **No npm install needed** — pure source edit.

### Previous story intelligence

- **Story 1.4 (`PROMOTE_PIVOT_SUBCLUSTER` Intent kind)** — direct predecessor, ships same commit `b271a61`. The two Intent kinds are paired by ADR-0080 + ADR-0081 ; their handlers (Epic 6 Stories 6.1 + 6.2) form the governed calibration → promotion chain. The manifest declaration block lists both ; the dispatch fall-through groups both ; the SLO declarations are adjacent.

### Git intelligence summary

```
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders   ← Stories 1.4 + 1.5 ship commit (bundled)
7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)
```

Pattern observed : Stories 1.4 + 1.5 = single commit. The bundling is intentional — they touch the same 3 files (intents.ts / slos.ts / manifest.ts) and form a structural pair (calibration → promotion governance chain).

### Project context reference

This story is **Story 5 of Phase 23 Epic 1 Governance Foundations**. It registers the second of two Phase 23 Intent kinds (the first — `PROMOTE_PIVOT_SUBCLUSTER` — ships in Story 1.4 same commit). After Stories 1.4 + 1.5, the OS recognizes both new Intent kinds at the dispatcher level, the slow-call SLO envelope is declared, and the streaming-progress contract is signed.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0081 read for the payload + envelope spec ; ADR-0072 read for the NSP SSE helper pattern Epic 6 Story 6.1 will reuse ; ADR-0004 read for the IntentEmission append-only contract that hosts the snapshot ; ADR-0067 cross-checked even though calibration is pure-TS (no LLM in scope) ; manifest convention verified to support `streamingProgress` declaration. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (Intent union arm with payload) — shipped: see [intents.ts L840-861](../../src/server/services/mestor/intents.ts) — `kind: "RUN_ATTRIBUTION_CALIBRATION"` + `strategyId` (brand-scoped) + `operatorId` + optional `campaignIds` + `mode: "AUTO" | "MANUAL_COEFFICIENTS"` + optional `operatorCoefficients`.
- AC #2 (SLO declaration) — shipped: see [slos.ts L237-240](../../src/server/governance/slos.ts) — `{ kind: "RUN_ATTRIBUTION_CALIBRATION", p95LatencyMs: 60_000, errorRatePct: 0.05, costP95Usd: 0.50 }` slow-call envelope.
- AC #3 (manifest declaration with streamingProgress flag) — shipped: see [campaign-tracker/manifest.ts L197-201](../../src/server/services/campaign-tracker/manifest.ts) — `"RUN_ATTRIBUTION_CALIBRATION"` in `acceptsIntents` ; `streamingProgress: true` flag inline-per-kind (or parallel `streamingProgressIntents` array depending on manifest convention).
- AC #4 (placeholder dispatch) — shipped: see [intents.ts L1071-1073](../../src/server/services/mestor/intents.ts) — fall-through `case` with `PROMOTE_PIVOT_SUBCLUSTER` returning `[]` ; handler-level NOT_YET_IMPLEMENTED ships Epic 6 Story 6.1 (`calibration.ts`).
- AC #5 (typecheck + lint) — verified pre-commit and post-commit. `tsc --noEmit` clean ; `eslint` 0 errors.
- Verification : `git log --oneline | grep "register Phase 23 Intent"` confirms commit `b271a61`.

### Completion Notes List

- **AC #1–5 all shipped** in commit `b271a61` (bundled with Story 1.4 — same 3 files, paired Intent kinds).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0081 + ADR-0072 + ADR-0004 + sibling Intent kind manifests read), Phase 1 APOGEE (Layer 5 service + Layer 4 governance ; no Neter added, cap 7/7 preserved), Phase 2 anti-doublon (grep returned 0 hits for `RUN_ATTRIBUTION_CALIBRATION` / `RUN_CALIBRATION` ; `EXECUTE_SEQUENCE` confirmed as streaming-progress precedent), Phase 3 conception (3 file paths canon, payload locked per ADR-0081, slow-call envelope justified for ~5k-transition windows, mode discriminator for manual-first parity), Phase 4 execution (3 files edited bundled with Story 1.4), Phase 5 verification (`tsc --noEmit` / `eslint` / `neteru-coherence.test.ts` all green), Phase 6 documentation (CODE-MAP auto-regen + manifest entry), Phase 7 commit (shipped via `b271a61`).
- **Cap APOGEE 7/7 preserved** — Intent kind registration is governance scaffolding, no Neter added.
- **Manual-first parity (ADR-0060)** — **structurally pre-shipped** via `mode: "AUTO" | "MANUAL_COEFFICIENTS"` discriminator. The handler (Epic 6 Story 6.1) consumes both modes via the same `runAttribution()` call ; downstream cannot distinguish source except via `IntentEmission.payload.source: "ALGORITHMIC" | "MANUAL_OPERATOR"`. Equal-status peer paths from day one of the Intent contract.
- **Mission link**: this Intent kind is the **traceability hinge** for promoting pivot sub-clusters to PRODUCTION. Without it, ROC AUC / RMSE would be ephemeral compute outputs (operator runs the regression in their head, no audit trail) ; with it, every calibration run is hash-chained as an `IntentEmission` whose `id` becomes the `calibrationSnapshotRef` that `PROMOTE_PIVOT_SUBCLUSTER` cites — the chain "calibration → snapshot → review → promotion" is the structural answer to "is this PRODUCTION promotion justified ?".

### File List

- **EDIT** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) — Intent union arm (~L840-861) + dispatch fall-through case (~L1071-1073 shared with Story 1.4).
- **EDIT** [src/server/governance/slos.ts](../../src/server/governance/slos.ts) — SLO declaration (~L237-240).
- **EDIT** [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) — `acceptsIntents` array entry + `streamingProgress: true` flag (~L197-201).
- **EDIT** [_bmad-output/implementation-artifacts/1-5-run-attribution-calibration-intent-slo.md](./1-5-run-attribution-calibration-intent-slo.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.5 shipped via commit `b271a61` — `RUN_ATTRIBUTION_CALIBRATION` async Intent kind registered (brand-scoped `strategyId` + optional `campaignIds` window + `mode: "AUTO" | "MANUAL_COEFFICIENTS"` for ADR-0060 parity + optional `operatorCoefficients`) + slow-call SLO (p95 60s, cost $0.50) + manifest `acceptsIntents` entry with `streamingProgress: true` flag + dispatch fall-through placeholder. Real handler deferred to Epic 6 Story 6.1 (`calibration.ts`). Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 4/10 → 5/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
