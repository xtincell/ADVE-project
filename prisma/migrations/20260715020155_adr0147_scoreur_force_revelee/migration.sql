-- CreateTable
CREATE TABLE "BrandRef" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorSlug" TEXT,
    "marketScale" "MarketScale",
    "countryCode" VARCHAR(2),
    "fixedTheta" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Epreuve" (
    "id" TEXT NOT NULL,
    "subjectStrategyId" TEXT,
    "subjectBrandRefId" TEXT,
    "opponentBrandRefId" TEXT,
    "opponentStrategyId" TEXT,
    "arena" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,
    "marketScale" "MarketScale",
    "countryCode" VARCHAR(2),
    "result" TEXT NOT NULL,
    "proofWeight" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Epreuve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreVerdict" (
    "id" TEXT NOT NULL,
    "subjectStrategyId" TEXT,
    "subjectBrandRefId" TEXT,
    "subjectLabel" TEXT NOT NULL,
    "sectorSlug" TEXT NOT NULL,
    "marketScale" "MarketScale",
    "countryCode" VARCHAR(2),
    "force" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "coherence" DOUBLE PRECISION NOT NULL,
    "coveragePct" INTEGER NOT NULL,
    "arenas" JSONB NOT NULL,
    "gates" JSONB NOT NULL,
    "cappedReason" TEXT,
    "epreuveCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreVerdict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandRef_slug_key" ON "BrandRef"("slug");

-- CreateIndex
CREATE INDEX "BrandRef_kind_idx" ON "BrandRef"("kind");

-- CreateIndex
CREATE INDEX "BrandRef_sectorSlug_marketScale_countryCode_idx" ON "BrandRef"("sectorSlug", "marketScale", "countryCode");

-- CreateIndex
CREATE INDEX "Epreuve_subjectStrategyId_arena_idx" ON "Epreuve"("subjectStrategyId", "arena");

-- CreateIndex
CREATE INDEX "Epreuve_subjectBrandRefId_arena_idx" ON "Epreuve"("subjectBrandRefId", "arena");

-- CreateIndex
CREATE INDEX "Epreuve_sectorSlug_marketScale_countryCode_arena_idx" ON "Epreuve"("sectorSlug", "marketScale", "countryCode", "arena");

-- CreateIndex
CREATE INDEX "ScoreVerdict_sectorSlug_marketScale_countryCode_force_idx" ON "ScoreVerdict"("sectorSlug", "marketScale", "countryCode", "force");

-- CreateIndex
CREATE INDEX "ScoreVerdict_subjectStrategyId_computedAt_idx" ON "ScoreVerdict"("subjectStrategyId", "computedAt");

-- CreateIndex
CREATE INDEX "ScoreVerdict_tier_idx" ON "ScoreVerdict"("tier");
