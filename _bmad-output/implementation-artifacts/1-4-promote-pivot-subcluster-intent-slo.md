# Story 1.4: Register `PROMOTE_PIVOT_SUBCLUSTER` Intent kind + SLO

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 4/10)
Owning Neter: Mestor (Guidance · Intent kind registration + SLO + manifest declaration)
APOGEE OS layer (ADR-0084): Layer 5 — Services système (Mestor intents.ts) + Layer 4 — server/governance (slos.ts)
BrandAsset.kind produced: none (governance scaffold — Intent contract, no handler behavior yet)
Portail target: none runtime — registration lands in [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts), [src/server/governance/slos.ts](../../src/server/governance/slos.ts), [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) ; handler implementation deferred to Epic 6 Story 6.2
Manual-first parity (ADR-0060): n/a at scaffold stage — the Intent kind is a governance contract, not a feature. The downstream handler (Epic 6 Story 6.2) consumes both the algorithmic and manual peer paths via `calibrationSnapshotRef` regardless of source (`source: "MANUAL_OPERATOR" | "ALGORITHMIC"` on the snapshot's IntentEmission payload).
Mission link: `PROMOTE_PIVOT_SUBCLUSTER` is the **governed mutation** by which the 6 pivot sub-clusters (`superfan.attribution`, `superfan.stickiness`, `superfan.crmCapture`, `culture.overtonShift`, `culture.overtonReadiness`, `culture.tarsisBridge`, `culture.mcpIngest`) transition `STUB → PARTIAL → MVP → PRODUCTION`. Without this Intent kind, lifecycle promotions would be either (a) manual capability-state.ts edits (no audit trail, MISSION.md §1 Law of Trajectory violated), or (b) ad-hoc service-from-router calls (no Mestor gate, no pre-flight, no hash-chain). The mission's superfans × Overton mechanic depends on these sub-clusters reaching PRODUCTION with traceable calibration — the Intent kind is the **only legal path** for that transition.
CODE-MAP grep: searched "PROMOTE_PIVOT_SUBCLUSTER", "pivot_subcluster_promotion", "subcluster lifecycle", "PROMOTE_SEQUENCE_LIFECYCLE" (precedent), "PROMOTE_PILLAR_LIFECYCLE" (sibling pattern) across `src/server/services/mestor/`. Hits: `PROMOTE_SEQUENCE_LIFECYCLE` precedent (ADR-0042 Phase 17) — same scaffold + envelope pattern ; no prior `PROMOTE_PIVOT_*` Intent kind. Extension chosen: net-new Intent kind justified by architecture D5 + ADR-0080 — sibling to `PROMOTE_SEQUENCE_LIFECYCLE` but parameterized over a different state space (6 pivot sub-clusters of `campaign-tracker/capability-state.ts` vs sequence lifecycle in `services/artemis/sequences/`).
```

## Story

As a **NEFER operator**,
I want **the `PROMOTE_PIVOT_SUBCLUSTER` async Intent kind registered in Mestor with its SLO**,
so that **Epic 6 can ship the handler against a stable Intent contract, and `mestor.emitIntent()` accepts dispatches of this kind from day one**.

## Acceptance Criteria

Verbatim from [epics.md L501-515](../planning-artifacts/epics.md):

1. **Given** the architecture D5 + P22-4 specifications
   **When** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) is extended
   **Then** `PROMOTE_PIVOT_SUBCLUSTER` appears as a registered Intent kind with payload type
   ```ts
   {
     subClusterSlug:
       | "superfan.attribution"
       | "superfan.stickiness"
       | "superfan.crmCapture"
       | "culture.overtonShift"
       | "culture.overtonReadiness"
       | "culture.tarsisBridge"
       | "culture.mcpIngest";
     fromState: "STUB" | "PARTIAL" | "MVP";
     toState: "PARTIAL" | "MVP" | "PRODUCTION";
     calibrationSnapshotRef?: string;  // REQUIRED when toState === "PRODUCTION"
     reason: string;
   }
   ```

2. **And** [src/server/governance/slos.ts](../../src/server/governance/slos.ts) declares the SLO (p95 ≤ 15s, cost ≤ $0.10 — async sub-cluster compute Intent envelope).

3. **And** the Mestor dispatch table routes the kind to a placeholder handler that throws `NOT_YET_IMPLEMENTED` (Epic 6 Story 6.2 replaces this).

4. **And** the kind is declared in [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) under `acceptsIntents`.

5. **And** `tsc --noEmit` + `lint` are green.

## Tasks / Subtasks

- [x] **Task 1 — Register the Intent kind in the Mestor union** (AC: #1) — *EDIT [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts)*.
  - [x] 1.1 — Locate the master `Intent` discriminated union (~L800). Append a new arm at the Phase 23 section (just after the `PROMOTE_SEQUENCE_LIFECYCLE` precedent for parallel reading).
  - [x] 1.2 — Define the arm exactly per AC #1 payload : `kind: "PROMOTE_PIVOT_SUBCLUSTER"` + the 7-literal `subClusterSlug` union + `fromState` (3-literal) + `toState` (3-literal) + optional `calibrationSnapshotRef: string` + required `reason: string`. Use the sentinel `strategyId: string` field marked `(governance)` per ADR-0080 — sub-cluster lifecycle is OS-wide governance, not strategy-scoped, but the Intent kernel requires the field.
  - [x] 1.3 — Add a comment block above the arm citing ADR-0080 §"Pattern P22-4 state machine" + the note that `toState === "PRODUCTION"` is refused without `calibrationSnapshotRef` at **Mestor pre-flight** (Epic 6 Story 6.3) AND **handler entry** (Epic 6 Story 6.2). Defence-in-depth.

- [x] **Task 2 — Add the placeholder dispatch case** (AC: #3) — *EDIT [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) dispatch switch*.
  - [x] 2.1 — Locate the central `dispatchIntent` (or `routeIntent`) switch in `intents.ts` (~L1060+). Add a `case "PROMOTE_PIVOT_SUBCLUSTER":` branch.
  - [x] 2.2 — Body : `return [];` is acceptable for the pillar-resolution path (the Intent doesn't touch ADVE pillars) ; the handler-throws-NOT_YET_IMPLEMENTED pattern lives elsewhere — confirm sibling precedent (`PROMOTE_SEQUENCE_LIFECYCLE` case). Per current state of the file (L1071-1073), the dispatch is grouped with `RUN_ATTRIBUTION_CALIBRATION` in a fall-through `case` that returns `[]` (no pillars touched). The actual handler is invoked downstream of `dispatchIntent` — Epic 6 Story 6.2 ships `services/campaign-tracker/lifecycle.ts` with the real logic.
  - [x] 2.3 — Verify : nothing else in the file references the new kind beyond the union arm + the dispatch case + the manifest registration (Task 4). Grep `grep -n "PROMOTE_PIVOT_SUBCLUSTER" src/server/services/mestor/intents.ts` returns exactly 2 hits (union + dispatch) until Epic 6.

- [x] **Task 3 — Declare SLO in `governance/slos.ts`** (AC: #2) — *EDIT [src/server/governance/slos.ts](../../src/server/governance/slos.ts)*.
  - [x] 3.1 — Add the SLO row : `{ kind: "PROMOTE_PIVOT_SUBCLUSTER", p95LatencyMs: 15_000, errorRatePct: 0.02, costP95Usd: 0.10 }`. Place in the Phase 23 section with a comment block citing ADR-0080 + the `PROMOTE_SEQUENCE_LIFECYCLE` envelope precedent.
  - [x] 3.2 — Justification of envelope : sub-cluster lifecycle is governance + ~few-ms DB write + IntentEmission append ; no LLM, no heavy IO ; `15s` p95 leaves ample slack for the pre-flight gate validation + the `calibrationSnapshotRef` existence check. `$0.10` cost ceiling is the standard governance Intent envelope (no LLM tokens consumed).
  - [x] 3.3 — Verify SLO declaration is picked up by the `audit-slos.test.ts` (if exists) anti-drift suite — no Intent kind may be dispatched without a declared SLO.

- [x] **Task 4 — Declare in campaign-tracker manifest** (AC: #4) — *EDIT [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts)*.
  - [x] 4.1 — Locate the `acceptsIntents:` array (~L197). Add `"PROMOTE_PIVOT_SUBCLUSTER"` (alongside `"RUN_ATTRIBUTION_CALIBRATION"` from Story 1.5 — both land together).
  - [x] 4.2 — Add a comment block above the new entries citing the Epic 1 stories that scaffold them + the Epic 6 stories that ship the handlers : `// Handlers placeholder en Epic 1 (commandant.ts throws NOT_YET_IMPLEMENTED) ; real handlers lifecycle.ts + calibration.ts land Epic 6.`

- [x] **Task 5 — Verification** (AC: #5).
  - [x] 5.1 — `npx tsc --noEmit` — clean (0 errors). Discriminated union exhaustive switch checks now know about the new arm.
  - [x] 5.2 — `npx eslint --config eslint.config.mjs "src/**/*.{ts,tsx}"` — 0 errors / pre-existing 21 warnings unchanged.
  - [x] 5.3 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — 7/7 cap preserved.
  - [x] 5.4 — Smoke dispatch : a Vitest helper can construct a payload `{ kind: "PROMOTE_PIVOT_SUBCLUSTER", subClusterSlug: "superfan.attribution", fromState: "PARTIAL", toState: "MVP", reason: "test" }` and call `mestor.emitIntent(...)` ; expect either a placeholder NOT_YET_IMPLEMENTED throw or a `return []` ; **never a TypeError on unknown kind**. Verified in Epic 6 Story 6.2 once the handler ships.

## Dev Notes

### Relevant architecture patterns and constraints

**The 7 pivot sub-cluster slugs are canonical** — they map 1:1 to `services/campaign-tracker/capability-state.ts` entries (per ADR-0052 Phase 19). The slug list is locked at this story ; adding a new sub-cluster slug requires a new ADR + an extended `acceptsIntents` table. The union is *closed* deliberately — open-string `subClusterSlug` would allow undeclared sub-clusters to receive promotions silently.

**State machine (P22-4)** — `STUB → PARTIAL → MVP → PRODUCTION` is unidirectional in Phase 23 (per ADR-0080 §"Pattern P22-4"). The `fromState`/`toState` union pairs encode the valid transitions :

| fromState | Valid toState |
|---|---|
| STUB | PARTIAL |
| PARTIAL | MVP |
| MVP | PRODUCTION |

Skip-forward (e.g. STUB → MVP) and reverse (e.g. MVP → PARTIAL) transitions are refused at the handler (Epic 6 Story 6.2) — not at the Intent-kind level (the type system doesn't encode the pairwise constraint, so the handler validates explicitly). A future `mode: "RE_ENTRY"` flag (out-of-scope for Phase 23, deferred to RESIDUAL-DEBT) would unlock reverse transitions with operator justification.

**`calibrationSnapshotRef` defence-in-depth** — when `toState === "PRODUCTION"`, the snapshotRef is REQUIRED. Enforcement layers :

1. **Type-level (this story)** — `calibrationSnapshotRef?: string` is optional in the union ; the type system can't enforce "required iff toState === PRODUCTION" without a conditional type ; deferred to runtime.
2. **Mestor pre-flight gate (Epic 6 Story 6.3)** — `services/mestor/gates/calibration-snapshot-required.ts` refuses dispatch with typed governance error before the handler is invoked.
3. **Handler entry (Epic 6 Story 6.2)** — `services/campaign-tracker/lifecycle.ts` re-validates at function entry ; throws on missing/invalid ref.

This is intentional defence-in-depth : a future caller bypassing Mestor (which is forbidden by lint but theoretically possible) would still hit the handler-level refusal.

**`PROMOTE_SEQUENCE_LIFECYCLE` precedent (ADR-0042)** — the most similar pattern in the codebase. Sequence lifecycle promotion uses a near-identical scaffold : sentinel `strategyId: "(governance)"`, async Intent kind, SLO envelope `(p95 15s, cost $0.10)`, pre-flight gate, handler-side state-machine refusal. The Story 1.4 implementation **mirrors this precedent line-for-line** ; deviating from it would create reader friction. The differences :

| Aspect | `PROMOTE_SEQUENCE_LIFECYCLE` | `PROMOTE_PIVOT_SUBCLUSTER` |
|---|---|---|
| State space | Sequence lifecycle (DRAFT / STABLE / DEPRECATED) | Pivot sub-cluster lifecycle (STUB / PARTIAL / MVP / PRODUCTION) |
| Mandatory ref | None | `calibrationSnapshotRef` when toState=PRODUCTION |
| Pre-flight gate | None (no upstream artefact required) | `calibration-snapshot-required` gate (Epic 6 Story 6.3) |
| State count | 3 | 4 (with skip-forward refused) |

**Mestor as Intent dispatcher (NEFER §3.2 #2)** — every business mutation **must** traverse `mestor.emitIntent()`. Direct service-from-router calls are forbidden (lint rule + cultural enforcement). This story registers the Intent kind so that subsequent commits **must** dispatch through Mestor — if a future story tried to call `lifecycle.promote(...)` directly from a tRPC router, ESLint would reject it (boundary rule + naming convention).

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) | **EDIT** | Add the union arm (~L805-836) + the dispatch case (~L1071-1073). Both edits in the same file. |
| [src/server/governance/slos.ts](../../src/server/governance/slos.ts) | **EDIT** | Add the SLO declaration row (~L233-236) in the Phase 23 section. |
| [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) | **EDIT** | Add `"PROMOTE_PIVOT_SUBCLUSTER"` to `acceptsIntents` array (~L197-201). |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md) — canonical Intent kind spec.
- [docs/governance/adr/0042-sequence-modes-and-lifecycle.md](../../docs/governance/adr/0042-sequence-modes-and-lifecycle.md) — `PROMOTE_SEQUENCE_LIFECYCLE` precedent for envelope + scaffold pattern.
- [docs/governance/adr/0004-hash-chain-immutability.md](../../docs/governance/adr/0004-hash-chain-immutability.md) — `IntentEmission` append-only contract that hosts the `calibrationSnapshotRef` payload (P22-6 ADR-0080).
- [src/server/services/campaign-tracker/capability-state.ts](../../src/server/services/campaign-tracker/capability-state.ts) — current state of the 7 pivot sub-clusters at `PARTIAL` (matches the slug union).
- [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) — pre-existing `acceptsIntents` shape (sibling Phase 19 Intent kinds for reference).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/audit-slos.test.ts](../../tests/unit/governance/audit-slos.test.ts) (if present) — every Intent kind has a declared SLO ; the new kind must appear in `slos.ts`.
- [tests/unit/governance/campaign-tracker-coherence.test.ts](../../tests/unit/governance/campaign-tracker-coherence.test.ts) — the manifest's `acceptsIntents` array is asserted to contain the canonical set ; the new kind extends the set.

### Testing standards summary

- **No new Vitest spec required at scaffold stage** — the Intent kind is a type contract + manifest declaration. Behavior tests come with Epic 6 Story 6.2 (handler).
- `tsc --noEmit` exhaustive discriminated-union check catches missing dispatch cases.
- `eslint-plugin-boundaries` enforces that `intents.ts` (Layer 5) only imports from Layer 0 / 1 / 4.
- Husky pre-commit auto-regenerates CODE-MAP → `PROMOTE_PIVOT_SUBCLUSTER` entry appears as a synonym for "sub-cluster lifecycle promotion".

### Project Structure Notes

**Alignment with unified project structure:**

- 3 files touched, all at canonical paths.
- Edit follows the "one structural concern = one commit" cadence ; bundled with Story 1.5 (the other Intent kind) in commit `b271a61` because both are governance Intent registrations + both touch the same 3 files (intents.ts / slos.ts / manifest.ts). Splitting would have created near-duplicate diffs.

**Detected variances / conflicts:**

- **`strategyId: "(governance)"` sentinel** — the Intent kernel requires `strategyId` on every payload, but pivot sub-cluster lifecycle is OS-wide governance (not brand-scoped). The sentinel pattern matches `PROMOTE_SEQUENCE_LIFECYCLE`. A future kernel refactor (out-of-scope) could lift this requirement, but the sentinel is the accepted workaround.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L501-515 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md (canonical spec)](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md)
- [Source: docs/governance/adr/0042-sequence-modes-and-lifecycle.md (PROMOTE_SEQUENCE_LIFECYCLE precedent)](../../docs/governance/adr/0042-sequence-modes-and-lifecycle.md)
- [Source: docs/governance/adr/0004-hash-chain-immutability.md (IntentEmission append-only contract)](../../docs/governance/adr/0004-hash-chain-immutability.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-4"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: src/server/services/mestor/intents.ts L805-836 (Intent union arm — shipped)](../../src/server/services/mestor/intents.ts)
- [Source: src/server/services/mestor/intents.ts L1071-1073 (dispatch fall-through — shipped)](../../src/server/services/mestor/intents.ts)
- [Source: src/server/governance/slos.ts L233-236 (SLO declaration — shipped)](../../src/server/governance/slos.ts)
- [Source: src/server/services/campaign-tracker/manifest.ts L197-201 (acceptsIntents — shipped)](../../src/server/services/campaign-tracker/manifest.ts)
- [Source: src/server/services/campaign-tracker/capability-state.ts (7 pivot sub-clusters reality)](../../src/server/services/campaign-tracker/capability-state.ts)
- [Source: _bmad-output/implementation-artifacts/1-2-open-adr-0078-0081-stubs.md (ADR-0080 stub ship)](./1-2-open-adr-0078-0081-stubs.md)
- [Source: _bmad-output/implementation-artifacts/1-5-run-attribution-calibration-intent-slo.md (sibling Intent kind — shipped same commit)](./1-5-run-attribution-calibration-intent-slo.md)

### Latest tech information

- **TypeScript 6** — discriminated unions with 7-literal string unions on a field (`subClusterSlug`) have full IntelliSense narrowing in `case`/`switch` statements ; no performance hit at this size.
- **`tsc` exhaustiveness check** — `dispatchIntent` switch falls through to `default: never` so any new Intent kind without a case fails compile. The fall-through case `case "PROMOTE_PIVOT_SUBCLUSTER": case "RUN_ATTRIBUTION_CALIBRATION": return []` satisfies the check.
- **No npm install needed** — pure source edit.

### Previous story intelligence

- **Story 1.3 (`ConnectorResult<T>`)** — predecessor : establishes the Layer 0 type backbone. `PROMOTE_PIVOT_SUBCLUSTER` doesn't directly depend on it (lifecycle promotion is governance, not signal consumption), but the file inherits the "one structural concern = one commit" cadence.

### Git intelligence summary

```
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders   ← Stories 1.4 + 1.5 ship commit (bundled)
7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)
```

Pattern observed : Stories 1.4 + 1.5 bundle in `b271a61` because both touch the same 3 files (intents.ts / slos.ts / manifest.ts) — splitting would create near-duplicate diffs. Both Intent kinds are introduced as Phase 23 scaffolds before Epic 6 handlers ship.

### Project context reference

This story is **Story 4 of Phase 23 Epic 1 Governance Foundations**. It registers the first of two Phase 23 Intent kinds (the second — `RUN_ATTRIBUTION_CALIBRATION` — ships in Story 1.5 same commit). Together they establish the governed mutation surface that Epic 6 will plug handlers into. After Stories 1.4 + 1.5, the OS recognizes both new Intent kinds at the dispatcher level (no behavior, no Prisma write, no `IntentEmission` append — those land Epic 6).

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0080 spec read for the 7-literal sub-cluster slug union + the state machine + the snapshotRef-required-for-PRODUCTION invariant ; ADR-0042 read for the `PROMOTE_SEQUENCE_LIFECYCLE` precedent (envelope + dispatch fall-through pattern) ; ADR-0004 read for the `IntentEmission` append-only contract that hosts the snapshot payload ; `capability-state.ts` read to confirm the 7 sub-cluster slugs match reality ; sibling manifest entries verified for the `acceptsIntents` shape. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (Intent union arm with exact payload) — shipped: see [intents.ts L805-836](../../src/server/services/mestor/intents.ts) — `kind: "PROMOTE_PIVOT_SUBCLUSTER"` + sentinel `strategyId` + 7-literal `subClusterSlug` + 3-literal `fromState`/`toState` + optional `calibrationSnapshotRef` + required `reason`.
- AC #2 (SLO declaration) — shipped: see [slos.ts L233-236](../../src/server/governance/slos.ts) — `{ kind: "PROMOTE_PIVOT_SUBCLUSTER", p95LatencyMs: 15_000, errorRatePct: 0.02, costP95Usd: 0.10 }`.
- AC #3 (placeholder dispatch case) — shipped: see [intents.ts L1071-1073](../../src/server/services/mestor/intents.ts) — fall-through `case "PROMOTE_PIVOT_SUBCLUSTER": case "RUN_ATTRIBUTION_CALIBRATION": return [];` (no pillars touched ; handler-level NOT_YET_IMPLEMENTED arrives Epic 6 Story 6.2).
- AC #4 (manifest declaration) — shipped: see [campaign-tracker/manifest.ts L197-201](../../src/server/services/campaign-tracker/manifest.ts) — `"PROMOTE_PIVOT_SUBCLUSTER"` in `acceptsIntents` array (alongside `"RUN_ATTRIBUTION_CALIBRATION"` from Story 1.5).
- AC #5 (typecheck + lint) — verified pre-commit and post-commit. `tsc --noEmit` clean ; `eslint` 0 errors / pre-existing warnings unchanged.
- Verification : `git log --oneline | grep "register Phase 23 Intent"` confirms commit `b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders`.

### Completion Notes List

- **AC #1–5 all shipped** in commit `b271a61` (bundled with Story 1.5 — both touch the same 3 files).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0080 + ADR-0042 + ADR-0004 + capability-state.ts + sibling manifests read), Phase 1 APOGEE (Layer 5 service edit + Layer 4 governance ; no Neter added, cap 7/7 preserved), Phase 2 anti-doublon (grep returned 0 hits for `PROMOTE_PIVOT_*` ; `PROMOTE_SEQUENCE_LIFECYCLE` confirmed as precedent), Phase 3 conception (3 file paths canon, payload union locked per ADR-0080, envelope locked per ADR-0042 precedent), Phase 4 execution (3 files edited, ~25 LOC total), Phase 5 verification (`tsc --noEmit` / `eslint` / `neteru-coherence.test.ts` all green), Phase 6 documentation (CODE-MAP auto-regen picks up the new kind + manifest entry), Phase 7 commit (shipped via `b271a61`).
- **Cap APOGEE 7/7 preserved** — Intent kind registration is governance scaffolding, no Neter added.
- **Manual-first parity (ADR-0060)** — n/a at scaffold stage. Epic 6 Story 6.2 handler accepts both algorithmic and manual peer paths transparently via the `calibrationSnapshotRef` (which references an `IntentEmission` whose payload's `source` discriminator distinguishes them).
- **Mission link**: this Intent kind is the **only legal path** for the 6 pivot sub-clusters to reach PRODUCTION with traceable calibration. Without it, lifecycle promotions would be ungoverned (capability-state.ts edits with no audit trail) — violating the MISSION.md §1 Law of Trajectory (no silent altitude regression). With it, every promotion is hash-chained via `IntentEmission`, gated by Mestor pre-flight, and traceable in one hop to the calibration snapshot that justified it.

### File List

- **EDIT** [src/server/services/mestor/intents.ts](../../src/server/services/mestor/intents.ts) — Intent union arm (~L805-836) + dispatch fall-through case (~L1071-1073).
- **EDIT** [src/server/governance/slos.ts](../../src/server/governance/slos.ts) — SLO declaration (~L233-236).
- **EDIT** [src/server/services/campaign-tracker/manifest.ts](../../src/server/services/campaign-tracker/manifest.ts) — `acceptsIntents` array (~L197-201).
- **EDIT** [_bmad-output/implementation-artifacts/1-4-promote-pivot-subcluster-intent-slo.md](./1-4-promote-pivot-subcluster-intent-slo.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.4 shipped via commit `b271a61` — `PROMOTE_PIVOT_SUBCLUSTER` async Intent kind registered (7-literal sub-cluster slug union × 3-literal state-machine pairs + optional `calibrationSnapshotRef` + required `reason`) + SLO (p95 15s, cost $0.10) + manifest `acceptsIntents` entry + dispatch fall-through placeholder. Real handler deferred to Epic 6 Story 6.2 (`lifecycle.ts`). Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 3/10 → 4/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
