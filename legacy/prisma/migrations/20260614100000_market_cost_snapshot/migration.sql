-- Base de coûts marché HISTORISÉS par (pays, secteur, métrique, période) — ADR-0094.
-- Complète MarketBenchmark (statique) avec l'axe temps. Additif, non destructif.

CREATE TABLE "MarketCostSnapshot" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'ALL',
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'FCFA',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "p10" DOUBLE PRECISION,
    "p50" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'SEED',
    "sourceRef" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCostSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketCostSnapshot_countryCode_sector_metric_period_key" ON "MarketCostSnapshot"("countryCode", "sector", "metric", "period");
CREATE INDEX "MarketCostSnapshot_countryCode_sector_metric_periodStart_idx" ON "MarketCostSnapshot"("countryCode", "sector", "metric", "periodStart");
CREATE INDEX "MarketCostSnapshot_metric_periodStart_idx" ON "MarketCostSnapshot"("metric", "periodStart");
