-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "briefId" TEXT;

-- CreateTable
CREATE TABLE "MissionActivity" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ASSET_CREATION',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "budgetAllocated" DOUBLE PRECISION,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "kpiLabel" TEXT,
    "kpiTarget" DOUBLE PRECISION,
    "kpiActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concludesMission" BOOLEAN NOT NULL DEFAULT false,
    "briefContent" JSONB,
    "deliverableId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionActivity_missionId_idx" ON "MissionActivity"("missionId");

-- CreateIndex
CREATE INDEX "MissionActivity_missionId_status_idx" ON "MissionActivity"("missionId", "status");

-- AddForeignKey
ALTER TABLE "MissionActivity" ADD CONSTRAINT "MissionActivity_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionActivity" ADD CONSTRAINT "MissionActivity_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "MissionDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
