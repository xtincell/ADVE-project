-- ADR-0159 — Pari Public v1 (Phase C état-final, boucle B3).
-- Additif + backfill-safe : le registre existant reste intact.

ALTER TABLE "PredictionRecord" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PredictionRecord" ADD COLUMN "resolutionNote" TEXT;
ALTER TABLE "PredictionRecord" ADD COLUMN "declaredBy" TEXT;

CREATE INDEX "PredictionRecord_isPublic_status_idx" ON "PredictionRecord"("isPublic", "status");
