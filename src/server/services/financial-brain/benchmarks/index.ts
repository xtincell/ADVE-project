/**
 * Benchmarks — Unified API for all benchmark lookups
 *
 * Single entry point: getBenchmark(sector, country, channel, metric)
 * with graceful fallback chains.
 */

import type { SourcedValue, QualityTier, SeasonalFactor, FeeBenchmark, RevenueRatio, BudgetTier, BudgetTierInfo, TieredProductionCost } from "../types";
import { getCpm, getAllCpms } from "./cpm-matrix";
import { getCtr, getAllCtrs } from "./ctr-matrix";
import { getCvr, getAllCvrs } from "./cvr-matrix";
import { getUnitCost, getBatchCost, getCountryAdjustedCost, PRODUCTION_COSTS } from "./production-costs";
import { getSeasonalFactor, getAverageSeasonalFactor } from "./seasonal-factors";
import { getCompetitiveIntensity } from "./competitive-intensity";
import { getBudgetTier, getMinBudgetForTier, getCountryCurrency, PURCHASING_POWER_INDEX } from "./purchasing-power";
import { getAgencyFeeBenchmark, getFreelanceDayRate, AGENCY_HEALTH_BENCHMARKS } from "./fee-benchmarks";
import { getRevenueRatio, getRecommendedBudgetFromRevenue } from "./revenue-ratios";
export { SOURCES } from "./metadata";

// ─── Unified Benchmark Accessor ─────────────────────────────────────────────

export type BenchmarkMetric = "cpm" | "ctr" | "cvr";

/**
 * Get a single benchmark value for a channel.
 * This is the primary lookup function — replaces all flat tables.
 */
export function getBenchmark(
  channel: string,
  country: string,
  sector: string,
  metric: BenchmarkMetric,
  positioning?: string,
): SourcedValue<number> {
  switch (metric) {
    case "cpm": return getCpm(channel, country, sector);
    case "ctr": return getCtr(channel, country, sector);
    case "cvr": return getCvr(channel, country, sector, positioning);
    default: return { value: 0, source: { name: "unknown", date: "", confidence: 0, region: "" }, lastUpdated: "" };
  }
}

/**
 * Get all benchmarks for all channels (useful for budget allocation)
 */
export function getAllBenchmarks(
  country: string,
  sector: string,
  positioning?: string,
): Record<string, { cpm: SourcedValue<number>; ctr: SourcedValue<number>; cvr: SourcedValue<number> }> {
  const cpms = getAllCpms(country, sector);
  const ctrs = getAllCtrs(country, sector);
  const cvrs = getAllCvrs(country, sector, positioning);

  const result: Record<string, { cpm: SourcedValue<number>; ctr: SourcedValue<number>; cvr: SourcedValue<number> }> = {};
  for (const ch of Object.keys(cpms)) {
    result[ch] = {
      cpm: cpms[ch]!,
      ctr: ctrs[ch] ?? { value: 0.01, source: cpms[ch]!.source, lastUpdated: cpms[ch]!.lastUpdated },
      cvr: cvrs[ch] ?? { value: 0.02, source: cpms[ch]!.source, lastUpdated: cpms[ch]!.lastUpdated },
    };
  }
  return result;
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export {
  // CPM / CTR / CVR
  getCpm, getAllCpms,
  getCtr, getAllCtrs,
  getCvr, getAllCvrs,
  // Production costs
  getUnitCost, getBatchCost, getCountryAdjustedCost, PRODUCTION_COSTS,
  // Seasonal
  getSeasonalFactor, getAverageSeasonalFactor,
  // Competitive
  getCompetitiveIntensity,
  // PPP + Budget Tiers
  getBudgetTier, getMinBudgetForTier, getCountryCurrency, PURCHASING_POWER_INDEX,
  // Fees
  getAgencyFeeBenchmark, getFreelanceDayRate, AGENCY_HEALTH_BENCHMARKS,
  // Revenue ratios
  getRevenueRatio, getRecommendedBudgetFromRevenue,
};

// Re-export types used by consumers
export type { SourcedValue, QualityTier, SeasonalFactor, FeeBenchmark, RevenueRatio, BudgetTier, BudgetTierInfo, TieredProductionCost };
