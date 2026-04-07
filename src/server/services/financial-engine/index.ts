// ============================================================================
// Financial Engine — Sector benchmarks & reference data for ADVE generation
// Provides coherent default financial values based on sector, positioning,
// country, and business model. Used by LLM prompts to calibrate estimates.
// Values are correctable during RTIS cascade.
// ============================================================================

export interface SectorBenchmark {
  /** Average product price range for this sector+positioning (local currency) */
  priceRange: { min: number; max: number };
  /** Average gross margin % */
  grossMargin: number;
  /** Average CAC for this business model */
  cacRange: { min: number; max: number };
  /** Average LTV */
  ltvRange: { min: number; max: number };
  /** Typical marketing budget as % of revenue */
  marketingBudgetPct: number;
  /** Reference annual revenue for a growing brand */
  revenueRange: { min: number; max: number };
  /** Common distribution channels */
  channels: string[];
}

export interface CountryContext {
  currency: string;
  currencySymbol: string;
  marketSize: string;
  avgIncome: string;
  priceMultiplier: number; // 1.0 = reference (Cameroun XAF), adjust for other markets
}

// ─── Country → Currency + Context ─────────────────────────────────────────

const COUNTRY_DATA: Record<string, CountryContext> = {
  "Cameroun": { currency: "XAF", currencySymbol: "FCFA", marketSize: "27M habitants", avgIncome: "~800K FCFA/an", priceMultiplier: 1.0 },
  "Cote d'Ivoire": { currency: "XOF", currencySymbol: "FCFA", marketSize: "28M habitants", avgIncome: "~900K FCFA/an", priceMultiplier: 1.05 },
  "Senegal": { currency: "XOF", currencySymbol: "FCFA", marketSize: "17M habitants", avgIncome: "~750K FCFA/an", priceMultiplier: 0.95 },
  "RDC": { currency: "CDF", currencySymbol: "FC", marketSize: "100M habitants", avgIncome: "~500K CDF/an", priceMultiplier: 0.6 },
  "Gabon": { currency: "XAF", currencySymbol: "FCFA", marketSize: "2.3M habitants", avgIncome: "~2.5M FCFA/an", priceMultiplier: 2.0 },
  "Congo": { currency: "XAF", currencySymbol: "FCFA", marketSize: "5.5M habitants", avgIncome: "~1.2M FCFA/an", priceMultiplier: 1.1 },
  "Nigeria": { currency: "NGN", currencySymbol: "₦", marketSize: "220M habitants", avgIncome: "~1.5M NGN/an", priceMultiplier: 0.8 },
  "Ghana": { currency: "GHS", currencySymbol: "GH₵", marketSize: "33M habitants", avgIncome: "~15K GHS/an", priceMultiplier: 0.9 },
  "France": { currency: "EUR", currencySymbol: "€", marketSize: "68M habitants", avgIncome: "~25K €/an", priceMultiplier: 8.0 },
  "USA": { currency: "USD", currencySymbol: "$", marketSize: "330M habitants", avgIncome: "~45K $/an", priceMultiplier: 10.0 },
  "Maroc": { currency: "MAD", currencySymbol: "MAD", marketSize: "37M habitants", avgIncome: "~35K MAD/an", priceMultiplier: 1.5 },
  "Tunisie": { currency: "TND", currencySymbol: "TND", marketSize: "12M habitants", avgIncome: "~8K TND/an", priceMultiplier: 1.3 },
};

// ─── Sector × Positioning → Financial benchmarks ──────────────────────────

