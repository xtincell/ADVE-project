/**
 * SESHAT — Market Context Store (Tier 1, relational)
 *
 * Public API for typed queries against MarketBenchmark, MarketSizing,
 * CostStructure, CompetitiveLandscape, MarketDocument.
 *
 * All Neteru consume these tables to ground their reasoning in real
 * benchmarks instead of hard-coded multipliers.
 *
 * Tier 3 (vector) augments these queries; never replaces them.
 */

import { db } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────

export interface BenchmarkFilter {
  country?: string;
  sector?: string;
  businessModel?: string;
  brandNature?: string;
  premiumScope?: string;
  metric?: string;
}

export interface BenchmarkValue {
  metric: string;
  unit: string;
  p10: number;
  p50: number;
  p90: number;
  confidence: number;
  sampleSize: number;
}

export interface MarketSizingValue {
  country: string;
  sector: string;
  segment: string | null;
  year: number;
  TAM: number | null;
  SAM: number | null;
  SOM: number | null;
  currency: string;
  growthRate: number | null;
  confidence: number;
}

// ── queryBenchmark ───────────────────────────────────────────────────

/**
 * Fetch benchmark distributions matching the filter.
 * Returns the most specific matches first (full filter > sector+country > metric only).
 */
export async function queryBenchmark(
  filter: BenchmarkFilter,
): Promise<BenchmarkValue[]> {
  const where: Record<string, unknown> = {};
  if (filter.country) where.country = filter.country;
  if (filter.sector) where.sector = filter.sector;
  if (filter.businessModel) where.businessModel = filter.businessModel;
  if (filter.brandNature) where.brandNature = filter.brandNature;
  if (filter.premiumScope) where.premiumScope = filter.premiumScope;
  if (filter.metric) where.metric = filter.metric;

  const rows = await db.marketBenchmark.findMany({
    where,
    orderBy: [{ confidence: "desc" }, { sampleSize: "desc" }],
  });

  return rows.map((r) => ({
    metric: r.metric,
    unit: r.unit,
    p10: r.p10,
    p50: r.p50,
    p90: r.p90,
    confidence: r.confidence,
    sampleSize: r.sampleSize,
  }));
}

/**
 * Get a single benchmark value with progressive fallback:
 *   1. exact match (all filters)
 *   2. drop premiumScope, brandNature
 *   3. drop businessModel
 *   4. country + sector + metric only
 *   5. metric only (global)
 *
 * Returns null if no match at any level.
 */
export async function queryBenchmarkWithFallback(
  filter: BenchmarkFilter & { metric: string },
): Promise<(BenchmarkValue & { matchSpecificity: "EXACT" | "PARTIAL" | "GLOBAL" }) | null> {
  // Tier A — exact
  const exact = await queryBenchmark(filter);
  if (exact.length > 0) return { ...exact[0]!, matchSpecificity: "EXACT" };

  // Tier B — drop premium / nature
  const partial = await queryBenchmark({
    country: filter.country,
    sector: filter.sector,
    businessModel: filter.businessModel,
    metric: filter.metric,
  });
  if (partial.length > 0) return { ...partial[0]!, matchSpecificity: "PARTIAL" };

  // Tier C — country + sector
  const ctrySec = await queryBenchmark({
    country: filter.country,
    sector: filter.sector,
    metric: filter.metric,
  });
  if (ctrySec.length > 0) return { ...ctrySec[0]!, matchSpecificity: "PARTIAL" };

  // Tier D — global metric
  const global = await queryBenchmark({ metric: filter.metric });
  if (global.length > 0) return { ...global[0]!, matchSpecificity: "GLOBAL" };

  return null;
}

// ── queryMarketSizing ────────────────────────────────────────────────

export async function queryMarketSizing(
  country: string,
  sector: string,
  year?: number,
): Promise<MarketSizingValue | null> {
  const row = await db.marketSizing.findFirst({
    where: { country, sector, ...(year ? { year } : {}) },
    orderBy: { year: "desc" },
  });
  if (!row) return null;
  return {
    country: row.country,
    sector: row.sector,
    segment: row.segment,
    year: row.year,
    TAM: row.TAM,
    SAM: row.SAM,
    SOM: row.SOM,
    currency: row.currency,
    growthRate: row.growthRate,
    confidence: row.confidence,
  };
}

// ── queryCostStructure ───────────────────────────────────────────────

export async function queryCostStructure(
  sector: string,
  businessModel?: string,
): Promise<
  Array<{ line: string; pctRevenue_p10: number; pctRevenue_p50: number; pctRevenue_p90: number }>
> {
  const rows = await db.costStructure.findMany({
    where: { sector, ...(businessModel ? { businessModel } : {}) },
  });
  return rows.map((r) => ({
    line: r.line,
    pctRevenue_p10: r.pctRevenue_p10,
    pctRevenue_p50: r.pctRevenue_p50,
    pctRevenue_p90: r.pctRevenue_p90,
  }));
}
