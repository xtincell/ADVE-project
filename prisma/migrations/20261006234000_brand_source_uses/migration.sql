CREATE TABLE "BrandSourceUse" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "analysisStatus" TEXT NOT NULL DEFAULT 'EXTRACTED',
  "pillarMapping" JSONB,
  "analyzedSourceHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandSourceUse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BrandSourceUse_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "BrandDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BrandSourceUse_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BrandSourceUse_sourceId_strategyId_key" ON "BrandSourceUse"("sourceId", "strategyId");
CREATE INDEX "BrandSourceUse_strategyId_revokedAt_idx" ON "BrandSourceUse"("strategyId", "revokedAt");
ALTER TABLE "Recommendation" ADD COLUMN "sourceReceipts" JSONB;
