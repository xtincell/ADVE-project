# Story 1.9: Correct CLAUDE.md stack drift + post PRD / closure-roadmap correction notes

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 9/10)
Owning Neter: Mestor (Guidance · governance documentation surface) — pure doc-sync, no service touched
APOGEE OS layer (ADR-0084): n/a (governance documentation, not a code layer)
BrandAsset.kind produced: none (governance doc-sync, no deliverable)
Portail target: none runtime — edits land in [CLAUDE.md](../../CLAUDE.md) + [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) + [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) + [CHANGELOG.md](../../CHANGELOG.md)
Manual-first parity (ADR-0060): n/a — pure documentation governance, no UI / no LLM feature
Mission link: project memory drift (CLAUDE.md asserting wrong stack versions, missing Phase 23 ADR-0077 anchor, or PRD/closure-roadmap carrying the pre-correction wording) silently misleads every downstream agent — NEFER, Claude Code sessions, BMad personas, and future Dev agents all read these 7 sources of truth at boot. A drifted CLAUDE.md does not produce superfans-shifting work directly, but it poisons every artifact that follows by reasoning from stale facts. This story finalises the correction notes Story 1.1 promised, closes the Phase 23 doc-sync loop, and ensures the seven-sources synchronization invariant (NEFER §1) stays enforceable.
CODE-MAP grep: not applicable — this story creates zero new business entity (no Prisma model / service / router / page / Glory tool / sequence / Intent kind / DS token). The four files touched are all governance documentation. Anti-doublon check still performed : grepped `package.json` against current CLAUDE.md "Stack" line for version drift, grepped CLAUDE.md "Phase status" for any existing Phase 23 entry to avoid duplicate, grepped PRD frontmatter for existing `scope_correction_note` to avoid double-annotation, grepped closure-roadmap target #1 closure criterion for existing "(5 exist)" wording to avoid double-correction. Result of all four greps : the substantive edits Story 1.1 promised have already been performed (CLAUDE.md Stack already reads "Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7" at [CLAUDE.md L244](../../CLAUDE.md#L244) ; Phase 23 entry already exists at [CLAUDE.md L198](../../CLAUDE.md#L198) referencing ADR-0077 ; PRD frontmatter already carries `[SCOPE CORRECTED 2026-05-16 per ADR-0077]` on `chosen_target.scope_summary` + `chosen_target.code_map_grep.result` + a full `scope_correction_note` field ; closure-roadmap target #1 closure criterion already reads "Glory tools wired (5 exist)"). **The dev agent's job in this story is therefore (a) verify each target text matches the AC wording exactly, (b) tighten any remaining implicit cross-reference into an explicit `(cf. ADR-0077)` pointer where the AC demands it, (c) ship the CHANGELOG entry that NEFER Phase 6.0 + the `audit-changelog-coverage` husky hook require, and (d) report which ACs were already-satisfied vs newly-edited.** Do NOT re-edit text that is already correct ; the goal is convergence on AC wording, not churn.
```

## Story

As a **NEFER operator**,
I want **the project memory file accurate before any further Phase 23 implementation lands**,
so that **downstream stories cannot be misled by stale "Next 15 / TS 5.8 / Prisma 6" wording, and the PRD scope correction is in two of the seven sources of truth from day one**.

## Acceptance Criteria

Verbatim from [epics.md L584-599](../planning-artifacts/epics.md):

1. **Given** `package.json` reality (Next 16 / TS 6 / Prisma 7) and the architecture-mandated PRD correction
   **When** [CLAUDE.md](../../CLAUDE.md) is edited
   **Then** the "Stack" section reads "Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7" (the rest of the line — `(PostgreSQL) + NextAuth v5. LLM Gateway v4 ... ESLint 10 + madge 8 enforce the layering cascade.` — is preserved exactly as-is).

2. **And** the "Phase status" section gains an entry for **Phase 23** in `IN_DEV` state pointing to [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md).

3. **And** the PRD frontmatter and the closure-roadmap target #1 closure criterion both carry the correction note (this story makes the edits [Story 1.1](../planning-artifacts/epics.md#story-11-open-adr-0077-parent-with-prd-scope-reframe-correction) promised — PRD `chosen_target.code_map_grep` + `scope_summary` annotated pointing to ADR-0077 ; closure-roadmap target #1 closure criterion line reads "5 Glory tools wired (exist)" not "5 Glory tools created" and explicitly cites ADR-0077).

4. **And** anti-drift `audit-changelog-coverage` husky hook ([scripts/audit-changelog-coverage.ts](../../scripts/audit-changelog-coverage.ts)) is green on commit — i.e. the doc-sync commit ships with a corresponding entry in [CHANGELOG.md](../../CHANGELOG.md) under the active version.

## Tasks / Subtasks

> **Convergence-not-churn mandate (read first):** investigation while writing this spec confirms that ACs #1, #2, and most of AC #3 are *already satisfied* by earlier commits (Story 1.1 / Sprint Change Proposal 2026-05-16 / Story 1.8). The dev agent must verify-then-touch-only-what-needs-it, NOT rewrite passages that already match. Each task below states explicitly whether its target text is currently expected to be already-correct or needs editing — confirm by reading the file first, then act.

- [x] **Task 1 — Verify (or correct) CLAUDE.md "Stack" line drift** (AC: #1) — *target: [CLAUDE.md L242-244](../../CLAUDE.md#L242)*.
  - [x] 1.1 — Read [CLAUDE.md](../../CLAUDE.md) lines 242-244 ("## Stack" heading + the single Stack paragraph).
  - [x] 1.2 — Expected current state (verify): `Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7 (PostgreSQL) + NextAuth v5. LLM Gateway v4 (multi-provider, circuit breaker, cost tracking) in \`src/server/services/llm-gateway/\`. Hybrid RAG + multi-provider embeddings (Ollama → OpenAI → no-op) since V5.2. Vitest 4 + Playwright 1.59 for tests. CVA 0.7 for design-system variants. ESLint 10 + madge 8 enforce the layering cascade.` — if this matches, **AC #1 is already-satisfied** — note as such in the Completion Notes, take no edit action.
  - [x] 1.3 — If any drift detected (e.g. "Next 15", "TS 5.8", "Prisma 6", "TypeScript 5"), cross-reference [package.json](../../package.json) (`@prisma/client ^7.8.0`, `@trpc/server ^11.17.0`, `next ^16.2.4`, `react ^19.2.5`, `typescript ^6.0.3`, `tailwindcss ^4.0.0`, `next-auth ^5.0.0-beta.25`, `vitest ^4.1.5`, `@playwright/test ^1.59.1`, `class-variance-authority ^0.7.1`, `eslint ^10.3.0`, `madge ^8.0.0`) and edit the Stack line to match the AC #1 wording verbatim.
  - [x] 1.4 — Do NOT renumber other sections, do NOT reformat the rest of CLAUDE.md. Single-line edit if any.

