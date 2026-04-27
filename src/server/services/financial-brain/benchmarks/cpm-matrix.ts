/**
 * CPM Matrix — 3D lookup: SECTOR x COUNTRY x CHANNEL
 *
 * Each value is sourced and dated. Falls back through:
 *   exact match → country default → sector default → global default
 *
 * Values in local currency (XAF for Cameroon, EUR for France, etc.)
 */

import type { SourcedValue } from "../types";
import { SOURCES } from "./metadata";

// ─── Global Defaults (XAF baseline, Cameroon) ───────────────────────────────

const GLOBAL_CPM: Record<string, SourcedValue<number>> = {
  INSTAGRAM:  { value: 1500,   source: SOURCES.META_ADS_AFRICA,     lastUpdated: "2024-09-01" },
  FACEBOOK:   { value: 800,    source: SOURCES.META_ADS_AFRICA,     lastUpdated: "2024-09-01" },
  TIKTOK:     { value: 600,    source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
  LINKEDIN:   { value: 4500,   source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  YOUTUBE:    { value: 2000,   source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  GOOGLE_ADS: { value: 1200,   source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  DISPLAY:    { value: 500,    source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  TV:         { value: 120000, source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  RADIO:      { value: 8000,   source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  PRINT:      { value: 25000,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  OOH:        { value: 15000,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  CINEMA:     { value: 50000,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  EVENT:      { value: 0,      source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  PR:         { value: 0,      source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  WEBSITE:    { value: 0,      source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  EMAIL:      { value: 50,     source: SOURCES.HUBSPOT_BENCHMARK,    lastUpdated: "2024-12-01" },
  SMS:        { value: 200,    source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  PACKAGING:  { value: 0,      source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  VIDEO:      { value: 0,      source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  CUSTOM:     { value: 2000,   source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
};

// ─── Country Overrides ──────────────────────────────────────────────────────

const COUNTRY_CPM: Record<string, Partial<Record<string, SourcedValue<number>>>> = {
  France: {
    INSTAGRAM:  { value: 7500,    source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    FACEBOOK:   { value: 5500,    source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    TIKTOK:     { value: 4000,    source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    LINKEDIN:   { value: 25000,   source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    TV:         { value: 600000,  source: SOURCES.WARC_MEDIA_COSTS,  lastUpdated: "2024-12-01" },
    RADIO:      { value: 45000,   source: SOURCES.WARC_MEDIA_COSTS,  lastUpdated: "2024-12-01" },
    OOH:        { value: 80000,   source: SOURCES.WARC_MEDIA_COSTS,  lastUpdated: "2024-12-01" },
  },
  USA: {
    INSTAGRAM:  { value: 10000,   source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    FACEBOOK:   { value: 7000,    source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    TIKTOK:     { value: 5500,    source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    LINKEDIN:   { value: 35000,   source: SOURCES.META_ADS_EUROPE,   lastUpdated: "2024-09-01" },
    TV:         { value: 1200000, source: SOURCES.WARC_MEDIA_COSTS,  lastUpdated: "2024-12-01" },
  },
  Nigeria: {
    INSTAGRAM:  { value: 1200,    source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
    FACEBOOK:   { value: 650,     source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
    TIKTOK:     { value: 400,     source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
    TV:         { value: 80000,   source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
  },
  "Cote d'Ivoire": {
    INSTAGRAM:  { value: 1600,    source: SOURCES.META_ADS_AFRICA, lastUpdated: "2024-09-01" },
    FACEBOOK:   { value: 850,     source: SOURCES.META_ADS_AFRICA, lastUpdated: "2024-09-01" },
    TV:         { value: 130000,  source: SOURCES.ADVE_INTERNAL,   lastUpdated: "2025-01-01" },
  },
  Senegal: {
    INSTAGRAM:  { value: 1400,    source: SOURCES.META_ADS_AFRICA, lastUpdated: "2024-09-01" },
    FACEBOOK:   { value: 750,     source: SOURCES.META_ADS_AFRICA, lastUpdated: "2024-09-01" },
  },
  Gabon: {
    INSTAGRAM:  { value: 2200,    source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    FACEBOOK:   { value: 1200,    source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    TV:         { value: 180000,  source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
};

// ─── Sector Multipliers ─────────────────────────────────────────────────────
// Some sectors have higher CPM due to audience competition

const SECTOR_CPM_MULTIPLIER: Record<string, Partial<Record<string, number>>> = {
  BANQUE:     { INSTAGRAM: 1.4, FACEBOOK: 1.3, LINKEDIN: 1.5, GOOGLE_ADS: 1.6 },
  TECH:       { INSTAGRAM: 1.2, LINKEDIN: 1.8, GOOGLE_ADS: 1.5 },
  MODE:       { INSTAGRAM: 1.3, TIKTOK: 1.2 },
  GAMING:     { TIKTOK: 0.8, YOUTUBE: 1.3, DISPLAY: 0.7 },  // Gaming gets cheaper social CPM
  FMCG:       { TV: 1.2, RADIO: 1.1, OOH: 1.1 },           // FMCG pays premium for mass media
  HOSPITALITY: { INSTAGRAM: 1.1, GOOGLE_ADS: 1.3 },
};

// ─── Lookup Function ────────────────────────────────────────────────────────

/**
 * Get CPM for a specific sector × country × channel combination.
 * Fallback: exact country → global default, then apply sector multiplier.
 */
export function getCpm(
  channel: string,
  country: string = "Cameroun",
  sector: string = "SERVICES",
): SourcedValue<number> {
  const ch = channel.toUpperCase();

  // 1. Try country-specific override
  const countryOverride = COUNTRY_CPM[country]?.[ch];
  if (countryOverride) {
    const sectorMult = SECTOR_CPM_MULTIPLIER[sector.toUpperCase()]?.[ch] ?? 1.0;
    return {
      value: Math.round(countryOverride.value * sectorMult),
      source: countryOverride.source,
      lastUpdated: countryOverride.lastUpdated,
    };
  }

  // 2. Fall back to global default
  const global = GLOBAL_CPM[ch] ?? GLOBAL_CPM.CUSTOM!;
  const sectorMult = SECTOR_CPM_MULTIPLIER[sector.toUpperCase()]?.[ch] ?? 1.0;
  return {
    value: Math.round(global.value * sectorMult),
    source: global.source,
    lastUpdated: global.lastUpdated,
  };
}

/**
 * Get all CPMs for a country × sector (useful for budget allocation)
 */
export function getAllCpms(
  country: string = "Cameroun",
  sector: string = "SERVICES",
): Record<string, SourcedValue<number>> {
  const channels = Object.keys(GLOBAL_CPM);
  const result: Record<string, SourcedValue<number>> = {};
  for (const ch of channels) {
    result[ch] = getCpm(ch, country, sector);
  }
  return result;
}
