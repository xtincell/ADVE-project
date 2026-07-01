/*
  Warnings:

  - You are about to drop the `SuperAsset` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


-- NEFER patch 2026-05-10 — IF NOT EXISTS pour idempotence en local dev. La
-- migration originale échoue sur "XOF existe déjà" si l'enum a été partiellement
-- enrichi par une exécution antérieure. PostgreSQL 9.6+ supporte IF NOT EXISTS.
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'XOF';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'USD';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'MAD';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'NGN';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'GHS';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'TND';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'CDF';
ALTER TYPE "IntakePaymentCurrency" ADD VALUE IF NOT EXISTS 'WKD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntakePaymentProvider" ADD VALUE IF NOT EXISTS 'PAYPAL';
ALTER TYPE "IntakePaymentProvider" ADD VALUE IF NOT EXISTS 'ADMIN_BYPASS';

-- DropForeignKey
ALTER TABLE "SuperAsset" DROP CONSTRAINT "SuperAsset_briefId_fkey";

-- DropForeignKey
ALTER TABLE "SuperAsset" DROP CONSTRAINT "SuperAsset_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "SuperAsset" DROP CONSTRAINT "SuperAsset_parentSuperAssetId_fkey";

-- DropForeignKey
ALTER TABLE "SuperAsset" DROP CONSTRAINT "SuperAsset_strategyId_fkey";

-- DropForeignKey
ALTER TABLE "SuperAsset" DROP CONSTRAINT "SuperAsset_supersededById_fkey";

-- DropIndex
DROP INDEX "QuickIntake_convertedToId_idx";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "clientState" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "commentsLatest" TEXT,
ADD COLUMN     "creativeState" TEXT NOT NULL DEFAULT 'BRIEF_DRAFT',
ADD COLUMN     "healthSignal" TEXT NOT NULL DEFAULT 'GREEN',
ADD COLUMN     "manualRagOverride" TEXT;

-- AlterTable
ALTER TABLE "CampaignTeamMember" ADD COLUMN     "delegatedToOperatorId" TEXT;

-- AlterTable
ALTER TABLE "ClientAllocation" ADD COLUMN     "scopeMode" TEXT NOT NULL DEFAULT 'NODE_AND_DESCENDANTS',
ADD COLUMN     "scopeNodeId" TEXT;

-- AlterTable
ALTER TABLE "IntakePayment" ADD COLUMN     "providerEventId" TEXT,
ADD COLUMN     "tierKey" TEXT;

-- AlterTable
ALTER TABLE "IntentEmission" ADD COLUMN     "observationError" TEXT,
ADD COLUMN     "observationStatus" TEXT NOT NULL DEFAULT 'PENDING_OBSERVATION',
ADD COLUMN     "observedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "SuperAsset";

-- DropEnum
DROP TYPE "SuperAssetState";

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "strategyId" TEXT,
    "operatorId" TEXT,
    "tierKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountPerPeriod" INTEGER NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "providerSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPolicy" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "anthropicModel" TEXT NOT NULL,
    "ollamaModel" TEXT,
    "allowOllamaSubstitution" BOOLEAN NOT NULL DEFAULT false,
    "pipelineVersion" TEXT NOT NULL DEFAULT 'V1',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingOverride" (
    "id" TEXT NOT NULL,
    "tierKey" TEXT NOT NULL,
    "countryCode" VARCHAR(2),
    "amountSpu" INTEGER,
    "amountLocal" DECIMAL(12,2),
    "currencyCode" VARCHAR(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderConfig" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommsPlan" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "mode" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "audience" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommsPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastJob" (
    "id" TEXT NOT NULL,
    "commsPlanId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3),
    "providerTaskId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "metrics" JSONB,
    "operatorId" TEXT NOT NULL,
    "sourceIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "BroadcastJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" JSONB,
    "category" TEXT NOT NULL DEFAULT 'transactional',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "clientId" TEXT,
    "parentNodeId" TEXT,
    "nodeKind" TEXT NOT NULL,
    "nodeNature" "BrandNature" NOT NULL DEFAULT 'PRODUCT',
    "nodeRole" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pillarOverrides" JSONB,
    "inheritanceLocked" BOOLEAN NOT NULL DEFAULT false,
    "countryCode" VARCHAR(2),
    "clusterTag" TEXT,
    "lifecycle" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pillarSnapshotAtTransfer" JSONB,
    "strategyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "BrandNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignDeliverable" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "countryCode" VARCHAR(2),
    "clusterTag" TEXT,
    "deliverableType" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'FR',
    "promoTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "rag" TEXT NOT NULL DEFAULT 'GREEN',
    "manualRagOverride" TEXT,
    "brandAssetId" TEXT,
    "delegatedToOperatorId" TEXT,
    "dueDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_strategyId_idx" ON "Subscription"("strategyId");

-- CreateIndex
CREATE INDEX "Subscription_operatorId_idx" ON "Subscription"("operatorId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_tierKey_idx" ON "Subscription"("tierKey");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPolicy_purpose_key" ON "ModelPolicy"("purpose");

-- CreateIndex
CREATE INDEX "ModelPolicy_purpose_idx" ON "ModelPolicy"("purpose");

-- CreateIndex
CREATE INDEX "PricingOverride_active_idx" ON "PricingOverride"("active");

-- CreateIndex
CREATE INDEX "PricingOverride_countryCode_idx" ON "PricingOverride"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "PricingOverride_tierKey_countryCode_key" ON "PricingOverride"("tierKey", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderConfig_providerId_key" ON "PaymentProviderConfig"("providerId");

-- CreateIndex
CREATE INDEX "CommsPlan_strategyId_idx" ON "CommsPlan"("strategyId");

-- CreateIndex
CREATE INDEX "CommsPlan_campaignId_idx" ON "CommsPlan"("campaignId");

-- CreateIndex
CREATE INDEX "CommsPlan_status_idx" ON "CommsPlan"("status");

-- CreateIndex
CREATE INDEX "CommsPlan_operatorId_idx" ON "CommsPlan"("operatorId");

-- CreateIndex
CREATE INDEX "BroadcastJob_commsPlanId_idx" ON "BroadcastJob"("commsPlanId");

-- CreateIndex
CREATE INDEX "BroadcastJob_status_idx" ON "BroadcastJob"("status");

-- CreateIndex
CREATE INDEX "BroadcastJob_scheduledFor_idx" ON "BroadcastJob"("scheduledFor");

-- CreateIndex
CREATE INDEX "BroadcastJob_operatorId_idx" ON "BroadcastJob"("operatorId");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_isActive_idx" ON "EmailTemplate"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_operatorId_name_key" ON "EmailTemplate"("operatorId", "name");

-- CreateIndex
CREATE INDEX "SmsTemplate_isActive_idx" ON "SmsTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_operatorId_name_key" ON "SmsTemplate"("operatorId", "name");

-- CreateIndex
CREATE INDEX "BrandNode_operatorId_clientId_idx" ON "BrandNode"("operatorId", "clientId");

-- CreateIndex
CREATE INDEX "BrandNode_parentNodeId_idx" ON "BrandNode"("parentNodeId");

-- CreateIndex
CREATE INDEX "BrandNode_nodeNature_clusterTag_idx" ON "BrandNode"("nodeNature", "clusterTag");

-- CreateIndex
CREATE INDEX "BrandNode_countryCode_idx" ON "BrandNode"("countryCode");

-- CreateIndex
CREATE INDEX "BrandNode_lifecycle_idx" ON "BrandNode"("lifecycle");

-- CreateIndex
CREATE INDEX "BrandNode_strategyId_idx" ON "BrandNode"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandNode_operatorId_slug_key" ON "BrandNode"("operatorId", "slug");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_campaignId_status_idx" ON "CampaignDeliverable"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_targetNodeId_idx" ON "CampaignDeliverable"("targetNodeId");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_clusterTag_countryCode_idx" ON "CampaignDeliverable"("clusterTag", "countryCode");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_rag_idx" ON "CampaignDeliverable"("rag");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_promoTag_idx" ON "CampaignDeliverable"("promoTag");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_deliverableType_idx" ON "CampaignDeliverable"("deliverableType");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_delegatedToOperatorId_idx" ON "CampaignDeliverable"("delegatedToOperatorId");

-- CreateIndex
CREATE INDEX "Campaign_healthSignal_idx" ON "Campaign"("healthSignal");

-- CreateIndex
CREATE INDEX "Campaign_creativeState_idx" ON "Campaign"("creativeState");

-- CreateIndex
CREATE INDEX "Campaign_clientState_idx" ON "Campaign"("clientState");

-- CreateIndex
CREATE INDEX "CampaignTeamMember_delegatedToOperatorId_idx" ON "CampaignTeamMember"("delegatedToOperatorId");

-- CreateIndex
CREATE INDEX "ClientAllocation_scopeNodeId_idx" ON "ClientAllocation"("scopeNodeId");

-- CreateIndex
CREATE INDEX "IntentEmission_observationStatus_emittedAt_idx" ON "IntentEmission"("observationStatus", "emittedAt");

-- AddForeignKey
ALTER TABLE "ClientAllocation" ADD CONSTRAINT "ClientAllocation_scopeNodeId_fkey" FOREIGN KEY ("scopeNodeId") REFERENCES "BrandNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastJob" ADD CONSTRAINT "BroadcastJob_commsPlanId_fkey" FOREIGN KEY ("commsPlanId") REFERENCES "CommsPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNode" ADD CONSTRAINT "BrandNode_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNode" ADD CONSTRAINT "BrandNode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNode" ADD CONSTRAINT "BrandNode_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "BrandNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNode" ADD CONSTRAINT "BrandNode_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "BrandNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_brandAssetId_fkey" FOREIGN KEY ("brandAssetId") REFERENCES "BrandAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_delegatedToOperatorId_fkey" FOREIGN KEY ("delegatedToOperatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
