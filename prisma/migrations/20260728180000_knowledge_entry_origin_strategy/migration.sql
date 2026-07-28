-- Origine d'une entrée de connaissance (ADR-0186).
-- Additif et backfill-safe : les entrées existantes restent NULL, donc
-- « non attribuables » — et ne sont plus présentées à un fondateur comme
-- étant les siennes.
ALTER TABLE "KnowledgeEntry" ADD COLUMN "originStrategyId" TEXT;
CREATE INDEX "KnowledgeEntry_originStrategyId_idx" ON "KnowledgeEntry"("originStrategyId");
