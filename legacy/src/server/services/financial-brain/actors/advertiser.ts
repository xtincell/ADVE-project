/**
 * Advertiser Engine — Full financial analysis for brands/advertisers
 */

import type { AdvertiserInput, AdvertiserOutput } from "../types";
import { recommendBudget } from "../recommend-budget";
import { validateFinancials } from "../validate-financials";
import { projectMultiYear } from "../project-multi-year";
import { scenarioModel } from "../scenario-model";
import { getRevenueRatio } from "../benchmarks/revenue-ratios";
import { getBudgetTier, getCountryCurrency } from "../benchmarks/purchasing-power";
import { generateRecommendedTaxonomy } from "../budget-taxonomy";

// Sector benchmarks (mirror from financial-engine for deterministic CAC/LTV estimation)
const SECTOR_DATA: Record<string, { cacMid: number; ltvMid: number; grossMargin: number }> = {
  FMCG:       { cacMid: 2750,   ltvMid: 82500,   grossMargin: 0.35 },
  TECH:       { cacMid: 55000,  ltvMid: 2550000, grossMargin: 0.65 },
  SERVICES:   { cacMid: 110000, ltvMid: 5250000, grossMargin: 0.55 },
  RETAIL:     { cacMid: 11000,  ltvMid: 275000,  grossMargin: 0.40 },
  HOSPITALITY: { cacMid: 27500, ltvMid: 1050000, grossMargin: 0.45 },
  EDUCATION:  { cacMid: 55000,  ltvMid: 2600000, grossMargin: 0.50 },
  BANQUE:     { cacMid: 275000, ltvMid: 10250000, grossMargin: 0.60 },
  MODE:       { cacMid: 27500,  ltvMid: 525000,  grossMargin: 0.55 },
  GAMING:     { cacMid: 15500,  ltvMid: 255000,  grossMargin: 0.70 },
  STARTUP:    { cacMid: 52500,  ltvMid: 1025000, grossMargin: 0.60 },
};

const COUNTRY_MULT: Record<string, number> = {
  Cameroun: 1.0, "Cote d'Ivoire": 1.05, Senegal: 0.95, RDC: 0.6, Gabon: 2.0,
  Congo: 1.1, Nigeria: 0.8, Ghana: 0.9, France: 8.0, USA: 10.0, Maroc: 1.5, Tunisie: 1.3,
  "Afrique du Sud": 3.0,
};

const BIZ_MODEL_CAC: Record<string, number> = {
  B2C: 1.0, B2B: 2.5, B2B2C: 1.8, D2C: 0.7, MARKETPLACE: 0.5,
};

const POS_MULT: Record<string, number> = {
  ULTRA_LUXE: 10.0, LUXE: 5.0, PREMIUM: 2.5, MASSTIGE: 1.5, MAINSTREAM: 1.0, VALUE: 0.6, LOW_COST: 0.3,
};

export async function analyzeAdvertiser(input: AdvertiserInput): Promise<AdvertiserOutput> {
  const sector = input.sector.toUpperCase();
  const countryMult = COUNTRY_MULT[input.country] ?? 1.0;
  const bizMult = BIZ_MODEL_CAC[input.businessModel.toUpperCase()] ?? 1.0;
  const posMult = POS_MULT[input.positioning.toUpperCase()] ?? 1.0;
  const sectorData = SECTOR_DATA[sector] ?? SECTOR_DATA.SERVICES!;

  // Deterministic unit economics
  const cac = Math.round(sectorData.cacMid * countryMult * bizMult);
  const ltv = Math.round(sectorData.ltvMid * countryMult * posMult);
  const ltvCacRatio = cac > 0 ? Math.round((ltv / cac) * 100) / 100 : 0;
  const margeNette = Math.round(sectorData.grossMargin * 0.65 * 100) / 100;
  const roiEstime = cac > 0 ? Math.round(((ltv - cac) / cac) * 100) : 0;
  const monthlyRevPerCustomer = input.productPrice ? input.productPrice / 3 : ltv / 24;
  const paybackPeriod = monthlyRevPerCustomer > 0 && margeNette > 0
    ? Math.round(cac / (monthlyRevPerCustomer * margeNette))
    : 24;

  // Revenue estimate
  const ratio = getRevenueRatio(sector, input.companyStage);
  const revenueTarget = input.revenueTarget ?? input.declaredRevenue ?? Math.round(sectorData.ltvMid * countryMult * 100);

  // Budget recommendation
  const budgetReco = await recommendBudget({
    sector: input.sector,
    country: input.country,
    positioning: input.positioning,
    businessModel: input.businessModel,
    companyStage: input.companyStage,
    estimatedRevenue: revenueTarget,
    revenueTarget,
    productPrice: input.productPrice,
    ltv,
    channels: input.channels,
    growthAmbition: 0.5,
  });

  const budgetCom = input.declaredBudget ?? budgetReco.recommended;
  const caVise = revenueTarget;

  // Validation
  const validation = validateFinancials({
    actorType: "ADVERTISER",
    sector: input.sector,
    country: input.country,
    positioning: input.positioning,
    businessModel: input.businessModel,
    companyStage: input.companyStage,
    cac, ltv, ltvCacRatio,
    budgetCom, caVise,
    margeNette, roiEstime, paybackPeriod,
    productPrice: input.productPrice,
  });

  // Multi-year + scenarios
  const multiYear = projectMultiYear({
    year1Budget: budgetCom,
    year1Revenue: caVise,
    sector: input.sector,
    country: input.country,
    positioning: input.positioning,
    companyStage: input.companyStage,
    growthAmbition: 0.5,
    currentCustomers: input.currentCustomers,
    churnRate: input.churnRate,
    cac, ltv,
    productPrice: input.productPrice,
  });

  const scenarios = scenarioModel({
    year1Budget: budgetCom,
    year1Revenue: caVise,
    sector: input.sector,
    country: input.country,
    positioning: input.positioning,
    companyStage: input.companyStage,
    growthAmbition: 0.5,
    currentCustomers: input.currentCustomers,
    churnRate: input.churnRate,
    cac, ltv,
    productPrice: input.productPrice,
  });

  return {
    recommendedBudget: budgetReco,
    unitEconomics: { cac, ltv, ltvCacRatio, margeNette, roiEstime, paybackPeriod, budgetCom, caVise },
    campaignMix: budgetReco.campaignMix,
    taxonomy: budgetReco.taxonomy,
    multiYear,
    scenarios,
    validation,
  };
}
