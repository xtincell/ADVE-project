-- AlterTable
ALTER TABLE "CompetitorSnapshot" ADD COLUMN     "countryCode" VARCHAR(2),
ADD COLUMN     "strategyId" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'QUARANTINE';

-- CreateTable
CREATE TABLE "ContentSpecimen" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "strategyId" TEXT,
    "visibility" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "caption" TEXT,
    "format" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "socialPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSpecimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMetricSnapshot" (
    "id" TEXT NOT NULL,
    "specimenId" TEXT NOT NULL,
    "observationKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "views" DOUBLE PRECISION,
    "reach" DOUBLE PRECISION,
    "likes" DOUBLE PRECISION,
    "comments" DOUBLE PRECISION,
    "shares" DOUBLE PRECISION,
    "followersAtObservation" DOUBLE PRECISION,
    "paidStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAnalysis" (
    "id" TEXT NOT NULL,
    "specimenId" TEXT NOT NULL,
    "analysisKey" TEXT NOT NULL,
    "taxonomyVersion" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "modelVersion" TEXT,
    "contentHash" TEXT NOT NULL,
    "annotation" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternEvidence" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "specimenId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "observedRatio" DOUBLE PRECISION,
    "baseline" JSONB NOT NULL,

    CONSTRAINT "PatternEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeApplication" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "applicationKey" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "frozenRecipe" JSONB NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "primaryMetric" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "actionId" TEXT,
    "assetId" TEXT,
    "resultSpecimenId" TEXT,
    "outcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RecipeApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSpecimen_identityKey_key" ON "ContentSpecimen"("identityKey");

-- CreateIndex
CREATE INDEX "ContentSpecimen_strategyId_visibility_idx" ON "ContentSpecimen"("strategyId", "visibility");

-- CreateIndex
CREATE INDEX "ContentSpecimen_platform_accountId_publishedAt_idx" ON "ContentSpecimen"("platform", "accountId", "publishedAt");

-- CreateIndex
CREATE INDEX "ContentSpecimen_sector_countryCode_publishedAt_idx" ON "ContentSpecimen"("sector", "countryCode", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentMetricSnapshot_observationKey_key" ON "ContentMetricSnapshot"("observationKey");

-- CreateIndex
CREATE INDEX "ContentMetricSnapshot_specimenId_observedAt_idx" ON "ContentMetricSnapshot"("specimenId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeAnalysis_analysisKey_key" ON "CreativeAnalysis"("analysisKey");

-- CreateIndex
CREATE INDEX "CreativeAnalysis_specimenId_createdAt_idx" ON "CreativeAnalysis"("specimenId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatternEvidence_recipeId_specimenId_key" ON "PatternEvidence"("recipeId", "specimenId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeApplication_applicationKey_key" ON "RecipeApplication"("applicationKey");

-- CreateIndex
CREATE INDEX "RecipeApplication_strategyId_createdAt_idx" ON "RecipeApplication"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_strategyId_visibility_idx" ON "CompetitorSnapshot"("strategyId", "visibility");

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSpecimen" ADD CONSTRAINT "ContentSpecimen_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentMetricSnapshot" ADD CONSTRAINT "ContentMetricSnapshot_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "ContentSpecimen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAnalysis" ADD CONSTRAINT "CreativeAnalysis_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "ContentSpecimen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "KnowledgeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "ContentSpecimen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CreativeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternEvidence" ADD CONSTRAINT "PatternEvidence_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "ContentMetricSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeApplication" ADD CONSTRAINT "RecipeApplication_resultSpecimenId_fkey" FOREIGN KEY ("resultSpecimenId") REFERENCES "ContentSpecimen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeApplication" ADD CONSTRAINT "RecipeApplication_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeApplication" ADD CONSTRAINT "RecipeApplication_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "KnowledgeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Proven private study provenance can be recovered. Unattributed legacy rows stay quarantined.
UPDATE "CompetitorSnapshot" AS snapshot
SET "visibility" = 'BRAND', "strategyId" = study."strategyId", "countryCode" = strategy."countryCode"
FROM "MarketStudy" AS study JOIN "Strategy" AS strategy ON strategy."id" = study."strategyId"
WHERE snapshot."studyId" = study."id";

ALTER TABLE "ContentSpecimen" ADD CONSTRAINT "ContentSpecimen_scope_check" CHECK (
  ("visibility" = 'PUBLIC' AND "strategyId" IS NULL) OR
  ("visibility" = 'BRAND' AND "strategyId" IS NOT NULL)
);
ALTER TABLE "ContentMetricSnapshot" ADD CONSTRAINT "ContentMetricSnapshot_paid_check"
  CHECK ("paidStatus" IN ('ORGANIC', 'PAID', 'UNKNOWN'));
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_scope_check" CHECK (
  "visibility" = 'QUARANTINE' OR
  ("visibility" = 'PUBLIC' AND "strategyId" IS NULL AND "studyId" IS NULL AND "source" IS NOT NULL AND "countryCode" IS NOT NULL) OR
  ("visibility" = 'BRAND' AND ("strategyId" IS NOT NULL OR "studyId" IS NOT NULL))
);
