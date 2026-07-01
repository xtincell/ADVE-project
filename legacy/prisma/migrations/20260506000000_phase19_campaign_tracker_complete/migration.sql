-- Phase 19 — Campaign tracker L2 Instrumental complete (ADR-0052 v2 + enfants).
-- Vagues 1 + 2 + 3 + clôture résidus + Strategy.evaluatorMode pour câblage Glory tools PRODUCTION.
--
-- Cette migration ajoute :
--   1. Strategy.strictModeGates Json? — opt-in gates strict-mode L2
--   2. Strategy.evaluatorMode String? — bascule Cluster B Jaccard → LLM (ADR-0052-B)
--   3. Campaign : 13 colonnes neuves (snapshots immutables A + B + C + D + F + G)
--   4. CampaignAction : 4 colonnes neuves (B coherence + C devotion + H pillarServed)
--   5. CampaignFieldOp.tarsisCaptureSessionId
--   6. CampaignReport.postmortemStructured
--   7. Nouveau modèle TarsisCaptureSession (Cluster D capture sessions)
--   8. Nouveau modèle CampaignContextIngest (Cluster D MCP entrant)
--
-- Toutes colonnes ajoutées sont optionnelles — rétrocompat garantie.
-- Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md

-- ─── Strategy ───────────────────────────────────────────────────────────────

ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "strictModeGates" JSONB;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "evaluatorMode" TEXT;

-- ─── Campaign — Cluster A (Trajectoire & altitude) ──────────────────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "tierBrandSnapshot" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "tierBrandFinal" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "altitudeRegression" BOOLEAN;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "killTriggeredAt" TIMESTAMP(3);

-- ─── Campaign — Cluster B (Cohérence narrative) ─────────────────────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "bigIdeaSnapshotBrandAssetId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "manifestoSnapshotBrandAssetId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "bigIdeaSnapshotContent" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "manifestoSnapshotContent" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "manipulationMixSnapshot" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "cultIndexSnapshotPre" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "cultIndexSnapshotPost" JSONB;

-- ─── Campaign — Cluster C (Superfan economy) Vague 2 ────────────────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "detractorsCount" INTEGER;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "detractorsSentimentScore" DOUBLE PRECISION;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "shadowReachEarned" INTEGER;

-- ─── Campaign — Cluster D (Signaux faibles & culture) Vague 2 ───────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "overtonHypothesis" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "overtonObserved" JSONB;

-- ─── Campaign — Cluster F (Économie agence) Vague 3 ─────────────────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "forksDeclined" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "frictionScore" DOUBLE PRECISION;

-- ─── Campaign — Cluster G (Souveraineté opérationnelle) Vague 3 ─────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "credentialsChainSnapshot" JSONB;

-- ─── Campaign — index neufs ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Campaign_killTriggeredAt_idx" ON "Campaign"("killTriggeredAt");

-- ─── CampaignAction — Cluster B + C + H ──────────────────────────────────────

ALTER TABLE "CampaignAction" ADD COLUMN IF NOT EXISTS "manipulationModeApplied" TEXT;
ALTER TABLE "CampaignAction" ADD COLUMN IF NOT EXISTS "bigIdeaCoherenceScore" DOUBLE PRECISION;
ALTER TABLE "CampaignAction" ADD COLUMN IF NOT EXISTS "devotionRungTargeted" TEXT;
ALTER TABLE "CampaignAction" ADD COLUMN IF NOT EXISTS "devotionTransitionsObserved" JSONB;
ALTER TABLE "CampaignAction" ADD COLUMN IF NOT EXISTS "pillarServed" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "CampaignAction_manipulationModeApplied_idx"
  ON "CampaignAction"("manipulationModeApplied");

-- ─── CampaignFieldOp — Cluster D ────────────────────────────────────────────

ALTER TABLE "CampaignFieldOp" ADD COLUMN IF NOT EXISTS "tarsisCaptureSessionId" TEXT;

-- ─── CampaignReport — Cluster E (postmortem 12 questions canon) ─────────────

ALTER TABLE "CampaignReport" ADD COLUMN IF NOT EXISTS "postmortemStructured" JSONB;

-- ─── TarsisCaptureSession — modèle léger Cluster D ──────────────────────────

CREATE TABLE IF NOT EXISTS "TarsisCaptureSession" (
  "id" TEXT NOT NULL,
  "campaignFieldOpId" TEXT,
  "campaignId" TEXT,
  "strategyId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signalsCount" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TarsisCaptureSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TarsisCaptureSession_strategyId_idx"   ON "TarsisCaptureSession"("strategyId");
CREATE INDEX IF NOT EXISTS "TarsisCaptureSession_campaignId_idx"   ON "TarsisCaptureSession"("campaignId");
CREATE INDEX IF NOT EXISTS "TarsisCaptureSession_campaignFieldOpId_idx" ON "TarsisCaptureSession"("campaignFieldOpId");
CREATE INDEX IF NOT EXISTS "TarsisCaptureSession_capturedAt_idx"   ON "TarsisCaptureSession"("capturedAt");

-- ─── CampaignContextIngest — modèle léger Cluster D ─────────────────────────

CREATE TABLE IF NOT EXISTS "CampaignContextIngest" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "piiFiltered" BOOLEAN NOT NULL DEFAULT false,
  "piiVerdict" TEXT,
  CONSTRAINT "CampaignContextIngest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignContextIngest_campaignId_source_sourceId_key"
  ON "CampaignContextIngest"("campaignId", "source", "sourceId");
CREATE INDEX IF NOT EXISTS "CampaignContextIngest_campaignId_idx"  ON "CampaignContextIngest"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignContextIngest_strategyId_idx"  ON "CampaignContextIngest"("strategyId");
CREATE INDEX IF NOT EXISTS "CampaignContextIngest_source_idx"      ON "CampaignContextIngest"("source");
