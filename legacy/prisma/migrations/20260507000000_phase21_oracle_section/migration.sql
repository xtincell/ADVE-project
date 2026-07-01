-- Phase 21 (ADR-0068) — OracleSection first-class entity
-- 35 sections × strategyId. Lifecycle PENDING → GENERATING → COMPLETE → FAILED → STALE.

-- CreateEnum
CREATE TYPE "OracleTier" AS ENUM ('CORE', 'BIG4_BASELINE', 'DISTINCTIVE');

-- CreateEnum
CREATE TYPE "OracleSectionStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETE', 'FAILED', 'STALE');

-- CreateTable
CREATE TABLE "OracleSection" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "tier" "OracleTier" NOT NULL,
    "status" "OracleSectionStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "confidence" DOUBLE PRECISION,
    "lastGenerationStartedAt" TIMESTAMP(3),
    "lastGenerationCompletedAt" TIMESTAMP(3),
    "lastError" JSONB,
    "errorCode" TEXT,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "staleAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lockExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OracleSection_strategyId_sectionId_key" ON "OracleSection"("strategyId", "sectionId");

-- CreateIndex
CREATE INDEX "OracleSection_strategyId_status_idx" ON "OracleSection"("strategyId", "status");

-- CreateIndex
CREATE INDEX "OracleSection_strategyId_tier_idx" ON "OracleSection"("strategyId", "tier");

-- CreateIndex
CREATE INDEX "OracleSection_staleAt_idx" ON "OracleSection"("staleAt");

-- AddForeignKey
ALTER TABLE "OracleSection" ADD CONSTRAINT "OracleSection_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
