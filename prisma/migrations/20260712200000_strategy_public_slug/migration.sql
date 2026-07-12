-- Vague « cockpit qui ramène tout » (2026-07-12) : slug public de la page de
-- marque (<slug>.powerupgraders.com). Additif, nullable, unique.
ALTER TABLE "Strategy" ADD COLUMN "publicSlug" TEXT;
CREATE UNIQUE INDEX "Strategy_publicSlug_key" ON "Strategy"("publicSlug");
