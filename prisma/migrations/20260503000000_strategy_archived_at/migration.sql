-- Strategy archive system (2-phase: archive → purge)
-- Phase 16+ — soft archive marker. null = active, set = archived.
-- Hidden from default queries via WHERE archivedAt IS NULL filter.
-- Restorable via OPERATOR_RESTORE_STRATEGY, hard-deletable via OPERATOR_PURGE_STRATEGY.

ALTER TABLE "Strategy" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Strategy_archivedAt_idx" ON "Strategy"("archivedAt");