// Base benchmarks in XAF (Cameroun reference). priceMultiplier adjusts for country.
const SECTOR_BENCHMARKS: Record<string, SectorBenchmark> = {
  "FMCG": {
    priceRange: { min: 500, max: 15000 },
    grossMargin: 0.35,
    cacRange: { min: 500, max: 5000 },
    ltvRange: { min: 15000, max: 150000 },
    marketingBudgetPct: 0.12,
    revenueRange: { min: 50_000_000, max: 500_000_000 },
    channels: ["distribution traditionnelle", "supermarche", "e-commerce", "vente directe"],
  },
  "TECH": {
    priceRange: { min: 5000, max: 500000 },
    grossMargin: 0.65,
    cacRange: { min: 10000, max: 100000 },
    ltvRange: { min: 100000, max: 5_000_000 },
    marketingBudgetPct: 0.15,
    revenueRange: { min: 20_000_000, max: 1_000_000_000 },
    channels: ["site web", "app store", "partenaires tech", "social selling"],
  },
  "SERVICES": {
    priceRange: { min: 50000, max: 5_000_000 },
    grossMargin: 0.55,
    cacRange: { min: 20000, max: 200000 },
    ltvRange: { min: 500000, max: 10_000_000 },
    marketingBudgetPct: 0.08,
    revenueRange: { min: 30_000_000, max: 300_000_000 },
    channels: ["bouche-a-oreille", "LinkedIn", "evenements", "referral"],
  },
  "RETAIL": {
    priceRange: { min: 2000, max: 100000 },
    grossMargin: 0.40,
    cacRange: { min: 2000, max: 20000 },
    ltvRange: { min: 50000, max: 500000 },
    marketingBudgetPct: 0.10,
    revenueRange: { min: 20_000_000, max: 200_000_000 },
    channels: ["boutique physique", "marketplace", "reseaux sociaux", "e-commerce"],
  },
  "HOSPITALITY": {
    priceRange: { min: 10000, max: 500000 },
    grossMargin: 0.45,
    cacRange: { min: 5000, max: 50000 },
    ltvRange: { min: 100000, max: 2_000_000 },
    marketingBudgetPct: 0.10,
    revenueRange: { min: 50_000_000, max: 500_000_000 },
    channels: ["booking platforms", "site web", "agences de voyage", "social media"],
  },
  "EDUCATION": {
    priceRange: { min: 25000, max: 2_000_000 },
    grossMargin: 0.50,
    cacRange: { min: 10000, max: 100000 },
    ltvRange: { min: 200000, max: 5_000_000 },
    marketingBudgetPct: 0.08,
    revenueRange: { min: 10_000_000, max: 200_000_000 },
    channels: ["site web", "partenariats ecoles", "reseaux sociaux", "evenements"],
  },
  "BANQUE": {
    priceRange: { min: 0, max: 50000 }, // fees
    grossMargin: 0.60,
    cacRange: { min: 50000, max: 500000 },
    ltvRange: { min: 500000, max: 20_000_000 },
    marketingBudgetPct: 0.05,
    revenueRange: { min: 500_000_000, max: 10_000_000_000 },
    channels: ["agences", "app mobile", "partenaires", "site web"],
  },
  "MODE": {
    priceRange: { min: 5000, max: 500000 },
    grossMargin: 0.55,
    cacRange: { min: 5000, max: 50000 },
    ltvRange: { min: 50000, max: 1_000_000 },
    marketingBudgetPct: 0.15,
    revenueRange: { min: 10_000_000, max: 500_000_000 },
    channels: ["boutique", "e-commerce", "Instagram", "pop-up stores", "concept stores"],
  },
  "GAMING": {
    priceRange: { min: 0, max: 50000 },
    grossMargin: 0.70,
    cacRange: { min: 1000, max: 30000 },
    ltvRange: { min: 10000, max: 500000 },
    marketingBudgetPct: 0.20,
    revenueRange: { min: 5_000_000, max: 1_000_000_000 },
    channels: ["app store", "Steam", "communaute Discord", "Twitch", "YouTube"],
  },
  "STARTUP": {
    priceRange: { min: 5000, max: 200000 },
    grossMargin: 0.60,
    cacRange: { min: 5000, max: 100000 },
    ltvRange: { min: 50000, max: 2_000_000 },
    marketingBudgetPct: 0.18,
    revenueRange: { min: 5_000_000, max: 200_000_000 },
    channels: ["digital", "product-led growth", "content marketing", "partnerships"],
  },
};

// Positioning multipliers on base prices
const POSITIONING_MULTIPLIERS: Record<string, number> = {
  ULTRA_LUXE: 10.0,
  LUXE: 5.0,
  PREMIUM: 2.5,
  MASSTIGE: 1.5,
  MAINSTREAM: 1.0,
  VALUE: 0.6,
  LOW_COST: 0.3,
};

const BIZ_MODEL_CAC_MULTIPLIERS: Record<string, number> = {
  B2C: 1.0,
  B2B: 2.5,
  B2B2C: 1.8,
  D2C: 0.7,
  MARKETPLACE: 0.5,
};

/**
 * Returns a formatted financial context string to inject into LLM prompts.
 * This gives Mestor coherent reference points for generating financial defaults.
 */
