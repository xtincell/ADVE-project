-- CreateTable
CREATE TABLE "AicpSectionReference" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AicpSectionReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AicpLineItem" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "plannedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AicpLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AicpSectionReference_code_key" ON "AicpSectionReference"("code");

-- CreateIndex
CREATE INDEX "AicpSectionReference_family_idx" ON "AicpSectionReference"("family");

-- CreateIndex
CREATE INDEX "AicpLineItem_executionId_idx" ON "AicpLineItem"("executionId");

-- CreateIndex
CREATE INDEX "AicpLineItem_sectionCode_idx" ON "AicpLineItem"("sectionCode");

-- AddForeignKey
ALTER TABLE "AicpLineItem" ADD CONSTRAINT "AicpLineItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "CampaignExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
