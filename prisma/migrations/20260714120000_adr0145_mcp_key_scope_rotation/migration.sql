-- ADR-0145 — portée d'accès + rotation des tokens API MCP (additif, backfill-safe).
-- scopeKind : "SYSTEM" (tout l'OS) | "BRAND" (une stratégie). Défaut SYSTEM → les clés
-- existantes restent système-wide (compatibilité). scopeStrategyId : la seule marque
-- touchable si BRAND. rotatedToId/rotatedAt : lineage de rotation (regen secret + révoque).
ALTER TABLE "McpApiKey" ADD COLUMN "scopeKind" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "McpApiKey" ADD COLUMN "scopeStrategyId" TEXT;
ALTER TABLE "McpApiKey" ADD COLUMN "rotatedToId" TEXT;
ALTER TABLE "McpApiKey" ADD COLUMN "rotatedAt" TIMESTAMP(3);
