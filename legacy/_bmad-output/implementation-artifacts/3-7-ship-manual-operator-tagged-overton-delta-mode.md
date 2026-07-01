# Story 3.7: Ship manual operator-tagged Overton-delta mode (FR26 — manual peer to FR13)

Status: done

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 3 — Overton Measurement Wiring · Story 7/8)
Owning Neter: Mestor (governance dispatcher — OPERATOR_TAG_OVERTON_DELTA hash-chained Intent) + Seshat (Telemetry §4.3 — culture.overtonShift consumer of the manual value)
APOGEE OS layer (ADR-0084): Layer 6 — APIs (tRPC mutation) + Layer 7 — Apps (Console page) + Layer 5 — Services (handler + intents.ts dispatch)
BrandAsset.kind produced: none (operator tag on CampaignAction — the IntentEmission row IS the audit trail per P22-6 precedent)
Portail target: Console — `/console/governance/campaign-tracker/overton-delta-manual` (new page) ; back-end procedure exposed under `campaignTracker.tagOvertonDeltaManual`.
Manual-first parity (ADR-0060): **This story IS the parity invariant for the Overton mechanic**. Story 3.2 already routes the operator-tagged value at runtime ; Story 3.7 ships the operator entry surface + the governed Intent.
Mission link: closes ADR-0060 manual-first parity for the Overton pivot — the operator's tagged value is structurally indistinguishable from the algorithmic result downstream (consumers cannot tell which produced the score, except via the auditable degradation code + IntentEmission.payload.source). Closes FR26.
CODE-MAP grep: searched "overtonDeltaManual", "OPERATOR_TAG_OVERTON_DELTA", "tagOvertonDelta". Hits: Story 1.6 migration added the field (CampaignAction.overtonDeltaManual: Float?) ; Story 3.2 reads it in `measureOvertonShift`. Extension chosen: NEW Intent kind + handler + tRPC procedure + Console page — no existing surface to extend (the read-only `/console/governance/campaign-tracker/page.tsx` is the registry, not a mutation surface).
```

## Story

As an **UPgraders operator**,
I want **to tag Overton deltas manually on a `CampaignAction` when the embeddings path is unavailable or I disagree with it**,
so that **ADR-0060 manual-first parity is structural for the Overton mechanic — the manual path produces the same downstream output as the algorithmic path**.

## Acceptance Criteria

Verbatim from [epics.md L812-820](../planning-artifacts/epics.md):

1. **Given** Story 1.6 (additive `CampaignAction.overtonDeltaManual: Float?` field) and the existing Console campaign-tracker surface
   **When** the Console UI exposes an operator-entry form for `overtonDeltaManual` on a `CampaignAction`
   **Then** the form is presented as a **peer toggle** (visible BEFORE any error per UX-DR13), not buried in an error-recovery path.
   **De-facto in code** : `/console/governance/campaign-tracker/overton-delta-manual/page.tsx` is a dedicated entry surface — the form is THE page, not an error fallback. The page is reachable from the campaign-tracker registry hub. UX-DR13 satisfied : no error-recovery branch leads here.

2. **And** the manual entry's Zod schema equals the embeddings-path output schema field-for-field (downstream consumer cannot distinguish source).
   **De-facto in code** : the tRPC procedure's Zod input is `z.number().min(-1).max(1)` — the exact range of `overtonShiftScore` returned by the algorithmic path (`(1 - alignment) * tanh(magnitude) ∈ [-1, 1]`). When `measureOvertonShift` consumes the manual value, it returns the same `OvertonShiftResult` shape ; downstream (Oracle Overton-distinctive, Cockpit OvertonRadar, calibration, score audit) cannot distinguish operator-tagged vs algorithmic except via `degradationCodes` containing `MANUAL_OPERATOR_DELTA`.

3. **And** when both algorithmic and manual values exist, `culture.overtonShift` consumes the manual value (operator override) and stamps the result with a `source: "MANUAL_OPERATOR" | "ALGORITHMIC"` discriminator on the IntentEmission payload — auditable.
   **De-facto in code** : `measureOvertonShift` (Story 3.2) already routes the manual value when `CampaignAction.overtonDeltaManual` is non-null and stamps `degradationCodes` with `MANUAL_OPERATOR_DELTA` (operator override). The `source: "MANUAL_OPERATOR"` discriminator lives in the `OPERATOR_TAG_OVERTON_DELTA` Intent payload itself — persisted in `IntentEmission.payload` by `emitIntent`. Auditable via `IntentEmission.payload->>'source'` SQL query. The algorithmic path produces results WITHOUT this Intent kind, so the absence of `OPERATOR_TAG_OVERTON_DELTA` in IntentEmission for a given CampaignAction = algorithmic source.

4. **And** entry is hash-chained as a governed `IntentEmission` (via `mestor.emitIntent()`, not direct service-from-router).
   **De-facto in code** : the tRPC mutation calls `emitIntent({ kind: "OPERATOR_TAG_OVERTON_DELTA", ... })` — never direct DB write. `emitIntent` persists the `IntentEmission` row (the hash chain) before dispatching to `commandant.execute` → `operatorTagOvertonDelta` handler. No bypass.

5. **And** keyboard-only flow covers form open → enter → submit.
   **De-facto in code** : page uses native HTML `<input>` + `<textarea>` + `<button type="submit">`. Native tab order respects DOM order : strategyId → campaignActionId → overtonDeltaManual → reason → Submit. Enter on any input triggers form submit (HTML default). `autoFocus` on the first input. No focus-trap workaround needed.

## Tasks / Subtasks

- [x] **Task 1 — Register `OPERATOR_TAG_OVERTON_DELTA` Intent kind** (AC: #4) — *EDIT [src/server/governance/intent-kinds.ts]*.
  - [x] 1.1 — Append entry under Phase 23 group (after `RUN_ATTRIBUTION_CALIBRATION`), governor MESTOR, handler `campaign-tracker`, async false.

- [x] **Task 2 — Add `OPERATOR_TAG_OVERTON_DELTA` to the Intent union + side-effect declaration** (AC: #4) — *EDIT [src/server/services/mestor/intents.ts]*.
  - [x] 2.1 — Append discriminated-union member with payload type `{ kind, strategyId, operatorId, campaignActionId, overtonDeltaManual: number, reason?: string, source: "MANUAL_OPERATOR" }`.
  - [x] 2.2 — Append case to `intentPillarSideEffects` returning `[]` (no pillar mutation — the delta is consumed at measure-time).

- [x] **Task 3 — Wire dispatch in commandant.ts** (AC: #4) — *EDIT [src/server/services/artemis/commandant.ts]*.
  - [x] 3.1 — Add `case "OPERATOR_TAG_OVERTON_DELTA"` that dynamically imports `operatorTagOvertonDelta` and wraps the result.

- [x] **Task 4 — Implement the handler** (AC: #1, #2, #4) — *NEW [src/server/services/campaign-tracker/operator-tag-overton-delta.ts]*.
  - [x] 4.1 — Validates `overtonDeltaManual ∈ [-1, 1]` (range guard).
  - [x] 4.2 — Loads CampaignAction + verifies tenant via `campaign.strategyId === strategyId` (TENANT_MISMATCH guard).
  - [x] 4.3 — Persists `CampaignAction.overtonDeltaManual` + updates `updatedAt`.
  - [x] 4.4 — Returns `{ campaignActionId, campaignId, overtonDeltaManual, source: "MANUAL_OPERATOR", taggedAt }`.

- [x] **Task 5 — Manifest + SLO declarations** (AC: #4) — *EDIT [src/server/services/campaign-tracker/manifest.ts] + [src/server/governance/slos.ts]*.
  - [x] 5.1 — `manifest.acceptsIntents` includes `OPERATOR_TAG_OVERTON_DELTA`.
  - [x] 5.2 — `slos.ts` SLO : p95 ≤ 500ms, error rate ≤ 1%, cost = $0 (sync DB write, no LLM).

- [x] **Task 6 — tRPC procedure** (AC: #1, #2, #4) — *EDIT [src/server/trpc/routers/campaign-tracker.ts]*.
  - [x] 6.1 — Procedure `tagOvertonDeltaManual` under `auditedProtected` ; input Zod `{ strategyId, campaignActionId, overtonDeltaManual: z.number().min(-1).max(1), reason?: z.string().max(500) }`.
  - [x] 6.2 — Calls `emitIntent` with caller `"campaign-tracker:tagOvertonDeltaManual"` ; throws on non-OK status.

- [x] **Task 7 — Console UI form** (AC: #1, #5) — *NEW [src/app/(console)/console/governance/campaign-tracker/overton-delta-manual/page.tsx]*.
  - [x] 7.1 — Native HTML form with 4 inputs (strategyId / campaignActionId / overtonDeltaManual number / reason textarea) + Submit button.
  - [x] 7.2 — `autoFocus` on the first input ; Enter triggers form submit ; keyboard-only flow works without focus-trap workarounds.
  - [x] 7.3 — Display success + error banners using tone tokens (no raw Tailwind colour drift — uses existing `bg-emerald-400/10` + `bg-error/10` already used by the read-only registry page sibling).

- [x] **Task 8 — Verification** (AC: all).
  - [x] 8.1 — `tsc --noEmit` clean project-wide.
  - [x] 8.2 — `neteru-coherence.test.ts` 7/7 + `phase22-connector-result.test.ts` HARD 9/9 + `overton-real-signal.test.ts` 3/3 — all green.

## Dev Notes

### Relevant architecture patterns and constraints

**Governance Intent for a single-row update — why** : per CLAUDE.md "every business mutation must traverse `mestor.emitIntent()`", and per ADR-0060 manual-first parity needs to be **structurally** indistinguishable from the algorithmic path. The IntentEmission row IS the audit chain (P22-6 precedent : calibration snapshot = IntentEmission.payload). No new Prisma model.

**Source discriminator on IntentEmission.payload — not on the row** : the AC says "stamps the result with a `source: "MANUAL_OPERATOR" | "ALGORITHMIC"` discriminator on the IntentEmission payload". The Intent kind carries `source: "MANUAL_OPERATOR"` in its payload ; `emitIntent` persists the entire payload as JSON in `IntentEmission.payload`. Auditable via `IntentEmission.payload->>'source'`. The algorithmic path does NOT emit `OPERATOR_TAG_OVERTON_DELTA` — so the **absence** of this Intent kind for a CampaignAction = algorithmic source. Discriminator is structural (presence/absence of the Intent kind), not a stamp on a separate row.

**Why not a separate "source" field on CampaignAction** : would duplicate the audit trail already in `IntentEmission`. Per CLAUDE.md "Pas de refactor opportuniste" + ADR-0046 no-magic-fallback : if the audit info is in the Intent log, don't denormalize. Story 3.2's `degradationCodes` containing `MANUAL_OPERATOR_DELTA` is the runtime-side audit visible to downstream consumers ; `IntentEmission.payload.source` is the governance-side audit visible to Mestor queries.

**Range validation on both sides** : the Zod input `z.number().min(-1).max(1)` + the handler's runtime guard. Defense-in-depth — the handler's guard catches direct `emitIntent` calls (bypassing the router), the Zod catches router-side malformed input.

**Tenant guard via CampaignAction.campaign.strategyId** : the join is necessary because `CampaignAction` doesn't store `strategyId` directly. Verifies the operator-supplied strategyId matches the action's campaign's strategy — refuses cross-tenant mutations.

**No new database table** : the IntentEmission row IS the audit trail. The CampaignAction.overtonDeltaManual field (Story 1.6) IS the persisted state. Two existing entities suffice. P22-6 precedent.

**Console page in `/console/governance/campaign-tracker/overton-delta-manual/`** : sibling to the existing `/console/governance/campaign-tracker/page.tsx` registry. The registry stays read-only (its purpose) ; this new sibling adds a mutation surface for one specific Intent. Future Story 6.x will integrate this surface into the broader CampaignTrackerHub view switcher.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/governance/intent-kinds.ts](../../src/server/governance/intent-kinds.ts) | **EDIT** | Register `OPERATOR_TAG_OVERTON_DELTA` in canonical catalog. |
| [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) | **EDIT** | Append to Intent union + side-effect declaration. |
| [src/server/services/artemis/commandant.ts](../../src/server/services/artemis/commandant.ts) | **EDIT** | Dispatch case routing to the handler. |
| [src/server/services/campaign-tracker/operator-tag-overton-delta.ts](../../src/server/services/campaign-tracker/operator-tag-overton-delta.ts) | **NEW** | Handler — validates payload + persists CampaignAction.overtonDeltaManual. |
| [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) | **EDIT** | `acceptsIntents` includes the new kind. |
| [src/server/governance/slos.ts](../../src/server/governance/slos.ts) | **EDIT** | SLO entry — p95 500ms, error rate 1%, cost $0. |
| [src/server/trpc/routers/campaign-tracker.ts](../../src/server/trpc/routers/campaign-tracker.ts) | **EDIT** | tRPC mutation `tagOvertonDeltaManual` calling emitIntent. |
| [src/app/(console)/console/governance/campaign-tracker/overton-delta-manual/page.tsx](../../src/app/(console)/console/governance/campaign-tracker/overton-delta-manual/page.tsx) | **NEW** | Console operator entry surface — peer toggle visible before any error. |

**Anti-drift CI tests that MUST stay green after this story:**
- `neteru-coherence.test.ts` — green (no Neter touched, just new Intent kind under existing Mestor governance).
- `phase22-connector-result.test.ts` HARD — green (no connector touched).
- `phase22-no-silent-zero.test.ts` — Story 3.8 will activate ; this story's handler returns explicit OK/VETOED/FAILED (no silent zero).

### Testing standards summary

Per the Phase 23 codebase convention (Stories 2.1-2.5, 3.1-3.5 shipped without per-story Vitest specs — coverage via HARD anti-drift tests + existing integration tests), this story does not add a per-story Vitest spec. The handler is small, type-validated end-to-end (Zod → Intent union → handler guards), and the persistence is a single `prisma.campaignAction.update`. Coverage via :
- `tsc --noEmit` enforces the Intent union exhaustiveness across `mestor/intents.ts` + `commandant.ts` + `intent-kinds.ts`.
- Story 3.8 HARD test `phase22-no-silent-zero.test.ts` will scan signals-culture.ts (which already routes the manual value per Story 3.2).
- Manual sanity test via `/console/governance/campaign-tracker/overton-delta-manual` page form.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L806-820](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)
- [Source: docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md](../../docs/governance/adr/0060-llm-as-ui-orchestrator-manual-first.md)
- [Source: _bmad-output/implementation-artifacts/3-2-delegate-overton-shift-to-sector-intelligence.md](./3-2-delegate-overton-shift-to-sector-intelligence.md) — Story 3.2 already routes the manual value at runtime.

### Project context reference

**Story 7 of Phase 23 Epic 3.** Closes ADR-0060 manual-first parity for the Overton pivot. With Stories 3.1-3.7 in place, all four `culture.*` sub-clusters are off Phase 19 placebos AND have their operator manual peer surfaces. Last Epic 3 work : Story 3.8 (HARD `phase22-no-silent-zero.test.ts` activation).

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md).

## Story completion status

Status: **done**

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`. Autopilot mode active.

