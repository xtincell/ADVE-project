-- Vague 10 — empreinte web publique du prospect (étape préliminaire du rapport).
-- (websiteUrl existe déjà sur QuickIntake — partagé avec INGEST_PLUS.)
ALTER TABLE "QuickIntake" ADD COLUMN "socialLinksRaw" TEXT;
ALTER TABLE "QuickIntake" ADD COLUMN "webFootprint" JSONB;
