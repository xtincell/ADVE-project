/**
 * country-registry/fallback.ts — deterministic static dataset.
 *
 * The registry is DB-backed (source of truth = `prisma/seed-countries.ts`).
 * But a fresh / un-seeded production DB has empty `Country` / `Currency`
 * tables, which makes `getStandardCountry()` (and therefore the public
 * `/pricing` grid + every quote) throw — the customer sees empty cards.
 *
 * This module mirrors the canonical seed values so the registry is NEVER
 * empty: when the DB returns no rows, `load()` falls back to this table.
 * Deterministic, zero external dependency — consistent with the OS
 * doctrine (ship-able without seeding / external calls).
 *
 * Keep in sync with `prisma/seed-countries.ts` (real, non-fictional rows).
 */

import type { CountryRecord, CurrencyRecord } from "./index";

export const FALLBACK_CURRENCIES: readonly CurrencyRecord[] = [
  { code: "XAF", name: "Franc CFA BEAC", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
  { code: "XOF", name: "Franc CFA BCEAO", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
  { code: "CDF", name: "Franc congolais", symbol: "FC", decimalPlaces: 0, usdRate: 2800 },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", decimalPlaces: 0, usdRate: 1500 },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", decimalPlaces: 2, usdRate: 15 },
  { code: "MAD", name: "Dirham marocain", symbol: "MAD", decimalPlaces: 2, usdRate: 10 },
  { code: "TND", name: "Dinar tunisien", symbol: "TND", decimalPlaces: 3, usdRate: 3.1 },
  { code: "ZAR", name: "Rand sud-africain", symbol: "R", decimalPlaces: 2, usdRate: 18 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, usdRate: 0.92 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, usdRate: 1 },
];

interface FallbackCountrySeed {
  code: string;
  name: string;
  primaryLanguage: string;
  currencyCode: string;
  purchasingPowerIndex: number;
  region: string;
}

const FALLBACK_COUNTRY_SEEDS: readonly FallbackCountrySeed[] = [
  { code: "CM", name: "Cameroun", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 100, region: "AFRICA_CENTRAL" },
  { code: "GA", name: "Gabon", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 200, region: "AFRICA_CENTRAL" },
  { code: "CG", name: "Congo", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 110, region: "AFRICA_CENTRAL" },
  { code: "TD", name: "Tchad", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 70, region: "AFRICA_CENTRAL" },
  { code: "CF", name: "Centrafrique", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 60, region: "AFRICA_CENTRAL" },
  { code: "GQ", name: "Guinée Équatoriale", primaryLanguage: "es", currencyCode: "XAF", purchasingPowerIndex: 180, region: "AFRICA_CENTRAL" },
  { code: "CI", name: "Côte d'Ivoire", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 105, region: "AFRICA_WEST" },
  { code: "SN", name: "Sénégal", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 95, region: "AFRICA_WEST" },
  { code: "BF", name: "Burkina Faso", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 70, region: "AFRICA_WEST" },
  { code: "ML", name: "Mali", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 65, region: "AFRICA_WEST" },
  { code: "NE", name: "Niger", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 55, region: "AFRICA_WEST" },
  { code: "TG", name: "Togo", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 75, region: "AFRICA_WEST" },
  { code: "BJ", name: "Bénin", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 80, region: "AFRICA_WEST" },
  { code: "NG", name: "Nigeria", primaryLanguage: "en", currencyCode: "NGN", purchasingPowerIndex: 80, region: "AFRICA_WEST" },
  { code: "GH", name: "Ghana", primaryLanguage: "en", currencyCode: "GHS", purchasingPowerIndex: 90, region: "AFRICA_WEST" },
  { code: "CD", name: "RDC", primaryLanguage: "fr", currencyCode: "CDF", purchasingPowerIndex: 60, region: "AFRICA_CENTRAL" },
  { code: "MA", name: "Maroc", primaryLanguage: "fr", currencyCode: "MAD", purchasingPowerIndex: 150, region: "AFRICA_NORTH" },
  { code: "TN", name: "Tunisie", primaryLanguage: "fr", currencyCode: "TND", purchasingPowerIndex: 130, region: "AFRICA_NORTH" },
  { code: "ZA", name: "Afrique du Sud", primaryLanguage: "en", currencyCode: "ZAR", purchasingPowerIndex: 300, region: "AFRICA_SOUTH" },
  { code: "FR", name: "France", primaryLanguage: "fr", currencyCode: "EUR", purchasingPowerIndex: 800, region: "EUROPE" },
  { code: "US", name: "USA", primaryLanguage: "en", currencyCode: "USD", purchasingPowerIndex: 1000, region: "AMERICAS" },
];

/** Build the fallback country records, resolving currencies from the table above. */
export function buildFallbackCountries(
  currencyByCode: Map<string, CurrencyRecord>,
): CountryRecord[] {
  return FALLBACK_COUNTRY_SEEDS.map((c) => ({
    code: c.code,
    name: c.name,
    primaryLanguage: c.primaryLanguage,
    currencyCode: c.currencyCode,
    purchasingPowerIndex: c.purchasingPowerIndex,
    region: c.region,
    isFictional: false,
    currency: currencyByCode.get(c.currencyCode) ?? {
      code: c.currencyCode,
      name: c.currencyCode,
      symbol: c.currencyCode,
      decimalPlaces: 2,
      usdRate: null,
    },
  }));
}
