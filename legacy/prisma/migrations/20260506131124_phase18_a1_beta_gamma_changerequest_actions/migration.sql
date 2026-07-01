-- CreateEnum
CREATE TYPE "ChangeRequestImpact" AS ENUM ('COSMETIC', 'MINOR', 'MAJOR', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "OperatorActionCategory" AS ENUM ('BEFORE_DEPARTURE', 'SYSTEM', 'FOLLOWUPS', 'PRODUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "OperatorActionSource" AS ENUM ('GMAIL', 'SLACK', 'WHATSAPP', 'VERBAL', 'BRIEF', 'SYSTEM', 'OTHER');

-- CreateTable
CREATE TABLE "CampaignChangeRequest" (
    "id" TEXT NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "campaignDeliverableId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "impact" "ChangeRequestImpact" NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "newBriefVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAction" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "context" TEXT,
    "priority" "OperationalPriority" NOT NULL DEFAULT 'MOYENNE',
    "category" "OperatorActionCategory" NOT NULL DEFAULT 'OTHER',
    "source" "OperatorActionSource" NOT NULL DEFAULT 'OTHER',
    "campaignId" TEXT,
    "deliverableIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigneeUserId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignChangeRequest_ticketCode_key" ON "CampaignChangeRequest"("ticketCode");

-- CreateIndex
CREATE INDEX "CampaignChangeRequest_campaignDeliverableId_status_idx" ON "CampaignChangeRequest"("campaignDeliverableId", "status");

-- CreateIndex
CREATE INDEX "CampaignChangeRequest_impact_idx" ON "CampaignChangeRequest"("impact");

-- CreateIndex
CREATE INDEX "CampaignChangeRequest_assignedToUserId_idx" ON "CampaignChangeRequest"("assignedToUserId");

-- CreateIndex
CREATE INDEX "CampaignChangeRequest_requestedAt_idx" ON "CampaignChangeRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "OperatorAction_operatorId_done_idx" ON "OperatorAction"("operatorId", "done");

-- CreateIndex
CREATE INDEX "OperatorAction_priority_idx" ON "OperatorAction"("priority");

-- CreateIndex
CREATE INDEX "OperatorAction_category_idx" ON "OperatorAction"("category");

-- CreateIndex
CREATE INDEX "OperatorAction_campaignId_idx" ON "OperatorAction"("campaignId");

-- CreateIndex
CREATE INDEX "OperatorAction_assigneeUserId_idx" ON "OperatorAction"("assigneeUserId");

-- CreateIndex
CREATE INDEX "OperatorAction_dueDate_idx" ON "OperatorAction"("dueDate");

-- AddForeignKey
ALTER TABLE "CampaignChangeRequest" ADD CONSTRAINT "CampaignChangeRequest_campaignDeliverableId_fkey" FOREIGN KEY ("campaignDeliverableId") REFERENCES "CampaignDeliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignChangeRequest" ADD CONSTRAINT "CampaignChangeRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAction" ADD CONSTRAINT "OperatorAction_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAction" ADD CONSTRAINT "OperatorAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAction" ADD CONSTRAINT "OperatorAction_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
