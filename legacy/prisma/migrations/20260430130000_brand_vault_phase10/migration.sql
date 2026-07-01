-- CreateEnum
CREATE TYPE "BrandAssetState" AS ENUM ('DRAFT', 'CANDIDATE', 'SELECTED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'REJECTED');

-- DropIndex
DROP INDEX "CampaignBrief_superAssetId_idx";

-- DropIndex
DROP INDEX "GenerativeTask_sourceSuperAssetId_idx";

-- AlterTable
ALTER TABLE "BrandAsset" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "batchIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "batchSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "briefId" TEXT,
ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "content" JSONB,
ADD COLUMN     "family" TEXT NOT NULL DEFAULT 'HYBRID',
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'production',
ADD COLUMN     "manipulationMode" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "parentBrandAssetId" TEXT,
ADD COLUMN     "pillarSource" TEXT,
ADD COLUMN     "selectedAt" TIMESTAMP(3),
ADD COLUMN     "selectedById" TEXT,
ADD COLUMN     "selectedReason" TEXT,
ADD COLUMN     "sourceAssetVersionId" TEXT,
ADD COLUMN     "sourceGloryOutputId" TEXT,
ADD COLUMN     "sourceIntentId" TEXT,
ADD COLUMN     "state" "BrandAssetState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "supersededById" TEXT,
ADD COLUMN     "supersededReason" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CampaignBrief" DROP COLUMN "superAssetId",
ADD COLUMN     "brandAssetId" TEXT;

-- AlterTable
ALTER TABLE "GenerativeTask" DROP COLUMN "sourceSuperAssetId",
ADD COLUMN     "sourceBrandAssetId" TEXT;

-- CreateIndex
CREATE INDEX "BrandAsset_strategyId_kind_state_idx" ON "BrandAsset"("strategyId", "kind", "state");

-- CreateIndex
CREATE INDEX "BrandAsset_campaignId_kind_state_idx" ON "BrandAsset"("campaignId", "kind", "state");

-- CreateIndex
CREATE INDEX "BrandAsset_briefId_idx" ON "BrandAsset"("briefId");

-- CreateIndex
CREATE INDEX "BrandAsset_batchId_idx" ON "BrandAsset"("batchId");

-- CreateIndex
CREATE INDEX "BrandAsset_parentBrandAssetId_idx" ON "BrandAsset"("parentBrandAssetId");

-- CreateIndex
CREATE INDEX "BrandAsset_sourceIntentId_idx" ON "BrandAsset"("sourceIntentId");

-- CreateIndex
CREATE INDEX "BrandAsset_sourceGloryOutputId_idx" ON "BrandAsset"("sourceGloryOutputId");

-- CreateIndex
CREATE INDEX "BrandAsset_sourceAssetVersionId_idx" ON "BrandAsset"("sourceAssetVersionId");

-- CreateIndex
CREATE INDEX "BrandAsset_state_idx" ON "BrandAsset"("state");

-- CreateIndex
CREATE INDEX "BrandAsset_operatorId_idx" ON "BrandAsset"("operatorId");

-- CreateIndex
CREATE INDEX "CampaignBrief_brandAssetId_idx" ON "CampaignBrief"("brandAssetId");

-- CreateIndex
CREATE INDEX "GenerativeTask_sourceBrandAssetId_idx" ON "GenerativeTask"("sourceBrandAssetId");

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "CampaignBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_parentBrandAssetId_fkey" FOREIGN KEY ("parentBrandAssetId") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerativeTask" ADD CONSTRAINT "GenerativeTask_sourceBrandAssetId_fkey" FOREIGN KEY ("sourceBrandAssetId") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

