/**
 * Budget Recommendation Engine — 5-approach blended model
 *
 * Blends 5 independent approaches to recommend a marketing budget:
 *   1. Revenue Percentage (30%) — sector benchmark × revenue × growth factor
 *   2. CAC Target (25%) — target customers × target CAC × overhead
 *   3. Market Share (20%) — SOM target × avg market CAC × competitive intensity
 *   4. Competitive Parity (15%) — sector avg spend × positioning factor
 *   5. Objective-Based (10%) — channel CPM × required reach for objectives
 *
 * All calculations are 100% deterministic. Zero LLM dependency.
 */

import type {
  BudgetRecommendation,
  BudgetRecommendationInput,
  CampaignMixRecommendation,
  RecommendationApproach,
  ValidationResult,
} from "./types";
import { getRevenueRatio, getRecommendedBudgetFromRevenue } from "./benchmarks/revenue-ratios";
import { getCompetitiveIntensity } from "./benchmarks/competitive-intensity";
import { getCpm } from "./benchmarks/cpm-matrix";
import { getCtr } from "./benchmarks/ctr-matrix";
import { getBudgetTier, getCountryCurrency } from "./benchmarks/purchasing-power";
import { getCampaignMix, getAlwaysOnSubsplit, getSeasonalCalendar } from "./campaign-profiles";
import { generateRecommendedTaxonomy } from "./budget-taxonomy";

// ─── Financial Engine Data (reuse existing sector benchmarks) ───────────────

const SECTOR_BENCHMARKS: Record<string, { cacRange: { min: number; max: number }; revenueRange: { min: number; max: number }; marketingBudgetPct: number }> = {
  FMCG:       { cacRange: { min: 500, max: 5_000 },    revenueRange: { min: 50_000_000, max: 500_000_000 },    marketingBudgetPct: 0.12 },
  TECH:       { cacRange: { min: 10_000, max: 100_000 }, revenueRange: { min: 20_000_000, max: 1_000_000_000 }, marketingBudgetPct: 0.15 },
  SERVICES:   { cacRange: { min: 20_000, max: 200_000 }, revenueRange: { min: 30_000_000, max: 300_000_000 },   marketingBudgetPct: 0.08 },
  RETAIL:     { cacRange: { min: 2_000, max: 20_000 },   revenueRange: { min: 20_000_000, max: 200_000_000 },   marketingBudgetPct: 0.10 },
  HOSPITALITY: { cacRange: { min: 5_000, max: 50_000 },  revenueRange: { min: 50_000_000, max: 500_000_000 },   marketingBudgetPct: 0.10 },
  EDUCATION:  { cacRange: { min: 10_000, max: 100_000 }, revenueRange: { min: 10_000_000, max: 200_000_000 },   marketingBudgetPct: 0.08 },
  BANQUE:     { cacRange: { min: 50_000, max: 500_000 }, revenueRange: { min: 500_000_000, max: 10_000_000_000 }, marketingBudgetPct: 0.05 },
  MODE:       { cacRange: { min: 5_000, max: 50_000 },   revenueRange: { min: 10_000_000, max: 500_000_000 },   marketingBudgetPct: 0.15 },
  GAMING:     { cacRange: { min: 1_000, max: 30_000 },   revenueRange: { min: 5_000_000, max: 1_000_000_000 },  marketingBudgetPct: 0.20 },
  STARTUP:    { cacRange: { min: 5_000, max: 100_000 },  revenueRange: { min: 5_000_000, max: 200_000_000 },    marketingBudgetPct: 0.18 },
};

const POSITIONING_FACTOR: Record<string, number> = {
  ULTRA_LUXE: 2.0, LUXE: 1.5, PREMIUM: 1.3, MASSTIGE: 1.1, MAINSTREAM: 1.0, VALUE: 0.7, LOW_COST: 0.5,
};

const BIZ_MODEL_CAC_MULT: Record<string, number> = {
  B2C: 1.0, B2B: 2.5, B2B2C: 1.8, D2C: 0.7, MARKETPLACE: 0.5,
};

const COUNTRY_MULT: Record<string, number> = {
  Cameroun: 1.0, "Cote d'Ivoire": 1.05, Senegal: 0.95, RDC: 0.6, Gabon: 2.0,
  Congo: 1.1, Nigeria: 0.8, Ghana: 0.9, France: 8.0, USA: 10.0, Maroc: 1.5, Tunisie: 1.3,
  "Afrique du Sud": 3.0,
};

// ─── Individual Approach Calculators ────────────────────────────────────────

