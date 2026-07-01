/**
 * CVR Matrix — Conversion Rate (click-to-conversion) by SECTOR x COUNTRY x CHANNEL
 *
 * Corrected benchmarks:
 * - EVENT: 8% → 4% (was implausibly high)
 * - LINKEDIN CVR: 3.5% → 2.0% (CVR cannot exceed CTR in rational model)
 * - All CVR values represent % of CLICKS that convert, not % of REACH
 */

import type { SourcedValue } from "../types";
import { SOURCES } from "./metadata";

// ─── Global Defaults ────────────────────────────────────────────────────────

const GLOBAL_CVR: Record<string, SourcedValue<number>> = {
  INSTAGRAM:  { value: 0.025,  source: SOURCES.META_ADS_AFRICA,      lastUpdated: "2024-09-01" },
  FACEBOOK:   { value: 0.030,  source: SOURCES.META_ADS_AFRICA,      lastUpdated: "2024-09-01" },
  TIKTOK:     { value: 0.015,  source: SOURCES.AFRICAN_MEDIA_MARKET, lastUpdated: "2024-06-01" },
  LINKEDIN:   { value: 0.020,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },  // Corrected from 3.5%
  YOUTUBE:    { value: 0.012,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  GOOGLE_ADS: { value: 0.040,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  DISPLAY:    { value: 0.008,  source: SOURCES.GOOGLE_ADS_BENCHMARK, lastUpdated: "2024-06-01" },
  TV:         { value: 0.005,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  RADIO:      { value: 0.008,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  PRINT:      { value: 0.010,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  OOH:        { value: 0.003,  source: SOURCES.WARC_MEDIA_COSTS,     lastUpdated: "2024-12-01" },
  EVENT:      { value: 0.040,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },  // Corrected from 8%
  PR:         { value: 0.010,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  WEBSITE:    { value: 0.040,  source: SOURCES.HUBSPOT_BENCHMARK,    lastUpdated: "2024-12-01" },
  EMAIL:      { value: 0.035,  source: SOURCES.HUBSPOT_BENCHMARK,    lastUpdated: "2024-12-01" },
  SMS:        { value: 0.050,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
  CUSTOM:     { value: 0.020,  source: SOURCES.ADVE_INTERNAL,        lastUpdated: "2025-01-01" },
};

// ─── Sector Adjustments ─────────────────────────────────────────────────────

const SECTOR_CVR_MULTIPLIER: Record<string, Partial<Record<string, number>>> = {
  FMCG:       { FACEBOOK: 1.3, INSTAGRAM: 1.2, EVENT: 1.5 },     // Impulse purchase
  RETAIL:     { INSTAGRAM: 1.4, FACEBOOK: 1.3, GOOGLE_ADS: 1.2 }, // E-commerce
  MODE:       { INSTAGRAM: 1.5, TIKTOK: 1.3 },                    // Fashion impulse
  TECH:       { GOOGLE_ADS: 1.3, LINKEDIN: 1.4 },                 // High intent search
  GAMING:     { TIKTOK: 1.2, DISPLAY: 1.5 },                      // App install
  BANQUE:     { GOOGLE_ADS: 0.7, LINKEDIN: 0.8 },                 // Long decision cycle
  SERVICES:   { LINKEDIN: 1.3, GOOGLE_ADS: 1.2 },
  EDUCATION:  { GOOGLE_ADS: 1.3, WEBSITE: 1.2 },
  HOSPITALITY: { GOOGLE_ADS: 1.5, INSTAGRAM: 1.2 },               // Booking intent
};

// ─── Positioning Adjustments ────────────────────────────────────────────────
// Premium/luxury brands have lower CVR (longer consideration) but higher AOV

const POSITIONING_CVR_MULTIPLIER: Record<string, number> = {
  ULTRA_LUXE: 0.40,
  LUXE: 0.55,
  PREMIUM: 0.70,
  MASSTIGE: 0.85,
  MAINSTREAM: 1.00,
  VALUE: 1.20,
  LOW_COST: 1.35,
};

// ─── Lookup Function ────────────────────────────────────────────────────────

export function getCvr(
  channel: string,
  country: string = "Cameroun",
  sector: string = "SERVICES",
  positioning: string = "MAINSTREAM",
): SourcedValue<number> {
  const ch = channel.toUpperCase();
  const global = GLOBAL_CVR[ch] ?? GLOBAL_CVR.CUSTOM!;
  const sectorMult = SECTOR_CVR_MULTIPLIER[sector.toUpperCase()]?.[ch] ?? 1.0;
  const posMult = POSITIONING_CVR_MULTIPLIER[positioning.toUpperCase()] ?? 1.0;

  // Country effect on CVR is minimal (purchase intent is more sector-driven)
  return {
    value: Math.round(global.value * sectorMult * posMult * 10000) / 10000,
    source: global.source,
    lastUpdated: global.lastUpdated,
  };
}

export function getAllCvrs(
  country: string = "Cameroun",
  sector: string = "SERVICES",
  positioning: string = "MAINSTREAM",
): Record<string, SourcedValue<number>> {
  const result: Record<string, SourcedValue<number>> = {};
  for (const ch of Object.keys(GLOBAL_CVR)) {
    result[ch] = getCvr(ch, country, sector, positioning);
  }
  return result;
}
