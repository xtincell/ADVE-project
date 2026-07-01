-- ADR-0023 (OPERATOR_AMEND_PILLAR) — staleness flag for BrandAsset
-- When a source pillar (ADVE) is amended via STRATEGIC_REWRITE, all ACTIVE
-- BrandAssets with pillarSource = amended pillar get staleAt = now() so the
-- operator UI shows a "regen suggested" badge. Sémantique enum BrandAssetState
-- préservée (DRAFT reste "in creation by sequence", pas "stale").

-- AlterTable
ALTER TABLE "BrandAsset" ADD COLUMN "staleAt" TIMESTAMP(3);
ALTER TABLE "BrandAsset" ADD COLUMN "staleReason" TEXT;

-- CreateIndex
CREATE INDEX "BrandAsset_staleAt_idx" ON "BrandAsset"("staleAt");
