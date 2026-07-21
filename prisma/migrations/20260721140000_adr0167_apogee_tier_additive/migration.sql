-- ADR-0167 — Palier officiel APOGEE (moteur de trajectoire gouverné).
-- Additive et backfill-safe : 4 colonnes nullable sur "Strategy", aucun défaut,
-- aucune donnée existante touchée (Loi 1 — fallback dérivé classifyTier en app).
-- Le palier ne bouge QUE par Intent PROMOTE_*/DEMOTE_* proof-gated (hash-chaîné).

ALTER TABLE "Strategy" ADD COLUMN "apogeeTier" TEXT;
ALTER TABLE "Strategy" ADD COLUMN "apogeeTierSetAt" TIMESTAMP(3);
ALTER TABLE "Strategy" ADD COLUMN "apogeeTierReason" TEXT;
ALTER TABLE "Strategy" ADD COLUMN "apogeeTierBy" TEXT;
