/**
 * Scenario Modeling — Optimistic / Realistic / Pessimistic projections
 *
 * Generates 3 scenarios with probability-weighted expected values,
 * plus sensitivity analysis ranking.
 */

import type { MultiYearInput, Scenario, ScenarioAnalysis, ScenarioName } from "./types";
import { projectMultiYear } from "./project-multi-year";

// ─── Scenario Deviation Parameters ──────────────────────────────────────────

const SCENARIO_PARAMS: Record<ScenarioName, {
  probability: number;
  cacMultiplier: number;
  revenueMultiplier: number;
  churnMultiplier: number;
  growthMultiplier: number;
}> = {
  OPTIMISTIC: {
    probability: 0.20,
    cacMultiplier: 0.80,       // CAC -20%
    revenueMultiplier: 1.30,   // Revenue +30%
    churnMultiplier: 0.75,     // Churn -25%
    growthMultiplier: 1.25,    // Growth +25%
  },
  REALISTIC: {
    probability: 0.60,
    cacMultiplier: 1.00,
    revenueMultiplier: 1.00,
    churnMultiplier: 1.00,
    growthMultiplier: 1.00,
  },
  PESSIMISTIC: {
    probability: 0.20,
    cacMultiplier: 1.40,       // CAC +40%
    revenueMultiplier: 0.75,   // Revenue -25%
    churnMultiplier: 1.25,     // Churn +25%
    growthMultiplier: 0.70,    // Growth -30%
  },
};

// ─── Scenario Generator ─────────────────────────────────────────────────────

export function scenarioModel(baseInput: MultiYearInput): ScenarioAnalysis {
  const scenarios: Scenario[] = [];

  for (const [name, params] of Object.entries(SCENARIO_PARAMS) as Array<[ScenarioName, typeof SCENARIO_PARAMS.REALISTIC]>) {
    const adjustedInput: MultiYearInput = {
      ...baseInput,
      year1Revenue: Math.round(baseInput.year1Revenue * params.revenueMultiplier),
      cac: baseInput.cac ? Math.round(baseInput.cac * params.cacMultiplier) : undefined,
      ltv: baseInput.ltv ? Math.round(baseInput.ltv * (2 - params.cacMultiplier)) : undefined, // Inverse of CAC deviation
      churnRate: (baseInput.churnRate ?? 0.15) * params.churnMultiplier,
      growthAmbition: Math.min(1.0, baseInput.growthAmbition * params.growthMultiplier),
    };

    const projection = projectMultiYear(adjustedInput);

    const deviations = name === "REALISTIC" ? [] : [
      { parameter: "CAC", value: params.cacMultiplier, deviation: `${((params.cacMultiplier - 1) * 100).toFixed(0)}% vs realiste` },
      { parameter: "Revenue", value: params.revenueMultiplier, deviation: `${((params.revenueMultiplier - 1) * 100).toFixed(0)}% vs realiste` },
      { parameter: "Churn", value: params.churnMultiplier, deviation: `${((params.churnMultiplier - 1) * 100).toFixed(0)}% vs realiste` },
      { parameter: "Croissance", value: params.growthMultiplier, deviation: `${((params.growthMultiplier - 1) * 100).toFixed(0)}% vs realiste` },
    ];

    scenarios.push({
      name,
      probability: params.probability,
      projection,
      deviations,
      expectedValue: Math.round(projection.cumulativeRevenue * params.probability),
    });
  }

  const weightedExpectedValue = scenarios.reduce((sum, s) => sum + s.expectedValue, 0);

  // Risk-adjusted budget = weighted average of recommended budgets per scenario
  const riskAdjustedBudget = Math.round(
    scenarios.reduce((sum, s) => sum + s.projection.years[0]!.budget * s.probability, 0),
  );

  // Sensitivity analysis — perturb each parameter +/-10% and measure impact
  const sensitivityRanking = computeSensitivity(baseInput);

  return {
    scenarios,
    weightedExpectedValue,
    riskAdjustedBudget,
    sensitivityRanking,
  };
}

// ─── Sensitivity Analysis ───────────────────────────────────────────────────

function computeSensitivity(baseInput: MultiYearInput): Array<{ parameter: string; impact: number }> {
  const baseProjection = projectMultiYear(baseInput);
  const baseRevenue = baseProjection.cumulativeRevenue;
  const perturbation = 0.10; // +/- 10%

  const parameters = [
    { name: "Budget", mutate: (i: MultiYearInput, mult: number): MultiYearInput => ({ ...i, year1Budget: Math.round(i.year1Budget * mult) }) },
    { name: "CAC", mutate: (i: MultiYearInput, mult: number): MultiYearInput => ({ ...i, cac: i.cac ? Math.round(i.cac * mult) : undefined }) },
    { name: "Revenue", mutate: (i: MultiYearInput, mult: number): MultiYearInput => ({ ...i, year1Revenue: Math.round(i.year1Revenue * mult) }) },
    { name: "Churn", mutate: (i: MultiYearInput, mult: number): MultiYearInput => ({ ...i, churnRate: (i.churnRate ?? 0.15) * mult }) },
    { name: "Prix produit", mutate: (i: MultiYearInput, mult: number): MultiYearInput => ({ ...i, productPrice: i.productPrice ? Math.round(i.productPrice * mult) : undefined }) },
  ];

  const results: Array<{ parameter: string; impact: number }> = [];

  for (const param of parameters) {
    const upInput = param.mutate(baseInput, 1 + perturbation);
    const downInput = param.mutate(baseInput, 1 - perturbation);

    const upRevenue = projectMultiYear(upInput).cumulativeRevenue;
    const downRevenue = projectMultiYear(downInput).cumulativeRevenue;

    const impact = baseRevenue > 0
      ? Math.abs((upRevenue - downRevenue) / (2 * perturbation * baseRevenue))
      : 0;

    results.push({ parameter: param.name, impact: Math.round(impact * 100) / 100 });
  }

  // Sort by impact descending
  return results.sort((a, b) => b.impact - a.impact);
}
