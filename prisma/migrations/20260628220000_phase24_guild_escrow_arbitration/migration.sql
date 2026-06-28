-- DropForeignKey
ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_contractId_fkey";

-- AlterTable
ALTER TABLE "Escrow" ADD COLUMN     "arbitratedBy" TEXT,
ADD COLUMN     "commissionId" TEXT,
ADD COLUMN     "missionId" TEXT,
ADD COLUMN     "paymentOrderId" TEXT,
ALTER COLUMN "contractId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Escrow_missionId_idx" ON "Escrow"("missionId");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