export function getFinancialContext(
  sector?: string | null,
  country?: string | null,
  positioning?: string | null,
  businessModel?: string | null,
  declaredBudget?: number | null,
): string {
  const sectorKey = sector?.toUpperCase() ?? "";
  const benchmark = SECTOR_BENCHMARKS[sectorKey] ?? SECTOR_BENCHMARKS["SERVICES"]!;
  const countryCtx = COUNTRY_DATA[country ?? ""] ?? COUNTRY_DATA["Cameroun"]!;
  const posMultiplier = POSITIONING_MULTIPLIERS[positioning ?? "MAINSTREAM"] ?? 1.0;
  const cacMultiplier = BIZ_MODEL_CAC_MULTIPLIERS[businessModel ?? ""] ?? 1.0;
  const pm = countryCtx.priceMultiplier;

  const priceMin = Math.round(benchmark.priceRange.min * posMultiplier * pm);
  const priceMax = Math.round(benchmark.priceRange.max * posMultiplier * pm);
  const cacMin = Math.round(benchmark.cacRange.min * cacMultiplier * pm);
  const cacMax = Math.round(benchmark.cacRange.max * cacMultiplier * pm);
  const ltvMin = Math.round(benchmark.ltvRange.min * posMultiplier * pm);
  const ltvMax = Math.round(benchmark.ltvRange.max * posMultiplier * pm);
  const revMin = Math.round(benchmark.revenueRange.min * pm);
  const revMax = Math.round(benchmark.revenueRange.max * pm);
  const budgetStr = declaredBudget
    ? `Budget marketing declare: ${declaredBudget.toLocaleString("fr-FR")} ${countryCtx.currency}/an`
    : `Budget marketing estime: ${(benchmark.marketingBudgetPct * 100).toFixed(0)}% du CA soit ${Math.round(revMin * benchmark.marketingBudgetPct).toLocaleString("fr-FR")} - ${Math.round(revMax * benchmark.marketingBudgetPct).toLocaleString("fr-FR")} ${countryCtx.currency}/an`;

  return `REFERENCES FINANCIERES (${countryCtx.currency}, marche ${country ?? "Cameroun"} — ${countryCtx.marketSize}, revenu moyen ${countryCtx.avgIncome}):
- Prix produit reference secteur ${sector ?? "services"} + positionnement ${positioning ?? "mainstream"}: ${priceMin.toLocaleString("fr-FR")} - ${priceMax.toLocaleString("fr-FR")} ${countryCtx.currency}
- Marge brute moyenne secteur: ${(benchmark.grossMargin * 100).toFixed(0)}%
- CAC reference (${businessModel ?? "B2C"}): ${cacMin.toLocaleString("fr-FR")} - ${cacMax.toLocaleString("fr-FR")} ${countryCtx.currency}
- LTV reference: ${ltvMin.toLocaleString("fr-FR")} - ${ltvMax.toLocaleString("fr-FR")} ${countryCtx.currency}
- CA reference annuel: ${revMin.toLocaleString("fr-FR")} - ${revMax.toLocaleString("fr-FR")} ${countryCtx.currency}
- ${budgetStr}
- Canaux distribution reference: ${benchmark.channels.join(", ")}
- Devise: ${countryCtx.currency} (${countryCtx.currencySymbol})

UTILISE CES REFERENCES pour calibrer les prix, couts, marges, CAC, LTV et budgets. Ne mets PAS 0 — estime a partir de ces benchmarks.`;
}

/**
 * Returns the country context for a given country name.
 */
export function getCountryContext(country?: string | null): CountryContext {
  return COUNTRY_DATA[country ?? ""] ?? COUNTRY_DATA["Cameroun"]!;
}

/**
 * Async version: tries to load real benchmarks from KnowledgeEntry before falling back to hardcodes.
 * Use this when you have DB access (server-side only).
 */
export async function getFinancialContextWithDB(
  sector?: string | null,
  country?: string | null,
  positioning?: string | null,
  businessModel?: string | null,
  declaredBudget?: number | null,
): Promise<string> {
  try {
    const { db } = await import("@/lib/db");
    const entry = await db.knowledgeEntry.findFirst({
      where: {
        entryType: "SECTOR_BENCHMARK",
        sector: sector ?? undefined,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (entry?.data && typeof entry.data === "object") {
      const data = entry.data as Record<string, unknown>;
      const countryCtx = COUNTRY_DATA[country ?? ""] ?? COUNTRY_DATA["Cameroun"]!;
      const avgComposite = typeof data.avgComposite === "number" ? data.avgComposite : 0;
      const sampleSize = entry.sampleSize ?? 0;

      // Enrich the base context with real data
      const baseCtx = getFinancialContext(sector, country, positioning, businessModel, declaredBudget);
      return `${baseCtx}\n\nDONNEES MARCHE REELLES (${sampleSize} marques analysees dans le secteur ${sector ?? ""}):
- Score ADVE moyen secteur: ${avgComposite.toFixed(0)}/200
- Source: Knowledge Graph LaFusee (${countryCtx.currency})`;
    }
  } catch {
    // DB not available — fall through to hardcodes
  }

  return getFinancialContext(sector, country, positioning, businessModel, declaredBudget);
}
