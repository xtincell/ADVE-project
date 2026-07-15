-- CreateTable
CREATE TABLE "EpreuveCandidate" (
    "id" TEXT NOT NULL,
    "subjectStrategyId" TEXT NOT NULL,
    "rivalName" TEXT NOT NULL,
    "rivalStrategyId" TEXT,
    "rivalBrandRefId" TEXT,
    "arena" TEXT NOT NULL,
    "proposedResult" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "recordedEpreuveId" TEXT,
    "dedupHash" TEXT NOT NULL,
    "intentEmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpreuveCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpreuveCandidate_dedupHash_key" ON "EpreuveCandidate"("dedupHash");

-- CreateIndex
CREATE INDEX "EpreuveCandidate_subjectStrategyId_status_idx" ON "EpreuveCandidate"("subjectStrategyId", "status");
