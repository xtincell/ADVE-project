-- Extend KnowledgeType enum with MarketStudy and EXTERNAL_FEED_DIGEST values.
-- Cf. ADR-0037 PR-L (typed schemas) + PR-I (ingestion pipeline) + PR-G (external feeds).
--
-- Postgres ALTER TYPE ADD VALUE is non-transactional, so each new value is
-- a separate statement. All values are additive — no breaking change for
-- existing entries (SECTOR_BENCHMARK et al. continue de fonctionner).

ALTER TYPE "KnowledgeType" ADD VALUE IF NOT EXISTS 'MARKET_STUDY_TAM';
ALTER TYPE "KnowledgeType" ADD VALUE IF NOT EXISTS 'MARKET_STUDY_COMPETITOR';
ALTER TYPE "KnowledgeType" ADD VALUE IF NOT EXISTS 'MARKET_STUDY_SEGMENT';
ALTER TYPE "KnowledgeType" ADD VALUE IF NOT EXISTS 'MARKET_STUDY_RAW';
ALTER TYPE "KnowledgeType" ADD VALUE IF NOT EXISTS 'EXTERNAL_FEED_DIGEST';
