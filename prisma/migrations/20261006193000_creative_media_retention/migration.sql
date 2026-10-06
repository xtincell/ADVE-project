ALTER TABLE "ContentSpecimen" ADD COLUMN "mediaArchive" JSONB,
  ADD COLUMN "mediaRetentionUntil" TIMESTAMP(3);
CREATE INDEX "ContentSpecimen_mediaRetentionUntil_idx" ON "ContentSpecimen"("mediaRetentionUntil");
ALTER TABLE "RecipeApplication" ADD COLUMN "publicationBinding" JSONB;
ALTER TABLE "CompetitorSnapshot" ADD COLUMN "brandRefId" TEXT;
CREATE INDEX "CompetitorSnapshot_brandRefId_measuredAt_idx" ON "CompetitorSnapshot"("brandRefId", "measuredAt");
ALTER TABLE "CompetitorSnapshot" ADD CONSTRAINT "CompetitorSnapshot_brandRefId_fkey" FOREIGN KEY ("brandRefId") REFERENCES "BrandRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;
