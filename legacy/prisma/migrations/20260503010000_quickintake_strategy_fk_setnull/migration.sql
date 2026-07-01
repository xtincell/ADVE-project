-- QuickIntake.convertedToId — promote String? → real FK with ON DELETE SET NULL.
-- Cf. ADR-0029 (post-mortem of dangling pointers after Strategy archive purge).
--
-- Before this migration, convertedToId was a free String? field invisible to
-- the BFS purge in src/server/services/strategy-archive (which scans
-- information_schema for FKs). The purge of 18 incomplete brands left
-- 15 dangling pointers and crashed the convert / activateBrand flows
-- with "No record was found for an update".
--
-- Idempotent: cleanup any remaining dangling rows first, then add the FK.

UPDATE "QuickIntake" qi
SET "convertedToId" = NULL
WHERE qi."convertedToId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Strategy" s WHERE s.id = qi."convertedToId");

ALTER TABLE "QuickIntake"
  ADD CONSTRAINT "QuickIntake_convertedToId_fkey"
  FOREIGN KEY ("convertedToId") REFERENCES "Strategy"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "QuickIntake_convertedToId_idx" ON "QuickIntake"("convertedToId");