function revenuePercentageApproach(input: BudgetRecommendationInput): { amount: number; reasoning: string } | null {
  const revenue = input.revenueTarget ?? input.estimatedRevenue ?? input.declaredRevenue;
  if (!revenue || revenue <= 0) return null;

  const result = getRecommendedBudgetFromRevenue(
    revenue,
    input.sector,
    input.companyStage ?? "GROWTH",
    input.growthAmbition ?? 0.5,
  );
  return {
    amount: result.budget,
    reasoning: `${(result.pct * 100).toFixed(1)}% du CA (${input.sector} / ${input.companyStage ?? "GROWTH"})`,
  };
}

function cacTargetApproach(input: BudgetRecommendationInput): { amount: number; reasoning: string } | null {
  if (!input.targetCustomers || input.targetCustomers <= 0) return null;

  const sectorData = SECTOR_BENCHMARKS[input.sector.toUpperCase()] ?? SECTOR_BENCHMARKS.SERVICES!;
  const countryMult = COUNTRY_MULT[input.country] ?? 1.0;
  const bizMult = BIZ_MODEL_CAC_MULT[input.businessModel.toUpperCase()] ?? 1.0;

  const cac = input.targetCac ?? Math.round(((sectorData.cacRange.min + sectorData.cacRange.max) / 2) * countryMult * bizMult);
  const overhead = 1.25; // 25% for production + agency
  const amount = Math.round(input.targetCustomers * cac * overhead);

  return {
    amount,
    reasoning: `${input.targetCustomers} clients × ${cac.toLocaleString()} CAC × 1.25 overhead`,
  };
}

function marketShareApproach(input: BudgetRecommendationInput): { amount: number; reasoning: string } | null {
  if (!input.somTarget || input.somTarget <= 0) return null;

  const sectorData = SECTOR_BENCHMARKS[input.sector.toUpperCase()] ?? SECTOR_BENCHMARKS.SERVICES!;
  const countryMult = COUNTRY_MULT[input.country] ?? 1.0;
  const avgCac = ((sectorData.cacRange.min + sectorData.cacRange.max) / 2) * countryMult;
  const intensity = getCompetitiveIntensity(input.sector, input.country).value;

  const amount = Math.round(input.somTarget * avgCac * intensity);
  return {
    amount,
    reasoning: `SOM ${input.somTarget} × CAC moyen ${Math.round(avgCac).toLocaleString()} × intensite ${intensity}`,
  };
}

function competitiveParityApproach(input: BudgetRecommendationInput): { amount: number; reasoning: string } | null {
  const sectorData = SECTOR_BENCHMARKS[input.sector.toUpperCase()] ?? SECTOR_BENCHMARKS.SERVICES!;
  const countryMult = COUNTRY_MULT[input.country] ?? 1.0;
  const posFactor = POSITIONING_FACTOR[input.positioning.toUpperCase()] ?? 1.0;

  const avgRevenue = (sectorData.revenueRange.min + sectorData.revenueRange.max) / 2;
  const avgSpend = avgRevenue * sectorData.marketingBudgetPct * countryMult;
  const amount = Math.round(avgSpend * posFactor * 0.5); // Target 50% of market leader spend

  return {
    amount,
    reasoning: `Parite concurrentielle: 50% du spend moyen secteur × positionnement ${input.positioning}`,
  };
}

function objectiveBasedApproach(input: BudgetRecommendationInput): { amount: number; reasoning: string } | null {
  if (!input.channels || input.channels.length === 0) return null;
  if (!input.targetReach || input.targetReach <= 0) return null;

  let totalCost = 0;
  const reachPerChannel = Math.round(input.targetReach / input.channels.length);

  for (const channel of input.channels) {
    const cpm = getCpm(channel, input.country, input.sector).value;
    if (cpm > 0) {
      totalCost += (reachPerChannel / 1000) * cpm;
    }
  }

  // Add non-working overhead (production + talent + agency)
  const overhead = 1.40;
  const amount = Math.round(totalCost * overhead);

  return {
    amount,
    reasoning: `Reach ${input.targetReach.toLocaleString()} via ${input.channels.length} canaux × 1.4 overhead`,
  };
}

// ─── Main Recommendation Function ───────────────────────────────────────────

const APPROACH_WEIGHTS: Record<RecommendationApproach, number> = {
  REVENUE_PERCENTAGE: 0.30,
  CAC_TARGET: 0.25,
  MARKET_SHARE: 0.20,
  COMPETITIVE_PARITY: 0.15,
  OBJECTIVE_BASED: 0.10,
};

