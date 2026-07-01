-- CreateTable
CREATE TABLE "CreativeProposal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LAFUSEE_AI',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "direction" JSONB NOT NULL,
    "executionLevels" JSONB,
    "visuals" JSONB,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreativeProposal_strategyId_idx" ON "CreativeProposal"("strategyId");

-- CreateIndex
CREATE INDEX "CreativeProposal_strategyId_status_idx" ON "CreativeProposal"("strategyId", "status");

-- AddForeignKey
ALTER TABLE "CreativeProposal" ADD CONSTRAINT "CreativeProposal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
