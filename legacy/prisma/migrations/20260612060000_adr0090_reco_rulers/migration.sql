-- ADR-0090 — Déterminisme radical : rulers par champ ADVE + remplacement pondéré
-- Champs additifs nullable sur Recommendation (aucune donnée existante touchée).

ALTER TABLE "Recommendation" ADD COLUMN "rulerScore" DOUBLE PRECISION;
ALTER TABLE "Recommendation" ADD COLUMN "rulerVerdict" JSONB;
ALTER TABLE "Recommendation" ADD COLUMN "scoreImpactEstimate" DOUBLE PRECISION;
ALTER TABLE "Recommendation" ADD COLUMN "weightedScore" DOUBLE PRECISION;
ALTER TABLE "Recommendation" ADD COLUMN "predecessorId" TEXT;