export async function recommendBudget(input: BudgetRecommendationInput): Promise<BudgetRecommendation> {
  const approaches: Array<{ approach: RecommendationApproach; amount: number; weight: number; reasoning: string }> = [];

  // Run each approach
  const rev = revenuePercentageApproach(input);
  if (rev) approaches.push({ approach: "REVENUE_PERCENTAGE", amount: rev.amount, weight: APPROACH_WEIGHTS.REVENUE_PERCENTAGE, reasoning: rev.reasoning });

  const cac = cacTargetApproach(input);
  if (cac) approaches.push({ approach: "CAC_TARGET", amount: cac.amount, weight: APPROACH_WEIGHTS.CAC_TARGET, reasoning: cac.reasoning });

  const ms = marketShareApproach(input);
  if (ms) approaches.push({ approach: "MARKET_SHARE", amount: ms.amount, weight: APPROACH_WEIGHTS.MARKET_SHARE, reasoning: ms.reasoning });

  const cp = competitiveParityApproach(input);
  if (cp) approaches.push({ approach: "COMPETITIVE_PARITY", amount: cp.amount, weight: APPROACH_WEIGHTS.COMPETITIVE_PARITY, reasoning: cp.reasoning });

  const ob = objectiveBasedApproach(input);
  if (ob) approaches.push({ approach: "OBJECTIVE_BASED", amount: ob.amount, weight: APPROACH_WEIGHTS.OBJECTIVE_BASED, reasoning: ob.reasoning });

  // Normalize weights
  const totalWeight = approaches.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight > 0) {
    for (const a of approaches) {
      a.weight = a.weight / totalWeight;
    }
  }

  // Weighted blend
  const recommended = Math.round(approaches.reduce((sum, a) => sum + a.amount * a.weight, 0));

  // Confidence = based on how many approaches we could run
  const confidence = Math.min(1.0, approaches.length / 4);

  // Currency (DB-backed; throws if unknown country)
  const { currency } = await getCountryCurrency(input.country);

  // Budget tier + taxonomy
  const tierInfo = await getBudgetTier(recommended, input.country);
  const taxonomy = generateRecommendedTaxonomy(
    recommended,
    currency,
    tierInfo.tier,
    input.companyStage ?? "GROWTH",
  );

  // Campaign mix
  const campaignMix = buildCampaignMix(input.companyStage ?? "GROWTH", input.country, recommended);

  // Category breakdown (from taxonomy operational split)
  const byCategory = {
    workingMedia: taxonomy.byWorkingType.WORKING,
    production: taxonomy.byOperationalCategory.PRODUCTION,
    talent: taxonomy.byOperationalCategory.TALENT,
    agencyFee: taxonomy.byOperationalCategory.AGENCY_FEE,
    technology: taxonomy.byOperationalCategory.TECHNOLOGY,
    contingency: taxonomy.byOperationalCategory.CONTINGENCY,
  };

  // Warnings
  const warnings: ValidationResult[] = [];
  if (approaches.length < 2) {
    warnings.push({
      ruleId: "REC-W01",
      severity: "WARN",
      field: "approaches",
      message: "Recommandation basee sur moins de 2 approches — confiance limitee",
      currentValue: approaches.length,
      suggestion: "Fournir plus de donnees (CA, clients cibles, objectifs) pour affiner la reco",
    });
  }

  return {
    recommended,
    range: { min: Math.round(recommended * 0.70), max: Math.round(recommended * 1.40) },
    currency,
    confidence,
    breakdown: { byApproach: approaches, byCategory },
    campaignMix,
    taxonomy,
    warnings,
  };
}

// ─── Campaign Mix Builder ───────────────────────────────────────────────────

function buildCampaignMix(companyStage: string, country: string, totalBudget: number): CampaignMixRecommendation {
  const mix = getCampaignMix(companyStage);
  const subsplit = getAlwaysOnSubsplit(companyStage);
  const calendar = getSeasonalCalendar(country);

  // Distribute punctual budget across seasonal events
  const punctualBudget = totalBudget * mix.punctual;
  const totalWeight = calendar.reduce((sum, ev) => sum + ev.budgetWeight, 0);

  const punctualCalendar = calendar.map(ev => ({
    month: ev.month,
    event: ev.event,
    budgetPct: totalWeight > 0 ? (ev.budgetWeight / totalWeight) * mix.punctual : 0,
    campaignType: ev.campaignType,
  }));

  return {
    alwaysOnPct: mix.alwaysOn,
    punctualPct: mix.punctual,
    contingencyPct: mix.contingency,
    alwaysOnSplit: subsplit,
    punctualCalendar,
  };
}
