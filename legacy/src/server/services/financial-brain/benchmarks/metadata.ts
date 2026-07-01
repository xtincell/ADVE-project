/**
 * Benchmark Metadata — Source, date, confidence for every benchmark value
 *
 * Every hardcoded financial value in the system carries provenance metadata.
 * This enables transparency about data quality and freshness.
 */

import type { BenchmarkSource } from "../types";

// ─── Source Definitions ─────────────────────────────────────────────────────

export const SOURCES = {
  ADVE_INTERNAL: {
    name: "ADVE Internal Estimates",
    date: "2025-01-01",
    confidence: 0.6,
    region: "CEMAC",
  } satisfies BenchmarkSource,

  META_ADS_AFRICA: {
    name: "Meta Ads Manager — African Markets Benchmarks",
    date: "2024-09-01",
    confidence: 0.8,
    sampleSize: 5000,
    region: "AFRICA",
  } satisfies BenchmarkSource,

  META_ADS_EUROPE: {
    name: "Meta Ads Manager — European Markets Benchmarks",
    date: "2024-09-01",
    confidence: 0.85,
    sampleSize: 50000,
    region: "EUROPE",
  } satisfies BenchmarkSource,

  GOOGLE_ADS_BENCHMARK: {
    name: "Google Ads Industry Benchmarks",
    date: "2024-06-01",
    confidence: 0.85,
    sampleSize: 100000,
    region: "GLOBAL",
  } satisfies BenchmarkSource,

  WARC_MEDIA_COSTS: {
    name: "WARC Media Cost Benchmarks",
    date: "2024-12-01",
    confidence: 0.9,
    region: "GLOBAL",
  } satisfies BenchmarkSource,

  AFRICAN_MEDIA_MARKET: {
    name: "African Digital Marketing Benchmarks (GeoPoll/Statista)",
    date: "2024-06-01",
    confidence: 0.7,
    sampleSize: 2000,
    region: "AFRICA",
  } satisfies BenchmarkSource,

  AGENCY_SURVEY_CEMAC: {
    name: "UPgraders Agency Fee Survey — CEMAC",
    date: "2024-10-01",
    confidence: 0.75,
    sampleSize: 50,
    region: "CEMAC",
  } satisfies BenchmarkSource,

  PRODUCTION_COST_SURVEY: {
    name: "UPgraders Production Cost Index",
    date: "2025-01-01",
    confidence: 0.7,
    sampleSize: 100,
    region: "CEMAC",
  } satisfies BenchmarkSource,

  WORLD_BANK_PPP: {
    name: "World Bank PPP Conversion Factors",
    date: "2024-01-01",
    confidence: 0.95,
    region: "GLOBAL",
  } satisfies BenchmarkSource,

  DELOITTE_CMO_SURVEY: {
    name: "Deloitte CMO Survey — Marketing Budget Ratios",
    date: "2024-09-01",
    confidence: 0.85,
    sampleSize: 3000,
    region: "GLOBAL",
  } satisfies BenchmarkSource,

  HUBSPOT_BENCHMARK: {
    name: "HubSpot Marketing Benchmarks Report",
    date: "2024-12-01",
    confidence: 0.75,
    sampleSize: 10000,
    region: "GLOBAL",
  } satisfies BenchmarkSource,
} as const;

/** Get the most appropriate source for a region */
export function getSourceForRegion(region: string): BenchmarkSource {
  if (region === "CEMAC" || region === "ECOWAS") return SOURCES.AFRICAN_MEDIA_MARKET;
  if (region === "EUROPE") return SOURCES.META_ADS_EUROPE;
  return SOURCES.ADVE_INTERNAL;
}
