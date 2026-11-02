ALTER TABLE "Deal"
  ADD COLUMN "operatorId" TEXT,
  ADD COLUMN "sellerStrategyId" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "commercial" JSONB,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ALTER COLUMN "contactEmail" DROP NOT NULL;
CREATE INDEX "Deal_operatorId_idx" ON "Deal"("operatorId");
CREATE INDEX "Deal_sellerStrategyId_idx" ON "Deal"("sellerStrategyId");
CREATE UNIQUE INDEX "Deal_paymentReference_key" ON "Deal"("paymentReference");
