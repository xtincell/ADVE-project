-- ADR-0207 (amendement 562) : filiation de l'écriture qui applique une proposition.
-- Additif et nullable ; aucune application antérieure n'est rattachée par supposition.
ALTER TABLE "Recommendation" ADD COLUMN "appliedIntentId" TEXT;
