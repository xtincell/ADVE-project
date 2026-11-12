ALTER TABLE "FileUpload" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "FileUpload" ADD COLUMN "storageReceipt" JSONB;
CREATE UNIQUE INDEX "FileUpload_sourceId_key" ON "FileUpload"("sourceId");
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "BrandDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
