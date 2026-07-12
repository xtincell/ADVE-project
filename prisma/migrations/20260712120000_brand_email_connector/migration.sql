-- Connecteur email PAR MARQUE (newsletter) — la marque envoie via SON PROPRE
-- compte fournisseur (ex: Brevo). Pattern Vault (ADR-0021) : la clé vit en DB,
-- scopée à la Strategy → n'envoie QUE ses propres newsletters (multi-tenant).
-- Additive : nouvelle table, aucun backfill.

CREATE TABLE "BrandEmailConnector" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BREVO',
    "apiKey" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "lastTestAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandEmailConnector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandEmailConnector_strategyId_key" ON "BrandEmailConnector"("strategyId");
CREATE INDEX "BrandEmailConnector_status_idx" ON "BrandEmailConnector"("status");

ALTER TABLE "BrandEmailConnector" ADD CONSTRAINT "BrandEmailConnector_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