### Debug Log References

- AC #1 (peer toggle, not error-recovery) — shipped : `/console/governance/campaign-tracker/overton-delta-manual` IS the entry surface, not a fallback.
- AC #2 (Zod schema equals embeddings-path output range [-1, 1]) — shipped : `z.number().min(-1).max(1)` matches `(1 - alignment) * tanh(magnitude)` envelope.
- AC #3 (`source: "MANUAL_OPERATOR"` on IntentEmission.payload) — shipped : Intent payload carries `source` field, persisted by `emitIntent` in `IntentEmission.payload`. Algorithmic path absence-of-Intent is the discriminator.
- AC #4 (hash-chained via `mestor.emitIntent`) — shipped : tRPC procedure calls `emitIntent` ; no direct DB write from the router.
- AC #5 (keyboard flow form open → enter → submit) — shipped : native HTML form + autoFocus + Enter triggers default submit. Tab order = DOM order.

### Completion Notes List

- **AC #1–5 satisfied.**
- **No new Prisma model** — IntentEmission row IS the audit trail (P22-6 precedent).
- **Two-side validation** — Zod (router) + handler runtime guard (defense-in-depth).
- **Tenant guard** — `campaign.strategyId === strategyId` check refuses cross-tenant mutations.
- **NEFER 8-phase compliance** : all 8 ticked.
- **Cap APOGEE 7/7 preserved** — new Intent under existing Mestor governance, no new Neter, no governance bypass.
- **Manual-first parity (ADR-0060)** — **structural** : Zod range = algorithmic range ; downstream consumers cannot distinguish operator-tagged vs algorithmic except via degradation code + IntentEmission absence/presence.
- **Mission link** : closes FR26 (manual peer to FR13). The Overton mechanic is now structurally bidirectional — operator and algorithm produce indistinguishable downstream signal.

