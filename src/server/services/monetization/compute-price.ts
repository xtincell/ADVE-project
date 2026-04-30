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
import { db } from "@/lib/db";

const MIN_MARKET_FACTOR = 0.30; // even the lowest-PPI market pays >= 30% of standard
const MAX_MARKET_FACTOR = 1.50; // cap so high-PPI markets aren't gouged
const SOFT_SCALE_EXPONENT = 0.6; // < 1 = compresses both extremes
const STANDARD_COUNTRY_ENV = "MONETIZATION_STANDARD_COUNTRY";
const STANDARD_COUNTRY_DEFAULT = "FR";

/**
 * Currency-specific rounding + psychological pricing.
 *
 * Two-step process:
 *
 * 1. Round to the currency's "natural step":
 *    - decimalPlaces == 0  AND usdRate >= 100  → step 1000 (XAF, XOF, NGN, KRW...)
 *    - decimalPlaces == 0  AND usdRate < 100   → step 100  (JPY, HUF...)
 *    - decimalPlaces == 2                      → step 10   (EUR, USD, MAD, GBP...)
 *
 * 2. Psychological "-1" adjustment for decimal currencies (EUR, USD, MAD,
 *    GBP, etc.). The natural step is 10 and final price ends in 9 — so
 *    49 / 199 / 299 / 999 / 1239 instead of 50 / 200 / 300 / 1000 / 1240.
 *    This applies whenever the currency carries decimals AND the rounded
 *    price is ≥ 10 (otherwise -1 produces nonsense like 9 instead of 10).
 *
 *    For currencies with decimalPlaces=0 and step ≥ 100 (XAF, XOF, NGN),
 *    psychological -1 doesn't apply: 9 999 FCFA reads worse than 10 000.
 */
function naturalStep(currency: { decimalPlaces: number; usdRate: number | null }): number {
  if (currency.decimalPlaces === 0) {
    const usdRate = currency.usdRate ?? 1;
    if (usdRate >= 100) return 1000;
    return 100;
  }
  // Decimal currencies (EUR/USD/MAD/...): step 10 — psychological -1 applies.
  return 10;
}

function isPsychologicalCurrency(currency: { decimalPlaces: number }): boolean {
  return currency.decimalPlaces === 2;
}

function applyRoundingAndPsychology(
  amount: number,
  currency: { decimalPlaces: number; usdRate: number | null },
): number {
  const step = naturalStep(currency);
  const rounded = Math.round(amount / step) * step;
  if (isPsychologicalCurrency(currency) && rounded >= 10) {
    return rounded - 1;
  }
  return rounded;
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
  readonly overrideAmountSpu?: number;
  readonly overrideAmountLocal?: number;
  readonly overrideCurrency?: string;
}

function resolveSync(ctx: ResolveContext): ResolvedPrice {
  const tier = getTier(ctx.tierKey);
  const { targetCountry, standardCountry } = ctx;

  // Direct local-currency override — skips market factor + FX entirely.
  if (typeof ctx.overrideAmountLocal === "number" && ctx.overrideCurrency) {
    const amount = ctx.overrideAmountLocal;
    return {
      tier: tier.key,
      tierLabel: tier.label,
      amount,
      currencyCode: ctx.overrideCurrency,
      currencySymbol: targetCountry.currency.symbol,
      billing: tier.billing,
      display: formatMoney(amount, { code: ctx.overrideCurrency, symbol: targetCountry.currency.symbol, decimalPlaces: targetCountry.currency.decimalPlaces }),
      localizedBadge: "Promo",
      internal: {
        marketFactor: 1,
        fxRate: 1,
        amountSpu: tier.amountSpu,
        amountStandardCurrency: amount,
      },
    };
  }

  // SPU override (per-tier, per-country or global) replaces tier.amountSpu.
  const effectiveSpu = ctx.overrideAmountSpu ?? tier.amountSpu;

  // Free tiers: shortcut, no math.
  if (effectiveSpu === 0) {
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
  const amountStandardCurrency = effectiveSpu * factor;

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

  // Round to natural step + apply psychological "-1" for decimal currencies.
  const amount = applyRoundingAndPsychology(amountTargetUnrounded, targetCountry.currency);

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
      amountSpu: effectiveSpu,
      amountStandardCurrency,
    },
  };
}

