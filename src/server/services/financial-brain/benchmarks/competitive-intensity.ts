/**
 * Competitive Intensity — How crowded the market is for ad space
 *
 * Higher intensity = higher CPM, lower CTR (ad fatigue).
 * Scale: 0.5 (low competition) to 2.0 (extremely competitive).
 */

import type { SourcedValue } from "../types";
import { SOURCES } from "./metadata";

// ─── Competitive Intensity Matrix (Sector × Country) ────────────────────────

const COMPETITIVE_INTENSITY: Record<string, Record<string, SourcedValue<number>>> = {
  FMCG: {
    Cameroun:        { value: 1.2, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    "Cote d'Ivoire": { value: 1.3, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    Nigeria:         { value: 1.5, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.8, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    USA:             { value: 2.0, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 1.2, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
  TECH: {
    Cameroun:        { value: 0.8, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    Nigeria:         { value: 1.0, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.6, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    USA:             { value: 1.9, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 0.9, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
  BANQUE: {
    Cameroun:        { value: 1.3, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    Nigeria:         { value: 1.4, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.7, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 1.2, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
  MODE: {
    Cameroun:        { value: 0.7, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.8, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    USA:             { value: 1.7, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 0.8, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
  GAMING: {
    Cameroun:        { value: 0.5, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    Nigeria:         { value: 0.7, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.4, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    USA:             { value: 1.8, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 0.6, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
  DEFAULT: {
    Cameroun:        { value: 1.0, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    "Cote d'Ivoire": { value: 1.0, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    Nigeria:         { value: 1.1, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
    France:          { value: 1.5, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    USA:             { value: 1.7, source: SOURCES.WARC_MEDIA_COSTS, lastUpdated: "2024-12-01" },
    DEFAULT:         { value: 1.0, source: SOURCES.ADVE_INTERNAL, lastUpdated: "2025-01-01" },
  },
};

/**
 * Get competitive intensity for a sector × country combination.
 * Higher = more competition = more expensive / harder to convert.
 */
export function getCompetitiveIntensity(
  sector: string = "SERVICES",
  country: string = "Cameroun",
): SourcedValue<number> {
  const sectorData = COMPETITIVE_INTENSITY[sector.toUpperCase()] ?? COMPETITIVE_INTENSITY.DEFAULT!;
  return sectorData[country] ?? sectorData.DEFAULT!;
}
