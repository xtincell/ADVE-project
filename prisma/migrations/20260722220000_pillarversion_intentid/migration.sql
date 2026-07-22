-- G (ADR-0176) — moteur de compensation réel. ROLLBACK_PILLAR restaure le
-- contenu du pilier depuis l'historique PillarVersion. Chaque PillarVersion
-- capture le contenu PRÉ-écriture ; `intentId` lie la version à l'IntentEmission
-- qui l'a produite → restauration PRÉCISE de l'état d'avant l'intent visé (au
-- lieu de deviner « la dernière écriture »). Purement additif, backfill-safe
-- (NULL = version antérieure au suivi, non restaurable avec précision).

-- AlterTable
ALTER TABLE "PillarVersion" ADD COLUMN "intentId" TEXT;

-- CreateIndex
CREATE INDEX "PillarVersion_intentId_idx" ON "PillarVersion"("intentId");
