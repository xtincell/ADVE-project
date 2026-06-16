/**
 * country-registry — shared record types.
 *
 * Extracted from `index.ts` so both `index.ts` (DB-backed registry) and
 * `fallback.ts` (deterministic seed mirror) can reference them without an
 * import cycle. `index.ts` re-exports these for backward compatibility.
 */

export interface CurrencyRecord {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  usdRate: number | null;
}

export interface CountryRecord {
  code: string;
  name: string;
  primaryLanguage: string;
  currencyCode: string;
  purchasingPowerIndex: number;
  region: string;
  isFictional: boolean;
  currency: CurrencyRecord;
}
