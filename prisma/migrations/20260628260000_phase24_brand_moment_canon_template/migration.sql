-- CreateTable
CREATE TABLE "BrandMoment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "dayOfMonth" INTEGER,
    "movable" BOOLEAN NOT NULL DEFAULT false,
    "positioningTag" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCanonTemplate" (
    "id" TEXT NOT NULL,
    "canonType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aarrrPrimary" TEXT NOT NULL,
    "aarrrSecondary" TEXT NOT NULL,
    "durationDays" INTEGER,
    "isAlwaysOn" BOOLEAN NOT NULL DEFAULT false,
    "budgetShare" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCanonTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandMoment_key_key" ON "BrandMoment"("key");

-- CreateIndex
CREATE INDEX "BrandMoment_type_month_idx" ON "BrandMoment"("type", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignCanonTemplate_canonType_key" ON "CampaignCanonTemplate"("canonType");
