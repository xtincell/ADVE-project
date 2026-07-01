-- CreateEnum
CREATE TYPE "MediaPlanStatus" AS ENUM ('PLANNED', 'BOOKED', 'LIVE', 'RECONCILED');

-- CreateTable
CREATE TABLE "MediaPlan" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "countryCode" VARCHAR(2),
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "MediaPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "flightStart" TIMESTAMP(3),
    "flightEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPlanLine" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "plannedImpressions" DOUBLE PRECISION,
    "plannedGrp" DOUBLE PRECISION,
    "plannedReachPct" DOUBLE PRECISION,
    "plannedFrequency" DOUBLE PRECISION,
    "plannedSpend" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "flightStart" TIMESTAMP(3),
    "flightEnd" TIMESTAMP(3),
    "actualImpressions" DOUBLE PRECISION,
    "actualSpend" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPlanLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaPlan_campaignId_status_idx" ON "MediaPlan"("campaignId", "status");

-- CreateIndex
CREATE INDEX "MediaPlanLine_planId_idx" ON "MediaPlanLine"("planId");

-- AddForeignKey
ALTER TABLE "MediaPlan" ADD CONSTRAINT "MediaPlan_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPlanLine" ADD CONSTRAINT "MediaPlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MediaPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
