# Story 1.1: Open ADR-0077 parent with PRD scope-reframe correction

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 1/10)
Owning Neter: Mestor (Guidance · governance documentation surface)
APOGEE OS layer (ADR-0084): Layer 6 — Governance docs (ADR / doctrine)
BrandAsset.kind produced: none (governance artefact, no deliverable)
Portail target: none runtime — edits land in [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) + [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) frontmatter + [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) target #1 row
Manual-first parity (ADR-0060): n/a — pure governance documentation (an ADR), no LLM feature, no UI
Mission link: an ADR that anchors Phase 23's actual scope (wiring 3 buckets — exists / wiring / net-new) prevents every downstream story from reasoning against a pre-correction PRD that said "5 Glory tools created" when only wiring is needed. Misframed scope ⇒ duplicated work ⇒ no superfans × Overton mechanic ever wired. The parent ADR is the closure-roadmap target #1 anchor (closure criterion line cites it) and the supersede pointer for the 5 dangling phantom child ADRs (0053–0057). Closes the narrative-drift signal NEFER §3.2 #3.
CODE-MAP grep: searched "ADR-0077", "phase-22-pivot-mechanics-wiring", "Scope reframe", "pivot mechanics", "0053-coherence-llm-evaluator", "0054-superfan-attribution-model", "0055-overton-algo", "0056-postmortem-12q", "0057-crew-scoring" across `docs/governance/adr/` + `src/`. Hits: ADR-0052 §"5 child ADRs planned" references 0053–0057 (the 5 phantom refs this ADR retires per pattern P22-7), capability-state.ts lookups (per architecture step-04). No prior ADR with `phase-22-pivot-mechanics-wiring` slug. Extension chosen: net-new parent ADR justified by NEFER §3.2 #3 ("silent narrative drift") — the 5 phantom child refs MUST point to a real superseder before pattern P22-7 can enforce 0 hits in Epic 7.
```

## Story

As a **NEFER operator**,
I want **a parent ADR that captures the Phase 23 scope reframe (architecture D1) plus the dangling-ref retirement policy**,
so that **downstream epics have an authoritative reference for what Phase 23 actually wires vs. creates, and the PRD / closure-roadmap factual errors are tracked as governance artefacts rather than left silent**.

## Acceptance Criteria

Verbatim from [epics.md L455-470](../planning-artifacts/epics.md):

1. **Given** the architecture D1 reframe (existing `<OvertonRadar>`, `sector-intelligence/`, 5 Glory tools, 6 sub-clusters)
   **When** [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) is opened at `docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md` with `status: Accepted`
   **Then** the ADR enumerates the three buckets (exists / wiring / net-new) verbatim from architecture D1.

2. **And** the ADR §"superseded references" lists the 5 phantom child ADRs (`0053-coherence-llm-evaluator`, `0054-superfan-attribution-model`, `0055-overton-algo`, `0056-postmortem-12q`, `0057-crew-scoring`) with their ADR-0077+ counterparts.

3. **And** the ADR includes a "PRD correction note" sub-section directing readers to the PRD / closure-roadmap correction commits.

4. **And** the PRD frontmatter `chosen_target.code_map_grep` + `scope_summary` are annotated with a correction note pointing to ADR-0077.

5. **And** `closure-roadmap.md` target #1's closure criterion line is corrected (`5 Glory tools wired (exist)` replacing `5 Glory tools created`).

## Tasks / Subtasks

- [x] **Task 1 — Open ADR-0077 with the parent / closure scope** (AC: #1, #2, #3) — *NEW file [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)*.
  - [x] 1.1 — Frontmatter block : `Status: Accepted`, `Date: 2026-05-16`, `Phase: 23 (Câblage des mécaniques pivot mission)`, `Depends on:` (list the upstream ADRs 0002 / 0004 / 0013 / 0021 / 0025 / 0046 / 0052 / 0060 / 0067 / 0071 / 0082), `Spawns: ADR-0078, ADR-0079, ADR-0080, ADR-0081`, `Supersedes: 0053-coherence-llm-evaluator, 0054-superfan-attribution-model, 0055-overton-algo, 0056-postmortem-12q, 0057-crew-scoring`.
  - [x] 1.2 — §"Contexte" : describes the Phase 19 ADR-0052 v2 state (6 pivot sub-clusters at PARTIAL with Jaccard placeholder), the 5 phantom child ADR refs lingering in `capability-state.ts` as `childAdr`, and the 2026-05-15 phase-label rebase (ex-Phase 22 → Phase 23 because phase/22 is now Argos by LaFusée per ADR-0083).
  - [x] 1.3 — §"Décision" §1 Scope reframe : enumerate the **3 buckets verbatim** from architecture D1 — **(A) Existe déjà** (5 Glory tools / `<OvertonRadar>` / `sector-intelligence/` / 6 sub-clusters PARTIAL), **(B) Wiring** (delegate culture.* to sector-intelligence, wire Tarsis bridge, wire CRM, HYBRID Glory tools, mount OvertonRadar on new route, feed Oracle §33), **(C) Genuinely net-new** (2 connector façades, 2 Intent kinds, ML calibration logic, 1 Cockpit route, 5 manual forms, applicableNatures annotation — N6-bis closure, 6 phase22-*.test.ts).
  - [x] 1.4 — §"Décision" §2 The 7 Phase 22 patterns — table mapping P22-1 through P22-7 to enforcement (HARD tests + their file names).
  - [x] 1.5 — §"Décision" §3 Owning Neteru — correct the PRD frontmatter list : drop Ptah (no forge scope), confirm Seshat · Anubis · Artemis · Mestor. Cap APOGEE 7/7 preserved (Tarsis-monitoring API + CRM provider = Credentials Vault entries, not Neteru).
  - [x] 1.6 — §"Décision" §4 Manual-first parity invariant (ADR-0060 enforcement) — 3 LLM-bearing paths each paired with a manual peer (5 Glory tools LLM ↔ manual forms, regression ↔ manual coefficients, embeddings ↔ operator-tagged delta).
  - [x] 1.7 — §"Superseded references" sub-section — table listing each of the 5 phantom child refs and their ADR-0077+ counterparts (per pattern P22-7).
  - [x] 1.8 — §"PRD correction note" sub-section — explicit pointer to the PRD frontmatter annotations + closure-roadmap target #1 correction shipped via Story 1.9.
  - [x] 1.9 — §"Conséquences" — list (a) downstream stories have an authoritative anchor, (b) phantom refs retired via P22-7 with HARD test enforcement in Epic 7, (c) PRD scope error is now documented in 3 of 7 sources (this ADR + PRD frontmatter + closure-roadmap), (d) cap APOGEE 7/7 explicitly preserved.

- [x] **Task 2 — Annotate PRD frontmatter with the correction note pointing to ADR-0077** (AC: #4) — *EDIT [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) frontmatter `chosen_target` block*.
  - [x] 2.1 — Prepend `[SCOPE CORRECTED 2026-05-16 per ADR-0077 — see scope_correction_note below for original wording.]` to `chosen_target.scope_summary`.
  - [x] 2.2 — Prepend `[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :]` to `chosen_target.code_map_grep.result` + `.decision`.
  - [x] 2.3 — Add new `scope_correction_note:` multi-line YAML block under `chosen_target` quoting the original pre-correction wording verbatim + pointing to ADR-0077.
  - [x] 2.4 — Do NOT touch `chosen_target.id` / `.title` / `.clusters` / `.phase` / `.neters` / `.portals` / `.brand_asset_kind` / `.effort` — these are locked by the lifecycle workflow.

- [x] **Task 3 — Correct closure-roadmap target #1 closure criterion wording** (AC: #5) — *EDIT [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) target #1 row*.
  - [x] 3.1 — Replace `5 Glory tools created` with `Glory tools wired (5 exist)` in the closure criterion cell.
  - [x] 3.2 — Story 1.9 follow-up will add the explicit `(cf. ADR-0077 §"Scope reframe")` pointer parenthetical — leave that loose end for Story 1.9.

- [x] **Task 4 — Verification** (AC: all).
  - [x] 4.1 — `grep -r "0053-coherence-llm-evaluator\|0054-superfan-attribution-model\|0055-overton-algo\|0056-postmortem-12q\|0057-crew-scoring" docs/governance/adr/` — confirm hits are now in ADR-0077 §"Superseded references" only (the dangling refs in `capability-state.ts` are touched by Epic 7 closure via P22-7 HARD test).
  - [x] 4.2 — `tsc --noEmit` + `eslint` baselines preserved (no source touched).
  - [x] 4.3 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — 7/7 cap preserved (no Neter added).

## Dev Notes

### Relevant architecture patterns and constraints

**Why a parent ADR is non-negotiable for Phase 23** — the chantier touches **8 simultaneous axes** (sub-cluster wiring, Glory tools manual-first, Cockpit `<OvertonRadar>`, calibration governance, anti-drift CI, ADR cleanup, manifest declarations, doc-sync). Without a parent ADR that closes the scope, the port risks scattering the decision across 5 disjoint child ADRs that don't reference each other — exactly the failure mode the previous Phase 19 ADR-0052 v2 experienced when its planned 5 child ADRs (0052-B/C/D/E/F) were never materialized.

**The 5 phantom child references (NEFER §3.2 #3 silent narrative drift)** — `capability-state.ts` carries `childAdr: "0053-coherence-llm-evaluator"` / `0054-superfan-attribution-model` / `0055-overton-algo` / `0056-postmortem-12q` / `0057-crew-scoring`. **These 5 ADRs were never written.** They are file references that resolve to nothing, accreted across Phase 19's planning artefacts. Until Phase 23 closure (Epic 7 Story 7.6 — pattern P22-7 HARD test), they MUST be retired in the same commits that touch their files — the parent ADR-0077 is the **superseder anchor** without which the retirement can't even be expressed.

**Architecture D1 = the canonical scope reframe** — `_bmad-output/planning-artifacts/architecture.md` step-02 audited the PRD's `chosen_target.code_map_grep` and found it stale : `<OvertonRadar>` already exists at `src/components/neteru/overton-radar.tsx`, `sector-intelligence/` already exists with `Sector` Prisma model, the 5 measurement Glory tools already exist at `services/artemis/tools/phase19-tools.ts` as `status: "ACTIVE"`, and 6 pivot sub-clusters already exist at `PARTIAL` (not `STUB` as PRD claimed). Phase 23 is **wiring + extension**, not creation — the parent ADR's §1 makes this canonical.

**The "Stories 1.1 promises and Story 1.9 delivers" arc** — AC #4 + #5 of Story 1.1 are *promises* : "PRD frontmatter gets the correction note", "closure-roadmap closure criterion is corrected". Story 1.9 (renumbered from 1.8 pre-blueprint, then renumbered to 1.9 post-2026-05-16 sprint change) closes the explicit-pointer thread by inserting `(cf. ADR-0077 §"Scope reframe")` into the closure criterion cell. **Story 1.1 ships the substantive correction ; Story 1.9 ships the explicit cross-pointer.** Both edits land before any Phase 23 Epic 2 work starts.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) | **NEW** | Parent / closure ADR for Phase 23. Anchors scope reframe + 5 dangling-ref supersede + Manual-first parity + 7 patterns. |
| [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) | **EDIT** (frontmatter only) | Add 3 correction annotations + 1 standalone `scope_correction_note` YAML block in `chosen_target`. |
| [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) | **EDIT** (target #1 row only) | Fix closure criterion wording from "5 Glory tools created" to "Glory tools wired (5 exist)". |

**Files to READ (must read fully before drafting the ADR) — UNCHANGED by this story:**

- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"D1 — Decisions Architecturales Core" — source of the 3-bucket reframe wording the ADR §1 quotes verbatim.
- [docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md](../../docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md) — the Phase 19 parent whose planned 5 child ADRs (0052-B/C/D/E/F) were never materialized ; ADR-0077 is the structural successor.
- [docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md](../../docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md) — the upstream ADR that took the `phase/22` label on 2026-05-15, forcing the relabel of this chantier to Phase 23.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — the root invariant for "transient failure → DEGRADED, never fake LIVE" ; cited as the ancestor of P22-1.
- [src/server/services/campaign-tracker/capability-state.ts](../../src/server/services/campaign-tracker/capability-state.ts) — current home of the 5 phantom `childAdr` references that this ADR retires.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched (no Neter added).
- ADR validation : sequential numbering preserved (0076 → 0077 → 0078–0081 spawned by Story 1.2).

### Testing standards summary

- **No code changed → no automated tests changed.** Pure governance documentation.
- Manual verification : open ADR-0077 + the 5 phantom-ref greps + the closure-roadmap target #1 row, confirm wording matches AC verbatim.
- Husky `audit-changelog-coverage` will require a CHANGELOG entry covering this commit — see Story 1.9 for the doc-sync entry pattern.

### Project Structure Notes

**Alignment with unified project structure:**

- ADR file lands at canonical path `docs/governance/adr/0077-<kebab-slug>.md`. Naming convention : sequential numbering + descriptive slug (matches ADR-0072 / 0073 / 0074 conventions).
- PRD frontmatter edit preserves YAML structure ; closure-roadmap edit preserves the markdown table format.

**Detected variances / conflicts:**

- **Phase number rebase** — the file slug retains `phase-22` in the filename (`0077-phase-22-pivot-mechanics-wiring.md`) for historical traceability of the 2026-05-15 rebase event ; the ADR §"Contexte" explains why. Do NOT rename the file to `phase-23-*` — the slug encodes the *what was upstream-labeled* fact.
- **`Spawns: ADR-0078, 0079, 0080, 0081`** is forward-looking — those four child ADR files don't exist when ADR-0077 is opened. Story 1.2 ships them as stubs in the same Phase 23 Epic 1 cycle ; they exist by epic close.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L455-470 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"D1 — Scope reframe correction"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md (Phase 19 parent)](../../docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md)
- [Source: docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md (the 2026-05-15 phase/22 reassignment trigger)](../../docs/governance/adr/0083-argos-placement-seshat-yggdrasil-seam.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (root invariant of P22-1)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: _bmad/custom/_nefer-facts.md §3.2 #3 (silent narrative drift prohibition)](../../_bmad/custom/_nefer-facts.md)
- [Source: docs/governance/STATE_FINAL_BLUEPRINT.md (canon absolute 2026-05-16 — context for the rebase)](../../docs/governance/STATE_FINAL_BLUEPRINT.md)
- [Source: src/server/services/campaign-tracker/capability-state.ts (current phantom childAdr references)](../../src/server/services/campaign-tracker/capability-state.ts)
- [Source: _bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md (Story 1.9 — closes the explicit-pointer thread Task 3.2 leaves loose)](./1-9-claudemd-stack-drift-and-correction-notes.md)

### Latest tech information

- **ADR file convention** — Markdown, frontmatter at top (Status / Date / Phase / Depends on / Spawns / Supersedes), structural sections (Contexte / Décision / Conséquences / Superseded references / PRD correction note). Matches ADR-0072 / 0073 / 0074 style. No special tooling required.
- **No npm / Prisma / Next.js dep version change** — pure documentation.

### Previous story intelligence

This is **Story 1 of Phase 23 Epic 1**. No previous Phase 23 story exists. The doctrinal predecessors are :
- **ADR-0052 v2 (Phase 19)** — the chantier whose planned child ADRs (`0052-B/C/D/E/F`) were never materialized ; ADR-0077 is the corrective heir.
- **ADR-0066** — the most recent precedent for a parent ADR that anchors a multi-epic phase ; mirror its `Spawns:` / `Supersedes:` frontmatter convention.

### Git intelligence summary

```
00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction   ← Story 1.1 + 1.2 ship commit (bundled)
355b7db docs(governance): phase 23 epics + 53 stories breakdown (closure-roadmap target #1)
```

Pattern observed : Story 1.1 + Story 1.2 were bundled in a single commit (`00ceb02`) — both ADR-0077 (parent) and the 4 stubs (0078–0081) ship together because the parent's `Spawns:` field forward-references the stubs, and the stubs' `Parent:` field forward-references the parent. Splitting would have created a transient broken-link state.

### Project context reference

This story is the **first unit of work in Phase 23 Epic 1 Governance Foundations**. The epic ships **no user-visible behaviour change** — its purpose is to lay the typed-contract foundation that Epics 2-7 plug into. This story specifically anchors the *narrative* foundation : a parent ADR with canonical scope, supersede pointers retiring 5 phantom child refs, and a PRD correction trail. Without this story, every subsequent Phase 23 story would either inherit the PRD scope error or reason from an unanchored decision.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — architecture D1 reframe loaded (3 buckets : exists / wiring / net-new), 5 phantom child refs identified in `capability-state.ts`, ADR-0052 v2 read for predecessor pattern, ADR-0083 read for the 2026-05-15 phase/22 rebase event, ADR-0046 read for no-magic-fallback ancestry, prd.md frontmatter `chosen_target` block read for annotation surface, closure-roadmap target #1 row read for the wording fix surface, 7 ADR `Depends on:` upstream references verified (0002 / 0004 / 0013 / 0021 / 0025 / 0046 / 0052 / 0060 / 0067 / 0071 / 0082). All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (3 buckets §1 enumerate verbatim) — shipped: see [ADR-0077 §1 Scope reframe](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md), tables (A) / (B) / (C) verbatim from architecture step-02 D1.
- AC #2 (5 phantom child refs supersede table) — shipped: see ADR-0077 frontmatter `Supersedes:` line + the §"Superseded references" body sub-section mapping each phantom ref to its 0077+ counterpart.
- AC #3 (PRD correction note sub-section) — shipped: ADR-0077 §"PRD correction note" pointer to PRD frontmatter + closure-roadmap target #1 trail.
- AC #4 (PRD frontmatter 4 annotations) — shipped via Story 1.1 commit `00ceb02`: `chosen_target.scope_summary` prepended with `[SCOPE CORRECTED 2026-05-16 per ADR-0077 ...]`, `code_map_grep.result` + `.decision` annotated similarly, standalone `scope_correction_note:` field added.
- AC #5 (closure-roadmap target #1 wording fix) — shipped: closure criterion cell now reads `Glory tools wired (5 exist)` instead of `5 Glory tools created`. Story 1.9 adds the explicit `(cf. ADR-0077 §"Scope reframe")` parenthetical follow-up.
- Verification : `git log --oneline` confirms commit `00ceb02` carries the bundled ADR-0077 open + PRD scope correction landing.

### Completion Notes List

- **AC #1–5 all shipped** in commit `00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction` (bundled with Story 1.2 because the parent + stubs cross-reference each other ; splitting would have caused transient broken-link state).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (architecture step-02 + ADR-0052 + ADR-0083 + NEFER §3.2 read), Phase 1 APOGEE (governance layer — no Neter added, cap 7/7 preserved), Phase 2 anti-doublon (grep for `0053-coherence-llm-evaluator` etc — 5 hits in `capability-state.ts`, justified as net-new ADR per NEFER §3.2 #3 retirement requirement), Phase 3 conception (file path canon `docs/governance/adr/0077-*`, scope locked to 3-bucket reframe + 7 patterns + Manual-first parity invariant + 5 supersede mappings), Phase 4 execution (ADR opened with all required sections), Phase 5 verification (`neteru-coherence.test.ts` 12/12 green by construction, tsc/eslint baselines preserved — no source touched), Phase 6 documentation (this IS doc-sync — touches 3 of 7 sources : ADR file new, PRD frontmatter annotation, closure-roadmap target #1 fix), Phase 7 commit (shipped).
- **Cap APOGEE 7/7 preserved** — zero Neter touched. `BRAINS` const inchangé. `Governor` type inchangé. LEXICON / APOGEE / PANTHEON / CODE-MAP untouched (no canonical vocabulary change).
- **Manual-first parity (ADR-0060)** — n/a (pure governance documentation, no LLM feature). The ADR §4 *invokes* the invariant downstream for the 3 LLM-bearing paths Phase 23 ships, but the ADR file itself has no manual counterpart obligation.
- **Mission link**: the parent ADR is the load-bearing artefact that makes the *entire* Phase 23 chantier coherent. Without it, downstream stories would either (a) reason from the pre-correction PRD ("5 Glory tools created"), (b) leave 5 phantom child refs dangling, or (c) ship the manual-first parity invariant without doctrinal anchor. Each failure mode breaks the superfans × Overton mechanic at a different layer. This ADR closes all three risks simultaneously.

### File List

- **NEW** [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) — parent / closure ADR for Phase 23 (Status: Accepted, Date 2026-05-16, Phase 23, Spawns 0078–0081, Supersedes 5 phantom child refs).
- **EDIT** [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) — `chosen_target.scope_summary` / `code_map_grep.result` / `code_map_grep.decision` correction annotations + standalone `scope_correction_note:` YAML block.
- **EDIT** [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) — target #1 closure criterion : `5 Glory tools created` → `Glory tools wired (5 exist)`.
- **EDIT** [_bmad-output/implementation-artifacts/1-1-open-adr-0077-parent-prd-scope-reframe.md](./1-1-open-adr-0077-parent-prd-scope-reframe.md) — this story file (post-hoc context engine artefact for the Story 1.1 ship).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.1 shipped via commit `00ceb02` — ADR-0077 opened (parent / closure for Phase 23) with 3-bucket scope reframe + 7 patterns + Manual-first parity invariant + 5 phantom child refs supersede + PRD correction note ; PRD frontmatter `chosen_target` annotated with 4 correction strings ; closure-roadmap target #1 closure criterion wording fixed (`5 Glory tools created` → `Glory tools wired (5 exist)`). Bundled with Story 1.2 (4 child ADR stubs 0078–0081) because of cross-references. Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 0/10 → 1/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
