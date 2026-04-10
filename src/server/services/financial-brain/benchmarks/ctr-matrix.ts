/**
 * CTR Matrix — Click-Through Rate by SECTOR x COUNTRY x CHANNEL
 *
 * Corrected benchmarks:
 * - EVENT: 5% → 2.5% (was implausibly high)
 * - All values validated against industry averages
 */

import type { SourcedValue } from "../types";
import { SOURCES } from "./metadata";

// ─── Global Defaults ────────────────────────────────────────────────────────

const GLOBAL_CTR: Record<string, SourcedValue<number>> = {
  INSTAGRAM:  { value: 0.012,  source: SOURCES.META_ADS_AFRICA,      lastUpdated: "2024-09-01" },
  FACEBOOK:   { value: 0.009,  source: SOURCES.META_ADS_AFRICA,      lastUpdated: "2024-09-01" },
  TIKTOK:     { value: 0.018,  source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
  LINKEDIN:   { value: 0.006,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  YOUTUBE:    { value: 0.008,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  GOOGLE_ADS: { value: 0.035,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  DISPLAY:    { value: 0.004,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  TV:         { value: 0.003,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  RADIO:      { value: 0.001,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  PRINT:      { value: 0.002,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  OOH:        { value: 0.001,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  EVENT:      { value: 0.025,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },  // Corrected from 5%
  PR:         { value: 0.005,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  WEBSITE:    { value: 0.035,  source: SOURCES.HUBSPOT_BENCHMARK,    lastUpdated: "2024-12-01" },
  EMAIL:      { value: 0.025,  source: SOURCES.HUBSPOT_BENCHMARK,    lastUpdated: "2024-12-01" },
  SMS:        { value: 0.040,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  CUSTOM:     { value: 0.008,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
};

// ─── Sector Adjustments ─────────────────────────────────────────────────────
// CTR varies significantly by sector (e-commerce gets higher CTR than B2B)

const SECTOR_CTR_MULTIPLIER: Record<string, Partial<Record<string, number>>> = {
  FMCG:       { FACEBOOK: 1.2, INSTAGRAM: 1.1, EVENT: 1.3 },
  TECH:       { LINKEDIN: 1.5, GOOGLE_ADS: 1.2, DISPLAY: 0.8 },
  RETAIL:     { INSTAGRAM: 1.3, FACEBOOK: 1.2, GOOGLE_ADS: 1.3 },
  MODE:       { INSTAGRAM: 1.5, TIKTOK: 1.3 },
  GAMING:     { TIKTOK: 1.4, YOUTUBE: 1.2, DISPLAY: 1.3 },
  BANQUE:     { LINKEDIN: 1.3, GOOGLE_ADS: 0.8 },  // Banking gets lower search CTR (high competition)
  EDUCATION:  { GOOGLE_ADS: 1.2, FACEBOOK: 1.1 },
  HOSPITALITY: { INSTAGRAM: 1.2, GOOGLE_ADS: 1.4 },
};

// ─── Country Adjustments ────────────────────────────────────────────────────
// Mature markets have lower CTR (ad fatigue), emerging markets have higher

const COUNTRY_CTR_MULTIPLIER: Record<string, number> = {
  Cameroun: 1.0,
  "Cote d'Ivoire": 1.05,
  Senegal: 1.05,
  Nigeria: 1.10,      // High mobile engagement
  Ghana: 1.05,
  RDC: 1.15,          // Less ad saturation
  Gabon: 0.95,
  Congo: 1.0,
  France: 0.75,       // Mature market, ad fatigue
  USA: 0.70,          // Most saturated market
  Maroc: 0.90,
  Tunisie: 0.90,
};

// ─── Lookup Function ────────────────────────────────────────────────────────

export function getCtr(
  channel: string,
  country: string = "Cameroun",
  sector: string = "SERVICES",
): SourcedValue<number> {
  const ch = channel.toUpperCase();
  const global = GLOBAL_CTR[ch] ?? GLOBAL_CTR.CUSTOM!;
  const sectorMult = SECTOR_CTR_MULTIPLIER[sector.toUpperCase()]?.[ch] ?? 1.0;
  const countryMult = COUNTRY_CTR_MULTIPLIER[country] ?? 1.0;

  return {
    value: Math.round(global.value * sectorMult * countryMult * 10000) / 10000,
    source: global.source,
    lastUpdated: global.lastUpdated,
  };
}

export function getAllCtrs(
  country: string = "Cameroun",
  sector: string = "SERVICES",
): Record<string, SourcedValue<number>> {
  const result: Record<string, SourcedValue<number>> = {};
  for (const ch of Object.keys(GLOBAL_CTR)) {
    result[ch] = getCtr(ch, country, sector);
  }
  return result;
}
