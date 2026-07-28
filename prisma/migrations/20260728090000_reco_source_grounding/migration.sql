-- Ancrage documentaire des recommandations (ADR-0184).
-- Additif et backfill-safe : les recos existantes gardent NULL / tableau vide,
-- ce qui se lit « non mesuré » — jamais « non ancré ».
ALTER TABLE "Recommendation" ADD COLUMN "groundingScore" DOUBLE PRECISION;
ALTER TABLE "Recommendation" ADD COLUMN "groundingBand" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "groundedSourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Recommendation" ADD COLUMN "citedSourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Recommendation" ADD COLUMN "unverifiedCitations" TEXT[] DEFAULT ARRAY[]::TEXT[];
