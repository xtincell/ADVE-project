-- CreateEnum
CREATE TYPE "IntentionType" AS ENUM ('PRODUCT_LAUNCH', 'REPOSITION', 'MARKET_ENTRY', 'CAMPAIGN', 'PLATFORM', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "IntentionStatus" AS ENUM ('CAPTURED', 'BRIEF_GENERATED', 'BRIEF_VALIDATED', 'CONVERTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Intention" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "type" "IntentionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IntentionStatus" NOT NULL DEFAULT 'CAPTURED',
    "operatorId" TEXT,
    "briefMode" TEXT,
    "coherence" JSONB,
    "generatedBriefId" TEXT,
    "briefDraft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intention_strategyId_status_idx" ON "Intention"("strategyId", "status");

-- CreateIndex
CREATE INDEX "Intention_operatorId_idx" ON "Intention"("operatorId");

-- AddForeignKey
ALTER TABLE "Intention" ADD CONSTRAINT "Intention_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
