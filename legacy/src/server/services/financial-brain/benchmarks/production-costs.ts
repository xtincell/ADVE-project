/**
 * Production Costs — 3-tier quality pricing + volume discounts
 *
 * Each deliverable has BASIC / STANDARD / PREMIUM pricing.
 * Volume discounts: 10+ items = -10%, 30+ items = -20%
 * Prices in XAF (Cameroon baseline). Apply PPP for other countries.
 */

import type { TieredProductionCost, QualityTier } from "../types";
import { SOURCES } from "./metadata";

// ─── Production Cost Table (XAF) ───────────────────────────────────────────

export const PRODUCTION_COSTS: Record<string, TieredProductionCost> = {
  SOCIAL_POST: {
    basic: 8_000,          // Canva template
    standard: 15_000,      // Custom design
    premium: 35_000,       // Photoshoot + design
    volumeDiscounts: [{ minQuantity: 10, discountPct: 0.10 }, { minQuantity: 30, discountPct: 0.20 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  SOCIAL_VIDEO: {
    basic: 25_000,         // Smartphone + basic edit
    standard: 50_000,      // Proper filming + edit
    premium: 150_000,      // Professional production
    volumeDiscounts: [{ minQuantity: 5, discountPct: 0.10 }, { minQuantity: 15, discountPct: 0.15 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  STORY: {
    basic: 5_000,
    standard: 10_000,
    premium: 25_000,
    volumeDiscounts: [{ minQuantity: 20, discountPct: 0.15 }, { minQuantity: 50, discountPct: 0.25 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  REEL: {
    basic: 15_000,
    standard: 35_000,
    premium: 80_000,
    volumeDiscounts: [{ minQuantity: 8, discountPct: 0.10 }, { minQuantity: 20, discountPct: 0.20 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  BANNER_WEB: {
    basic: 10_000,
    standard: 20_000,
    premium: 50_000,
    volumeDiscounts: [{ minQuantity: 10, discountPct: 0.10 }, { minQuantity: 30, discountPct: 0.20 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  KV_PRINT: {
    basic: 40_000,
    standard: 75_000,
    premium: 200_000,
    volumeDiscounts: [{ minQuantity: 3, discountPct: 0.10 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  KV_OOH: {
    basic: 50_000,
    standard: 100_000,
    premium: 300_000,
    volumeDiscounts: [{ minQuantity: 3, discountPct: 0.10 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  SPOT_RADIO_30S: {
    basic: 75_000,         // Voice only, stock music
    standard: 150_000,     // Professional voice + original music
    premium: 400_000,      // Celebrity voice + composition
    volumeDiscounts: [],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  SPOT_TV_30S: {
    basic: 500_000,        // Animation / motion graphics
    standard: 1_500_000,   // Standard film production
    premium: 5_000_000,    // High-end production
    volumeDiscounts: [],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  LANDING_PAGE: {
    basic: 75_000,         // Template-based
    standard: 150_000,     // Custom design + dev
    premium: 500_000,      // Full UX + animations
    volumeDiscounts: [],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  EMAIL_TEMPLATE: {
    basic: 15_000,
    standard: 30_000,
    premium: 75_000,
    volumeDiscounts: [{ minQuantity: 5, discountPct: 0.10 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  FLYER: {
    basic: 10_000,
    standard: 25_000,
    premium: 60_000,
    volumeDiscounts: [{ minQuantity: 5, discountPct: 0.10 }],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  EVENT_SETUP: {
    basic: 150_000,
    standard: 300_000,
    premium: 1_000_000,
    volumeDiscounts: [],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
  PACKAGING: {
    basic: 100_000,
    standard: 200_000,
    premium: 500_000,
    volumeDiscounts: [],
    source: SOURCES.PRODUCTION_COST_SURVEY,
  },
};

// ─── Complexity Multipliers ─────────────────────────────────────────────────

const COMPLEXITY_MULTIPLIER: Record<string, number> = {
  SIMPLE: 0.75,
  STANDARD: 1.0,
  COMPLEX: 1.5,
};

// ─── Lookup Functions ───────────────────────────────────────────────────────

/**
 * Get unit cost for a deliverable, adjusted for quality and complexity
 */
export function getUnitCost(
  type: string,
  qualityTier: QualityTier = "STANDARD",
  complexity: string = "STANDARD",
): number {
  const costs = PRODUCTION_COSTS[type.toUpperCase()];
  if (!costs) return PRODUCTION_COSTS.SOCIAL_POST!.standard;

  const baseCost = qualityTier === "BASIC" ? costs.basic
    : qualityTier === "PREMIUM" ? costs.premium
    : costs.standard;

  const complexityMult = COMPLEXITY_MULTIPLIER[complexity.toUpperCase()] ?? 1.0;
  return Math.round(baseCost * complexityMult);
}

/**
 * Get total cost for a batch with volume discount applied
 */
export function getBatchCost(
  type: string,
  quantity: number,
  qualityTier: QualityTier = "STANDARD",
  complexity: string = "STANDARD",
): { unitCost: number; totalCost: number; discount: number; discountPct: number } {
  const unitCost = getUnitCost(type, qualityTier, complexity);
  const costs = PRODUCTION_COSTS[type.toUpperCase()];

  let discountPct = 0;
  if (costs) {
    for (const vd of costs.volumeDiscounts) {
      if (quantity >= vd.minQuantity && vd.discountPct > discountPct) {
        discountPct = vd.discountPct;
      }
    }
  }

  const rawTotal = unitCost * quantity;
  const discount = Math.round(rawTotal * discountPct);
  return {
    unitCost,
    totalCost: rawTotal - discount,
    discount,
    discountPct,
  };
}

/**
 * Apply PPP multiplier for a country
 */
export function getCountryAdjustedCost(
  type: string,
  qualityTier: QualityTier,
  pppIndex: number,
): number {
  return Math.round(getUnitCost(type, qualityTier) * pppIndex);
}
