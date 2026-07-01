-- AlterTable
ALTER TABLE "MarketSource" ADD COLUMN     "provenanceClass" TEXT;

-- AlterTable
ALTER TABLE "CompetitorSnapshot" ADD COLUMN     "studyId" TEXT;

-- CreateIndex
CREATE INDEX "CompetitorSnapshot_studyId_idx" ON "CompetitorSnapshot"("studyId");

-- AddForeignKey
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "MarketStudy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
