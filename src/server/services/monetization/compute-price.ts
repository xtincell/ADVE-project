/**
 * compute-price.ts — derive a market-localized price from a tier + country.
 *
 * Architecture (anti-hardcoding):
 *
 *   1. The "standard pricing market" is identified by an env var
 *      `MONETIZATION_STANDARD_COUNTRY` (default "FR"). The customer-facing
 *      surface NEVER references this country by name — it just sees the
 *      computed price in their own currency.
 *
 *   2. Market factor = soft scale of purchasingPowerIndex relative to
 *      the standard market. A floor at MIN_FACTOR prevents giving away
 *      the OS in low-PPI markets (digital margin still costs LLM tokens).
 *
 *   3. FX conversion: standard currency → target currency via
 *      country-registry.currency.usdRate as the bridge.
 *
 *   4. Rounding: each currency declares a "natural step" (1000 for
 *      XAF/XOF, 10 for EUR/USD, 100 for MAD, etc.). Final amount
 *      rounded to nearest natural step.
 *
 * The whole pipeline is deterministic given (tier, countryCode), and
 * depends only on data in the country-registry — no constants leak.
 */

import { lookupCountry, type CountryRecord } from "@/server/services/country-registry";
import { getTier, type PricingTierDefinition, type PricingTierKey } from "./pricing-tiers";

const MIN_MARKET_FACTOR = 0.30; // even the lowest-PPI market pays >= 30% of standard
const MAX_MARKET_FACTOR = 1.50; // cap so high-PPI markets aren't gouged
const SOFT_SCALE_EXPONENT = 0.6; // < 1 = compresses both extremes
const STANDARD_COUNTRY_ENV = "MONETIZATION_STANDARD_COUNTRY";
const STANDARD_COUNTRY_DEFAULT = "FR";

/**
 * Currency-specific rounding. Returns the smallest "natural" step in
 * the currency. Most prices should align to this step.
 *
 * Heuristic:
 *   - decimalPlaces == 0  AND smallest unit >= 100  → step 1000 (XAF, XOF, KRW...)
 *   - decimalPlaces == 0  AND smallest unit < 100   → step 100  (JPY, HUF...)
 *   - decimalPlaces == 2                            → step 1    (EUR, USD, MAD, GBP...)
 *
 * The "smallest unit" heuristic uses usdRate: a currency with 1 USD ≈ 600 unit
 * (XAF/XOF) wants thousand-rounding because 25 USD ≈ 15 000 XOF.
 */
function naturalStep(currency: { decimalPlaces: number; usdRate: number | null }): number {
  if (currency.decimalPlaces === 0) {
    const usdRate = currency.usdRate ?? 1;
    if (usdRate >= 100) return 1000;
    return 100;
  }
  return 1;
}

function roundToStep(amount: number, step: number): number {
  if (step <= 1) return Math.round(amount * 100) / 100; // 2 decimals
  return Math.round(amount / step) * step;
}

export interface ResolvedPrice {
  readonly tier: PricingTierKey;
  readonly tierLabel: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly currencySymbol: string;
  readonly billing: "ONE_TIME" | "MONTHLY";
  /** Pre-formatted display string (locale-aware). */
  readonly display: string;
  /** Marketing badge if the local price is markedly lower than the implicit standard. */
  readonly localizedBadge?: string;
  /** Audit data — useful for governance, never displayed. */
  readonly internal: {
    readonly marketFactor: number;
    readonly fxRate: number;
    readonly amountSpu: number;
    readonly amountStandardCurrency: number;
  };
}

interface ResolveContext {
  readonly tierKey: PricingTierKey;
  readonly targetCountry: CountryRecord;
  readonly standardCountry: CountryRecord;
}

