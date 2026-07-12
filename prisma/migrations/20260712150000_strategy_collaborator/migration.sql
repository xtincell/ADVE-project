-- ADR-0129 — Accès délégué PAR MARQUE (StrategyCollaborator).
-- Un collaborateur externe (ex. freelance « directeur du digital » recruté via
-- La Guilde) obtient l'accès cockpit à UNE Strategy précise — appliqué par
-- canAccessStrategy/scopeStrategies (authz réelle, jamais opérateur-large).
-- Additive : nouvelle table + 1 valeur d'enum, aucun backfill.

ALTER TYPE "CampaignTeamRole" ADD VALUE IF NOT EXISTS 'DIGITAL_DIRECTOR';

CREATE TABLE "StrategyCollaborator" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CampaignTeamRole" NOT NULL,
    "scopes" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "grantedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StrategyCollaborator_strategyId_userId_key" ON "StrategyCollaborator"("strategyId", "userId");
CREATE INDEX "StrategyCollaborator_userId_status_idx" ON "StrategyCollaborator"("userId", "status");

ALTER TABLE "StrategyCollaborator" ADD CONSTRAINT "StrategyCollaborator_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategyCollaborator" ADD CONSTRAINT "StrategyCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategyCollaborator" ADD CONSTRAINT "StrategyCollaborator_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
