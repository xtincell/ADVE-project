-- ADR-0144 (résiduel « FK durable BrandAction.missionId ») — le lien mission ↔
-- tâche datée passait par BrandAction.metadata.missionKey (JSON non indexé,
-- fragile). Champ additif nullable + FK ON DELETE SET NULL + backfill depuis
-- metadata->>'missionKey' (qui stocke déjà l'id de Mission). Backfill-safe :
-- seules les clés pointant une Mission existante sont recopiées.

ALTER TABLE "BrandAction" ADD COLUMN "missionId" TEXT;

UPDATE "BrandAction" ba
SET "missionId" = ba."metadata"->>'missionKey'
WHERE ba."metadata"->>'missionKey' IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Mission" m WHERE m."id" = ba."metadata"->>'missionKey');

CREATE INDEX "BrandAction_missionId_idx" ON "BrandAction"("missionId");

ALTER TABLE "BrandAction" ADD CONSTRAINT "BrandAction_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
