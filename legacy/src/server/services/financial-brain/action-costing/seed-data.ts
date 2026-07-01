/**
 * Thot — Canonical ZoneIndex + EconomicNeighborMap seed (ADR-0093 / ADR-0087).
 *
 * COST_OF_LIVING is an index relative to the CM baseline (=100) used to scale
 * base-zone catalog rates per market. TAXES holds the standard VAT rate per
 * country. TJM seeds a creative day-rate per market (MARKET_INDEX demo family).
 * Values are DATA (seeded into ZoneIndex), not source-code pricing literals.
 */

import type { ZoneIndexFamily } from "./types";
import { ECONOMIC_NEIGHBORS } from "./constants";

export interface ZoneIndexSeed {
  family: ZoneIndexFamily;
  zoneCode: string;
  key: string;
  value: number;
  currency?: string;
  unit?: string;
  sourceRef?: string;
}

const COL = "Numbeo / Banque Mondiale (indicatif 2026)";
const VAT = "DGI pays (veille fiscale 2026)";
const TJM = "UPgraders TJM survey + Académie (indicatif 2026)";

export const ZONE_INDEX_SEED: ZoneIndexSeed[] = [
  // ── COST_OF_LIVING (index, CM = 100) ──
  { family: "COST_OF_LIVING", zoneCode: "CM", key: "general", value: 100, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "CI", key: "general", value: 105, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "SN", key: "general", value: 110, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "GA", key: "general", value: 130, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "BF", key: "general", value: 90, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "TG", key: "general", value: 95, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "BJ", key: "general", value: 95, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "ML", key: "general", value: 92, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "CG", key: "general", value: 120, unit: "index", sourceRef: COL },
  { family: "COST_OF_LIVING", zoneCode: "FR", key: "general", value: 320, unit: "index", sourceRef: COL },

  // ── TAXES (standard VAT, fraction) ──
  { family: "TAXES", zoneCode: "CM", key: "vat_standard", value: 0.1925, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "CI", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "SN", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "GA", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "BF", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "TG", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "BJ", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "ML", key: "vat_standard", value: 0.18, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "CG", key: "vat_standard", value: 0.185, unit: "rate", sourceRef: VAT },
  { family: "TAXES", zoneCode: "FR", key: "vat_standard", value: 0.20, unit: "rate", sourceRef: VAT },

  // ── TJM creative day-rate (MARKET_INDEX demo family) ──
  { family: "TJM", zoneCode: "CM", key: "creative_day", value: 90000, currency: "XAF", unit: "day", sourceRef: TJM },
  { family: "TJM", zoneCode: "CI", key: "creative_day", value: 110000, currency: "XOF", unit: "day", sourceRef: TJM },
  { family: "TJM", zoneCode: "SN", key: "creative_day", value: 120000, currency: "XOF", unit: "day", sourceRef: TJM },
  { family: "TJM", zoneCode: "GA", key: "creative_day", value: 140000, currency: "XAF", unit: "day", sourceRef: TJM },
  { family: "TJM", zoneCode: "BF", key: "creative_day", value: 80000, currency: "XOF", unit: "day", sourceRef: TJM },
];

export interface NeighborMapSeed {
  zoneCode: string;
  neighbors: string[];
}

export const NEIGHBOR_MAP_SEED: NeighborMapSeed[] = Object.entries(ECONOMIC_NEIGHBORS).map(
  ([zoneCode, neighbors]) => ({ zoneCode, neighbors }),
);
