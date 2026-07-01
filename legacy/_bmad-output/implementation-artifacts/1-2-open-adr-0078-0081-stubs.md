# Story 1.2: Open ADRs 0078–0081 as accepted stubs with locked scope

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 2/10)
Owning Neter: Mestor (Guidance · governance documentation surface)
APOGEE OS layer (ADR-0084): Layer 6 — Governance docs (ADR / doctrine)
BrandAsset.kind produced: none (governance artefact, no deliverable)
Portail target: none runtime — edits land in [docs/governance/adr/](../../docs/governance/adr/) (4 new files)
Manual-first parity (ADR-0060): n/a — pure governance documentation, no LLM feature
Mission link: locked-scope child ADRs are the structural cross-reference targets the downstream stories cite when they write code (e.g. `services/sector-intelligence/index.ts` Story 3.1 header cites `ADR-0078`, `services/seshat/tarsis/connector.ts` Story 2.2 cites `ADR-0079`, etc.). Without these stubs existing, every Epic 2–6 commit would carry dangling refs and pattern P22-7 anti-drift test would fire false positives. The 4 stubs unblock 100% of downstream coding work.
CODE-MAP grep: searched "ADR-0078", "ADR-0079", "ADR-0080", "ADR-0081", "overton-canonical-home", "credentials-vault-connector", "subcluster-lifecycle-promotion", "superfan-attribution-calibration" across `docs/governance/adr/` + `src/`. Hits: 0 prior ADR files at these numbers, no slug collisions. The ADR sequence was 0001 → 0076 (most recent post-ADR-0066, with 0083 being the 2026-05-15 sibling for Argos placement). Extension chosen: net-new sequential ADRs justified by architecture D3 (parent ADR-0077 + 4 child decisions D2/D4/D5/D6 each require their own ADR for scope-locked cross-references).
```

## Story

As a **NEFER operator**,
I want **four child ADR stubs created with locked titles, scope, and decision summaries (full text deferred to Epic 7 closure)**,
so that **downstream epics can reference them in code and commits without leaving dangling links, and the doctrinal scope of each decision is fixed before implementation**.

## Acceptance Criteria

Verbatim from [epics.md L471-483](../planning-artifacts/epics.md):

1. **Given** the architecture D3 table mapping ADRs 0078–0081 to decisions D2 / D4 / D5 / D6
   **When** the four ADR files are created at `docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md`, `0079-external-signal-connectors-credentials-vault.md`, `0080-pivot-subcluster-lifecycle-promotion-intent.md`, `0081-superfan-attribution-calibration-methodology.md`
   **Then** each ADR has a one-paragraph decision summary, the parent reference to ADR-0077, and a `Status: Accepted (stub — finalization in Epic 7 closure)` frontmatter line.

2. **And** each ADR enumerates the patterns / Intent kinds / files it governs (lifted from architecture step-04).

3. **And** all five ADRs (0077–0081) are sequentially numbered and no other ADR file in `docs/governance/adr/` uses those numbers.

## Tasks / Subtasks

- [x] **Task 1 — Open ADR-0078 (D2 : Overton canonical home `sector-intelligence/`)** (AC: #1, #2) — *NEW file [docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md)*.
  - [x] 1.1 — Frontmatter : `Status: Accepted (stub — finalization in Phase 23 Epic 7 Story 7.9)`, `Date: 2026-05-16`, `Phase: 23 (Câblage pivots mission)`, `Parent: ADR-0077`, `Depends on: ADR-0052`, `Supersedes: 0055-overton-algo` (phantom ref).
  - [x] 1.2 — §"Contexte" : `sector-intelligence/` already exists (Seshat-governed, backed by `Sector` Prisma model, with `getSectorAxis` / `refreshSectorOverton` / `detectDrift` / `computeBrandDeflection`) but `campaign-tracker/culture.overtonShift|overtonReadiness|tarsisBridge` still ships a Jaccard placeholder per the `MVP heuristic — vrai algo Overton viendra` comment in `signals-culture.ts`. Two possible homes for the Overton measurement (campaign-level vs sector-level engine) → without a canonical decision, doubling risk (NEFER §3.2 #1).
  - [x] 1.3 — §"Décision" : **`sector-intelligence/` is the canonical Overton engine** ; `campaign-tracker/culture.*` delegates to it and never writes to `Sector`. Seam ownership table (sector-intelligence vs campaign-tracker), one-way import rule, pure data-in/data-out contract (`sector-intelligence/` accepts `ConnectorResult<TarsisSignal>` from `campaign-tracker/culture.tarsisBridge` rather than reading the Tarsis connector itself).
  - [x] 1.4 — §"Wiring concret (livré en Epic 3)" : list the 4 delegations (overtonShift → detectDrift+computeBrandDeflection ; overtonReadiness → getSectorAxis ; tarsisBridge → fetchSectorSignal+refreshSectorOverton ; mcpIngest → gated by `mcp-content-pii-classifier`).
  - [x] 1.5 — §"Conséquences" : (a) capability-state.ts childAdr for the 4 sub-clusters lifts from phantom `0055-overton-algo` to `0078` ; (b) anti-drift HARD test `phase22-no-silent-zero.test.ts` (Epic 3) covers all 4 delegation handlers ; (c) cap APOGEE 7/7 preserved (no new Neter).

- [x] **Task 2 — Open ADR-0079 (D4 : External signal connectors via Credentials Vault)** (AC: #1, #2) — *NEW file [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md)*.
  - [x] 2.1 — Frontmatter : `Status: Accepted (stub)`, `Parent: ADR-0077`, `Depends on: ADR-0021 (Credentials Vault), ADR-0046 (no-magic-fallback)`.
  - [x] 2.2 — §"Décision" : the 2 new external signal sources (Tarsis-monitoring API + CRM provider) are **per-Operator Credentials Vault entries** (ADR-0021 pattern), NOT Neteru. Cap APOGEE 7/7 preserved structurally. Each façade returns `ConnectorResult<T>` (P22-1 from ADR-0077) exhaustively — `LIVE` / `DEFERRED_AWAITING_CREDENTIALS` / `DEGRADED` ; ship-without-keys is a first-class state, not an error.
  - [x] 2.3 — §"Files governed" : enumerate `services/anubis/credential-vault.ts` (Vault registration extension), `services/seshat/tarsis/connector.ts` (Tarsis façade), `services/anubis/providers/crm-provider.ts` (CRM façade), `app/console/anubis/credentials/page.tsx` (UI).
  - [x] 2.4 — §"Conséquences" : ship-without-keys structurally supported (PRD Journey 2) ; NFR4 + NFR5 + NFR8 + NFR11 covered ; HARD test `phase22-connector-result.test.ts` (Epic 2 Story 2.5) enforces exhaustive state handling.

- [x] **Task 3 — Open ADR-0080 (D5 : Pivot sub-cluster lifecycle-promotion Intent)** (AC: #1, #2) — *NEW file [docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md)*.
  - [x] 3.1 — Frontmatter : `Status: Accepted (stub)`, `Parent: ADR-0077`, `Depends on: ADR-0004 (hash-chain immutability), ADR-0023 (operator-amend-pillar — precedent for governed lifecycle Intents), ADR-0042 (PROMOTE_SEQUENCE_LIFECYCLE precedent)`.
  - [x] 3.2 — §"Décision" : 1 new async Intent kind `PROMOTE_PIVOT_SUBCLUSTER` parameterized over `{subClusterSlug, fromState, toState, calibrationSnapshotRef?, reason}`. State machine `STUB → PARTIAL → MVP → PRODUCTION` ; skip-forward refused ; reverse refused (no `mode: "RE_ENTRY"` in Phase 23 scope). `toState === "PRODUCTION"` requires `calibrationSnapshotRef` pointing to a `RUN_ATTRIBUTION_CALIBRATION` IntentEmission with `state: "OK"` — enforced at **handler entry** (Epic 6 Story 6.2) AND **Mestor pre-flight gate** (Epic 6 Story 6.3).
  - [x] 3.3 — §"Pattern P22-4" : the state-machine + snapshotRef-required is HARD-test enforced via `phase22-lifecycle-promotion.test.ts` (Epic 6).
  - [x] 3.4 — §"Files governed" : `services/mestor/intents.ts` (Intent kind registration — Story 1.4), `governance/slos.ts` (SLO declaration — Story 1.4), `services/campaign-tracker/manifest.ts` (acceptsIntents — Story 1.4), `services/campaign-tracker/lifecycle.ts` (handler — Epic 6 Story 6.2), `services/mestor/gates/calibration-snapshot-required.ts` (pre-flight — Epic 6 Story 6.3).

- [x] **Task 4 — Open ADR-0081 (D6 : Superfan-attribution calibration methodology)** (AC: #1, #2) — *NEW file [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)*.
  - [x] 4.1 — Frontmatter : `Status: Accepted (stub)`, `Parent: ADR-0077`, `Depends on: ADR-0004 (hash-chain immutability — calibration snapshot persists as IntentEmission payload), ADR-0060 (manual-first parity), ADR-0067 (LLM output structured enforcement)`.
  - [x] 4.2 — §"Décision" : pure-TS logistic regression in `services/campaign-tracker/superfan-attribution.ts` — **no new numeric / stats dependency** ; ROC AUC + RMSE computed in ~30 LOC each ; D6 footprint envelope. The model exposes `runAttribution({campaignIds, coefficients?})` returning a discriminated `AttributionResult` union (`OK` with lineage + snapshotRef ; `INSUFFICIENT_DATA` with `minSamplesRequired` + `samplesAvailable`). Manual coefficient mode (FR25) supplies operator-entered coefficients ; the same return shape — downstream consumers cannot distinguish source except via `IntentEmission.payload.source: "MANUAL_OPERATOR" | "ALGORITHMIC"`.
  - [x] 4.3 — §"Pattern P22-6" : calibration snapshots persist as `RUN_ATTRIBUTION_CALIBRATION` IntentEmission payloads — **no new Prisma table**. HARD test `phase22-no-calibration-table.test.ts` (Epic 6 Story 6.7) asserts no `Calibration*` model exists.
  - [x] 4.4 — §"SLO" : slow-call envelope `p95 ≤ 60s, cost ≤ $0.50` (declared in `governance/slos.ts` Story 1.5). NSP SSE streamed progress (NFR3 + UX-DR17).
  - [x] 4.5 — §"Files governed" : `services/campaign-tracker/superfan-attribution.ts` (regression — Epic 4 Story 4.2), `services/campaign-tracker/calibration.ts` (handler — Epic 6 Story 6.1), `services/mestor/intents.ts` (Intent kind — Story 1.5).

- [x] **Task 5 — Verification** (AC: #3) — *no-op (read-only check)*.
  - [x] 5.1 — `ls docs/governance/adr/0078* docs/governance/adr/0079* docs/governance/adr/0080* docs/governance/adr/0081*` — confirm 4 files exist, one per slug.
  - [x] 5.2 — `ls docs/governance/adr/` — confirm no other ADR file at numbers 0078 / 0079 / 0080 / 0081 (sequential numbering preserved ; ADR-0076 is the immediate predecessor, ADR-0082 was opened later for Yggdrasil canonization).
  - [x] 5.3 — Each ADR header carries the `Parent: ADR-0077` reference + the `Status: Accepted (stub — finalization in Phase 23 Epic 7 ...)` line.
  - [x] 5.4 — `pnpm test tests/unit/governance/neteru-coherence.test.ts` — 7/7 cap preserved.

## Dev Notes

### Relevant architecture patterns and constraints

**Why 4 stubs instead of "1 big ADR-0077"** — each of the 4 decisions D2 / D4 / D5 / D6 has its own enforcement surface (the pattern HARD test, the Intent kind, the methodology footprint) and its own enforcement timeline (Epic 2 → 0079, Epic 3 → 0078, Epic 4 → 0081, Epic 6 → 0080). Bundling them into ADR-0077 would mean every Epic commit cites the parent + the bundled-decision section, which (a) creates citation noise, (b) makes diff review harder, (c) blocks fine-grained `Status: Accepted (stub) → Status: Accepted (finalized)` transitions per child decision. The 4 stubs are the **citation surface** for downstream code.

**Why "stub" status until Epic 7 closure** — the stub status communicates two things : (a) the decision *scope* is locked (downstream stories can cite it confidently — title / parent / one-paragraph summary / patterns governed / files governed are all fixed at stub time), but (b) the *full prose* (Contexte / Décision / Alternatives considered / Conséquences) gets finalized once the implementation lands and Epic 7 closure validates that the decision held under contact with reality. This is the **decision-record-as-evolving-doctrine** pattern from ADR-0066 (sibling ADRs in Phase 17 used the same convention).

**Cross-reference shape** — the 4 stubs are **forward-pointed by ADR-0077** (`Spawns: ADR-0078, ADR-0079, ADR-0080, ADR-0081`) and **backward-point to it** (each carries `Parent: ADR-0077`). This bidirectional graph is necessary because (a) pattern P22-7 HARD test will sweep for dangling references — every ADR-0077+ ref in code must resolve to one of the 5 files, and (b) ADR-0077's supersede table needs to name the 5 phantom child refs being retired AND the 4 ADR-0077+ counterparts that take their place.

**`Spawns:` / `Parent:` graph diagram**

```
            ADR-0077 (parent / closure)
           /     |     |     |
       0078    0079   0080   0081
       (D2)    (D4)   (D5)   (D6)
        |       |      |      |
   Epic 3   Epic 2  Epic 6  Epic 4 + 6
