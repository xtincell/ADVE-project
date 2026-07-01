/**
 * Purchasing Power Parity — PPP-adjusted budget tier thresholds.
 *
 * Single source of truth: the `country-registry` service (DB-backed).
 * The hardcoded `PURCHASING_POWER_INDEX` constant that previously lived
 * here was the source of two recurring bugs:
 *   1. Wakanda (test environment) had no entry → silent fallback to
 *      Cameroun.
 *   2. UI / Notoria / financial-engine all maintained their own copies,
 *      drifting whenever a market was added.
 *
 * Both APIs below are now async (DB read on first call, then cached by
 * country-registry). Callers must await. Synchronous callers were
 * always papered over with a `?? Cameroun` default — that bandage is
 * removed: missing country = explicit error from `country-registry`.
 *
 * The PPP index in DB is expressed relative to Cameroun = 100. For
 * compatibility with the previous decimal-based formula (1.0, 8.0, …),
 * we divide by 100 here.
 */

import type { BudgetTier, BudgetTierInfo } from "../types";
import { lookupCountry } from "@/server/services/country-registry";

// ─── Budget Tier Thresholds (PPP-normalized, in XAF-equivalent) ─────────────

/** Thresholds in PPP-normalized XAF (Cameroun = 1.0 baseline). */
const TIER_THRESHOLDS: Array<{ max: number; tier: BudgetTier }> = [
  { max: 100_000,    tier: "MICRO" },
  { max: 1_000_000,  tier: "SMALL" },
  { max: 5_000_000,  tier: "MEDIUM" },
  { max: 25_000_000, tier: "LARGE" },
  { max: Infinity,   tier: "ENTERPRISE" },
];

async function getPpp(country: string): Promise<number> {
  const c = await lookupCountry(country);
  if (!c) {
    // Fail loud — there is no "default country" anymore.
    throw new Error(
      `purchasing-power: unknown country '${country}'. Add it to prisma/seed-countries.ts and re-run db:seed:countries.`,
    );
  }
  return c.purchasingPowerIndex / 100; // DB stores 100 = baseline.
}

/**
 * Get budget tier adjusted for purchasing power.
 * A 1M XAF budget in Cameroon = "SMALL".
 * A 1M XAF budget in France (PPP=8.0) → normalized = 125K → still "SMALL".
 * But a 1M EUR budget in France → 8M XAF equivalent → "LARGE".
 */
export async function getBudgetTier(
  budget: number,
  country: string = "Cameroun",
): Promise<BudgetTierInfo> {
  const ppp = await getPpp(country);
  const normalizedBudget = budget / ppp;

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
    pppIndex: ppp,
    country,
  };
}

/** Get the minimum recommended budget for a tier in a given country. */
export async function getMinBudgetForTier(
  tier: BudgetTier,
  country: string = "Cameroun",
): Promise<number> {
  const ppp = await getPpp(country);
  const thresholds: Record<BudgetTier, number> = {
    MICRO: 0,
    SMALL: 100_000,
    MEDIUM: 1_000_000,
    LARGE: 5_000_000,
    ENTERPRISE: 25_000_000,
  };
  return Math.round(thresholds[tier] * ppp);
}

export async function getCountryCurrency(
  country: string,
): Promise<{ currency: string; symbol: string }> {
  const c = await lookupCountry(country);
  if (!c) {
    throw new Error(
      `purchasing-power: unknown country '${country}'. Add it to prisma/seed-countries.ts.`,
    );
  }
  return { currency: c.currency.code, symbol: c.currency.symbol };
}
