-- AlterTable
ALTER TABLE "CampaignDeliverable" ADD COLUMN     "taskCode" TEXT;

-- CreateIndex
CREATE INDEX "CampaignDeliverable_taskCode_idx" ON "CampaignDeliverable"("taskCode");
