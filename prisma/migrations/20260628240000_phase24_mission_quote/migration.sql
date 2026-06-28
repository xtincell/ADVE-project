-- CreateTable
CREATE TABLE "MissionQuote" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionQuote_missionId_idx" ON "MissionQuote"("missionId");

-- CreateIndex
CREATE INDEX "MissionQuote_talentProfileId_idx" ON "MissionQuote"("talentProfileId");

-- AddForeignKey
ALTER TABLE "MissionQuote" ADD CONSTRAINT "MissionQuote_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionQuote" ADD CONSTRAINT "MissionQuote_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
