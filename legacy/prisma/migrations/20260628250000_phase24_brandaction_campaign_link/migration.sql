-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "aarrrPrimary" TEXT,
ADD COLUMN     "aarrrSecondary" TEXT,
ADD COLUMN     "canonType" TEXT,
ADD COLUMN     "isAlwaysOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendedBudget" DOUBLE PRECISION,
ADD COLUMN     "routeKey" TEXT;

-- AlterTable
ALTER TABLE "BrandAction" ADD COLUMN     "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "BrandAction_campaignId_idx" ON "BrandAction"("campaignId");

-- AddForeignKey
ALTER TABLE "BrandAction" ADD CONSTRAINT "BrandAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
