-- CreateTable
CREATE TABLE "OvertonPosition" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "sectorSlug" TEXT NOT NULL,
    "marketScale" "MarketScale",
    "countryCode" VARCHAR(2),
    "statement" TEXT NOT NULL,
    "zone" TEXT,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvidenceAt" TIMESTAMP(3),
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertonPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertonActorLink" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorRef" TEXT,
    "edgeKind" TEXT NOT NULL,
    "datedAt" TIMESTAMP(3),
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertonActorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertonZoneTransition" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "fromZone" TEXT,
    "toZone" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "evidence" JSONB,
    "attributedActorKind" TEXT,
    "attributedActorRef" TEXT,
    "attributionModel" TEXT NOT NULL DEFAULT 'LAST_TOUCH_45D',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertonZoneTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OvertonPosition_sectorSlug_marketScale_countryCode_idx" ON "OvertonPosition"("sectorSlug", "marketScale", "countryCode");

-- CreateIndex
CREATE INDEX "OvertonPosition_strategyId_idx" ON "OvertonPosition"("strategyId");

-- CreateIndex
CREATE INDEX "OvertonActorLink_positionId_idx" ON "OvertonActorLink"("positionId");

-- CreateIndex
CREATE INDEX "OvertonActorLink_actorKind_actorRef_idx" ON "OvertonActorLink"("actorKind", "actorRef");

-- CreateIndex
CREATE INDEX "OvertonZoneTransition_positionId_occurredAt_idx" ON "OvertonZoneTransition"("positionId", "occurredAt");

-- AddForeignKey
ALTER TABLE "OvertonActorLink" ADD CONSTRAINT "OvertonActorLink_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "OvertonPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertonZoneTransition" ADD CONSTRAINT "OvertonZoneTransition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "OvertonPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