function resolveSync(ctx: ResolveContext): ResolvedPrice {
  const tier = getTier(ctx.tierKey);
  const { targetCountry, standardCountry } = ctx;

  // Free tiers: shortcut, no math.
  if (tier.amountSpu === 0) {
    return {
      tier: tier.key,
      tierLabel: tier.label,
      amount: 0,
      currencyCode: targetCountry.currency.code,
      currencySymbol: targetCountry.currency.symbol,
      billing: tier.billing,
      display: "0",
      internal: {
        marketFactor: 1,
        fxRate: 1,
        amountSpu: 0,
        amountStandardCurrency: 0,
      },
    };
  }

  // Market factor (soft scale + floor + cap)
  const ppiRatio = (targetCountry.purchasingPowerIndex || standardCountry.purchasingPowerIndex)
    / standardCountry.purchasingPowerIndex;
  const rawFactor = Math.pow(ppiRatio, SOFT_SCALE_EXPONENT);
  const factor = Math.max(MIN_MARKET_FACTOR, Math.min(MAX_MARKET_FACTOR, rawFactor));

  // 1 SPU = 1 unit of standard currency
  const amountStandardCurrency = tier.amountSpu * factor;

  // FX bridge via USD.
  // Convention: usdRate = units of <currency> per 1 USD.
  //   1 EUR = 1/0.92 USD = 1.087 USD
  //   1 USD = 600 XAF
  //   ⇒ 1 EUR = (1/0.92) × 600 XAF = 652 XAF
  // Formula: amount_target = amount_source × (target.usdRate / source.usdRate)
  const fxStandardPerUsd = standardCountry.currency.usdRate ?? 1;
  const fxTargetPerUsd = targetCountry.currency.usdRate ?? 1;
  const fxRate = fxTargetPerUsd / fxStandardPerUsd;
  const amountTargetUnrounded = amountStandardCurrency * fxRate;

  // Round to natural step
  const step = naturalStep(targetCountry.currency);
  const amount = roundToStep(amountTargetUnrounded, step);

  // Display
  const display = formatMoney(amount, targetCountry.currency);

  const isLocalized = targetCountry.currencyCode !== standardCountry.currencyCode
    && factor < 0.85;

  return {
    tier: tier.key,
    tierLabel: tier.label,
    amount,
    currencyCode: targetCountry.currency.code,
    currencySymbol: targetCountry.currency.symbol,
    billing: tier.billing,
    display,
    localizedBadge: isLocalized ? "Prix local" : undefined,
    internal: {
      marketFactor: factor,
      fxRate,
      amountSpu: tier.amountSpu,
      amountStandardCurrency,
    },
  };
}

function formatMoney(amount: number, currency: { code: string; symbol: string; decimalPlaces: number }): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("fr-FR")} ${currency.symbol}`;
  }
}

async function getStandardCountry(): Promise<CountryRecord> {
  const code = process.env[STANDARD_COUNTRY_ENV] ?? STANDARD_COUNTRY_DEFAULT;
  const country = await lookupCountry(code);
  if (!country) {
    // Fail loud — the standard market must exist in country-registry.
    throw new Error(
      `monetization: standard pricing country code '${code}' not found in country-registry. ` +
      `Set ${STANDARD_COUNTRY_ENV} or seed the country.`,
    );
  }
  return country;
}

export async function resolvePrice(
  tierKey: PricingTierKey,
  countryCode: string,
): Promise<ResolvedPrice> {
  const targetCountry = await lookupCountry(countryCode);
  const standardCountry = await getStandardCountry();
  if (!targetCountry) {
    // Unknown country — fall back to standard market pricing in standard currency.
    return resolveSync({ tierKey, targetCountry: standardCountry, standardCountry });
  }
  return resolveSync({ tierKey, targetCountry, standardCountry });
}

export async function resolveAllTiers(
  countryCode: string,
  tierKeys: readonly PricingTierKey[],
): Promise<readonly ResolvedPrice[]> {
  const standardCountry = await getStandardCountry();
  const targetCountry = (await lookupCountry(countryCode)) ?? standardCountry;
  return tierKeys.map((k) => resolveSync({ tierKey: k, targetCountry, standardCountry }));
}

/** Tier definition + market price, for UI consumption. */
export interface TierWithPrice {
  readonly definition: PricingTierDefinition;
  readonly price: ResolvedPrice;
}

export async function buildTierGrid(
  countryCode: string,
  tierKeys: readonly PricingTierKey[],
): Promise<readonly TierWithPrice[]> {
  const prices = await resolveAllTiers(countryCode, tierKeys);
  return tierKeys.map((k, i) => ({
    definition: getTier(k),
    price: prices[i]!,
  }));
}
