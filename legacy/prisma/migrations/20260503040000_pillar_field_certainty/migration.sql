-- Migration: Pillar.fieldCertainty (PR-C, ADR-0035)
--
-- Per-field certainty tracking inside Pillar.content. Mapping
--   { "<dot.path>": "OFFICIAL" | "DECLARED" | "INFERRED" | "ARBITRARY" }
-- Populated at activateBrand time by the LLM inference pass for the 7
-- needsHuman ADVE fields (a.archetype, a.noyauIdentitaire, d.positionnement,
-- d.promesseMaitre, d.personas, v.produitsCatalogue, v.businessModel) so the
-- document is filled at activation. Operator can flip a field to DECLARED
-- via pillar.confirmInferredField (clears the INFERRED marker).
--
-- Source of truth taxonomy: src/domain/source-certainty.ts.
-- Backfill safe: NULL for pre-migration rows = treated as DECLARED in the
-- assessor (default behavior = absence of explicit INFERRED marker).

ALTER TABLE "Pillar"
  ADD COLUMN "fieldCertainty" JSONB;
