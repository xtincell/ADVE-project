-- Phase 24 (ADR-0094) — BrandAction becomes the canonical queryable projection
-- of I-pillar initiatives. Additive only:
--   1. materialization key column `sourceInitiativeId`
--   2. FK to Strategy (cascade purge with the brand)
--   3. unique (strategyId, sourceInitiativeId) so re-materialization upserts cleanly
--
-- The blob (Pillar.content "i") stays the authoring/cascade substrate (ADR-0088).
-- This table is materialized/synced from it and read by cockpit + Oracle.

-- 1. Materialization key
ALTER TABLE "BrandAction" ADD COLUMN "sourceInitiativeId" TEXT;

-- 2. Drop orphan rows (strategyId pointing to a purged Strategy) before adding the FK.
DELETE FROM "BrandAction"
WHERE "strategyId" NOT IN (SELECT "id" FROM "Strategy");

-- 3. FK to Strategy (cascade)
ALTER TABLE "BrandAction"
  ADD CONSTRAINT "BrandAction_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Unique materialization key (NULLs are distinct in Postgres → operator-manual
--    rows without a source initiative never collide).
CREATE UNIQUE INDEX "BrandAction_strategyId_sourceInitiativeId_key"
  ON "BrandAction"("strategyId", "sourceInitiativeId");
