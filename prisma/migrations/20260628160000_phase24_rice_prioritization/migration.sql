-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "riceConfidence" DOUBLE PRECISION,
ADD COLUMN     "riceEffort" DOUBLE PRECISION,
ADD COLUMN     "riceImpact" DOUBLE PRECISION,
ADD COLUMN     "riceReach" DOUBLE PRECISION,
ADD COLUMN     "riceScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RiceScale" (
    "id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiceScale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiceScale_dimension_sortOrder_idx" ON "RiceScale"("dimension", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RiceScale_dimension_label_key" ON "RiceScale"("dimension", "label");
