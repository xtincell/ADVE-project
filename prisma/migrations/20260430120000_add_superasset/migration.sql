-- CreateEnum
CREATE TYPE "SuperAssetState" AS ENUM ('DRAFT', 'CANDIDATE', 'SELECTED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "activeBigIdeaId" TEXT,
ADD COLUMN     "activeBriefId" TEXT,
ADD COLUMN     "activeClaimId" TEXT,
ADD COLUMN     "activeKvBriefId" TEXT,
ADD COLUMN     "activeManifestoId" TEXT;

-- AlterTable
ALTER TABLE "CampaignBrief" ADD COLUMN     "superAssetId" TEXT;

-- AlterTable
ALTER TABLE "GenerativeTask" ADD COLUMN     "briefId" TEXT,
ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "sourceSuperAssetId" TEXT;

-- CreateTable
CREATE TABLE "SuperAsset" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "briefId" TEXT,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "state" "SuperAssetState" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "pillarSource" TEXT,
    "manipulationMode" TEXT,
    "sourceIntentId" TEXT,
    "sourceGloryOutputId" TEXT,
    "batchId" TEXT,
    "batchSize" INTEGER NOT NULL DEFAULT 1,
    "batchIndex" INTEGER NOT NULL DEFAULT 0,
    "selectedAt" TIMESTAMP(3),
    "selectedById" TEXT,
    "selectedReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentSuperAssetId" TEXT,
    "supersededById" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededReason" TEXT,
    "metadata" JSONB,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuperAsset_operatorId_strategyId_kind_state_idx" ON "SuperAsset"("operatorId", "strategyId", "kind", "state");

-- CreateIndex
CREATE INDEX "SuperAsset_campaignId_kind_state_idx" ON "SuperAsset"("campaignId", "kind", "state");

-- CreateIndex
CREATE INDEX "SuperAsset_briefId_idx" ON "SuperAsset"("briefId");

-- CreateIndex
CREATE INDEX "SuperAsset_batchId_idx" ON "SuperAsset"("batchId");

-- CreateIndex
CREATE INDEX "SuperAsset_sourceGloryOutputId_idx" ON "SuperAsset"("sourceGloryOutputId");

-- CreateIndex
CREATE INDEX "SuperAsset_state_idx" ON "SuperAsset"("state");

-- CreateIndex
CREATE INDEX "CampaignBrief_superAssetId_idx" ON "CampaignBrief"("superAssetId");

-- CreateIndex
CREATE INDEX "GenerativeTask_sourceSuperAssetId_idx" ON "GenerativeTask"("sourceSuperAssetId");

-- CreateIndex
CREATE INDEX "GenerativeTask_campaignId_idx" ON "GenerativeTask"("campaignId");

-- CreateIndex
CREATE INDEX "GenerativeTask_briefId_idx" ON "GenerativeTask"("briefId");

-- AddForeignKey
ALTER TABLE "GenerativeTask" ADD CONSTRAINT "GenerativeTask_sourceSuperAssetId_fkey" FOREIGN KEY ("sourceSuperAssetId") REFERENCES "SuperAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAsset" ADD CONSTRAINT "SuperAsset_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAsset" ADD CONSTRAINT "SuperAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAsset" ADD CONSTRAINT "SuperAsset_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "CampaignBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAsset" ADD CONSTRAINT "SuperAsset_parentSuperAssetId_fkey" FOREIGN KEY ("parentSuperAssetId") REFERENCES "SuperAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperAsset" ADD CONSTRAINT "SuperAsset_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "SuperAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

