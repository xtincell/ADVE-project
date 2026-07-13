-- ADR-0134 — CommunitySnapshot devient un relevé de MESURE (écrivain de
-- production au cron social-sync). Relaxation additive, zéro perte :
--   * les 4 taux deviennent nullables (null = non mesuré, jamais 0 fabriqué — P22-2)
--   * colonne provenance `source` (MANUAL | CONNECTOR, null = historique)
-- Les rows seed existantes restent valides telles quelles.

ALTER TABLE "CommunitySnapshot" ALTER COLUMN "health" DROP NOT NULL;
ALTER TABLE "CommunitySnapshot" ALTER COLUMN "sentiment" DROP NOT NULL;
ALTER TABLE "CommunitySnapshot" ALTER COLUMN "velocity" DROP NOT NULL;
ALTER TABLE "CommunitySnapshot" ALTER COLUMN "activeRate" DROP NOT NULL;
ALTER TABLE "CommunitySnapshot" ADD COLUMN "source" TEXT;
