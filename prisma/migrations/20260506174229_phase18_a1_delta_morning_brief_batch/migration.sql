-- CreateEnum
CREATE TYPE "IngestedSourceKind" AS ENUM ('EMAIL', 'SLACK', 'WHATSAPP', 'MANUAL_PASTE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "MorningBriefBatchState" AS ENUM ('ANALYZING', 'READY_FOR_REVIEW', 'PARTIAL_VALIDATED', 'FULLY_VALIDATED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "BriefIngestionClassification" AS ENUM ('NEW_BRIEF', 'UPDATE_OF_BRIEF', 'NON_BRIEF', 'OPS_ACTION', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "BriefIngestionDraftState" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'EDITED', 'MATERIALIZED', 'AUTO_MATERIALIZED');

-- AlterTable
ALTER TABLE "CampaignBrief" ADD COLUMN     "sourceIngestedId" TEXT;

-- CreateTable
CREATE TABLE "IngestedSource" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "kind" "IngestedSourceKind" NOT NULL,
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "sender" TEXT,
    "subject" TEXT,
    "rawSnippet" TEXT NOT NULL,
    "redactedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "threadKey" TEXT,
    "language" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MorningBriefBatch" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rawInput" TEXT NOT NULL,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "briefCount" INTEGER NOT NULL DEFAULT 0,
    "state" "MorningBriefBatchState" NOT NULL DEFAULT 'ANALYZING',
    "llmConfidenceMean" DOUBLE PRECISION,
    "llmTotalTokens" INTEGER,
    "llmCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MorningBriefBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefIngestionDraft" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" "BriefIngestionClassification" NOT NULL,
    "classificationReason" TEXT,
    "resolvedNodeId" TEXT,
    "resolvedNodePath" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedCampaignId" TEXT,
    "resolvedCampaignName" TEXT,
    "payload" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "state" "BriefIngestionDraftState" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "materializedCampaignBriefId" TEXT,
    "materializedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefIngestionDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestedSource_operatorId_ingestedAt_idx" ON "IngestedSource"("operatorId", "ingestedAt");

-- CreateIndex
CREATE INDEX "IngestedSource_threadKey_idx" ON "IngestedSource"("threadKey");

-- CreateIndex
CREATE INDEX "IngestedSource_kind_externalId_idx" ON "IngestedSource"("kind", "externalId");

-- CreateIndex
CREATE INDEX "MorningBriefBatch_operatorId_startedAt_idx" ON "MorningBriefBatch"("operatorId", "startedAt");

-- CreateIndex
CREATE INDEX "MorningBriefBatch_state_idx" ON "MorningBriefBatch"("state");

-- CreateIndex
CREATE INDEX "BriefIngestionDraft_batchId_state_idx" ON "BriefIngestionDraft"("batchId", "state");

-- CreateIndex
CREATE INDEX "BriefIngestionDraft_classification_idx" ON "BriefIngestionDraft"("classification");

-- CreateIndex
CREATE INDEX "BriefIngestionDraft_resolvedNodeId_idx" ON "BriefIngestionDraft"("resolvedNodeId");

-- CreateIndex
CREATE INDEX "BriefIngestionDraft_resolvedCampaignId_idx" ON "BriefIngestionDraft"("resolvedCampaignId");

-- CreateIndex
CREATE INDEX "CampaignBrief_sourceIngestedId_idx" ON "CampaignBrief"("sourceIngestedId");

-- AddForeignKey
ALTER TABLE "CampaignBrief" ADD CONSTRAINT "CampaignBrief_sourceIngestedId_fkey" FOREIGN KEY ("sourceIngestedId") REFERENCES "IngestedSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestedSource" ADD CONSTRAINT "IngestedSource_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MorningBriefBatch" ADD CONSTRAINT "MorningBriefBatch_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefIngestionDraft" ADD CONSTRAINT "BriefIngestionDraft_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MorningBriefBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefIngestionDraft" ADD CONSTRAINT "BriefIngestionDraft_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestedSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