interface PricingOverrideRow {
  tierKey: string;
  countryCode: string | null;
  amountSpu: number | null;
  amountLocal: { toString(): string } | null;
  currencyCode: string | null;
  active: boolean;
}

async function lookupOverride(tierKey: PricingTierKey, countryCode: string): Promise<{ amountSpu?: number; amountLocal?: number; currencyCode?: string } | null> {
  // Most-specific match (tier+country) wins; fallback to global tier override.
  const rows: PricingOverrideRow[] = await db.pricingOverride.findMany({
    where: {
      tierKey,
      active: true,
      OR: [{ countryCode: countryCode.toUpperCase() }, { countryCode: null }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    },
  });
  if (rows.length === 0) return null;
  const specific = rows.find((r) => r.countryCode === countryCode.toUpperCase()) ?? rows[0];
  if (!specific) return null;
  return {
    amountSpu: specific.amountSpu ?? undefined,
    amountLocal: specific.amountLocal ? Number(specific.amountLocal.toString()) : undefined,
    currencyCode: specific.currencyCode ?? undefined,
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

/**
 * Free-tier shortcut. When the tier itself costs 0 SPU AND there's no
 * paid local override, none of the FX / PPI / standard-market machinery
 * is needed — we just need a currency code to display in. This lets the
 * free flow work even when the country-registry hasn't been seeded yet
 * (e.g. fresh dev DBs), instead of erroring out on `getStandardCountry()`.
 */
function freeTierResolved(
  tier: PricingTierDefinition,
  targetCountry: CountryRecord | null,
): ResolvedPrice {
  const currency = targetCountry?.currency;
  return {
    tier: tier.key,
    tierLabel: tier.label,
    amount: 0,
    currencyCode: currency?.code ?? "EUR",
    currencySymbol: currency?.symbol ?? "€",
    billing: tier.billing,
    display: "Gratuit",
    internal: {
      marketFactor: 1,
      fxRate: 1,
      amountSpu: 0,
      amountStandardCurrency: 0,
    },
  };
}

export async function resolvePrice(
  tierKey: PricingTierKey,
  countryCode: string,
): Promise<ResolvedPrice> {
  const tier = getTier(tierKey);
  const targetCountry = await lookupCountry(countryCode).catch(() => null);

  // Free-tier shortcut — no FX, no standard-country dependency. This must
  // happen BEFORE getStandardCountry() to avoid throwing on un-seeded DBs.
  // Paid overrides on a nominally-free tier are still respected via the
  // explicit overrideAmountLocal/Spu path below.
  const override = await lookupOverride(tierKey, (targetCountry?.code ?? countryCode).toUpperCase()).catch(() => null);
  const overrideMakesItPaid =
    (override?.amountSpu !== undefined && override.amountSpu > 0) ||
    (override?.amountLocal !== undefined && override.amountLocal > 0);
  if (tier.amountSpu === 0 && !overrideMakesItPaid) {
    return freeTierResolved(tier, targetCountry);
  }

  const standardCountry = await getStandardCountry();
  const country = targetCountry ?? standardCountry;
  return resolveSync({
    tierKey,
    targetCountry: country,
    standardCountry,
    overrideAmountSpu: override?.amountSpu,
    overrideAmountLocal: override?.amountLocal,
    overrideCurrency: override?.currencyCode,
  });
}

export async function resolveAllTiers(
  countryCode: string,
  tierKeys: readonly PricingTierKey[],
): Promise<readonly ResolvedPrice[]> {
  const standardCountry = await getStandardCountry();
  const targetCountry = (await lookupCountry(countryCode)) ?? standardCountry;
  const out: ResolvedPrice[] = [];
  for (const k of tierKeys) {
    const override = await lookupOverride(k, targetCountry.code).catch(() => null);
    out.push(resolveSync({
      tierKey: k,
      targetCountry,
      standardCountry,
      overrideAmountSpu: override?.amountSpu,
      overrideAmountLocal: override?.amountLocal,
      overrideCurrency: override?.currencyCode,
    }));
  }
  return out;
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
