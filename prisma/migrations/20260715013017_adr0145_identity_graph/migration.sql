-- AlterTable
ALTER TABLE "SuperfanProfile" ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "PersonIdentity" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "displayName" TEXT,
    "primaryHandle" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonIdentifier" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "matchHash" TEXT NOT NULL,
    "displayCipher" TEXT,
    "platform" TEXT,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonIdentity_strategyId_idx" ON "PersonIdentity"("strategyId");

-- CreateIndex
CREATE INDEX "PersonIdentity_mergedIntoId_idx" ON "PersonIdentity"("mergedIntoId");

-- CreateIndex
CREATE INDEX "PersonIdentifier_personId_idx" ON "PersonIdentifier"("personId");

-- CreateIndex
CREATE INDEX "PersonIdentifier_strategyId_kind_idx" ON "PersonIdentifier"("strategyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PersonIdentifier_strategyId_kind_matchHash_key" ON "PersonIdentifier"("strategyId", "kind", "matchHash");

-- CreateIndex
CREATE INDEX "SuperfanProfile_personId_idx" ON "SuperfanProfile"("personId");

-- AddForeignKey
ALTER TABLE "SuperfanProfile" ADD CONSTRAINT "SuperfanProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentity" ADD CONSTRAINT "PersonIdentity_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentity" ADD CONSTRAINT "PersonIdentity_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "PersonIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonIdentifier" ADD CONSTRAINT "PersonIdentifier_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
