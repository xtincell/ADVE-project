# Story 1.6: Ship the single additive Prisma migration for Campaign + CampaignAction

Status: review

<!-- Validation is optional. Run validate-create-story for quality check before dev-story. -->

```
NEFER pre-flight: C1 ✓ C2 ✓ C3 ✓ C4 ✓ C5 n/a C6 n/a
Phase label: phase/23 (Epic 1 — Governance Foundations · Story 6/10)
Owning Neter: Mestor (Guidance · Prisma schema governance) + Thot (Sustainment · downstream calibration snapshot consumer)
APOGEE OS layer (ADR-0084): Layer 3 — Persistence (Prisma schema + migrations)
BrandAsset.kind produced: none (governance schema scaffold — fields are downstream-consumed in Epics 3, 4, 6)
Portail target: none runtime — migration lands in [prisma/migrations/20260516000000_phase23_campaign_additive_fields/](../../prisma/migrations/) + [prisma/schema.prisma](../../prisma/schema.prisma)
Manual-first parity (ADR-0060): structurally enabled at the schema level — both `Campaign.attributionCoefficients` (manual coefficient mode FR25) and `CampaignAction.overtonDeltaManual` (manual operator-tagged delta mode FR26) ship in this migration alongside their algorithmic counterparts' fields. Manual-first parity is materialized at the **persistence** layer, not just the API or UI — the manual fields are first-class columns from day one.
Mission link: the 4 additive fields are the **persistence rails** for the entire downstream Phase 23 chantier. `attributionCoefficients` carries the regression's fitted coefficients (or operator-entered ones) per `Campaign` ; `activeCalibrationSnapshotRef` is the load-bearing `IntentEmission.id` pointer that `PROMOTE_PIVOT_SUBCLUSTER` cites when promoting to PRODUCTION (P22-4 traceability) ; `overtonDeltaManual` is the operator-override surface for the Overton-shift measurement (FR26 manual peer to FR13) ; `manualEntryFlag` is the audit discriminator. Without these fields, Epics 3 / 4 / 6 cannot persist their results — the entire superfans × Overton instrumentation cascade has nowhere to land.
CODE-MAP grep: searched "attributionCoefficients", "activeCalibrationSnapshotRef", "overtonDeltaManual", "manualEntryFlag", "phase23_campaign", "phase22_campaign_additive" across `prisma/migrations/` + `prisma/schema.prisma` + `src/`. Hits: 0 prior migration with similar fields ; `Campaign` model exists since Phase 19 ADR-0052 v2 (cf. `prisma/schema.prisma`) ; `CampaignAction` model exists since Phase 18 ADR-0059. Extension chosen: net-new additive nullable columns on existing models justified by architecture D8 (additive-only migration, no new table, no breaking change). The model `Calibration*` is explicitly **NOT created** — pattern P22-6 forbids it ; HARD test `phase22-no-calibration-table.test.ts` (Epic 6) enforces.
```

## Story

As a **NEFER operator**,
I want **one additive Prisma migration adding all Phase 23 nullable fields on `Campaign` and `CampaignAction`**,
so that **Epics 3 / 4 / 6 can write to and read from these fields without each adding their own migration — single PR review surface, single rollback unit**.

## Acceptance Criteria

Verbatim from [epics.md L533-547](../planning-artifacts/epics.md):

1. **Given** the architecture D8 + P22-6 specifications
   **When** `prisma migrate dev --name phase22_campaign_additive_fields` is run (actual on-disk slug : `20260516000000_phase23_campaign_additive_fields`)
   **Then** the migration adds nullable columns :
   - `Campaign.attributionCoefficients` (JSONB)
   - `Campaign.activeCalibrationSnapshotRef` (TEXT — `IntentEmission.id` pointer)
   - `CampaignAction.overtonDeltaManual` (DOUBLE PRECISION / Float)
   - `CampaignAction.manualEntryFlag` (BOOLEAN, DEFAULT false)

2. **And** no existing column is altered or dropped.

3. **And** no new table is created (P22-6 : calibration snapshots live in `IntentEmission` payloads).

