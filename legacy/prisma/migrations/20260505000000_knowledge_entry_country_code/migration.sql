-- Country-scoped knowledge base (ADR-0037 — Phase 17 PR-A).
--
-- Adds `countryCode` (ISO-2) to `KnowledgeEntry` so Tarsis lookups become
-- pays-aware. Without this column, `checkSectorKnowledge(sector, market)`
-- mixed cross-country knowledge silently — a CM weak-signal entry could
-- hit chaud for a ZA brand of the same sector. Cf. ADR-0037 §1-3.
--
-- Backfill: existing rows with `market ILIKE 'wakanda'` (or `'WK'`) get
-- countryCode='WK' so the seed Wakanda KB stays hot post-migration. All
-- other rows stay countryCode NULL — `checkSectorKnowledge` falls back
-- to sector-only lookup for those, keeping behaviour unchanged until
-- they are re-seeded with explicit countryCode.

ALTER TABLE "KnowledgeEntry"
  ADD COLUMN "countryCode" VARCHAR(2);

CREATE INDEX "KnowledgeEntry_countryCode_idx"
  ON "KnowledgeEntry"("countryCode");

CREATE INDEX "KnowledgeEntry_sector_countryCode_idx"
  ON "KnowledgeEntry"("sector", "countryCode");

-- Backfill Wakanda: seed-wakanda historically wrote market='Wakanda' (texte
-- libre, cf. scripts/seed-wakanda/26-intelligence.ts pre-PR-A). Map to ISO
-- 'WK' (cf. prisma/seed-countries.ts where Wakanda is registered as code WK).
UPDATE "KnowledgeEntry"
   SET "countryCode" = 'WK'
 WHERE "countryCode" IS NULL
   AND ("market" ILIKE 'wakanda' OR "market" = 'WK');
