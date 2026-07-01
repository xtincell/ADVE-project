-- La Guilde — portail public (ADR-0093).
-- Champs additifs NON DESTRUCTIFS sur Mission : exposition publique d'une
-- mission sur le mur /LaGuilde + file de modération opérateur + filtres.
-- Aucune colonne existante modifiée, aucune contrainte NOT NULL rétroactive
-- (toutes nullable ou defaultées) — backfill-safe sur base live.

ALTER TABLE "Mission" ADD COLUMN "guildPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Mission" ADD COLUMN "guildSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Mission" ADD COLUMN "guildPublishedAt" TIMESTAMP(3);
ALTER TABLE "Mission" ADD COLUMN "publicSlug" TEXT;
ALTER TABLE "Mission" ADD COLUMN "postedByUserId" TEXT;
ALTER TABLE "Mission" ADD COLUMN "sector" TEXT;
ALTER TABLE "Mission" ADD COLUMN "location" TEXT;
ALTER TABLE "Mission" ADD COLUMN "category" TEXT;

-- publicSlug unique (URL partageable /LaGuilde/m/[slug]) — NULLs autorisés en double.
CREATE UNIQUE INDEX "Mission_publicSlug_key" ON "Mission"("publicSlug");

-- Mur public + file de modération : (guildPublished, status) couvre les deux requêtes.
CREATE INDEX "Mission_guildPublished_status_idx" ON "Mission"("guildPublished", "status");
CREATE INDEX "Mission_category_idx" ON "Mission"("category");
CREATE INDEX "Mission_sector_idx" ON "Mission"("sector");