4. **And** `prisma generate` succeeds and `tsc --noEmit` is green against the regenerated client.

5. **And** the migration applied cleanly on a fresh DB and on an existing dev DB with seed data (no data loss).

## Tasks / Subtasks

- [x] **Task 1 — Extend `prisma/schema.prisma` with the 4 additive fields** (AC: #1, #2, #3) — *EDIT [prisma/schema.prisma](../../prisma/schema.prisma)*.
  - [x] 1.1 — Locate the `Campaign` model definition. Add 2 nullable scalar fields :
    ```prisma
    attributionCoefficients      Json?     // Phase 23 — manual coefficient mode (FR25) | algorithmic fit output (FR6) ; downstream-discriminated by IntentEmission.payload.source
    activeCalibrationSnapshotRef String?   // Phase 23 — IntentEmission.id pointer ; cited by PROMOTE_PIVOT_SUBCLUSTER.calibrationSnapshotRef for PRODUCTION promotion (P22-4 / FR24)
    ```
  - [x] 1.2 — Locate the `CampaignAction` model definition. Add 2 nullable scalar fields :
    ```prisma
    overtonDeltaManual  Float?    // Phase 23 — operator-tagged manual Overton delta (FR26) ; manual peer to algorithmic embeddings path (FR13)
    manualEntryFlag     Boolean?  @default(false)   // Phase 23 — audit discriminator : true when overtonDeltaManual is operator-entered (vs algorithmic-fit)
    ```
  - [x] 1.3 — Do NOT add any new model definition. Pattern P22-6 forbids a `Calibration*` model — snapshots persist as `IntentEmission` payloads.
  - [x] 1.4 — Verify no existing field on `Campaign` or `CampaignAction` is touched (additive-only — architecture D8).

- [x] **Task 2 — Run `prisma migrate dev` with the canonical name** (AC: #1) — *generates [prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql](../../prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql)*.
  - [x] 2.1 — `npx prisma migrate dev --name phase23_campaign_additive_fields`. Prisma auto-generates the timestamp prefix `20260516000000`.
  - [x] 2.2 — Inspect the generated `migration.sql`. Confirm it contains :
    ```sql
    ALTER TABLE "Campaign"
        ADD COLUMN "attributionCoefficients" JSONB,
        ADD COLUMN "activeCalibrationSnapshotRef" TEXT;

    ALTER TABLE "CampaignAction"
        ADD COLUMN "overtonDeltaManual" DOUBLE PRECISION,
        ADD COLUMN "manualEntryFlag" BOOLEAN DEFAULT false;
    ```
  - [x] 2.3 — Annotate the `migration.sql` with a header comment block explaining (a) which Phase 23 stories consume each field, (b) the P22-6 invariant (zero new table), (c) cross-reference to ADR-0077 / ADR-0080 / ADR-0081 / architecture D8. The annotation lives in the migration file so future readers see WHY without grepping the schema.
  - [x] 2.4 — Confirm `prisma generate` succeeds and regenerates the client with the new fields visible on `Campaign` + `CampaignAction` Prisma types.

- [x] **Task 3 — Verification** (AC: #4, #5).
  - [x] 3.1 — `npx tsc --noEmit` — green against the regenerated Prisma client (no consumers exist yet — the fields are unused in Epic 1).
  - [x] 3.2 — `npx prisma migrate reset --force` (on a dev DB only) then `npx prisma migrate dev` — confirm the migration applies cleanly on fresh DB.
  - [x] 3.3 — Apply against an existing dev DB with seed data : the migration adds NULL columns ; no rows are modified ; `Campaign`/`CampaignAction` row counts unchanged. No data loss.
  - [x] 3.4 — `grep -r "Calibration" prisma/schema.prisma` — confirm no `Calibration*` model exists (P22-6 enforced by inspection ; the HARD test `phase22-no-calibration-table.test.ts` activates Epic 6).
  - [x] 3.5 — Husky pre-commit hook auto-regenerates CODE-MAP.md → 4 new field synonyms appear (`attributionCoefficients` ↔ "manual / algorithmic attribution coefficients per Campaign", etc.).

## Dev Notes

### Relevant architecture patterns and constraints

**Architecture D8 = "additive-only nullable, no new table, one migration per Phase"** — the rule prevents the Phase 23 chantier from creating a "Phase 23 migration debris field" of 4-5 separate migrations (one per Epic). Bundling 4 fields in 1 migration delivers :
- **1 PR review surface** for schema impact.
- **1 rollback unit** if anything regresses (rare for additive-only ; possible for downstream readers ignoring NULLs).
- **0 risk of partial state** — if any downstream Epic ships a write to a missing column, dev would catch immediately at `prisma migrate dev` re-run time.

**P22-6 = "calibration snapshots live as `IntentEmission` payloads, zero new table"** — the most consequential structural decision in Phase 23 schema design. The intuitive design ("`CalibrationRun` model + `CalibrationSnapshot` model") is **forbidden** because :
- The snapshot is already hash-chained content (the `RUN_ATTRIBUTION_CALIBRATION` Intent's payload, persisted to `IntentEmission` per ADR-0004).
- A separate table would duplicate the hash-chain root-of-trust at a new location → drift risk + dual-write consistency burden.
- The snapshot's `id` (= the `IntentEmission.id`) is *already* the canonical reference for `PROMOTE_PIVOT_SUBCLUSTER.calibrationSnapshotRef` (P22-4 traceability gate).

The 4 nullable fields shipped here are **pointers + audit discriminators** for the `IntentEmission`-hosted snapshots — not snapshot replicas. `Campaign.activeCalibrationSnapshotRef` is a TEXT pointer to an `IntentEmission.id`. The actual snapshot content lives in `IntentEmission.payload` (a JSONB column already in the schema).

**Why JSONB for `attributionCoefficients`** — coefficients are `Record<string, number>` (per Story 4.5 + 4.2) ; the key set is dynamic (feature names per regression model version) and the column does not need indexed queries. JSONB is the right choice ; a normalized child table would be over-engineering for the access patterns.

**Why DOUBLE PRECISION for `overtonDeltaManual`** — Overton deltas are continuous values in approximately `[-1, +1]` range (sectoral-embedding cosine delta) ; floating-point precision is the natural representation. NUMERIC would over-constrain ; FLOAT4 would under-precise.

**Why BOOLEAN + DEFAULT false for `manualEntryFlag`** — most `CampaignAction` rows pre-Phase 23 have no Overton delta at all (the algorithmic path didn't ship until Epic 3) ; defaulting `manualEntryFlag` to `false` correctly classifies them as "not operator-entered" without a backfill migration. The DEFAULT is enforced at the DB level, not at the Prisma level — fresh rows post-migration with no explicit value get `false`.

**Migration naming** — `prisma migrate dev --name phase22_campaign_additive_fields` was the AC-specified name (reflecting the pre-2026-05-15 phase-label) ; the on-disk slug is `20260516000000_phase23_campaign_additive_fields` (Prisma auto-prefixed timestamp + the corrected `phase23` label). The slug discrepancy with the AC wording is intentional and documented in the migration's header comment.

### Source tree components to touch

| Path | Action | Why |
|---|---|---|
| [prisma/schema.prisma](../../prisma/schema.prisma) | **EDIT** | Add 4 nullable scalar fields across `Campaign` (2) + `CampaignAction` (2). No model added. |
| [prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql](../../prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql) | **NEW** | Auto-generated by `prisma migrate dev` ; annotated with header comment explaining downstream consumers + P22-6 invariant. |

**Files to READ (must read before drafting) — UNCHANGED by this story:**

- [docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md) §"Pattern P22-6" — snapshot persistence as IntentEmission payload (zero new table).
- [docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md) — `calibrationSnapshotRef` pointer semantics.
- [docs/governance/adr/0081-superfan-attribution-calibration-methodology.md](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md) — calibration snapshot payload shape (lives in IntentEmission.payload).
- [docs/governance/adr/0004-hash-chain-immutability.md](../../docs/governance/adr/0004-hash-chain-immutability.md) — `IntentEmission` append-only contract.
- [docs/governance/adr/0046-no-magic-fallback.md](../../docs/governance/adr/0046-no-magic-fallback.md) — `INSUFFICIENT_DATA` first-class returns (no fabricated coefficients).
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) §"D8 — Data architecture" — "0 new Prisma models, additive nullable fields only".
- [prisma/schema.prisma](../../prisma/schema.prisma) — current `Campaign` and `CampaignAction` model shapes (Phase 19 + Phase 18 origins).

**Anti-drift CI tests that MUST stay green after this story:**

- [tests/unit/governance/neteru-coherence.test.ts](../../tests/unit/governance/neteru-coherence.test.ts) — 7/7 cap, untouched.
- [tests/unit/governance/phase22-no-calibration-table.test.ts](../../tests/unit/governance/phase22-no-calibration-table.test.ts) — scaffolded by Story 1.7 ; activated HARD Epic 6 Story 6.7. Asserts no `Calibration*` model exists.

### Testing standards summary

- **No new Vitest spec at scaffold stage** — schema change ; behaviour tests come with the readers (Epic 3 / 4 / 6).
- `prisma migrate dev` is the structural verification ; CI runs `prisma migrate deploy` on every PR.
- Husky pre-commit auto-regenerates CODE-MAP → new field synonyms appear.
- `tsc --noEmit` is the type-level verification : every consumer of `Campaign` / `CampaignAction` Prisma types sees the new fields as nullable.

### Project Structure Notes

**Alignment with unified project structure:**

- Migration directory at canonical path `prisma/migrations/<YYYYMMDDHHMMSS>_<snake_slug>/migration.sql`. Slug is corrected from PRD's `phase22_*` to `phase23_*` to match the 2026-05-15 phase rebase.
- 1 schema edit, 1 generated migration ; no other files touched by this story.

**Detected variances / conflicts:**

- **AC slug wording** — AC #1 says `--name phase22_campaign_additive_fields` (pre-rebase wording) ; the shipped migration uses `phase23_*` (post-rebase). The discrepancy is documented in the migration header comment + this story's Completion Notes ; downstream tooling is unaffected (migrations are identified by the timestamp prefix, not the slug).
- **`manualEntryFlag` nullability** — `Boolean?` is technically nullable in Prisma (with `@default(false)`) ; some teams prefer `Boolean @default(false)` (non-nullable). The shipped version uses `Boolean?` to be permissive with pre-Phase-23 rows (no backfill needed). Both modes work ; the difference is whether `null` is distinguishable from `false`. Architecture D8 (additive nullable) suggests `Boolean?`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md L533-547 (story spec verbatim)](../planning-artifacts/epics.md)
- [Source: _bmad-output/planning-artifacts/architecture.md §"D8 — Data architecture"](../planning-artifacts/architecture.md)
- [Source: docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md §"Pattern P22-6"](../../docs/governance/adr/0077-phase-22-pivot-mechanics-wiring.md)
- [Source: docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md (calibrationSnapshotRef pointer)](../../docs/governance/adr/0080-pivot-subcluster-lifecycle-promotion-intent.md)
- [Source: docs/governance/adr/0081-superfan-attribution-calibration-methodology.md (snapshot payload shape in IntentEmission)](../../docs/governance/adr/0081-superfan-attribution-calibration-methodology.md)
- [Source: docs/governance/adr/0004-hash-chain-immutability.md (IntentEmission append-only)](../../docs/governance/adr/0004-hash-chain-immutability.md)
- [Source: prisma/schema.prisma (Campaign + CampaignAction current shapes)](../../prisma/schema.prisma)
- [Source: prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql (shipped migration)](../../prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql)
- [Source: _bmad-output/implementation-artifacts/1-4-promote-pivot-subcluster-intent-slo.md (consumer Story 1.4)](./1-4-promote-pivot-subcluster-intent-slo.md)
- [Source: _bmad-output/implementation-artifacts/1-5-run-attribution-calibration-intent-slo.md (consumer Story 1.5)](./1-5-run-attribution-calibration-intent-slo.md)

### Latest tech information

- **Prisma 7** (per CLAUDE.md "Stack") — `Json?` field type maps to `JSONB` in PostgreSQL ; `Float?` maps to `DOUBLE PRECISION` ; `Boolean?` with `@default(false)` maps to `BOOLEAN DEFAULT false`. All four mappings stable since Prisma 5.
- **Migration verification** — `prisma migrate dev` runs the new SQL against the dev DB + regenerates `@prisma/client` ; CI runs `prisma migrate deploy` (idempotent — applies only un-applied migrations).
- **No npm install needed** — Prisma is already a dep.

### Previous story intelligence

- **Stories 1.4 + 1.5 (`PROMOTE_PIVOT_SUBCLUSTER` + `RUN_ATTRIBUTION_CALIBRATION` Intent kinds)** — predecessors that **consume** `Campaign.activeCalibrationSnapshotRef` (the `PROMOTE_PIVOT_SUBCLUSTER` payload's `calibrationSnapshotRef` will eventually point to a Campaign-scoped snapshot) and produce snapshots via `RUN_ATTRIBUTION_CALIBRATION` (whose `IntentEmission.id` becomes the value `activeCalibrationSnapshotRef` stores).

### Git intelligence summary

```
3658e8c governance(domain): phase 23 additive migration on Campaign + CampaignAction   ← Story 1.6 ship commit
b271a61 governance: register Phase 23 Intent kinds + SLOs + dispatch placeholders   ← Stories 1.4 + 1.5
7421f56 governance(domain): add ConnectorResult<T> shared discriminated union (P22-1)
```

Pattern observed : Story 1.6 ships standalone (one structural concern = one commit). Commit scope `governance(domain)` — `domain` here refers to the Prisma schema as the data domain (the schema lives in `prisma/`, not `src/domain/`, but the scope tag is the canonical convention for schema commits per `_nefer-commit.md`).

### Project context reference

This story is **Story 6 of Phase 23 Epic 1 Governance Foundations**. It ships the **persistence rails** for the entire downstream Phase 23 chantier. After this story, every Epic 3 / 4 / 6 commit that needs to persist a coefficient / snapshot ref / manual Overton delta / audit flag has a column to write to — no further schema migrations needed for Phase 23.

For broader Phase 23 doctrine see [STATE_FINAL_BLUEPRINT.md](../../docs/governance/STATE_FINAL_BLUEPRINT.md) (canon absolute 2026-05-16).

## Story completion status

Status: **review**

NEFER context engine analysis completed — ADR-0077 §P22-6 + ADR-0080 + ADR-0081 + ADR-0004 read for the snapshot-as-IntentEmission-payload contract ; ADR-0046 read for the no-fabricated-coefficient invariant ; architecture D8 read for additive-only + zero-new-table mandate ; current `Campaign` + `CampaignAction` model shapes verified to allow the additions ; Prisma type-mapping rules verified for `Json?` / `Float?` / `Boolean?` ; HARD test `phase22-no-calibration-table.test.ts` Epic 6 activation timeline confirmed. All documented above.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`. NEFER operator persona on ADVE-project per `_nefer-facts.md`.

### Debug Log References

- AC #1 (4 nullable columns) — shipped: `cat prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql` confirms `ALTER TABLE "Campaign" ADD COLUMN "attributionCoefficients" JSONB, ADD COLUMN "activeCalibrationSnapshotRef" TEXT;` + `ALTER TABLE "CampaignAction" ADD COLUMN "overtonDeltaManual" DOUBLE PRECISION, ADD COLUMN "manualEntryFlag" BOOLEAN DEFAULT false;`. Header comment block documents each field's downstream consumer story + the P22-6 invariant.
- AC #2 (no existing column altered or dropped) — verified : the migration is pure `ADD COLUMN` ; no `ALTER`/`DROP` on existing columns.
- AC #3 (no new table) — verified : `grep "CREATE TABLE\|Calibration" prisma/migrations/20260516000000*/migration.sql` returns 0 hits.
- AC #4 (`prisma generate` + `tsc --noEmit` green) — verified pre-commit and post-commit.
- AC #5 (clean apply on fresh + existing dev DB) — verified locally with `prisma migrate reset --force` then `prisma migrate dev` ; no data loss on the seeded dev DB.
- Verification : `git log --oneline | grep "phase 23 additive migration"` confirms commit `3658e8c governance(domain): phase 23 additive migration on Campaign + CampaignAction`.

### Completion Notes List

- **AC #1–5 all shipped** in commit `3658e8c`. The migration carries an inline header comment documenting each field's downstream consumer story + the P22-6 invariant explicitly (no new table — calibration snapshots live in IntentEmission payloads).
- **NEFER 8-phase protocol compliance**: Phase 0 pre-flight (ADR-0077 + ADR-0080 + ADR-0081 + ADR-0004 + ADR-0046 + architecture D8 + current schema read), Phase 1 APOGEE (Layer 3 persistence ; no Neter added, cap 7/7 preserved), Phase 2 anti-doublon (grep returned 0 hits for the 4 new field names ; `Calibration*` model name explicitly excluded per P22-6), Phase 3 conception (additive-only + nullable + JSONB/Float/Boolean type mappings justified, no new table per P22-6), Phase 4 execution (`prisma migrate dev` + schema edits), Phase 5 verification (`tsc --noEmit` / `prisma generate` / migration replay against fresh + seeded dev DB / `neteru-coherence.test.ts` green), Phase 6 documentation (CODE-MAP auto-regen picks up new field synonyms), Phase 7 commit (shipped via `3658e8c`).
- **Cap APOGEE 7/7 preserved** — schema-level edit, no service/Neter added.
- **Manual-first parity (ADR-0060)** — **structurally enabled at persistence layer**. `Campaign.attributionCoefficients` carries the regression's fitted coefficients OR operator-entered ones ; `CampaignAction.overtonDeltaManual` is the manual operator-tagged delta peer to the algorithmic embeddings path ; both fields land alongside their algorithmic counterparts in the same migration. Manual peer paths have first-class columns from day one.
- **Mission link**: the 4 fields are the **persistence rails** for the calibration → snapshot → review → promotion chain. Without them, every Epic 3/4/6 commit would either (a) ship its own migration (debris field), or (b) work against in-memory state without persistence (no audit trail, no resumable runs). With them, the entire chantier has a stable schema to write to ; the Mission's superfans × Overton instrumentation has a place to land.

### File List

- **EDIT** [prisma/schema.prisma](../../prisma/schema.prisma) — `Campaign` model + 2 fields (`attributionCoefficients Json?`, `activeCalibrationSnapshotRef String?`) ; `CampaignAction` model + 2 fields (`overtonDeltaManual Float?`, `manualEntryFlag Boolean? @default(false)`).
- **NEW** [prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql](../../prisma/migrations/20260516000000_phase23_campaign_additive_fields/migration.sql) — auto-generated by `prisma migrate dev` + annotated with header comment block (downstream consumer stories + P22-6 invariant + cross-references to ADR-0077 / ADR-0080 / ADR-0081 / architecture D8).
- **EDIT** [_bmad-output/implementation-artifacts/1-6-phase23-campaign-additive-migration.md](./1-6-phase23-campaign-additive-migration.md) — this story file (post-hoc context engine artefact).

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-16 | Story 1.6 shipped via commit `3658e8c` — single additive Prisma migration adding 4 nullable columns (`Campaign.attributionCoefficients` JSONB + `Campaign.activeCalibrationSnapshotRef` TEXT + `CampaignAction.overtonDeltaManual` Float + `CampaignAction.manualEntryFlag` Boolean DEFAULT false). Zero new table (P22-6 — calibration snapshots in IntentEmission payloads). Zero existing column altered. Migration applies cleanly on fresh + seeded dev DB. `prisma generate` + `tsc --noEmit` green. Cap APOGEE 7/7 preserved. Phase 23 Epic 1 progress 5/10 → 6/10. | NEFER (Claude Opus 4.7) |
| 2026-05-27 | Post-hoc story file artefact generated for governance traceability. | NEFER (Claude Opus 4.7) |
