-- CreateTable
CREATE TABLE "ScoreurCanonOverride" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreurCanonOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoreurCanonOverride_kind_idx" ON "ScoreurCanonOverride"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreurCanonOverride_kind_key_key" ON "ScoreurCanonOverride"("kind", "key");
