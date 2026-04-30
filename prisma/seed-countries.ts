/**
 * prisma/seed-countries.ts — Seed Country + Currency rows.
 *
 * Replaces the hardcoded `PURCHASING_POWER_INDEX` constant in
 * `src/server/services/financial-brain/benchmarks/purchasing-power.ts` and
 * the `COUNTRY_DATA` dict in `src/server/services/financial-engine/index.ts`.
 *
 * Wakanda (WK) is a first-class fictional country (parity with FCFA, the
 * "most powerful African nation" simulation environment).
 *
 * Run automatically by `npm run db:seed:all`. Idempotent (upsert).
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const db = makeClient();

interface CurrencySeed {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  usdRate?: number;
}

const CURRENCIES: CurrencySeed[] = [
  { code: "XAF", name: "Franc CFA BEAC", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
  { code: "XOF", name: "Franc CFA BCEAO", symbol: "FCFA", decimalPlaces: 0, usdRate: 600 },
  { code: "CDF", name: "Franc congolais", symbol: "FC", decimalPlaces: 0, usdRate: 2800 },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", decimalPlaces: 0, usdRate: 1500 },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", decimalPlaces: 2, usdRate: 15 },
  { code: "MAD", name: "Dirham marocain", symbol: "MAD", decimalPlaces: 2, usdRate: 10 },
  { code: "TND", name: "Dinar tunisien", symbol: "TND", decimalPlaces: 3, usdRate: 3.1 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2, usdRate: 0.92 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2, usdRate: 1 },
  // Wakanda — fictional. Parity with FCFA (XAF) for simulation purposes.
  { code: "WKD", name: "Wakandan Dollar", symbol: "Ⱳ", decimalPlaces: 0, usdRate: 600 },
];

interface CountrySeed {
  code: string;
  name: string;
  primaryLanguage: string;
  currencyCode: string;
  purchasingPowerIndex: number;
  region: string;
  isFictional?: boolean;
  marketMeta?: Record<string, unknown>;
}

const COUNTRIES: CountrySeed[] = [
  // Central Africa (XAF zone)
  { code: "CM", name: "Cameroun", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 100, region: "AFRICA_CENTRAL" },
  { code: "GA", name: "Gabon", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 200, region: "AFRICA_CENTRAL" },
  { code: "CG", name: "Congo", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 110, region: "AFRICA_CENTRAL" },
  { code: "TD", name: "Tchad", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 70, region: "AFRICA_CENTRAL" },
  { code: "CF", name: "Centrafrique", primaryLanguage: "fr", currencyCode: "XAF", purchasingPowerIndex: 60, region: "AFRICA_CENTRAL" },
  { code: "GQ", name: "Guinée Équatoriale", primaryLanguage: "es", currencyCode: "XAF", purchasingPowerIndex: 180, region: "AFRICA_CENTRAL" },

  // West Africa (XOF zone)
  { code: "CI", name: "Côte d'Ivoire", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 105, region: "AFRICA_WEST" },
  { code: "SN", name: "Sénégal", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 95, region: "AFRICA_WEST" },
  { code: "BF", name: "Burkina Faso", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 70, region: "AFRICA_WEST" },
  { code: "ML", name: "Mali", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 65, region: "AFRICA_WEST" },
  { code: "NE", name: "Niger", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 55, region: "AFRICA_WEST" },
  { code: "TG", name: "Togo", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 75, region: "AFRICA_WEST" },
  { code: "BJ", name: "Bénin", primaryLanguage: "fr", currencyCode: "XOF", purchasingPowerIndex: 80, region: "AFRICA_WEST" },

  // West Africa (own currencies)
  { code: "NG", name: "Nigeria", primaryLanguage: "en", currencyCode: "NGN", purchasingPowerIndex: 80, region: "AFRICA_WEST" },
  { code: "GH", name: "Ghana", primaryLanguage: "en", currencyCode: "GHS", purchasingPowerIndex: 90, region: "AFRICA_WEST" },

  // Central Africa (own currencies)
  { code: "CD", name: "RDC", primaryLanguage: "fr", currencyCode: "CDF", purchasingPowerIndex: 60, region: "AFRICA_CENTRAL" },

  // North Africa
  { code: "MA", name: "Maroc", primaryLanguage: "fr", currencyCode: "MAD", purchasingPowerIndex: 150, region: "AFRICA_NORTH" },
  { code: "TN", name: "Tunisie", primaryLanguage: "fr", currencyCode: "TND", purchasingPowerIndex: 130, region: "AFRICA_NORTH" },
  { code: "DZ", name: "Algérie", primaryLanguage: "fr", currencyCode: "USD", purchasingPowerIndex: 120, region: "AFRICA_NORTH" }, // simplified — uses DZD locally; we map to USD for cross-currency math placeholder

  // Reference markets (operator dashboards, comparables)
  { code: "FR", name: "France", primaryLanguage: "fr", currencyCode: "EUR", purchasingPowerIndex: 800, region: "EUROPE" },
  { code: "US", name: "USA", primaryLanguage: "en", currencyCode: "USD", purchasingPowerIndex: 1000, region: "AMERICAS" },

  // Wakanda — fictional simulation environment.
  // Parity 1:1 with FCFA, "most powerful African nation" → highest PPP on
  // the continent (200 vs Cameroun=100 baseline). Used for end-to-end
  // tests, demos, and dev-environment seeding where we need a country
  // that doesn't reference real-world political/economic data.
  {
    code: "WK",
    name: "Wakanda",
    primaryLanguage: "fr",
    currencyCode: "WKD",
    purchasingPowerIndex: 200,
    region: "AFRICA_CENTRAL",
    isFictional: true,
    marketMeta: {
      gdpUsd: 90_000_000_000,
      population: 6_000_000,
      capital: "Birnin Zana",
      keySectors: ["VIBRANIUM_TECH", "BIOTECH", "AGROBUSINESS"],
      simulationOf: "FCFA-zone, top-tier purchasing power",
    },
  },
];

export async function seedCountries(): Promise<void> {
  for (const c of CURRENCIES) {
    await db.currency.upsert({
      where: { code: c.code },
      create: c,
      update: { name: c.name, symbol: c.symbol, decimalPlaces: c.decimalPlaces, usdRate: c.usdRate },
    });
  }
  for (const c of COUNTRIES) {
    const meta = (c.marketMeta ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
    await db.country.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        name: c.name,
        primaryLanguage: c.primaryLanguage,
        currencyCode: c.currencyCode,
        purchasingPowerIndex: c.purchasingPowerIndex,
        region: c.region,
        isFictional: c.isFictional ?? false,
        marketMeta: meta,
      },
      update: {
        name: c.name,
        primaryLanguage: c.primaryLanguage,
        currencyCode: c.currencyCode,
        purchasingPowerIndex: c.purchasingPowerIndex,
        region: c.region,
        isFictional: c.isFictional ?? false,
        marketMeta: meta,
      },
    });
  }
  console.log(`[seed] seeded ${CURRENCIES.length} currencies + ${COUNTRIES.length} countries (incl. Wakanda).`);
}

if (require.main === module) {
  seedCountries()
    .then(() => db.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await db.$disconnect();
      process.exit(1);
    });
}
