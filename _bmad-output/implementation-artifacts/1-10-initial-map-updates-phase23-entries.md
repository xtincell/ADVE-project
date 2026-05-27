# Story 1.10: Initial map updates — reserve Phase 23 entries

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 10/10 · final epic story)
Owning Neter: Mestor (Guidance · canonical map governance)
APOGEE OS layer (ADR-0084): Layer 6 — Governance docs (canonical maps)
BrandAsset.kind produced: none (governance documentation)
Portail target: none runtime — edits land in [docs/governance/PAGE-MAP.md](../../docs/governance/PAGE-MAP.md) + [docs/governance/ROUTER-MAP.md](../../docs/governance/ROUTER-MAP.md) + [docs/governance/SERVICE-MAP.md](../../docs/governance/SERVICE-MAP.md) + [docs/governance/COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md) (CODE-MAP.md auto-regen handles itself)
Manual-first parity (ADR-0060): n/a — pure documentation, no LLM feature
Mission link: canonical maps are the **anti-doublon early-warning system** (NEFER §3.2 #1) — every NEFER session boots by grepping these maps before proposing a new entity. Without skeletal Phase 23 entries reserved at Epic 1 time, Epics 2–7 would either (a) discover too late that their entries collide with each other, or (b) miss the maps in their PR and ship without doc-sync. Reserved entries surface the "you are not the first to think of `/cockpit/intelligence/overton`" signal at the moment of the original ADR-0077 scope decision, not 6 epics later. Indirect contribution to superfans × Overton, but a precondition for every direct contribution that follows.
CODE-MAP grep: searched "/cockpit/intelligence/overton", "campaign-tracker router Phase 23", "seshat/tarsis", "anubis/providers/crm-provider", "OvertonRadar consumed by route" across the 5 canonical maps. Hits: 0 prior Phase 23 entries (the maps still reflect the Phase 22 pre-rebase state). Extension chosen: skeletal reserved entries justified by architecture §"Phase 23 Touched Slice" tree — entries mark surfaces that Epics 2–7 will populate as their files land, preventing merge conflicts on the doc-sync surface.
```

## Story

As a **NEFER operator**,
I want **skeletal entries in PAGE-MAP / ROUTER-MAP / SERVICE-MAP / COMPONENT-MAP reserving Phase 23 surfaces**,
so that **downstream epics populate them as files land rather than fighting merge conflicts, and the canonical maps stay synchronized with implementation reality**.

## Acceptance Criteria

Verbatim from [epics.md L601-617](../planning-artifacts/epics.md):

1. **Given** the architecture §"Phase 23 Touched Slice" tree
   **When** the canonical maps are edited
   **Then** [PAGE-MAP.md](../../docs/governance/PAGE-MAP.md) gains a reserved entry for `/cockpit/intelligence/overton` (status: pending — Epic 7).

2. **And** [ROUTER-MAP.md](../../docs/governance/ROUTER-MAP.md) gains a "Phase 23 additions to `campaign-tracker` router (pending — Epic 6)" note.

3. **And** [SERVICE-MAP.md](../../docs/governance/SERVICE-MAP.md) gains pending entries for `services/seshat/tarsis/` and `services/anubis/providers/crm-provider` (Epic 2).

4. **And** [COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md) notes that `<OvertonRadar>` will be consumed by a route in Phase 23 (Epic 7) and that Phase-22 reusable patterns (degraded/empty, provenance, status-lifecycle, operator-judgement) will be documented (Epic 6/7).

5. **And** Husky pre-commit auto-regenerates CODE-MAP.md without conflict.

## Tasks / Subtasks

- [x] **Task 1 — PAGE-MAP.md : reserve `/cockpit/intelligence/overton`** (AC: #1) — *EDIT [docs/governance/PAGE-MAP.md](../../docs/governance/PAGE-MAP.md)*.
  - [x] 1.1 — Locate the Cockpit portal section. Add a reserved entry under a new (or existing) "Intelligence" sub-group :
    ```
    - `/cockpit/intelligence/overton` — Cockpit Overton Radar surface (Phase 23 Epic 7 Story 7.2 · status: pending) — mounts `<OvertonRadar>` (existing Tier 3 component) with `instance: full` CVA variant ; wired to real signal via `ConnectorResult<T>` ; degraded-state empty rendering ; paid-tier-gated read-only.
    ```
  - [x] 1.2 — If a "Intelligence" sub-group does not exist in the Cockpit section, create it minimally (just the new entry).
  - [x] 1.3 — Page count notation : if the file carries a global page count ("N pages mapped per portal"), increment Cockpit by 1 (or note "+1 pending — Epic 7"). Otherwise leave as-is.

- [x] **Task 2 — ROUTER-MAP.md : note Phase 23 additions to `campaign-tracker` router** (AC: #2) — *EDIT [docs/governance/ROUTER-MAP.md](../../docs/governance/ROUTER-MAP.md)*.
  - [x] 2.1 — Locate the `campaign-tracker` router section. Append a note line :
    ```
    > **Phase 23 additions (pending — Epic 6 / Epic 7) :** new tRPC procedures for `runCalibration`, `acceptCalibration`, `rejectCalibration`, `promoteSubcluster`, `listSubclusterStates`, calibration-snapshot accessors, OvertonRadar tRPC reads. Reserved here ; populated as Epic 6 / 7 stories ship.
    ```
  - [x] 2.2 — Do NOT enumerate the procedure list exhaustively at scaffold time — the exact procedure surface is fixed by Epic 6 Stories 6.1–6.6 + Epic 7 Story 7.3. The note is a placeholder pointing at the pending population.

- [x] **Task 3 — SERVICE-MAP.md : pending entries for connector façades** (AC: #3) — *EDIT [docs/governance/SERVICE-MAP.md](../../docs/governance/SERVICE-MAP.md)*.
  - [x] 3.1 — Locate the Seshat sub-section. Append :
    ```
    - `services/seshat/tarsis/connector.ts` — Tarsis-monitoring API façade (Phase 23 Epic 2 Story 2.2 · status: pending) — returns `ConnectorResult<TarsisSignal>` per P22-1 ; reads credentials via `tenantScopedDb` per-Operator (NFR4 / NFR5) ; consumed by `services/sector-intelligence/` + `campaign-tracker/culture.tarsisBridge`.
    ```
  - [x] 3.2 — Locate the Anubis sub-section. Append :
    ```
    - `services/anubis/providers/crm-provider.ts` — CRM provider façade with field-level PII redaction (Phase 23 Epic 2 Story 2.3 · status: pending) — returns `ConnectorResult<CrmCohortSignal>` per P22-1 ; redaction applied before any cohort row leaves the façade (NFR6) ; consumed by `services/campaign-tracker/superfan-economy.ts` (`superfan.stickiness` + `superfan.crmCapture`).
    ```
  - [x] 3.3 — Both entries are pending until Epic 2 ships ; flag with `· status: pending` so a stale-reading consumer cannot mistake reservation for shipped state.

- [x] **Task 4 — COMPONENT-MAP.md : OvertonRadar consumption + Phase 22 reusable patterns** (AC: #4) — *EDIT [docs/governance/COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md)*.
  - [x] 4.1 — Locate the entry for `<OvertonRadar>` (existing Tier 3 component at `src/components/neteru/overton-radar.tsx`). Append a "Phase 23 consumption" annotation : `Will be consumed by a new Cockpit route `/cockpit/intelligence/overton` (Phase 23 Epic 7 Story 7.2 · status: pending) — gains `instance: "full" | "teaser"` CVA variant + container-query reflow + `<OvertonPanel>` Cockpit wrapper for tRPC + Suspense boundary.`
  - [x] 4.2 — Append a new "Phase 22 reusable patterns (documented during Phase 23)" sub-section listing 4 patterns (each marked `· status: pending — Epic 6/7 Story`) :
    - **Degraded/empty state pattern** (single canonical `empty-state` treatment for all `ConnectorResult` non-LIVE branches — Story 3.7 / 4.7 / 7.5 deliveries).
    - **`ProvenancePopover` pattern** (thin composition over `popover` primitive ; 4 call sites — status grid / calibration panel / OvertonRadar events / Cockpit scores — Epic 6 Story 6.X).
    - **Status-lifecycle triad pattern** (colour + shape/icon + text label triad ; `DEFERRED` uses info tone — Epic 2 Story 2.4 introduction + Epic 6 reuse).
    - **Operator-judgement pattern** (explicit operator act → primary/ghost button pair → hash-chained attributed event → confirmation linking the resulting snapshot — Epic 6 Story 6.4 `CalibrationReviewPanel` first surface).
  - [x] 4.3 — Each pattern entry is one line at scaffold time ; Epic 6/7 Stories expand into full documentation when the pattern's first canonical site ships.

- [x] **Task 5 — CODE-MAP.md auto-regen verification** (AC: #5) — *no manual edit ; husky hook handles it*.
  - [x] 5.1 — Commit the 4 edits ; husky pre-commit hook runs `scripts/gen-code-map.ts` which auto-regenerates `docs/governance/CODE-MAP.md`. Confirm the regen produces a clean diff (no merge conflict).
  - [x] 5.2 — Spot-check : `grep -c "Phase 23" docs/governance/CODE-MAP.md` increments (the regen should pick up new synonyms from prior commits — `attributionCoefficients`, `ConnectorResult`, `PROMOTE_PIVOT_SUBCLUSTER`, etc. — that landed in Stories 1.3 / 1.4 / 1.5 / 1.6 but may not yet have been in CODE-MAP).

- [x] **Task 6 — Verification** (AC: all).
  - [x] 6.1 — Re-read each of the 4 edited maps ; confirm the reservation entries cite Phase 23 Epic + Story numbers + `status: pending` markers.
  - [x] 6.2 — `git diff --stat` shows touches limited to the 4 maps + CODE-MAP regen + this story file. No `src/**` / `tests/**` / `prisma/**` touched.
  - [x] 6.3 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — 7/7 cap preserved.
  - [x] 6.4 — Husky `audit-changelog-coverage` hook green on commit (Story 1.9 ship will have already shipped a CHANGELOG entry that covers this commit if bundled, OR a fresh entry per `_nefer-commit.md` P6).

## Dev Notes

### Relevant architecture patterns and constraints

**The 5 canonical maps + their roles** :
- **CODE-MAP.md** : synonym table (e.g. "vault de marque" ↔ `BrandAsset`) ; auto-regenerated pre-commit by `scripts/gen-code-map.ts`. **No manual edit** for this story — the regen picks up new synonyms from prior Story 1.3 / 1.4 / 1.5 / 1.6 commits.
- **PAGE-MAP.md** : per-portal route inventory (165+ pages today). Hand-maintained. This story adds 1 reserved entry under Cockpit · Intelligence.
- **ROUTER-MAP.md** : tRPC routers grouped by sub-system. Hand-maintained. This story adds a "Phase 23 additions" placeholder note on `campaign-tracker`.
- **SERVICE-MAP.md** : per-Neter service inventory. Hand-maintained. This story adds 2 pending entries (Seshat / Anubis).
- **COMPONENT-MAP.md** : design-system primitives + Neteru kit + portal-specific components. Hand-maintained. This story annotates `<OvertonRadar>` + lists 4 reusable patterns to document.

**Why "reserved" + "pending" markers matter** — without explicit reservation, a future NEFER session boot-grep against PAGE-MAP would return 0 hits for `/cockpit/intelligence/overton`, and the operator might **propose creating** that route as if it were net-new — wasting cycles re-deriving the architectural decision. The reserved entries are the **anti-doublon early signal** : "this surface is already planned ; populate, don't create."

**Map maintenance cadence** — per `_nefer-checks.md` Step C2 + Step P4 (in `_nefer-commit.md`) :
- Touch a Prisma model / Intent kind → CODE-MAP regen handles it.
- Touch a route / page → PAGE-MAP hand-update in the same PR.
- Touch a tRPC procedure → ROUTER-MAP hand-update.
- Touch a service file → SERVICE-MAP hand-update.
- Touch a component → COMPONENT-MAP hand-update.

This story pre-reserves entries that **don't yet exist** ; the rule above still applies for Epics 2–7 — when they ship files, they upgrade the reservation to a populated entry (one map edit per Epic Story that touches a mapped surface).

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [docs/governance/PAGE-MAP.md](../../docs/governance/PAGE-MAP.md) | **EDIT** | Reserve `/cockpit/intelligence/overton` under Cockpit · Intelligence. |
| [docs/governance/ROUTER-MAP.md](../../docs/governance/ROUTER-MAP.md) | **EDIT** | Add "Phase 23 additions" note on `campaign-tracker` router. |
| [docs/governance/SERVICE-MAP.md](../../docs/governance/SERVICE-MAP.md) | **EDIT** | Pending entries for `seshat/tarsis/connector.ts` + `anubis/providers/crm-provider.ts`. |
| [docs/governance/COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md) | **EDIT** | Annotate `<OvertonRadar>` Phase 23 consumption + list 4 reusable patterns. |
| [docs/governance/CODE-MAP.md](../../docs/governance/CODE-MAP.md) | **AUTO** (husky regen) | Picks up synonyms from prior commits ; no manual edit. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"Phase 23 Touched Slice" — canonical source for the surfaces being reserved.
- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) — scope reframe (3 buckets : exists / wiring / net-new). The "net-new" bucket aligns with the maps to update.
- [_bmad/custom/_nefer-checks.md](../../_bmad/custom/_nefer-checks.md) Step C2 — canonical maps inventory + when to grep each.
- [_bmad/custom/_nefer-commit.md](../../_bmad/custom/_nefer-commit.md) Step P4 — doc-sync convention (5 maps + when to hand-update vs auto-regen).
- The 4 existing canonical maps (PAGE-MAP / ROUTER-MAP / SERVICE-MAP / COMPONENT-MAP) — read fully to understand the existing structure + sub-section conventions before adding entries.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- Husky `audit-changelog-coverage` hook — green on commit.
- Husky CODE-MAP regen hook — produces a clean diff (no merge conflict).

### Testing standards summary

- **No code changed → no automated tests changed.** Pure governance documentation.
- The verification gate is the husky hook (CODE-MAP regen + audit-changelog-coverage).
- Manual reading-pass on the 4 edited maps to confirm reservation entries match the AC wording.

### Project Structure Notes

**Alignment with unified project structure:**

- All 4 hand-edited maps at canonical paths `docs/governance/<MAP>.md`. Edits append to existing sub-sections ; no map structural reorganization.
- CODE-MAP auto-regen via `scripts/gen-code-map.ts` is pre-commit ; no manual edit.

**Detected variances / conflicts:**

- **Sub-section creation in PAGE-MAP** — if the Cockpit section does not yet have an "Intelligence" sub-group, this story creates one minimally (just the one entry). Epic 7 Story 7.6 (cockpitNavGroups Intelligence entry) lands the runtime nav group + may expand the sub-section.
- **CODE-MAP regen** — the regen script may pick up synonyms from prior commits (Story 1.3 `ConnectorResult` ; Story 1.4 `PROMOTE_PIVOT_SUBCLUSTER` ; etc.) that haven't yet appeared. This is expected ; the regen reflects current schema/state reality. Spot-check (Task 5.2) confirms.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L601-617 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"Phase 23 Touched Slice"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Scope reframe — bucket (C) Genuinely net-new"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: _bmad/custom/_nefer-checks.md Step C2 (canonical maps inventory)](../../_bmad/custom/_nefer-checks.md)
- [Source: _bmad/custom/_nefer-commit.md Step P4 (doc-sync convention)](../../_bmad/custom/_nefer-commit.md)
- [Source: docs/governance/PAGE-MAP.md (existing structure)](../../docs/governance/PAGE-MAP.md)
- [Source: docs/governance/ROUTER-MAP.md (existing structure)](../../docs/governance/ROUTER-MAP.md)
- [Source: docs/governance/SERVICE-MAP.md (existing structure)](../../docs/governance/SERVICE-MAP.md)
- [Source: docs/governance/COMPONENT-MAP.md (existing structure + `<OvertonRadar>` entry)](../../docs/governance/COMPONENT-MAP.md)
- [Source: docs/governance/CODE-MAP.md (auto-regenerated — observed shape)](../../docs/governance/CODE-MAP.md)
- [Source: src/components/neteru/overton-radar.tsx (existing Tier 3 component being annotated)](../../src/components/neteru/overton-radar.tsx)
- [Source: _bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md (sibling doc-sync story)](./1-9-claudemd-stack-drift-and-correction-notes.md)

### Latest tech information

- **`scripts/gen-code-map.ts`** — pre-commit hook regenerates `CODE-MAP.md` from `src/` Prisma schema + Intent kind enum + service registry. No manual edit needed.
- **Husky 9.x** — `.husky/pre-commit` runs both CODE-MAP regen and `audit-changelog-coverage` scripts ; both must pass.
- **No npm install needed** — pure documentation.

### Previous story intelligence

- **Stories 1.1 / 1.2 (ADRs 0077 + 0078–0081)** — establish the "net-new surface" enumeration that this story reserves entries for.
- **Stories 1.3 / 1.4 / 1.5 / 1.6** — shipped concrete entities (`ConnectorResult<T>`, 2 Intent kinds, 4 schema fields) ; CODE-MAP regen picks up their synonyms automatically.
- **Story 1.9 (CLAUDE.md doc-sync)** — sibling doc-sync convention reference. Story 1.10 is the *map* analogue.

### Git intelligence summary

```
af75515 docs(governance): phase 23 CLAUDE.md state + reserve PAGE/ROUTER/SERVICE/COMPONENT-MAP entries   ← Story 1.10 ship commit (bundled with CLAUDE.md edit)
3658e8c governance(domain): phase 23 additive migration on Campaign + CampaignAction
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders
```

Pattern observed : Story 1.10 bundled with Phase 23 CLAUDE.md "Phase status" entry in commit `af75515` (the CLAUDE.md update is what Story 1.9 verifies post-hoc — Story 1.9 didn't actually edit CLAUDE.md since it was already correct, per the convergence-not-churn mandate of Story 1.9). The map edits + the CLAUDE.md state update form a logical "Phase 23 doc-sync foundations" commit.

### Project context reference

This story is **Story 10 of Phase 23 Epic 1 Governance Foundations — the final epic story**. After this story, Epic 1 is **closed (10/10 stories shipped)** and Phase 23 Epic 2 (External Signal Connectors via Credentials Vault) can start. The closure-roadmap target #1 status transitions from `EPICS_DRAFTED ✓` toward `IN_DEV` for real downstream work.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — architecture §"Phase 23 Touched Slice" tree read for the surface enumeration ; ADR-0077 §"Scope reframe — bucket (C) Genuinely net-new" read for the canonical net-new list ; `_nefer-checks.md` Step C2 + `_nefer-commit.md` Step P4 read for map maintenance convention ; existing 4 canonical maps read for their structure + sub-section conventions ; `<OvertonRadar>` existing entry in COMPONENT-MAP verified before annotation. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (PAGE-MAP `/cockpit/intelligence/overton` reserved entry) — shipped : Cockpit section gains the "Intelligence" sub-group with the canonical reservation entry citing Phase 23 Epic 7 Story 7.2 + `status: pending`.
- AC #2 (ROUTER-MAP `campaign-tracker` Phase 23 additions note) — shipped : note appended to the `campaign-tracker` router section pointing at Epic 6 / Epic 7 population.
- AC #3 (SERVICE-MAP 2 pending entries) — shipped : Seshat sub-section gains `tarsis/connector.ts` entry ; Anubis sub-section gains `providers/crm-provider.ts` entry ; both flagged `· status: pending` for Epic 2.
- AC #4 (COMPONENT-MAP OvertonRadar annotation + 4 reusable patterns) — shipped : `<OvertonRadar>` entry annotated with Phase 23 consumption note ; new sub-section "Phase 22 reusable patterns (documented during Phase 23)" lists the 4 patterns at one line each.
- AC #5 (CODE-MAP regen clean) — verified : husky pre-commit hook ran `scripts/gen-code-map.ts` ; diff is clean (no merge conflict ; picks up `ConnectorResult` / `PROMOTE_PIVOT_SUBCLUSTER` / `attributionCoefficients` synonyms from prior commits as expected).
- Verification : `git log --oneline | grep "phase 23 CLAUDE.md state\|reserve PAGE\|reserve"` confirms commit `af75515 docs(governance): phase 23 CLAUDE.md state + reserve PAGE/ROUTER/SERVICE/COMPONENT-MAP entries`.

### Completion Notes List

- **AC #1–5 all shipped** in commit `af75515` (bundled with the CLAUDE.md Phase 23 "Phase status" state update — same doc-sync surface).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (architecture §"Phase 23 Touched Slice" + ADR-0077 §"Scope reframe — net-new bucket" + `_nefer-checks.md` Step C2 + `_nefer-commit.md` Step P4 + 4 existing maps read), Phase 1 APOGEE (Layer 6 governance docs ; no Neter / service added, cap 7/7 preserved), Phase 2 anti-doublon (grep returned 0 hits for the new reservations across all 4 maps), Phase 3 conception (4 hand-edits at canonical paths + CODE-MAP auto-regen), Phase 4 execution (4 edits applied with `status: pending` markers + Epic + Story citations), Phase 5 verification (CODE-MAP regen clean / `neteru-coherence.test.ts` 12/12 green / git diff scope limited to docs), Phase 6 documentation (this IS doc-sync — the 4 maps ARE the documentation surface, Step P4 satisfied), Phase 7 commit (shipped via `af75515`).
- **Cap APOGEE 7/7 preserved** — pure documentation, no Neter / service / route shipped (only reservations).
- **Manual-first parity (ADR-0060)** — n/a (pure documentation).
- **Mission link**: canonical maps are the **anti-doublon early-warning system** (NEFER §3.2 #1). Reservation entries at Epic 1 prevent every Epic 2–7 NEFER boot from re-proposing surfaces already architected. Indirect contribution to superfans × Overton, but a precondition for every direct contribution that follows.
- **Epic 1 closure achieved** — with this story, Phase 23 Epic 1 is 10/10 stories shipped. Closure-roadmap target #1 status `EPICS_DRAFTED ✓` is now ready to transition to `IN_DEV` as Epic 2 starts.

### File List

- **EDIT** [docs/governance/PAGE-MAP.md](../../docs/governance/PAGE-MAP.md) — Cockpit · Intelligence sub-group + 1 reserved entry `/cockpit/intelligence/overton` (Epic 7 Story 7.2 · pending).
- **EDIT** [docs/governance/ROUTER-MAP.md](../../docs/governance/ROUTER-MAP.md) — `campaign-tracker` router section + Phase 23 additions note (Epic 6 / Epic 7 · pending).
- **EDIT** [docs/governance/SERVICE-MAP.md](../../docs/governance/SERVICE-MAP.md) — Seshat sub-section + `tarsis/connector.ts` entry (Epic 2 Story 2.2 · pending) ; Anubis sub-section + `providers/crm-provider.ts` entry (Epic 2 Story 2.3 · pending).
- **EDIT** [docs/governance/COMPONENT-MAP.md](../../docs/governance/COMPONENT-MAP.md) — `<OvertonRadar>` annotation (Epic 7 Story 7.2 · pending consumption by `/cockpit/intelligence/overton`) + new sub-section "Phase 22 reusable patterns (documented during Phase 23)" listing the 4 patterns.
- **AUTO** [docs/governance/CODE-MAP.md](../../docs/governance/CODE-MAP.md) — husky pre-commit regen ; picks up synonyms from prior Story 1.3 / 1.4 / 1.5 / 1.6 commits.
- **EDIT** [_bmad-output/implementation-artifacts/1-10-initial-map-updates-phase23-entries.md](./1-10-initial-map-updates-phase23-entries.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.10 shipped via commit `af75515` (bundled with CLAUDE.md Phase 23 "Phase status" entry update) — 4 canonical maps reserved Phase 23 surfaces : PAGE-MAP `+1 /cockpit/intelligence/overton` (Epic 7) · ROUTER-MAP `+ campaign-tracker Phase 23 additions note` (Epic 6/7) · SERVICE-MAP `+ tarsis/connector.ts + providers/crm-provider.ts` (Epic 2) · COMPONENT-MAP `+ OvertonRadar consumption annotation + 4 Phase 22 reusable patterns sub-section` (Epic 6/7). CODE-MAP auto-regen clean. Cap APOGEE 7/7 preserved. **Phase 23 Epic 1 progress 9/10 → 10/10 — Epic 1 CLOSED.** Closure-roadmap target #1 ready to transition `EPICS_DRAFTED ✓` → `IN_DEV` as Epic 2 starts. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
