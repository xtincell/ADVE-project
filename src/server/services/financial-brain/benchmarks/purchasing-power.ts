/**
 * Purchasing Power Parity — PPP-adjusted budget tier thresholds
 *
 * Budget tiers are normalized by country purchasing power so that
 * "MICRO" means the same thing in Cameroon and France.
 */

import type { BudgetTier, BudgetTierInfo } from "../types";
import { SOURCES } from "./metadata";

// ─── PPP Index (relative to Cameroon = 1.0) ────────────────────────────────

export const PURCHASING_POWER_INDEX: Record<string, { ppp: number; currency: string; currencySymbol: string; source: string }> = {
  Cameroun:         { ppp: 1.0,  currency: "XAF",  currencySymbol: "FCFA", source: SOURCES.WORLD_BANK_PPP.name },
  "Cote d'Ivoire":  { ppp: 1.05, currency: "XOF",  currencySymbol: "FCFA", source: SOURCES.WORLD_BANK_PPP.name },
  Senegal:          { ppp: 0.95, currency: "XOF",  currencySymbol: "FCFA", source: SOURCES.WORLD_BANK_PPP.name },
  RDC:              { ppp: 0.6,  currency: "CDF",  currencySymbol: "FC",   source: SOURCES.WORLD_BANK_PPP.name },
  Gabon:            { ppp: 2.0,  currency: "XAF",  currencySymbol: "FCFA", source: SOURCES.WORLD_BANK_PPP.name },
  Congo:            { ppp: 1.1,  currency: "XAF",  currencySymbol: "FCFA", source: SOURCES.WORLD_BANK_PPP.name },
  Nigeria:          { ppp: 0.8,  currency: "NGN",  currencySymbol: "₦",   source: SOURCES.WORLD_BANK_PPP.name },
  Ghana:            { ppp: 0.9,  currency: "GHS",  currencySymbol: "GH₵", source: SOURCES.WORLD_BANK_PPP.name },
  France:           { ppp: 8.0,  currency: "EUR",  currencySymbol: "€",   source: SOURCES.WORLD_BANK_PPP.name },
  USA:              { ppp: 10.0, currency: "USD",  currencySymbol: "$",   source: SOURCES.WORLD_BANK_PPP.name },
  Maroc:            { ppp: 1.5,  currency: "MAD",  currencySymbol: "MAD", source: SOURCES.WORLD_BANK_PPP.name },
  Tunisie:          { ppp: 1.3,  currency: "TND",  currencySymbol: "TND", source: SOURCES.WORLD_BANK_PPP.name },
};

// ─── Budget Tier Thresholds (PPP-normalized, in XAF-equivalent) ─────────────

/** Thresholds in PPP-normalized XAF */
const TIER_THRESHOLDS: Array<{ max: number; tier: BudgetTier }> = [
  { max: 100_000,    tier: "MICRO" },
  { max: 1_000_000,  tier: "SMALL" },
  { max: 5_000_000,  tier: "MEDIUM" },
  { max: 25_000_000, tier: "LARGE" },
  { max: Infinity,   tier: "ENTERPRISE" },
];

/**
 * Get budget tier adjusted for purchasing power.
 * A 1M XAF budget in Cameroon = "SMALL".
 * A 1M XAF budget in France (PPP=8.0) → normalized = 125K → still "SMALL".
 * But a 1M EUR budget in France → 8M XAF equivalent → "LARGE".
 */
export function getBudgetTier(budget: number, country: string = "Cameroun"): BudgetTierInfo {
  const pppData = PURCHASING_POWER_INDEX[country] ?? PURCHASING_POWER_INDEX.Cameroun!;
  const normalizedBudget = budget / pppData.ppp;

  let tier: BudgetTier = "ENTERPRISE";
  for (const t of TIER_THRESHOLDS) {
    if (normalizedBudget < t.max) {
      tier = t.tier;
      break;
    }
  }

  return {
    tier,
    normalizedBudget: Math.round(normalizedBudget),
    rawBudget: budget,
    pppIndex: pppData.ppp,
    country,
  };
}

/**
 * Get the minimum recommended budget for a tier in a given country
 */
export function getMinBudgetForTier(tier: BudgetTier, country: string = "Cameroun"): number {
  const pppData = PURCHASING_POWER_INDEX[country] ?? PURCHASING_POWER_INDEX.Cameroun!;
  const thresholds: Record<BudgetTier, number> = {
    MICRO: 0,
    SMALL: 100_000,
    MEDIUM: 1_000_000,
    LARGE: 5_000_000,
    ENTERPRISE: 25_000_000,
  };
  return Math.round(thresholds[tier] * pppData.ppp);
}

export function getCountryCurrency(country: string): { currency: string; symbol: string } {
  const data = PURCHASING_POWER_INDEX[country] ?? PURCHASING_POWER_INDEX.Cameroun!;
  return { currency: data.currency, symbol: data.currencySymbol };
}
