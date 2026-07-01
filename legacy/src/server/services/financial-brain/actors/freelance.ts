/**
 * Freelance Engine — Pricing, capacity, and profitability for solo operators
 */

import type { FreelanceInput, FreelanceOutput } from "../types";
import { validateFinancials } from "../validate-financials";
import { getFreelanceDayRate } from "../benchmarks/fee-benchmarks";

const SOCIAL_CHARGES_RATE = 0.30; // ~30% charges sociales
const TIER_MARGIN: Record<string, number> = {
  APPRENTI: 0.15,
  COMPAGNON: 0.25,
  MAITRE: 0.40,
  ASSOCIE: 0.50,
};

/** Typical project rate ranges by deliverable type (XAF, Cameroon baseline) */
const PROJECT_RATES: Record<string, { min: number; max: number }> = {
  BRAND_IDENTITY: { min: 500_000, max: 3_000_000 },
  SOCIAL_CAMPAIGN: { min: 200_000, max: 1_500_000 },
  WEBSITE_DESIGN: { min: 300_000, max: 2_000_000 },
  VIDEO_PRODUCTION: { min: 200_000, max: 5_000_000 },
  STRATEGY_DOCUMENT: { min: 500_000, max: 5_000_000 },
  COPYWRITING_CAMPAIGN: { min: 150_000, max: 800_000 },
  PHOTOGRAPHY_SESSION: { min: 100_000, max: 1_000_000 },
  MEDIA_PLAN: { min: 200_000, max: 1_500_000 },
};

export function analyzeFreelance(input: FreelanceInput): FreelanceOutput {
  const margin = TIER_MARGIN[input.guildTier] ?? 0.25;

  // Annual cost of doing business
  const annualFixed = input.monthlyFixedCosts * 12;
  const annualIncome = input.targetMonthlyIncome * 12;
  const annualWithCharges = annualIncome * (1 + SOCIAL_CHARGES_RATE);
  const annualCODB = annualFixed + annualWithCharges;

  // Billable hours
  const billableHoursPerMonth = Math.round(input.availableHoursPerMonth * input.billableRatio);
  const billableHoursPerYear = billableHoursPerMonth * 12;

  // Pricing
  const costRate = billableHoursPerYear > 0 ? Math.round(annualCODB / billableHoursPerYear) : 0;
  const sellRate = Math.round(costRate * (1 + margin));
  const dayRate = sellRate * 8;

  // Benchmark comparison
  const benchmarkDayRate = getFreelanceDayRate(input.country, input.specialty, input.guildTier);

  // Project rate guide (adjusted by tier)
  const tierMult = 1 + margin;
  const projectRateGuide: Record<string, { min: number; max: number }> = {};
  for (const [key, range] of Object.entries(PROJECT_RATES)) {
    projectRateGuide[key] = {
      min: Math.round(range.min * tierMult),
      max: Math.round(range.max * tierMult),
    };
  }

  // Capacity
  const avgProjectHours = 40; // ~1 week
  const maxClients = Math.floor(billableHoursPerMonth / avgProjectHours);

  // Profitability
  const annualRevenue = dayRate * billableHoursPerYear / 8;
  const annualCosts = annualCODB;
  const annualProfit = annualRevenue - annualCosts;
  const marginPct = annualRevenue > 0 ? Math.round((annualProfit / annualRevenue) * 100) / 100 : 0;

  // Validation
  const validation = validateFinancials({
    actorType: "FREELANCE",
    country: input.country,
    dayRate,
    costRate: costRate * 8,
    billableRatio: input.billableRatio,
    utilization: input.billableRatio,
    margeNette: marginPct,
  });

  return {
    pricing: { costRate, sellRate, dayRate, projectRateGuide },
    capacity: { billableHoursPerMonth, billableHoursPerYear, maxClients },
    profitability: { annualRevenue, annualCosts, annualProfit, marginPct },
    validation,
  };
}
