/**
 * Budget Elasticity Analysis — Diminishing returns model
 *
 * Models how reach, conversions, and ROAS change at different budget levels.
 * Uses logarithmic decay: reach(budget) = alpha * ln(1 + budget / beta)
 *
 * Generates 7 points at 25%, 50%, 75%, 100%, 125%, 150%, 200% of current budget.
 * Optimal budget = where marginal ROAS crosses 1.0.
 */

import type { ElasticityAnalysis, ElasticityInput, ElasticityPoint } from "./types";
import { getCpm } from "./benchmarks/cpm-matrix";
import { getCtr } from "./benchmarks/ctr-matrix";
import { getCvr } from "./benchmarks/cvr-matrix";

// ─── Budget Levels to Evaluate ──────────────────────────────────────────────

const BUDGET_LEVELS = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50, 2.00];

// ─── Core Elasticity Function ───────────────────────────────────────────────

export function elasticityAnalysis(input: ElasticityInput): ElasticityAnalysis {
  const { currentBudget, sector, country, channels, currentRoas } = input;

  // Calculate weighted average CPM/CTR/CVR across active channels
  let totalCpm = 0;
  let totalCtr = 0;
  let totalCvr = 0;
  const activeChannels = channels.length > 0 ? channels : ["INSTAGRAM", "FACEBOOK"];

  for (const ch of activeChannels) {
    totalCpm += getCpm(ch, country, sector).value;
    totalCtr += getCtr(ch, country, sector).value;
    totalCvr += getCvr(ch, country, sector).value;
  }

  const avgCpm = totalCpm / activeChannels.length;
  const avgCtr = totalCtr / activeChannels.length;
  const avgCvr = totalCvr / activeChannels.length;

  // Logarithmic model parameters
  // alpha = max reach capacity, beta = budget at half capacity
  const beta = currentBudget * 2; // Half-capacity at 2x current budget
  const currentReach = avgCpm > 0 ? (currentBudget / avgCpm) * 1000 : 0;
  const alpha = currentReach > 0 ? currentReach / Math.log(1 + currentBudget / beta) : currentBudget;

  // Estimated revenue per conversion (derived from ROAS or default)
  const estimatedRoas = currentRoas ?? 2.5;
  const revenuePerConversion = currentBudget > 0 && avgCtr > 0 && avgCvr > 0
    ? (estimatedRoas * currentBudget) / (currentReach * avgCtr * avgCvr)
    : 5000; // Default

  // Generate points
  const points: ElasticityPoint[] = [];
  let optimalBudget = currentBudget;
  let diminishingThreshold = currentBudget;
  let prevRevenue = 0;

  for (const pct of BUDGET_LEVELS) {
    const budget = Math.round(currentBudget * pct);

    // Reach with logarithmic diminishing returns
    const reach = Math.round(alpha * Math.log(1 + budget / beta));
    const clicks = Math.round(reach * avgCtr);
    const conversions = Math.round(clicks * avgCvr);
    const revenue = Math.round(conversions * revenuePerConversion);
    const roas = budget > 0 ? Math.round((revenue / budget) * 100) / 100 : 0;

    // Marginal ROAS: extra revenue from extra spend
    const prevPoint = points[points.length - 1];
    const marginalRoas = prevPoint && budget > prevPoint.budgetLevel
      ? Math.round(((revenue - prevPoint.expectedRevenue) / (budget - prevPoint.budgetLevel)) * 100) / 100
      : roas;

    // Track optimal (where marginal ROAS crosses 1.0)
    if (marginalRoas >= 1.0) {
      optimalBudget = budget;
    }

    // Track diminishing returns threshold (where marginal ROAS < overall ROAS * 0.5)
    if (prevPoint && marginalRoas < roas * 0.5 && diminishingThreshold === currentBudget) {
      diminishingThreshold = budget;
    }

    points.push({
      budgetLevel: budget,
      budgetPct: pct,
      expectedReach: reach,
      expectedConversions: conversions,
      expectedRevenue: revenue,
      expectedRoas: roas,
      marginalRoas,
    });

    prevRevenue = revenue;
  }

  // Current efficiency: how close to optimal is the current budget
  const currentPoint = points.find(p => p.budgetPct === 1.0);
  const optimalPoint = points.reduce((best, p) => p.expectedRoas > best.expectedRoas ? p : best, points[0]!);
  const currentEfficiency = optimalPoint.expectedRoas > 0
    ? Math.min(1.0, (currentPoint?.expectedRoas ?? 0) / optimalPoint.expectedRoas)
    : 0;

  return {
    points,
    optimalBudget,
    diminishingReturnsThreshold: diminishingThreshold,
    currentEfficiency: Math.round(currentEfficiency * 100) / 100,
  };
}
