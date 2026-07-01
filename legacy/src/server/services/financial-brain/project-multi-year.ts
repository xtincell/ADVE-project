/**
 * Multi-Year Projection — S-curve adoption model with CAC learning curve
 *
 * Projects 3 years of budget, revenue, customers, CAC, LTV evolution.
 * Uses logistic S-curve for adoption and Wright's Law for CAC learning.
 */

import type { MultiYearInput, MultiYearProjection, YearProjection } from "./types";
import { getRevenueRatio } from "./benchmarks/revenue-ratios";

// ─── S-Curve Parameters ─────────────────────────────────────────────────────

const GROWTH_RATE_K: Record<string, number> = {
  STARTUP: 0.8,   // Slower initial adoption
  GROWTH: 1.2,    // Fastest growth rate
  MATURITY: 0.4,  // Plateauing
  DECLINE: 0.2,   // Very slow
};

const INFLECTION_POINT: Record<string, number> = {
  STARTUP: 1.5,   // Inflection at year 1.5
  GROWTH: 0.5,    // Already past inflection
  MATURITY: -1.0, // Well past inflection (on plateau)
  DECLINE: -2.0,  // Deep into plateau
};

// Wright's Law exponent for CAC learning curve
const WRIGHT_EXPONENT = -0.15; // CAC decreases ~10% for each doubling of cumulative customers

// ─── Core Projection ────────────────────────────────────────────────────────

export function projectMultiYear(input: MultiYearInput): MultiYearProjection {
  const years: YearProjection[] = [];
  const k = GROWTH_RATE_K[input.companyStage] ?? GROWTH_RATE_K.GROWTH!;
  const t0 = INFLECTION_POINT[input.companyStage] ?? INFLECTION_POINT.GROWTH!;
  const ratio = getRevenueRatio(input.sector, input.companyStage);

  // Base values
  const baseCac = input.cac ?? 5000;
  const baseLtv = input.ltv ?? baseCac * 4;
  const baseCustomers = input.currentCustomers ?? Math.round(input.year1Revenue / (input.productPrice ?? baseLtv * 0.3));
  const churnRate = input.churnRate ?? 0.15;
  const marketPotential = baseCustomers * (input.companyStage === "STARTUP" ? 20 : input.companyStage === "GROWTH" ? 5 : 2);

  let cumulativeCustomers = baseCustomers;
  let cumulativeInvestment = 0;
  let cumulativeRevenue = 0;
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= 3; year++) {
    // S-curve adoption
    const t = year;
    const sCurvePos = 1 / (1 + Math.exp(-k * (t - t0)));
    const targetCustomers = Math.round(marketPotential * sCurvePos);
    const newCustomers = Math.max(0, targetCustomers - cumulativeCustomers + Math.round(cumulativeCustomers * churnRate));

    // Wright's Law: CAC decreases with cumulative experience
    const cacDecay = Math.pow(Math.max(1, cumulativeCustomers), WRIGHT_EXPONENT);
    const yearCac = Math.round(baseCac * cacDecay / Math.pow(1, WRIGHT_EXPONENT)); // Normalize

    // LTV improves with retention improvement
    const retentionImprovement = 1 + 0.10 * (year - 1);
    const yearLtv = Math.round(baseLtv * retentionImprovement);

    // Budget evolution
    const growthFactor = year === 1 ? 1.0
      : year === 2 ? 1 + ratio.marketingPct + input.growthAmbition * 0.3
      : 1 + ratio.marketingPct * 0.5; // Year 3: slower growth
    const yearBudget = Math.round(
      year === 1 ? input.year1Budget : years[year - 2]!.budget * growthFactor,
    );

    // Revenue
    cumulativeCustomers += newCustomers;
    const activeCustomers = Math.round(cumulativeCustomers * (1 - churnRate));
    const yearRevenue = Math.round(
      year === 1 ? input.year1Revenue
      : activeCustomers * (input.productPrice ?? yearLtv * 0.3),
    );

    // ROAS
    const roas = yearBudget > 0 ? yearRevenue / yearBudget : 0;

    // Growth rate
    const growthRate = year === 1 ? 0 : (yearRevenue - years[year - 2]!.revenue) / years[year - 2]!.revenue;

    // Market share
    const marketShare = marketPotential > 0 ? cumulativeCustomers / marketPotential : 0;

    cumulativeInvestment += yearBudget;
    cumulativeRevenue += yearRevenue;

    // Break-even check
    if (!breakEvenYear && cumulativeRevenue > cumulativeInvestment) {
      breakEvenYear = year;
    }

    years.push({
      year,
      budget: yearBudget,
      revenue: yearRevenue,
      customers: activeCustomers,
      cac: yearCac,
      ltv: yearLtv,
      marketShare: Math.round(marketShare * 1000) / 1000,
      roas: Math.round(roas * 100) / 100,
      growthRate: Math.round(growthRate * 1000) / 1000,
      sCurvePosition: Math.round(sCurvePos * 1000) / 1000,
    });
  }

  const cumulativeRoi = cumulativeInvestment > 0
    ? Math.round(((cumulativeRevenue - cumulativeInvestment) / cumulativeInvestment) * 100) / 100
    : 0;

  return {
    years,
    cumulativeInvestment,
    cumulativeRevenue,
    cumulativeRoi,
    breakEvenYear,
    assumptions: [
      `Courbe S (k=${k}, t0=${t0})`,
      `Taux de churn: ${(churnRate * 100).toFixed(0)}%`,
      `Potentiel marche: ${marketPotential} clients`,
      `Wright's Law: CAC decroit de ~10% par doublement de clients`,
      `LTV: +10%/an via amelioration retention`,
    ],
  };
}
