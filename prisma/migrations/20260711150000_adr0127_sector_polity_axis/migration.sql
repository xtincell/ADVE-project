-- ADR-0127 — Axe Overton par polity (secteur × échelle × pays).
-- Additive : nouvelle table, aucun backfill requis (le Sector global existant
-- reste le fallback de résolution — aucune donnée inventée par polity).

CREATE TABLE "SectorPolityAxis" (
    "id" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,
    "marketScale" "MarketScale" NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL DEFAULT '',
    "culturalAxis" JSONB,
    "dominantNarratives" TEXT[],
    "overtonState" JSONB,
    "lastObservedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectorPolityAxis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SectorPolityAxis_sectorSlug_marketScale_countryCode_key" ON "SectorPolityAxis"("sectorSlug", "marketScale", "countryCode");
CREATE INDEX "SectorPolityAxis_sectorSlug_idx" ON "SectorPolityAxis"("sectorSlug");
