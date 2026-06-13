-- CreateEnum
CREATE TYPE "CostDriver" AS ENUM ('LABOR', 'EQUIPMENT_RENTAL', 'LOCATION', 'TRAVEL', 'PER_DIEM', 'CONSUMABLES', 'POST_PRODUCTION', 'LICENSE', 'MEDIA_SPACE', 'LOGISTICS', 'AGENCY_MARGIN', 'CONTINGENCY', 'TAX');

-- CreateEnum
CREATE TYPE "CostUnit" AS ENUM ('HOUR', 'DAY', 'HALF_DAY', 'UNIT', 'FLAT', 'PERCENT', 'KM', 'SQUARE_METER', 'IMPRESSION');

-- CreateEnum
CREATE TYPE "CostRateBasis" AS ENUM ('MARKET_INDEX', 'PROVIDER_RATE', 'BENCHMARK', 'FIXED');

-- CreateEnum
CREATE TYPE "ZoneIndexFamily" AS ENUM ('COST_OF_LIVING', 'FOREX', 'MACRO', 'TJM', 'MARKETING_BUDGETS', 'MOBILE_MONEY_FEES', 'TAXES');

-- AlterTable
ALTER TABLE "BrandAction" ADD COLUMN     "costEstimateId" TEXT,
ADD COLUMN     "costInputs" JSONB,
ADD COLUMN     "costProviderId" TEXT,
ADD COLUMN     "costQualityTier" TEXT,
ADD COLUMN     "costTemplateKey" TEXT,
ADD COLUMN     "costZoneCode" TEXT,
ADD COLUMN     "estimatedCostCurrency" TEXT,
ADD COLUMN     "estimatedCostHt" DOUBLE PRECISION,
ADD COLUMN     "estimatedCostTtc" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ActionCostTemplate" (
    "id" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "family" TEXT,
    "unitOfWork" TEXT NOT NULL DEFAULT 'PROJECT',
    "description" TEXT,
    "defaultDurationHours" DOUBLE PRECISION,
    "baseZoneCode" TEXT NOT NULL DEFAULT 'CM',
    "baseCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "defaultMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "defaultContingencyPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionCostTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionCostComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "driver" "CostDriver" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" "CostUnit" NOT NULL DEFAULT 'FLAT',
    "rateBasis" "CostRateBasis" NOT NULL DEFAULT 'FIXED',
    "rateKey" TEXT,
    "indexFamily" "ZoneIndexFamily",
    "baseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "appliesToSubtotal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionCostComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneIndex" (
    "id" TEXT NOT NULL,
    "family" "ZoneIndexFamily" NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "unit" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicNeighborMap" (
    "zoneCode" TEXT NOT NULL,
    "neighbors" TEXT[],
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicNeighborMap_pkey" PRIMARY KEY ("zoneCode")
);

-- CreateTable
CREATE TABLE "ProviderCostRate" (
    "id" TEXT NOT NULL,
    "providerKind" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerLabel" TEXT,
    "driver" "CostDriver" NOT NULL,
    "roleKey" TEXT,
    "zoneCode" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "unit" "CostUnit" NOT NULL DEFAULT 'DAY',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionCostEstimate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateId" TEXT,
    "brandActionId" TEXT,
    "strategyId" TEXT,
    "zoneCode" TEXT NOT NULL,
    "providerId" TEXT,
    "qualityTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "currency" TEXT NOT NULL,
    "subtotalHt" DOUBLE PRECISION NOT NULL,
    "marginAmount" DOUBLE PRECISION NOT NULL,
    "contingencyAmount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalHt" DOUBLE PRECISION NOT NULL,
    "totalTtc" DOUBLE PRECISION NOT NULL,
    "taxRatePct" DOUBLE PRECISION NOT NULL,
    "marginPct" DOUBLE PRECISION NOT NULL,
    "contingencyPct" DOUBLE PRECISION NOT NULL,
    "lineItems" JSONB NOT NULL,
    "formula" TEXT NOT NULL,
    "breakdown" JSONB NOT NULL,
    "usedFallback" BOOLEAN NOT NULL DEFAULT false,
    "fallbackChain" TEXT[],
    "computedBy" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionCostEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionCostTemplate_actionKey_key" ON "ActionCostTemplate"("actionKey");

-- CreateIndex
CREATE INDEX "ActionCostTemplate_category_active_idx" ON "ActionCostTemplate"("category", "active");

-- CreateIndex
CREATE INDEX "ActionCostTemplate_family_idx" ON "ActionCostTemplate"("family");

-- CreateIndex
CREATE INDEX "ActionCostComponent_templateId_sortOrder_idx" ON "ActionCostComponent"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "ActionCostComponent_driver_idx" ON "ActionCostComponent"("driver");

-- CreateIndex
CREATE INDEX "ZoneIndex_family_zoneCode_key_validFrom_idx" ON "ZoneIndex"("family", "zoneCode", "key", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneIndex_family_zoneCode_key_validFrom_key" ON "ZoneIndex"("family", "zoneCode", "key", "validFrom");

-- CreateIndex
CREATE INDEX "ProviderCostRate_providerKind_providerId_driver_idx" ON "ProviderCostRate"("providerKind", "providerId", "driver");

-- CreateIndex
CREATE INDEX "ProviderCostRate_driver_roleKey_zoneCode_idx" ON "ProviderCostRate"("driver", "roleKey", "zoneCode");

-- CreateIndex
CREATE INDEX "ActionCostEstimate_brandActionId_idx" ON "ActionCostEstimate"("brandActionId");

-- CreateIndex
CREATE INDEX "ActionCostEstimate_strategyId_idx" ON "ActionCostEstimate"("strategyId");

-- CreateIndex
CREATE INDEX "ActionCostEstimate_templateKey_zoneCode_idx" ON "ActionCostEstimate"("templateKey", "zoneCode");

-- CreateIndex
CREATE INDEX "BrandAction_costTemplateKey_costZoneCode_idx" ON "BrandAction"("costTemplateKey", "costZoneCode");

-- AddForeignKey
ALTER TABLE "ActionCostComponent" ADD CONSTRAINT "ActionCostComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActionCostTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