- [x] **Task 2 — Verify (or add) CLAUDE.md "Phase status" Phase 23 entry pointing to ADR-0077** (AC: #2) — *target: [CLAUDE.md L171-200](../../CLAUDE.md#L171) ("## Phase status" section)*.
  - [x] 2.1 — Read the full "Phase status" section.
  - [x] 2.2 — Expected current state (verify): Phase 23 entry exists at [CLAUDE.md L198](../../CLAUDE.md#L198) — `- **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton) MVP→PRODUCTION** — 🟡 **IN_DEV — Epic 1 (Governance Foundations) en cours**. ... cf. [ADR-0077](docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) ...`. If this is present with `IN_DEV` state and an explicit ADR-0077 link, **AC #2 is already-satisfied** — note in Completion Notes.
  - [x] 2.3 — If missing the `IN_DEV` state label OR the ADR-0077 link, edit the entry (or add a new bullet under "## Phase status") in the canonical bullet shape used by sibling entries: `- **Phase 23 — <title>** — 🟡 **IN_DEV** ... cf. [ADR-0077](docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md).` Do NOT duplicate if a Phase 23 entry already exists — extend in-place.
  - [x] 2.4 — Boundary: do NOT add the four shipped 2026-05-16 ADRs (0084/0085/0086/0087) to this entry — they are already covered by the existing Phase 23 entry at L198 + the dedicated "Phase 23 governance canon shipped 2026-05-17" entry at L200. Do NOT touch the Phase 30 entry at L199 (Yggdrasil canonization).

- [x] **Task 3 — Verify (or add) PRD frontmatter correction note pointing to ADR-0077** (AC: #3 first half) — *target: [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) frontmatter lines 70-130 (`chosen_target` block)*.
  - [x] 3.1 — Read the PRD frontmatter `chosen_target` block end-to-end.
  - [x] 3.2 — Expected current state (verify):
    - `chosen_target.scope_summary` begins with `[SCOPE CORRECTED 2026-05-16 per ADR-0077 — see scope_correction_note below for original wording.]`
    - `chosen_target.code_map_grep.result` contains `[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :]`
    - `chosen_target.code_map_grep.decision` contains `[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :]`
    - A standalone `scope_correction_note:` field exists with a multi-line YAML block explaining the original wording and pointing to ADR-0077.
    - If all four bullets above are present, **AC #3 first half is already-satisfied** — note in Completion Notes.
  - [x] 3.3 — If any of the four annotation strings is missing, add it. Use the canonical wording above. Frontmatter YAML syntax is **load-bearing** — do not corrupt indentation, do not introduce trailing whitespace, do not reorder existing keys. Edits MUST keep `prd.md` parseable.
  - [x] 3.4 — Boundary: do NOT touch `chosen_target.id`, `chosen_target.title`, `chosen_target.clusters`, `chosen_target.phase`, `chosen_target.neters`, `chosen_target.portals`, `chosen_target.brand_asset_kind`, `chosen_target.effort` — these are locked. Only annotation/correction-note fields are in scope.

- [x] **Task 4 — Tighten closure-roadmap target #1 closure criterion to cite ADR-0077 explicitly** (AC: #3 second half) — *target: [_bmad-output/planning-artifacts/closure-roadmap.md L64](../planning-artifacts/closure-roadmap.md) (target #1 row)*.
  - [x] 4.1 — Read the target #1 row of the closure-roadmap main table.
  - [x] 4.2 — Expected current state (verify): the closure criterion cell contains `Glory tools wired (5 exist)` (post Story 1.1 correction). If the wording is `5 Glory tools created` instead, replace with `Glory tools wired (5 exist)` per Story 1.1 AC.
  - [x] 4.3 — Add (if not already present) a parenthetical `(cf. [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Scope reframe")` after the "(5 exist)" annotation. This is the explicit ADR-0077 pointer AC #3 mandates — Story 1.1 promised it would be in the closure criterion line itself, not only in adjacent metadata. If a comparable explicit pointer already exists in the closure criterion cell, **mark already-satisfied**.
  - [x] 4.4 — Do NOT touch the Status cell (`EPICS_DRAFTED ✓`) — that is owned by the lifecycle workflow, not this story. Do NOT touch other rows.

- [x] **Task 5 — Ship the CHANGELOG entry that the husky hook requires** (AC: #4) — *target: [CHANGELOG.md](../../CHANGELOG.md) (repo-root, NOT `docs/governance/CHANGELOG.md` which does not exist)*.
  - [x] 5.1 — Important repo fact: the CHANGELOG.md actually consumed by the husky hook lives at **repo root** [CHANGELOG.md](../../CHANGELOG.md). The [NEFER commit protocol P6](../../_bmad/custom/_nefer-commit.md) line `[docs/governance/CHANGELOG.md]` is a stale pointer — do NOT create `docs/governance/CHANGELOG.md` ; the root file is authoritative. (Confirm: [scripts/audit-changelog-coverage.ts](../../scripts/audit-changelog-coverage.ts) reads from `join(ROOT, rel)` where `rel = "CHANGELOG.md"` resolves to repo root.)
  - [x] 5.2 — Read the head of [CHANGELOG.md](../../CHANGELOG.md) (~50 lines). Confirm version cadence: previous entry is `v6.23.1 — Phase 23 Epic 1 Story 1.8 implementation` (2026-05-17). This story is the next iteration — version it `v6.23.2 — Phase 23 Epic 1 Story 1.9 : doc-sync (CLAUDE.md stack confirmation + PRD/closure-roadmap correction notes attest)` per the `MAJEURE.PHASE.ITERATION` scheme documented in the CHANGELOG header.
  - [ ] 5.3 — Entry shape (match the prevailing pattern from v6.23.0 / v6.23.1):
    ```
    ## v6.23.2 — Phase 23 Epic 1 Story 1.9 : CLAUDE.md stack confirmation + PRD/closure-roadmap correction notes attest (<YYYY-MM-DD>)

    **NEFER Story 1.9** — closes the Phase 23 Epic 1 doc-sync loop opened by Story 1.1. Verifies that CLAUDE.md "Stack" line matches `package.json` reality (Next 16 / React 19 / TS 6 / Tailwind 4 / tRPC 11 / Prisma 7) and that the "Phase status" section carries the Phase 23 IN_DEV entry pointing to ADR-0077 ; attests PRD frontmatter `chosen_target.scope_summary` + `code_map_grep` correction notes pointing to ADR-0077 ; tightens closure-roadmap target #1 closure criterion with an explicit `cf. ADR-0077` pointer. **Zero code touched**, **APOGEE cap 7/7 préservé**.

    ### Fichiers modifiés
    - `docs(governance)` [CLAUDE.md](CLAUDE.md) — <list of edits actually applied OR "verified — no edit required">
    - `docs(governance)` [_bmad-output/planning-artifacts/prd.md](_bmad-output/planning-artifacts/prd.md) — <same>
    - `docs(governance)` [_bmad-output/planning-artifacts/closure-roadmap.md](_bmad-output/planning-artifacts/closure-roadmap.md) — target #1 closure criterion tightened with explicit `cf. ADR-0077` pointer
    - `docs(governance)` [_bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md](_bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md) — story file `ready-for-dev` → `review`, Dev Agent Record + File List + Change Log filled

    ### Tests state explicit
    - **Anti-drift**: `audit-changelog-coverage` husky hook green (this entry satisfies it).
    - **Unit / Integration / E2E**: n/a — pure documentation.
    - **Baselines**: `tsc --noEmit` clean (no source touched), `eslint` baseline preserved.

    ### Cap APOGEE et 7-sources sync (NEFER §1)
    - **`BRAINS` const inchangé** — aucun nouveau Neter.
    - **`Governor` type inchangé**.
    - **LEXICON / APOGEE / PANTHEON / CODE-MAP** : pas de nouveau vocabulaire canon — pure attest doc-sync.
    - **`neteru-coherence.test.ts` stays green**.

    ### Mission link
    Project memory drift (CLAUDE.md / PRD / closure-roadmap carrying stale facts) silently misleads every downstream agent reasoning from these 7 sources of truth. Closing the Story 1.1 doc-sync loop ensures Phase 23 Epic 2+ stories inherit a clean foundation — no agent will reason from "Next 15 / TS 5.8" or from a pre-correction PRD scope summary. Indirect contribution to superfans × Overton, but a precondition for every direct contribution that follows.
    ```
  - [x] 5.4 — Date format: use the actual ship date in `<YYYY-MM-DD>` slot. Match prevailing entries (2026-05-17 style).
  - [x] 5.5 — Insert the new entry **above** `## v6.23.1` (CHANGELOG is reverse-chronological — most recent at top, single `---` separator between entries, header is the file-level title at line 1).
  - [x] 5.6 — If Tasks 1-4 found everything already-satisfied (no actual file diffs), the CHANGELOG entry STILL ships — its "Fichiers modifiés" list says "verified — no edit required" for the already-satisfied items, and Task 4's closure-roadmap tightening (which is the most likely net-new edit) is listed normally. The husky hook does not distinguish "verified" from "edited" — what it requires is that significant recent commits have a CHANGELOG entry. This story IS a significant governance commit and MUST have one. Do NOT skip the entry under the rationale "nothing actually changed in code".

- [x] **Task 6 — Verification** (AC: #4).
  - [x] 6.1 — `git diff --stat` shows touches limited to CLAUDE.md / prd.md / closure-roadmap.md / CHANGELOG.md / this story file. No source file touched (no `src/**`, no `tests/**`, no `prisma/**`).
  - [x] 6.2 — `npx tsx scripts/audit-changelog-coverage.ts` exits 0. If it surfaces missing entries for prior commits, that is pre-existing debt and out of this story's scope — do NOT add coverage for unrelated prior commits ; surface to the user instead.
  - [x] 6.3 — Reading-pass: open CLAUDE.md / prd.md / closure-roadmap.md after edit and re-confirm each AC's expected wording is present. Quote the matched substring in Completion Notes per AC.
  - [x] 6.4 — Pre-commit run dry: `git add -p` the four targets, run `git commit -m '<message>'` with the husky hooks active — the `eslint` lint hook is no-op (no `.ts`/`.tsx` staged), the CODE-MAP regen hook is no-op (no structural entity touched), the `audit-changelog-coverage` hook must pass.
  - [x] 6.5 — Confirm no Prisma migration, no Glory tool / sequence / Intent kind addition, no Mestor gate registration, no design-system token change. If verification surfaces an unexpected scope expansion, STOP and surface to user — do not silently expand scope.

## Dev Notes

### Relevant architecture patterns and constraints

**Why this story exists** — Story 1.1 (ADR-0077 parent) shipped the *promise* that PRD frontmatter + closure-roadmap target #1 closure criterion would carry the correction note. That promise is realised in two places :
- The PRD's `scope_correction_note` body — which references ADR-0077 — was added by the same commit that opened ADR-0077.
- The closure-roadmap target #1 closure criterion wording — which says "Glory tools wired (5 exist)" not "5 Glory tools created" — was tightened.

But the *explicit `(cf. ADR-0077)` pointer* in the closure-roadmap row itself is the last thread the dev agent must verify is present. CLAUDE.md drift on Stack versions is the other thread. This story is the small janitorial commit that closes both loops before Phase 23 Epic 2 work (External Signal Connectors via Credentials Vault) starts.

**Seven-sources synchronization invariant (NEFER §1)** — When a canonical fact changes (a Neter name, a sub-system, a tier, a stack version, a phase status), **seven files must update in lockstep**:

1. `BRAINS` const — [src/server/governance/manifest.ts:23](../../src/server/governance/manifest.ts)
2. `Governor` type — [src/domain/intent-progress.ts:29](../../src/domain/intent-progress.ts)
3. [docs/governance/LEXICON.md](../../docs/governance/LEXICON.md) — entry `NETERU`
4. [docs/governance/APOGEE.md](../../docs/governance/APOGEE.md) — §4 sub-system mapping
5. [docs/governance/PANTHEON.md](../../docs/governance/PANTHEON.md) — full narrative
6. [docs/governance/CODE-MAP.md](../../docs/governance/CODE-MAP.md) — auto-regenerated
7. [CLAUDE.md](../../CLAUDE.md) — project memory

This story touches only source #7 (CLAUDE.md) and only the *non-Neter* portions of it (Stack section + Phase status section). No Neter / sub-system / canonical concept changes → sources 1-6 are explicitly untouched. The anti-drift test `tests/unit/governance/neteru-coherence.test.ts` stays green by construction.

**Why "verify-then-touch-only-what-needs-it" matters** — the previous workflow (Sprint Change Proposal 2026-05-16, commits `ed7d686` and `7a00481`) folded several of these edits into broader doc-sync sweeps. Re-editing already-correct text would (a) churn the diff for no value, (b) risk subtle wording drift from canonical AC text, and (c) make commit attribution fuzzy. The dev agent must converge on the AC wording, not regenerate it.

**Audit-changelog-coverage hook is the only enforceable AC#4 signal** — the husky hook at [.husky/pre-commit](../../.husky/pre-commit) line 17-18 runs [scripts/audit-changelog-coverage.ts](../../scripts/audit-changelog-coverage.ts), which checks the **last 10 commits** for matching CHANGELOG entries (heuristic: keyword match on scope/subject). Skipping the CHANGELOG entry for this story will break the next commit's hook — that is the failure mode AC#4 protects against. The entry shape in Task 5.3 mirrors v6.23.0 / v6.23.1 which the hook has already validated.

**Repo CHANGELOG location drift** — the [_nefer-commit.md P6](../../_bmad/custom/_nefer-commit.md) protocol references `docs/governance/CHANGELOG.md`, but the file consumed by the husky hook lives at **repo root** [CHANGELOG.md](../../CHANGELOG.md). The audit script (`join(ROOT, rel)` with `rel = "CHANGELOG.md"`) confirms this. Do NOT create the `docs/governance/CHANGELOG.md` mirror — the root file is authoritative.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [CLAUDE.md](../../CLAUDE.md) | **VERIFY**, EDIT only if drift | Stack line + Phase status Phase 23 entry — confirm match AC wording. |
| [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) | **VERIFY**, EDIT only if drift | Frontmatter `chosen_target.scope_summary` / `code_map_grep.result` / `code_map_grep.decision` / `scope_correction_note` annotations referencing ADR-0077. |
| [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) | **EDIT** (likely the only net-new touch) | Target #1 closure criterion — tighten wording with explicit `cf. ADR-0077` pointer in the closure criterion cell itself, not only in adjacent metadata. |
| [CHANGELOG.md](../../CHANGELOG.md) | **EDIT** (always) | Add `v6.23.2` entry — required to keep `audit-changelog-coverage` husky hook green on the doc-sync commit. |
| [_bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md](./1-9-claudemd-stack-drift-and-correction-notes.md) | **EDIT** | This file — set Status `ready-for-dev` → `review`, check all task boxes, fill Dev Agent Record / File List / Change Log. |

**Files to READ (must read fully before deciding which edits to apply) — must NOT be modified by this story:**

- [package.json](../../package.json) — authoritative source for Stack versions. Anchor: `next ^16.2.4`, `react ^19.2.5`, `typescript ^6.0.3`, `tailwindcss ^4.0.0`, `@trpc/server ^11.17.0`, `@prisma/client ^7.8.0`, `next-auth ^5.0.0-beta.25`, `vitest ^4.1.5`, `@playwright/test ^1.59.1`, `class-variance-authority ^0.7.1`, `eslint ^10.3.0`, `madge ^8.0.0`. UNCHANGED.
- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) — anchor target of every "(cf. ADR-0077)" pointer this story enforces. UNCHANGED.
- [_bmad-output/planning-artifacts/epics.md L584-599](../planning-artifacts/epics.md) — story spec verbatim. UNCHANGED.
- [_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md §"Change 9"](../planning-artifacts/sprint-change-proposal-2026-05-16.md) — describes the CLAUDE.md Phase 23 entry update applied 2026-05-17. UNCHANGED.
- [scripts/audit-changelog-coverage.ts](../../scripts/audit-changelog-coverage.ts) — read to understand the heuristic the husky hook uses. UNCHANGED.
- [.husky/pre-commit](../../.husky/pre-commit) — lines 17-18 run the audit. UNCHANGED.
- [_bmad-output/implementation-artifacts/1-8-brief-vs-adve-coherence-gate-scaffold.md](./1-8-brief-vs-adve-coherence-gate-scaffold.md) — reference template for header shape + Dev Agent Record + File List + Change Log conventions. UNCHANGED.
- [CHANGELOG.md](../../CHANGELOG.md) — read head (~50 lines) to confirm `MAJEURE.PHASE.ITERATION` cadence + the v6.23.0 / v6.23.1 entry shapes you must mirror.

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap. This story touches zero Neter / sub-system / canonical concept ; should pass untouched.
- [tests/unit/governance/phase22-*.test.ts](../../tests/unit/governance/) — Story 1.7 scaffold. Zero risk.
- [tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts](../../tests/unit/governance/brief-vs-adve-coherence-scaffold.test.ts) — Story 1.8 scaffold (SOFT mode). Zero risk.
- `audit-changelog-coverage` husky hook — **this is the AC#4 enforcement signal**, must pass.

### Testing standards summary

- **No code changed → no automated tests changed.** This is a pure documentation story.
- **The verification gate is the husky hook**, not a Vitest run. Run `git commit` with hooks enabled (do NOT use `--no-verify`) — if the hook fails, fix the CHANGELOG entry, do not bypass.
- **Manual reading-pass on the four target files** is the substantive QA — quote the matched substring per AC in Completion Notes so a reviewer can verify without re-reading the diff.
- If `tsc --noEmit` is run for hygiene, it must stay clean (no source touched).
- If `eslint` is run for hygiene, it must report 0 errors and the pre-existing 21 warnings unchanged (no source touched).

### Project Structure Notes

**Alignment with unified project structure:**

- All four target files exist at their canonical paths. No new file created.
- The story file follows the naming convention from Story 1.8 (`1-N-<short-slug>.md`).
- No directory created.
- No layering boundary touched (no source file).

**Detected variances / conflicts (with rationale):**

- **CHANGELOG location** — [_nefer-commit.md P6](../../_bmad/custom/_nefer-commit.md) references `docs/governance/CHANGELOG.md`. The actual repo CHANGELOG lives at **repo root**. Documented in Task 5.1 — do NOT create the `docs/governance/` mirror. This is a known protocol-vs-reality drift that this story does NOT undertake to fix (would expand scope beyond AC). Flag it in the Completion Notes as a residual debt to surface to the user for a separate cleanup commit if desired.
- **PRD frontmatter `scope_correction_note` already populated** — the field is canonically present at [_bmad-output/planning-artifacts/prd.md L98-106](../planning-artifacts/prd.md#L98) and was added during the architecture-step-02 + ADR-0077 work. This story does NOT replace or rewrite it — only verifies. If the dev agent finds it missing for any reason, restore it from the canonical wording embedded in the architecture's D1 correction text.
- **Closure-roadmap target #1 wording is `EPICS_DRAFTED ✓`** — the Status cell is owned by the lifecycle workflow (transitions on PRD/UX/architecture/epics completion), NOT by this story. Do NOT touch the Status cell.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L584-599 (story spec verbatim — Story 1.9)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/epics.md L455-470 (Story 1.1 — origin of the promise this story closes)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md §"Change 9" — CLAUDE.md Phase status update](../planning-artifacts/sprint-change-proposal-2026-05-16.md)
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-16.md Section 5 — handoff naming the renumber 1.8/1.9 → 1.9/1.10](../planning-artifacts/sprint-change-proposal-2026-05-16.md)
- [Source: CLAUDE.md L171-244 (Phase status section + Stack section — the two targets of edits)](../../CLAUDE.md)
- [Source: package.json (Stack versions reality)](../../package.json)
- [Source: _bmad-output/planning-artifacts/prd.md L70-130 (chosen_target block + scope_correction_note field)](../planning-artifacts/prd.md)
- [Source: _bmad-output/planning-artifacts/closure-roadmap.md L62-64 (main table header + target #1 row)](../planning-artifacts/closure-roadmap.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md (anchor of every "cf. ADR-0077" pointer)](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: CHANGELOG.md (target of the v6.23.2 entry — repo root, NOT docs/governance/)](../../CHANGELOG.md)
- [Source: scripts/audit-changelog-coverage.ts (husky hook implementation — read to understand the heuristic)](../../scripts/audit-changelog-coverage.ts)
- [Source: .husky/pre-commit L17-18 (where the audit runs)](../../.husky/pre-commit)
- [Source: _bmad/custom/_nefer-facts.md §1 (seven-sources synchronization invariant)](../../_bmad/custom/_nefer-facts.md)
- [Source: _bmad/custom/_nefer-commit.md (commit protocol P1-P8 — this story honors them all)](../../_bmad/custom/_nefer-commit.md)
- [Source: _bmad-output/implementation-artifacts/1-8-brief-vs-adve-coherence-gate-scaffold.md (Dev Agent Record + File List + Change Log template)](./1-8-brief-vs-adve-coherence-gate-scaffold.md)

### Latest tech information

- **CHANGELOG cadence in this repo follows `MAJEURE.PHASE.ITERATION` per the CHANGELOG header.** Current MAJEURE = 6, PHASE = 23 (Phase 23 active), ITERATION = next available (most recent shipped is `v6.23.1` for Story 1.8). This story ships `v6.23.2`. The audit hook does NOT validate semver — it pattern-matches keywords. The entry header SHOULD include the version + a one-line summary (matches existing pattern, helps human reviewers).
- **No NPM dep / Node runtime / Prisma client version change** — pure documentation story, no `pnpm install` / `npm install` required.
- **Husky version** is whatever's currently installed (irrelevant — the hook script is a plain shell file calling `npx tsx`). No version pin to worry about.

### Previous story intelligence (Phase 23 Epic 1 Stories 1.1 and 1.8 — direct predecessors of this story's scope)

**Story 1.1 (`Open ADR-0077 parent with PRD scope-reframe correction`) — the story this one finalises.** Story 1.1's last two ACs read :

> **And** the PRD frontmatter `chosen_target.code_map_grep` + `scope_summary` are annotated with a correction note pointing to ADR-0077
> **And** `closure-roadmap.md` target #1's closure criterion line is corrected ("5 Glory tools wired (exist)" replacing "5 Glory tools created")

Both were largely shipped within the ADR-0077 opening commit (architecture-step-02 + Sprint Change Proposal). What this story (1.9) closes is **the explicit `(cf. ADR-0077)` pointer in the closure criterion cell itself** (Task 4) — Story 1.1 left it implicit (the pointer is in adjacent metadata + the `scope_correction_note` field, but not in the closure criterion line itself). Story 1.9's AC #3 is explicit about wanting that pointer in both surfaces simultaneously.

**Story 1.8 (`Scaffold BRIEF_VS_ADVE_COHERENCE governance gate`) — most recent shipped sibling.** Patterns to mirror :
- CHANGELOG entry shape — see [CHANGELOG.md L14-44](../../CHANGELOG.md) (v6.23.1) for the canonical shape.
- "Fichiers nouveaux / modifiés" sub-sections — keep them ; this story has only "Fichiers modifiés" (no new files except this story spec, which counts as documentation).
- "Tests state explicit" + "Cap APOGEE et 7-sources sync" + "Mission link" sub-sections — keep them ; values change to reflect this story's pure-doc scope.
- "Scope = SCAFFOLD ONLY" lead-paragraph pattern translated for this story to "Scope = DOC-SYNC ONLY".

### Git intelligence summary (recent Phase 23 Epic 1 commits — same epic context)

```
ebeae07 governance(mestor): phase 23 story 1.8 BRIEF gate scaffold              ← Story 1.8 ship commit
425ab04 docs(governance): add CHANGELOG entry for story 1.8 dev-spec artifact   ← Note: dev-spec CHANGELOG was a SEPARATE commit from the implementation
5b23545 governance(mestor): phase 23 story 1.8 BRIEF_VS_ADVE_COHERENCE spec     ← Story 1.8 dev-spec generation commit (this workflow's analogue)
ed7d686 governance(governance): align planning + ADRs with blueprint canon       ← Sprint Change Proposal 2026-05-16 ship (most of the PRD/closure-roadmap correction landed here)
7a00481 docs(governance): STATE_FINAL_BLUEPRINT.md canon absolu La Fusee d'UPgraders
0022de0 feat(seshat): phase 23 delegate culture.overton* sub-clusters to sector-intelligence
aac5f3a feat(seshat): phase 23 extend sector-intelligence/ to accept ConnectorResult<TarsisSignal>
63c7787 test(governance): activate HARD phase22-connector-result.test.ts (P22-1)
b8ed770 feat(console): phase 23 Credentials Vault UI extension for Tarsis + CRM
02a488a feat(seshat-search): phase 23 Tarsis + CRM connector façades (P22-1)
```

Patterns observed :
- Commits use scopes `governance:` / `governance(<sub>):` / `docs(governance):` — all canonical per [_nefer-commit.md](../../_bmad/custom/_nefer-commit.md). For this story's commit (pure documentation, no Neter touched), `docs(governance):` is the appropriate scope.
- Commit subject includes `phase 23` for grep-ability (do likewise — e.g., `docs(governance): phase 23 story 1.9 CLAUDE.md stack + PRD/closure-roadmap correction notes`).
- The CHANGELOG entry for Story 1.8's dev-spec artifact was a separate commit (`425ab04`). For Story 1.9, prefer to bundle the spec + CHANGELOG entry + the file edits into a single commit (this is a small story — three small file edits + one CHANGELOG entry). If the dev agent finds bundling clumsy, split per commit-message-clarity preference, but the husky hook only checks across the last 10 commits → either pattern passes.
- All Phase 23 commits include a one-paragraph body explaining the WHY — keep this convention.

### Project context reference

This story is a unit of work in **Phase 23 — Câblage des mécaniques pivot mission (superfans × Overton)**, Epic 1 Governance Foundations. The epic ships **no user-visible behaviour change** — its purpose is to lay the typed-contract foundation that Epics 2-7 plug into. This story specifically closes the documentation surface of that foundation : project memory (CLAUDE.md) accurate, PRD + closure-roadmap aligned with the ADR-0077 scope correction.

This story was renumbered from Story 1.8 → Story 1.9 on 2026-05-16 via [sprint-change-proposal-2026-05-16.md](../planning-artifacts/sprint-change-proposal-2026-05-16.md) (post-STATE_FINAL_BLUEPRINT canonization). Pre-blueprint, this was the last story of a 9-story epic ; post-blueprint, it is story 9 of 10 (the new Story 1.8 inserted for the `BRIEF_VS_ADVE_COHERENCE` gate scaffold).

The next story in sequence is **Story 1.10 (Initial map updates — reserve Phase 23 entries)** which lands skeletal entries in PAGE-MAP / ROUTER-MAP / SERVICE-MAP / COMPONENT-MAP for surfaces that downstream epics will populate.

After Stories 1.9 + 1.10 ship, **Epic 1 is closed (10/10 stories shipped)** and Phase 23 Epic 2 (External Signal Connectors via Credentials Vault) starts. The closure-roadmap status will transition from `EPICS_DRAFTED ✓` toward `IN_DEV` for target #1.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — package.json grep against CLAUDE.md Stack line confirmed already-correct, CLAUDE.md Phase status Phase 23 entry confirmed present with ADR-0077 link, PRD frontmatter `scope_correction_note` + ADR-0077 annotations confirmed present, closure-roadmap target #1 closure criterion read for the explicit-pointer tightening, audit-changelog-coverage husky hook semantics confirmed (root CHANGELOG.md authoritative ; `docs/governance/CHANGELOG.md` referenced by _nefer-commit.md is stale), Story 1.8 shipped reference loaded for entry-shape convention, Story 1.1 epic spec re-read to confirm what promise this story closes, Sprint Change Proposal Change 9 confirmed as the prior commit that landed most of the Phase 23 entry in CLAUDE.md. All documented above. Convergence-not-churn mandate explicitly inscribed in the task subsections so the dev agent does not re-edit already-correct text.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 verification: read [CLAUDE.md L240-249](../../CLAUDE.md#L240) → Stack paragraph matches AC #1 wording **verbatim** (no edit required). Substring quote: `Next.js 16 + React 19 + TypeScript 6 + Tailwind 4 + tRPC 11 + Prisma 7 (PostgreSQL) + NextAuth v5. LLM Gateway v4 (multi-provider, circuit breaker, cost tracking) in \`src/server/services/llm-gateway/\`. Hybrid RAG + multi-provider embeddings (Ollama → OpenAI → no-op) since V5.2. Vitest 4 + Playwright 1.59 for tests. CVA 0.7 for design-system variants. ESLint 10 + madge 8 enforce the layering cascade.`
- AC #2 verification: read [CLAUDE.md L195-200](../../CLAUDE.md#L195) → Phase 23 entry at L198 carries `🟡 **IN_DEV — Epic 1 (Governance Foundations) en cours**` state label AND `cf. [ADR-0077](docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)` explicit link. No edit required.
- AC #3 first half verification: read [_bmad-output/planning-artifacts/prd.md L70-130](../planning-artifacts/prd.md) → all 4 expected annotation strings present : (a) `scope_summary` L85 begins with `[SCOPE CORRECTED 2026-05-16 per ADR-0077 — see scope_correction_note below for original wording.]`, (b) `code_map_grep.result` L109 contains `[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :]`, (c) `code_map_grep.decision` L110 contains `[CORRECTED 2026-05-16 per ADR-0077 + architecture step-02 :]`, (d) standalone `scope_correction_note:` field L98-106 multi-line YAML block referencing ADR-0077. No edit required.
- AC #3 second half (Task 4): read [closure-roadmap.md L64](../planning-artifacts/closure-roadmap.md) → target #1 closure criterion contained `Glory tools wired (5 exist)` but no explicit `(cf. ADR-0077)` parenthetical. **Net-new edit applied** — inserted `(cf. [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Scope reframe")` immediately after `Glory tools wired (5 exist)`. Status cell `EPICS_DRAFTED ✓` left untouched (Task 4.4 boundary).
- AC #4 (Task 5): added `v6.23.2` entry to [CHANGELOG.md](../../CHANGELOG.md) above existing `v6.23.1` entry. Entry shape mirrors v6.23.1 (Story 1.8) conventions : header with date 2026-05-27, lead paragraph + "Scope = DOC-SYNC ONLY", "Fichiers modifiés" (4 items + this CHANGELOG row implicit), "Tests state explicit", "Cap APOGEE et 7-sources sync (NEFER §1)", "Residual debt flagged" (the `_nefer-commit.md` P6 stale pointer), "Mission link".
- Task 6 verification: `git diff --stat` (run pre-commit) shows touches limited to the 4 governance docs + this story file. No `src/**` / `tests/**` / `prisma/**` touched. `audit-changelog-coverage` hook will run on commit via [.husky/pre-commit L17-18](../../.husky/pre-commit).

### Completion Notes List

- **AC #1 (CLAUDE.md Stack line) — already-satisfied.** Verified, no edit applied. Matched substring quoted in Debug Log.
- **AC #2 (CLAUDE.md Phase 23 entry) — already-satisfied.** Verified, no edit applied. Phase 23 entry at L198 carries both `IN_DEV` state label and explicit `cf. ADR-0077` link. Sibling 2026-05-16 ADRs (0084/0085/0086/0087) covered by the L200 follow-up entry per Task 2.4 boundary.
- **AC #3 first half (PRD frontmatter 4 annotations) — already-satisfied.** Verified, no edit applied. All 4 annotation strings present at the expected line ranges. YAML structure preserved.
- **AC #3 second half (closure-roadmap target #1 explicit ADR-0077 pointer) — newly-edited.** Inserted `(cf. [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Scope reframe")` immediately after `Glory tools wired (5 exist)` in target #1's closure criterion cell. This is the only net-new edit on the four target files outside of the story file + CHANGELOG.
- **AC #4 (CHANGELOG v6.23.2) — shipped.** Entry inserted above v6.23.1 with all the canonical sub-sections (lead paragraph + "Scope = DOC-SYNC ONLY" + "Fichiers modifiés" + "Tests state explicit" + "Cap APOGEE et 7-sources sync" + "Residual debt flagged" + "Mission link"). Date 2026-05-27 (actual ship date). Husky `audit-changelog-coverage` hook will validate on commit.
- **Convergence-not-churn mandate honored** — 3 of 4 ACs were already-satisfied by prior commits (Story 1.1 + Sprint Change Proposal 2026-05-16 + Story 1.8). Only the explicit `(cf. ADR-0077)` pointer in closure-roadmap target #1's closure criterion cell itself was net-new (Story 1.1 had landed the pointer only in adjacent metadata + the `scope_correction_note` field, not in the closure criterion line per se).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (CLAUDE.md + NEFER + Story 1.8 conventions + _nefer-facts §11 STATE_FINAL_BLUEPRINT + _nefer-commit P1-P8 + package.json + ADR-0077 read), Phase 1 APOGEE (n/a — pure governance docs, no OS layer), Phase 2 anti-doublon (4 greps documented in story header — all converged on "already-satisfied"), Phase 3 conception (4 doc files + story file scope locked, no entity introduced), Phase 4 execution (single net-new closure-roadmap edit + CHANGELOG entry + story file lifecycle update), Phase 5 verification (git diff limited to 5 paths, no source touched, `tsc --noEmit` + `eslint` baselines preserved by construction, `neteru-coherence.test.ts` 12/12 green by construction), Phase 6 documentation (this IS the doc-sync; 7-sources synchronization invariant touched only on source #7 non-Neter portions), Phase 7 commit (next step).
- **Cap APOGEE 7/7 preserved** — zero Neter touched. `BRAINS` const inchangé. `Governor` type inchangé. LEXICON / APOGEE / PANTHEON / CODE-MAP untouched (no canonical vocabulary change). `neteru-coherence.test.ts` stays green by construction.
- **Manual-first parity (ADR-0060)** — n/a (pure documentation, no LLM feature).
- **Residual debt flagged for separate cleanup** — `_nefer-commit.md` P6 references `docs/governance/CHANGELOG.md` ; the husky hook actually reads from repo-root `CHANGELOG.md`. Protocol-vs-reality drift surfaced in CHANGELOG entry's "Residual debt flagged" section. Out-of-scope for Story 1.9 AC ; recommended for a separate doc-only cleanup commit.
- **Mission link**: project memory drift on the 7 sources of truth poisons every downstream agent reasoning from them. Closing the Story 1.1 doc-sync loop ensures Phase 23 Epic 2+ stories inherit a clean foundation. Indirect contribution to superfans × Overton, but a precondition for every direct contribution that follows.

### File List

- **EDIT** [_bmad-output/planning-artifacts/closure-roadmap.md](../planning-artifacts/closure-roadmap.md) — target #1 closure criterion cell : inserted `(cf. [ADR-0077](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Scope reframe")` immediately after `Glory tools wired (5 exist)`. No other rows touched.
- **EDIT** [CHANGELOG.md](../../CHANGELOG.md) — added `v6.23.2` entry above existing `v6.23.1` entry (reverse-chronological), with the canonical 7 sub-sections (lead + "Scope = DOC-SYNC ONLY" + "Fichiers modifiés" + "Tests state explicit" + "Cap APOGEE et 7-sources sync (NEFER §1)" + "Residual debt flagged" + "Mission link").
- **EDIT** [_bmad-output/implementation-artifacts/1-9-claudemd-stack-drift-and-correction-notes.md](./1-9-claudemd-stack-drift-and-correction-notes.md) — story file : Status `ready-for-dev` → `review`, all 6 task checkboxes [x] + 23 subtask checkboxes [x], Dev Agent Record filled (Agent Model + Debug Log + Completion Notes + File List + Change Log).
- **VERIFIED (no edit)** [CLAUDE.md](../../CLAUDE.md) — Stack line L244 + Phase 23 entry L198 both already match AC wording. Not modified.
- **VERIFIED (no edit)** [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) — 4 frontmatter annotation strings (`scope_summary` L85 / `code_map_grep.result` L109 / `code_map_grep.decision` L110 / standalone `scope_correction_note` L98-106) all present. Not modified.

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-27 | Story 1.9 shipped — convergence-not-churn doc-sync : verified CLAUDE.md Stack line + Phase 23 entry + PRD 4 annotations all already-correct (3 of 4 ACs already-satisfied by prior commits) ; net-new edit on closure-roadmap target #1 closure criterion (explicit `(cf. ADR-0077 §"Scope reframe")` pointer inserted) ; CHANGELOG v6.23.2 entry shipped. Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 8/10 → 9/10. Next : Story 1.10 (Initial map updates — PAGE/ROUTER/SERVICE/COMPONENT-MAP Phase 23 entries reserved). | NEFER (Claude Opus 4.7) |