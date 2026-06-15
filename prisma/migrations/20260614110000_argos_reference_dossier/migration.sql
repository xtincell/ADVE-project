-- Argos by LaFusée (ADR-0095) — dossier de référence campagne récolté par Hunter.
-- Réimplémentation sous gouvernance. Additif, non destructif.

CREATE TABLE "CampaignReferenceDossier" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "brandUid" TEXT NOT NULL,
    "campaign" TEXT,
    "campaignUid" TEXT,
    "sector" TEXT,
    "market" TEXT,
    "dna" JSONB NOT NULL,
    "editorial" JSONB,
    "sources" JSONB,
    "safetyVerdict" TEXT NOT NULL DEFAULT 'QUARANTINE',
    "safetyReasons" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'HUNTER',
    "intentEmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignReferenceDossier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignReferenceDossier_ref_key" ON "CampaignReferenceDossier"("ref");
CREATE INDEX "CampaignReferenceDossier_brandUid_idx" ON "CampaignReferenceDossier"("brandUid");
CREATE INDEX "CampaignReferenceDossier_sector_idx" ON "CampaignReferenceDossier"("sector");
CREATE INDEX "CampaignReferenceDossier_published_safetyVerdict_idx" ON "CampaignReferenceDossier"("published", "safetyVerdict");