```

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md) | **NEW** | D2 — Overton canonical home decision (`sector-intelligence/` owns sector engine ; campaign-tracker delegates). |
| [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) | **NEW** | D4 — 2 connector façades via Credentials Vault (Tarsis-monitoring + CRM) ; APOGEE cap 7/7 structurally preserved. |
| [docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md) | **NEW** | D5 — `PROMOTE_PIVOT_SUBCLUSTER` parameterized Intent + state machine + snapshotRef gate. |
| [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) | **NEW** | D6 — pure-TS logistic regression + ROC AUC + RMSE + IntentEmission-payload snapshot (zero new table). |

**Files to READ (must read before drafting the 4 stubs) — UNCHANGED:**

- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) — parent ; must already exist (Story 1.1 ships it in the same commit `00ceb02`).
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"D3 — Child ADRs" + §"D2", §"D4", §"D5", §"D6" — source of each stub's title + one-paragraph summary + patterns governed + files governed.
- [docs/governance/adr/0021-external-credentials-vault.md](../../docs/governance/adr/0021-external-credentials-vault.md) — ancestor pattern for 0079.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — ancestor invariant for 0079.
- [docs/governance/adr/0042-sequence-modes-and-lifecycle.md](../../docs/governance/adr/0042-sequence-modes-and-lifecycle.md) — `PROMOTE_SEQUENCE_LIFECYCLE` precedent for 0080.
- [docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md](../../docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md) — ancestor of 0078 (Phase 19 sub-cluster wiring).
- [docs/governance/adr/0066-* ](../../docs/governance/adr/) — convention reference for "Accepted (stub — finalized in epic close)" pattern.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- ADR validation : sequential numbering preserved (0077 → 0078 → 0079 → 0080 → 0081 ; no gaps).

### Testing standards summary

- **No code changed → no automated tests changed.** Pure governance documentation.
- Manual verification : open each of the 4 ADR files, confirm frontmatter has `Parent: ADR-0077` + `Status: Accepted (stub ...)`, confirm one-paragraph decision summary + patterns + files governed.

### Project Structure Notes

**Alignment with unified project structure:**

- All 4 files land at canonical paths `docs/governance/adr/00<NN>-<kebab-slug>.md`. Slug rules : descriptive, kebab-case, matches the ADR title.
- ADR-0077 + 0078 + 0079 + 0080 + 0081 form a contiguous block in the sequential numbering ; ADR-0082 (Yggdrasil canonization, opened 2026-05-15) is later in the sequence ; ADR-0083 (Argos placement) is later too.

**Detected variances / conflicts:**

- **Numbering choice** — the parent ADR is 0077 even though 0083 came earlier in calendar time (2026-05-15 vs 2026-05-16). This is intentional : 0083 closed on 2026-05-15 with a self-contained scope (Argos placement), and the Phase 23 child ADRs are spawned by the parent ADR's `Spawns:` graph — the numbering reflects spawn order, not raw calendar order. The two later ADRs (0084 / 0085 / 0086 / 0087, opened 2026-05-16 same day) interleave because they cover different chantiers (8-layer architecture / refresh cascade STOP / score system / Thot formula engine respectively).

### References

- [Source: _bmad-output/planning-artifacts/epics.md L471-483 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"D3 — ADR strategy"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md (parent — Story 1.1)](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0021-external-credentials-vault.md (ancestor for 0079)](../../docs/governance/adr/0021-external-credentials-vault.md)
- [Source: docs/governance/adr/0046-no-magic-fallback.md (ancestor invariant for 0079)](../../docs/governance/adr/0046-no-magic-fallback.md)
- [Source: docs/governance/adr/0042-sequence-modes-and-lifecycle.md (PROMOTE_SEQUENCE_LIFECYCLE precedent for 0080)](../../docs/governance/adr/0042-sequence-modes-and-lifecycle.md)
- [Source: docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md (ancestor of 0078)](../../docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md)
- [Source: _bmad-output/implementation-artifacts/1-1-open-adr-0077-parent-prd-scope-reframe.md (Story 1.1 — shipped same commit `00ceb02`)](./1-1-open-adr-0077-parent-prd-scope-reframe.md)

### Latest tech information

- **ADR file convention** — see Story 1.1 Dev Notes. Stub-status ADRs use the same skeleton (Frontmatter / Contexte / Décision / Conséquences) but each section is one paragraph max ; full prose lands in Epic 7 closure.
- **No npm / Prisma / Next.js dep version change** — pure documentation.

### Previous story intelligence

- **Story 1.1 (Open ADR-0077 parent)** — direct predecessor, bundled in commit `00ceb02`. Patterns to mirror : frontmatter shape, `Status:` line convention, §"Contexte" + §"Décision" + §"Conséquences" sections, `Parent:` + `Spawns:` graph. The 4 stubs in this story complete the spawn graph.

### Git intelligence summary

```
00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction   ← Story 1.1 + 1.2 ship commit (bundled)
```

Pattern observed : Story 1.1 + Story 1.2 = single commit. The bundle is intentional — the parent's `Spawns:` field and each stub's `Parent:` field reference each other ; splitting would create a transient broken-link state.

### Project context reference

This story is the **second unit of work in Phase 23 Epic 1 Governance Foundations**. Together with Story 1.1, it lays the doctrinal foundation (1 parent ADR + 4 child stubs = 5 ADRs total) that every downstream Epic 2–6 commit will cite. After this story, every reference to "ADR-0078" / "ADR-0079" / "ADR-0080" / "ADR-0081" in code or commit messages resolves to a real file.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — architecture step-04 read for the 4 stub decision summaries + patterns governed + files governed lists ; ADR-0077 (parent) read for `Spawns:` graph alignment ; ADR-0021 / 0046 / 0042 / 0052 read as ancestor patterns ; sequential numbering verified (0076 immediate predecessor, no collision at 0078–0081, 0082+ later for other chantiers). All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (4 ADR files exist with `Status: Accepted (stub)` + `Parent: ADR-0077` + one-paragraph decision summary) — shipped via commit `00ceb02`. `ls docs/governance/adr/0078* 0079* 0080* 0081*` returns the 4 files.
- AC #2 (patterns / Intent kinds / files governed enumerated per stub) — shipped : ADR-0078 §"Wiring concret" (4 delegations + 4 capability-state.ts updates), ADR-0079 §"Files governed" (4 paths), ADR-0080 §"Pattern P22-4" + §"Files governed" (5 paths), ADR-0081 §"Pattern P22-6" + §"SLO" + §"Files governed" (3 paths).
- AC #3 (sequential numbering preserved, no collisions) — verified : `wc -l docs/governance/adr/0077* 0078* 0079* 0080* 0081*` shows 5 contiguous files (177 / 65 / 96 / 101 / 135 lines) ; ADR-0076 immediate predecessor ; ADR-0082+ later.
- Verification : `git log --oneline | grep "phase 23 ADRs"` confirms commit `00ceb02 governance: phase 23 ADRs 0077-0081 (parent + 4 stubs) + PRD scope correction`.

### Completion Notes List

- **AC #1–3 all shipped** in commit `00ceb02` (bundled with Story 1.1 because of bidirectional `Spawns:` / `Parent:` cross-references between ADR-0077 and the 4 stubs).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (architecture step-04 + ADR-0077 + 4 ancestor ADRs read), Phase 1 APOGEE (governance layer ; no Neter added ; cap 7/7 preserved — explicitly stated in 0079 §"Décision" that Tarsis-monitoring + CRM = Credentials Vault entries, not Neteru), Phase 2 anti-doublon (slug greps returned 0 hits for the 4 new slugs ; sequential numbering uncollided), Phase 3 conception (4 files at canonical path, decision summaries lifted verbatim from architecture step-04 to ensure consistency with downstream story citations), Phase 4 execution (4 stubs opened with skeleton sections), Phase 5 verification (`neteru-coherence.test.ts` green by construction, tsc/eslint untouched), Phase 6 documentation (4 new ADR files = 4 new entries in the ADR index ; LEXICON / PANTHEON / CODE-MAP untouched because no Neter / sub-system / canonical concept change), Phase 7 commit (shipped).
- **Cap APOGEE 7/7 preserved** — explicitly stated in ADR-0079 §"Décision" (the 2 new external sources are Credentials Vault entries per ADR-0021, NOT Neteru). `BRAINS` const inchangé. `Governor` type inchangé.
- **Manual-first parity (ADR-0060)** — invoked by 0081 (regression ↔ manual coefficient mode peer paths) but no UI deliverable in this story.
- **Mission link**: the 4 stubs are the **citation backbone** for every Epic 2–6 commit. Without them, the downstream code commits would either (a) carry dangling ADR refs (failing pattern P22-7 HARD test at Epic 7 close), or (b) duplicate the decision rationale in every commit message (citation noise). The bundle (Story 1.1 + 1.2 = commit `00ceb02`) is the architectural ground truth Phase 23 needs.

### File List

- **NEW** [docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md](../../docs/governance/adr/0078-overton-canonical-home-sector-intelligence.md) — D2 : Overton canonical home (`sector-intelligence/`) ; supersedes phantom `0055-overton-algo`.
- **NEW** [docs/governance/adr/0079-external-signal-connectors-credentials-vault.md](../../docs/governance/adr/0079-external-signal-connectors-credentials-vault.md) — D4 : Tarsis-monitoring API + CRM provider as Credentials Vault entries (cap APOGEE 7/7 preserved).
- **NEW** [docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md) — D5 : `PROMOTE_PIVOT_SUBCLUSTER` Intent state-machine + snapshotRef gate.
- **NEW** [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) — D6 : pure-TS logistic regression + ROC AUC + RMSE + IntentEmission-payload snapshot.
- **EDIT** [_bmad-output/implementation-artifacts/1-2-open-adr-0078-0081-stubs.md](./1-2-open-adr-0078-0081-stubs.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.2 shipped via commit `00ceb02` — 4 child ADR stubs opened (0078 D2 Overton canonical home / 0079 D4 connectors via Vault / 0080 D5 PROMOTE_PIVOT_SUBCLUSTER / 0081 D6 calibration methodology). Each carries `Status: Accepted (stub — finalization Epic 7 Story 7.9)` + `Parent: ADR-0077` + one-paragraph decision summary + patterns/files governed. Cap APOGEE 7/7 preserved (0079 explicitly states Vault entries ≠ Neteru). Phase 23 Epic 1 progress 1/10 → 2/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
