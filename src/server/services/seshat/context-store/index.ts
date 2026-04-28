/**
 * SESHAT — Context Store
 *
 * Public surface for the unified data store Seshat owns.
 * Two stores live here:
 *   - MarketDataStore (Tier 1 + 2 + 3) — global market knowledge
 *   - BrandContextStore (Tier 3, per strategy) — brand-internal RAG
 *
 * Phase 1 ships the relational Tier 1 surface (./market).
 * Phase 4 will add the vector Tier 3 surface (./brand-indexer).
 */

export {
  queryBenchmark,
  queryBenchmarkWithFallback,
  queryMarketSizing,
  queryCostStructure,
} from "./market";

export type {
  BenchmarkFilter,
  BenchmarkValue,
  MarketSizingValue,
} from "./market";

export { indexBrandContext } from "./indexer";
export type { IndexScope, IndexResult, IndexedNode } from "./indexer";

export { queryBrand, getContextForPillar, findComparableBrands } from "./brand";
export type { BrandQueryFilter, BrandQueryNode } from "./brand";

export { embedBrandContext, cosineSimilarity } from "./embedder";
export type { EmbedWorkerResult } from "./embedder";

export { getOracleBrandContext, getOracleBrandContextByQuery } from "./oracle-augment";
export type { OracleContextBlock, PreciseField } from "./oracle-augment";

export { loadStrategyContextForFramework } from "./strategy-context";
export type { FrameworkStrategyContext } from "./strategy-context";
