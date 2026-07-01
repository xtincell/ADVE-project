/**
 * tests/unit/governance/country-registry.test.ts
 *
 * Sanity tests on the country-registry contract — no DB hit (we mock the
 * Prisma client). The point is to lock in the "no silent fallback to
 * Cameroun" invariant and the Wakanda fictional flag.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    country: {
      findMany: vi.fn().mockResolvedValue([
        {
          code: "CM",
          name: "Cameroun",
          primaryLanguage: "fr",
          currencyCode: "XAF",
          purchasingPowerIndex: 100,
          region: "AFRICA_CENTRAL",
          isFictional: false,
          currency: { code: "XAF", name: "Franc CFA BEAC", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
        },
        {
          code: "WK",
          name: "Wakanda",
          primaryLanguage: "fr",
          currencyCode: "WKD",
          purchasingPowerIndex: 200,
          region: "AFRICA_CENTRAL",
          isFictional: true,
          currency: { code: "WKD", name: "Wakandan Dollar", symbol: "Ⱳ", decimalPlaces: 0, usdRate: 600 },
        },
      ]),
    },
    currency: {
      findMany: vi.fn().mockResolvedValue([
        { code: "XAF", name: "Franc CFA BEAC", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
        { code: "WKD", name: "Wakandan Dollar", symbol: "Ⱳ", decimalPlaces: 0, usdRate: 600 },
      ]),
    },
  },
}));

import {
  lookupCountry,
  requireCountry,
  lookupCurrency,
  listCountries,
  refreshCache,
  formatAmount,
} from "@/server/services/country-registry";

describe("country-registry", () => {
  beforeEach(() => refreshCache());

  it("looks up by ISO-2 code", async () => {
    const c = await lookupCountry("CM");
    expect(c?.name).toBe("Cameroun");
    expect(c?.currency.code).toBe("XAF");
    expect(c?.currency.symbol).toBe("FCFA");
  });

  it("looks up by exact name (case-insensitive)", async () => {
    expect((await lookupCountry("cameroun"))?.code).toBe("CM");
    expect((await lookupCountry("WAKANDA"))?.code).toBe("WK");
  });

  it("returns null for unknown country (no silent fallback)", async () => {
    expect(await lookupCountry("Atlantis")).toBeNull();
  });

  it("requireCountry throws on unknown country", async () => {
    await expect(requireCountry("Atlantis")).rejects.toThrow(/unknown country/);
  });

  it("Wakanda is flagged as fictional", async () => {
    const wk = await lookupCountry("WK");
    expect(wk?.isFictional).toBe(true);
    expect(wk?.currency.code).toBe("WKD");
    expect(wk?.purchasingPowerIndex).toBe(200);
  });

  it("listCountries excludes fictional by default", async () => {
    const list = await listCountries();
    expect(list.find((c) => c.code === "WK")).toBeUndefined();
    expect(list.find((c) => c.code === "CM")).toBeDefined();
  });

  it("listCountries includes fictional when asked", async () => {
    const list = await listCountries({ includeFictional: true });
    expect(list.find((c) => c.code === "WK")).toBeDefined();
  });

  it("lookupCurrency returns null for unknown code (no fallback)", async () => {
    expect(await lookupCurrency("ZZZ")).toBeNull();
  });

  it("formatAmount handles fictional currencies (Intl accepts the 3-letter code)", async () => {
    const wkd = await lookupCurrency("WKD");
    expect(wkd).not.toBeNull();
    const formatted = formatAmount(1500, wkd!);
    // Intl accepts any 3-letter code; for unknown ones it appends the
    // code instead of the localised symbol. Either way the amount is
    // rendered correctly and never silently formatted as EUR.
    expect(formatted).toMatch(/1\s?500/);
    expect(formatted).toMatch(/(WKD|Ⱳ)/);
  });

  it("formatAmount uses Intl for real currencies (XAF)", async () => {
    const xaf = await lookupCurrency("XAF");
    const formatted = formatAmount(1000, xaf!);
    // Intl returns "1 000 XAF" or "1 000 F CFA" depending on locale data.
    expect(formatted).toMatch(/1\s?000/);
  });
});
