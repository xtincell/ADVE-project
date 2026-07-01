-- ADR-0105 — Market kill-switch lifecycle on Country.
-- Additive, backfill-safe: every existing market defaults to ACTIVE.

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('ACTIVE', 'FROZEN', 'SHADOWBANNED', 'PURGED');

-- AlterTable
ALTER TABLE "Country"
  ADD COLUMN "status" "MarketStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "statusChangedAt" TIMESTAMP(3),
  ADD COLUMN "statusChangedBy" TEXT;

-- CreateIndex
CREATE INDEX "Country_status_idx" ON "Country"("status");
