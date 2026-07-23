-- Audit adversarial 2026-07-22 — index additifs par strategyId (FK non auto-indexée
-- par Postgres). Signal est append-only et filtré par strategyId (+type, +orderBy
-- createdAt) dans 20+ chemins dont des cron sweeps → seq scans linéaires sinon.
-- Purement additif (aucune donnée touchée, backfill-safe).

-- CreateIndex
CREATE INDEX "Signal_strategyId_type_idx" ON "Signal"("strategyId", "type");

-- CreateIndex
CREATE INDEX "Signal_strategyId_createdAt_idx" ON "Signal"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "GloryOutput_strategyId_idx" ON "GloryOutput"("strategyId");
