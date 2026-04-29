/**
 * country-registry — Single source of truth for country / currency
 * lookups.
 *
 * Replaces the hardcoded constants previously scattered in
 * `financial-brain/benchmarks/purchasing-power.ts` and
 * `financial-engine/index.ts`. Both modules now delegate here.
 *
 * Memory cache (per-process) populated lazily on first read; refresh on
 * demand via `refreshCache()`. The cache is fine-grained enough that the
 * UI / Notoria / financial-brain can call `lookup()` per request without
 * a DB hit on the hot path.
 */

import { db } from "@/lib/db";

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

export interface CurrencyRecord {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  usdRate: number | null;
}

let _byCode: Map<string, CountryRecord> | null = null;
let _byName: Map<string, CountryRecord> | null = null;
let _currencyByCode: Map<string, CurrencyRecord> | null = null;
let _loadingPromise: Promise<void> | null = null;

async function load(): Promise<void> {
  const [countries, currencies] = await Promise.all([
    db.country.findMany({ include: { currency: true } }),
    db.currency.findMany(),
  ]);

  const cur = new Map<string, CurrencyRecord>();
  for (const c of currencies) {
    cur.set(c.code, {
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      decimalPlaces: c.decimalPlaces,
      usdRate: c.usdRate,
    });
  }
  const byCode = new Map<string, CountryRecord>();
  const byName = new Map<string, CountryRecord>();
  for (const c of countries) {
    const rec: CountryRecord = {
      code: c.code,
      name: c.name,
      primaryLanguage: c.primaryLanguage,
      currencyCode: c.currencyCode,
      purchasingPowerIndex: c.purchasingPowerIndex,
      region: c.region,
      isFictional: c.isFictional,
      currency: cur.get(c.currencyCode) ?? {
        code: c.currencyCode,
        name: c.currencyCode,
        symbol: c.currencyCode,
        decimalPlaces: 2,
        usdRate: null,
      },
    };
    byCode.set(c.code.toUpperCase(), rec);
    byName.set(c.name.toLowerCase(), rec);
  }
  _byCode = byCode;
  _byName = byName;
  _currencyByCode = cur;
}

async function ensureLoaded(): Promise<void> {
  if (_byCode && _byName && _currencyByCode) return;
  if (!_loadingPromise) {
    _loadingPromise = load().finally(() => {
      _loadingPromise = null;
    });
  }
  await _loadingPromise;
}

/**
 * Lookup by ISO-2 code OR exact name (case-insensitive). Returns null
 * when not found — callers should NEVER silently fall back to a hardcoded
 * default. Use `requireCountry()` if absence is a programming error.
 */
export async function lookupCountry(codeOrName: string): Promise<CountryRecord | null> {
  await ensureLoaded();
  const v = codeOrName.trim();
  if (!v) return null;
  return (
    _byCode!.get(v.toUpperCase()) ??
    _byName!.get(v.toLowerCase()) ??
    null
  );
}

export async function requireCountry(codeOrName: string): Promise<CountryRecord> {
  const c = await lookupCountry(codeOrName);
  if (!c) {
    throw new Error(
      `country-registry: unknown country '${codeOrName}'. Add it to prisma/seed-countries.ts.`,
    );
  }
  return c;
}

export async function lookupCurrency(code: string): Promise<CurrencyRecord | null> {
  await ensureLoaded();
  return _currencyByCode!.get(code.toUpperCase()) ?? null;
}

export async function listCountries(opts?: {
  region?: string;
  includeFictional?: boolean;
}): Promise<readonly CountryRecord[]> {
  await ensureLoaded();
  const all = [..._byCode!.values()];
  return all.filter((c) => {
    if (opts?.region && c.region !== opts.region) return false;
    if (!opts?.includeFictional && c.isFictional) return false;
    return true;
  });
}

/** Wipe the in-memory cache. Call after seed updates / from tests. */
export function refreshCache(): void {
  _byCode = null;
  _byName = null;
  _currencyByCode = null;
}

/** Format an amount in the country's currency. Locale-aware. */
export function formatAmount(amount: number, currency: CurrencyRecord): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
  } catch {
    // Intl rejects fictional currency codes (WKD). Fallback: use the
    // symbol literally.
    return `${amount.toFixed(currency.decimalPlaces)} ${currency.symbol}`;
  }
}
