-- CreateTable
CREATE TABLE "TalentService" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "priceAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "priceUnit" TEXT NOT NULL DEFAULT 'FORFAIT',
    "deliveryDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalentService_talentProfileId_idx" ON "TalentService"("talentProfileId");

-- CreateIndex
CREATE INDEX "TalentService_category_active_idx" ON "TalentService"("category", "active");

-- AddForeignKey
ALTER TABLE "TalentService" ADD CONSTRAINT "TalentService_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
