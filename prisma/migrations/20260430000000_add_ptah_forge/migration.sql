-- AlterTable
ALTER TABLE "Strategy" ADD COLUMN     "cultIndex" DOUBLE PRECISION,
ADD COLUMN     "manipulationMix" JSONB,
ADD COLUMN     "mixViolationOverrideCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GenerativeTask" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "sourceIntentId" TEXT,
    "operatorId" TEXT NOT NULL,
    "strategyId" TEXT,
    "forgeKind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModel" TEXT NOT NULL,
    "providerTaskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "promptHash" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "pillarSource" TEXT NOT NULL,
    "manipulationMode" TEXT NOT NULL,
    "resultUrls" JSONB,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL,
    "realisedCostUsd" DOUBLE PRECISION,
    "expectedSuperfans" INTEGER,
    "realisedSuperfans" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "webhookSecret" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "GenerativeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" TEXT NOT NULL,
    "parentAssetId" TEXT,
    "generativeTaskId" TEXT,
    "operatorId" TEXT NOT NULL,
    "strategyId" TEXT,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "fileSizeBytes" INTEGER,
    "metadata" JSONB NOT NULL,
    "cultIndexDeltaObserved" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForgeProviderHealth" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "circuitState" TEXT NOT NULL DEFAULT 'CLOSED',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureAt" TIMESTAMP(3),
    "circuitResetAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalFailures" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForgeProviderHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerativeTask_intentId_key" ON "GenerativeTask"("intentId");

-- CreateIndex
CREATE INDEX "GenerativeTask_operatorId_strategyId_forgeKind_status_idx" ON "GenerativeTask"("operatorId", "strategyId", "forgeKind", "status");

-- CreateIndex
CREATE INDEX "GenerativeTask_promptHash_idx" ON "GenerativeTask"("promptHash");

-- CreateIndex
CREATE INDEX "GenerativeTask_expiresAt_idx" ON "GenerativeTask"("expiresAt");

-- CreateIndex
CREATE INDEX "GenerativeTask_providerTaskId_idx" ON "GenerativeTask"("providerTaskId");

-- CreateIndex
CREATE INDEX "AssetVersion_operatorId_strategyId_idx" ON "AssetVersion"("operatorId", "strategyId");

-- CreateIndex
CREATE INDEX "AssetVersion_parentAssetId_idx" ON "AssetVersion"("parentAssetId");

-- CreateIndex
CREATE INDEX "AssetVersion_generativeTaskId_idx" ON "AssetVersion"("generativeTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ForgeProviderHealth_provider_key" ON "ForgeProviderHealth"("provider");

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "AssetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_generativeTaskId_fkey" FOREIGN KEY ("generativeTaskId") REFERENCES "GenerativeTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

