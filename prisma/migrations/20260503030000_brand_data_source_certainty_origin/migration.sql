-- Migration: BrandDataSource certainty + origin (PR-A, ADR-0032)
--
-- Adds:
--   - certainty (String, default 'DECLARED') — operator-controlled trust level
--     for the source. Taxonomy: OFFICIAL / DECLARED / INFERRED / ARBITRARY.
--     Source of truth: src/domain/source-certainty.ts.
--   - origin (String, nullable) — canonical source origin marker. Format:
--     'intake:<intakeId>' / 'manual:<userId>' / 'upload:<sha256>'. Used by
--     INTAKE_SOURCE_PURGE_AND_REINGEST (PR-B) to find the right row to purge
--     without heuristics on fileName.
--
-- Both fields backfill safely: certainty defaults to DECLARED (the most
-- conservative, neutral assumption for pre-existing rows that came from
-- intake or manual entry), origin stays NULL for legacy rows.

ALTER TABLE "BrandDataSource"
  ADD COLUMN "certainty" TEXT NOT NULL DEFAULT 'DECLARED';

ALTER TABLE "BrandDataSource"
  ADD COLUMN "origin" TEXT;

CREATE INDEX "BrandDataSource_certainty_idx" ON "BrandDataSource"("certainty");
CREATE INDEX "BrandDataSource_origin_idx" ON "BrandDataSource"("origin");
