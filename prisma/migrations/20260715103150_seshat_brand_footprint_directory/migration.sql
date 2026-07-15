-- CreateTable
CREATE TABLE "BrandFootprintSnapshot" (
    "id" TEXT NOT NULL,
    "brandKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "countryCode" VARCHAR(2),
    "sectorSlug" TEXT,
    "total" INTEGER,
    "measuredWeight" DOUBLE PRECISION,
    "dimensions" JSONB NOT NULL,
    "followerCounts" JSONB,
    "source" TEXT NOT NULL DEFAULT 'SCORER_FUNNEL',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandFootprintSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandFootprintSnapshot_brandKey_capturedAt_idx" ON "BrandFootprintSnapshot"("brandKey", "capturedAt");

-- CreateIndex
CREATE INDEX "BrandFootprintSnapshot_sectorSlug_countryCode_capturedAt_idx" ON "BrandFootprintSnapshot"("sectorSlug", "countryCode", "capturedAt");
