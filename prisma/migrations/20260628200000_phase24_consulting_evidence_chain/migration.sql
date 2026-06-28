-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "hypothesisId" TEXT;

-- CreateTable
CREATE TABLE "FrameworkReference" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "outputShape" TEXT,
    "whenToUse" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultingEngagement" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultingEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "netSupport" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "summary" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceUrl" TEXT,
    "marketSourceId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkReference_key_key" ON "FrameworkReference"("key");

-- CreateIndex
CREATE INDEX "FrameworkReference_family_idx" ON "FrameworkReference"("family");

-- CreateIndex
CREATE INDEX "ConsultingEngagement_strategyId_idx" ON "ConsultingEngagement"("strategyId");

-- CreateIndex
CREATE INDEX "Hypothesis_engagementId_idx" ON "Hypothesis"("engagementId");

-- CreateIndex
CREATE INDEX "Evidence_hypothesisId_idx" ON "Evidence"("hypothesisId");

-- AddForeignKey
ALTER TABLE "ConsultingEngagement" ADD CONSTRAINT "ConsultingEngagement_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ConsultingEngagement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
