-- ADR-0126 — Échelle de marché déclarée (enfant ADR-0086).
-- Additive et backfill-safe : 3 colonnes nullable sur "Strategy", aucun défaut,
-- aucune donnée existante touchée (Loi 1 — fallback cibles historiques en app).

CREATE TYPE "MarketScale" AS ENUM ('QUARTIER', 'VILLE', 'REGION', 'NATION', 'CONTINENT', 'MONDE');

ALTER TABLE "Strategy" ADD COLUMN "marketScale" "MarketScale";
ALTER TABLE "Strategy" ADD COLUMN "addressableAudience" INTEGER;
ALTER TABLE "Strategy" ADD COLUMN "brandFoundedYear" INTEGER;