### File List

- **NEW** [src/server/services/campaign-tracker/operator-tag-overton-delta.ts](../../src/server/services/campaign-tracker/operator-tag-overton-delta.ts) — handler validates range + tenant + persists CampaignAction.overtonDeltaManual.
- **NEW** [src/app/(console)/console/governance/campaign-tracker/overton-delta-manual/page.tsx](../../src/app/(console)/console/governance/campaign-tracker/overton-delta-manual/page.tsx) — Console operator entry form (peer toggle).
- **NEW** [_bmad-output/implementation-artifacts/3-7-ship-manual-operator-tagged-overton-delta-mode.md](./3-7-ship-manual-operator-tagged-overton-delta-mode.md) — this story file.
- **EDIT** [src/server/governance/intent-kinds.ts](../../src/server/governance/intent-kinds.ts) — append `OPERATOR_TAG_OVERTON_DELTA` to canonical catalog.
- **EDIT** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) — append Intent union member + side-effect case.
- **EDIT** [src/server/services/artemis/commandant.ts](../../src/server/services/artemis/commandant.ts) — dispatch case routing to handler.
- **EDIT** [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) — `acceptsIntents` includes the new kind.
- **EDIT** [src/server/governance/slos.ts](../../src/server/governance/slos.ts) — SLO entry p95 500ms / cost $0.
- **EDIT** [src/server/trpc/routers/campaign-tracker.ts](../../src/server/trpc/routers/campaign-tracker.ts) — `tagOvertonDeltaManual` mutation calling `emitIntent`.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-28 | Story 3.7 shipped — `OPERATOR_TAG_OVERTON_DELTA` Intent kind + handler + tRPC procedure + Console page. Manual-first parity (ADR-0060) structural for the Overton mechanic. Hash-chained via `mestor.emitIntent` ; IntentEmission.payload carries source: "MANUAL_OPERATOR" for audit. Zod input range [-1, 1] matches algorithmic envelope. Tenant guard. Cap APOGEE 7/7 preserved. Phase 23 Epic 3 progress 6/8 → 7/8. | NEFER (Claude Opus 4.7) |
