-- AlterTable
ALTER TABLE "MarketStudy" ADD COLUMN     "methodologyKey" TEXT;

-- CreateTable
CREATE TABLE "ResearchWave" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "waveLabel" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "fieldStart" TIMESTAMP(3),
    "fieldEnd" TIMESTAMP(3),
    "cadence" TEXT,
    "targetN" INTEGER,
    "achievedN" INTEGER,
    "isRolling" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchWave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodologyReference" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "typicalN" INTEGER,
    "confidenceLevel" DOUBLE PRECISION,
    "marginOfErrorPct" DOUBLE PRECISION,
    "t2bNormPct" DOUBLE PRECISION,
    "outputShape" TEXT,
    "whenToUse" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MethodologyReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchWave_studyId_idx" ON "ResearchWave"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "MethodologyReference_key_key" ON "MethodologyReference"("key");

-- CreateIndex
CREATE INDEX "MethodologyReference_family_idx" ON "MethodologyReference"("family");

-- CreateIndex
CREATE INDEX "MarketStudy_methodologyKey_idx" ON "MarketStudy"("methodologyKey");

-- AddForeignKey
ALTER TABLE "ResearchWave" ADD CONSTRAINT "ResearchWave_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "MarketStudy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
