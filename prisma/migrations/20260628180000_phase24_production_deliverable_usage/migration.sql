-- CreateTable
CREATE TABLE "DeliverableSpec" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "channelSpecKey" TEXT,
    "channel" TEXT NOT NULL,
    "aspectRatio" TEXT,
    "resolution" TEXT,
    "durationSec" INTEGER,
    "codec" TEXT,
    "frameRate" DOUBLE PRECISION,
    "loudnessTarget" TEXT,
    "captionRequired" BOOLEAN NOT NULL DEFAULT false,
    "fileFormat" TEXT,
    "maxFileMb" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSpecReference" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aspectRatio" TEXT,
    "resolution" TEXT,
    "durationSec" INTEGER,
    "codec" TEXT,
    "frameRate" DOUBLE PRECISION,
    "loudnessTarget" TEXT,
    "captionRequired" BOOLEAN NOT NULL DEFAULT false,
    "fileFormat" TEXT,
    "maxFileMb" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelSpecReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageGrant" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT,
    "deliverableSpecId" TEXT,
    "media" JSONB NOT NULL,
    "territory" TEXT NOT NULL,
    "termStart" TIMESTAMP(3) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "buyoutFee" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "exclusivity" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverableSpec_executionId_idx" ON "DeliverableSpec"("executionId");

-- CreateIndex
CREATE INDEX "DeliverableSpec_channelSpecKey_idx" ON "DeliverableSpec"("channelSpecKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelSpecReference_key_key" ON "ChannelSpecReference"("key");

-- CreateIndex
CREATE INDEX "ChannelSpecReference_channel_idx" ON "ChannelSpecReference"("channel");

-- CreateIndex
CREATE INDEX "UsageGrant_talentProfileId_idx" ON "UsageGrant"("talentProfileId");

-- CreateIndex
CREATE INDEX "UsageGrant_deliverableSpecId_idx" ON "UsageGrant"("deliverableSpecId");

-- CreateIndex
CREATE INDEX "UsageGrant_expiresAt_idx" ON "UsageGrant"("expiresAt");

-- AddForeignKey
ALTER TABLE "DeliverableSpec" ADD CONSTRAINT "DeliverableSpec_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "CampaignExecution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageGrant" ADD CONSTRAINT "UsageGrant_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageGrant" ADD CONSTRAINT "UsageGrant_deliverableSpecId_fkey" FOREIGN KEY ("deliverableSpecId") REFERENCES "DeliverableSpec"("id") ON DELETE SET NULL ON UPDATE CASCADE;
