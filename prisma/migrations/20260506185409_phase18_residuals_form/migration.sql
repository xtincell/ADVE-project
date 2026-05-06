-- CreateEnum
CREATE TYPE "Phase18ResidualCategory" AS ENUM ('BIBLE_VAR', 'GLORY_TOOL', 'PILLAR_DUPLICATE', 'FEATURE_FLAG', 'LLM_TUNING', 'PHASE_18_BIS', 'CACHE_INFRA');

-- CreateEnum
CREATE TYPE "Phase18ResidualStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Phase18ResidualEntry" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "category" "Phase18ResidualCategory" NOT NULL,
    "targetKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "Phase18ResidualStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase18ResidualEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Phase18ResidualEntry_operatorId_status_idx" ON "Phase18ResidualEntry"("operatorId", "status");

-- CreateIndex
CREATE INDEX "Phase18ResidualEntry_category_status_idx" ON "Phase18ResidualEntry"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Phase18ResidualEntry_operatorId_category_targetKey_key" ON "Phase18ResidualEntry"("operatorId", "category", "targetKey");

-- AddForeignKey
ALTER TABLE "Phase18ResidualEntry" ADD CONSTRAINT "Phase18ResidualEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
