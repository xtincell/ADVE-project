-- Quarantaine des intakes de test (V2 « debt free », 2026-07-31).
-- Additive et backfill-safe : colonne nullable, aucun défaut, aucune donnée
-- existante touchée. NULL = marque réelle ; une date = intake de test exclu
-- des lots de recalcul et de tout futur corpus de comparaison.
ALTER TABLE "QuickIntake" ADD COLUMN "quarantinedAt" TIMESTAMP(3);
