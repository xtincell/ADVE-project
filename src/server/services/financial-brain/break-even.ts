/**
 * Break-Even Analysis — Standard break-even + monthly break-even
 */

import type { BreakEvenAnalysis, BreakEvenInput } from "./types";

export function calculateBreakeven(input: BreakEvenInput): BreakEvenAnalysis {
  const { fixedCosts, variableCostPerUnit, pricePerUnit, monthlyVolume } = input;
  const issues = Object.entries({ fixedCosts, variableCostPerUnit, pricePerUnit })
    .filter(([, value]) => typeof value !== "number" || !Number.isFinite(value) || value < 0)
    .map(([key]) => `${key} absent ou invalide`);
  if (pricePerUnit === 0) issues.push("pricePerUnit doit être strictement positif");
  const empty = { breakEvenUnits: null, breakEvenRevenue: null, revenueAtWholeUnits: null,
    breakEvenMonths: null, marginOfSafety: null, contributionMargin: null, contributionMarginRatio: null };
  if (issues.length) return { ...empty, status: "INSUFFICIENT_DATA", issues };
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = contributionMargin / pricePerUnit;
  if (contributionMargin <= 0) return { ...empty, status: "NO_FINITE_BREAK_EVEN",
    issues: ["La contribution unitaire ne couvre pas les charges fixes."], contributionMargin, contributionMarginRatio };
  const theoreticalUnits = fixedCosts / contributionMargin;
  const breakEvenUnits = Math.ceil(theoreticalUnits);
  const comparableVolume = typeof monthlyVolume === "number" && Number.isFinite(monthlyVolume) && monthlyVolume >= 0 && input.costPeriod
    ? monthlyVolume * (input.costPeriod === "YEAR" ? 12 : 1) : null;
  return {
    status: "COMPUTED", issues: [], breakEvenUnits,
    breakEvenRevenue: fixedCosts / contributionMarginRatio,
    revenueAtWholeUnits: breakEvenUnits * pricePerUnit,
    // Recurrent monthly fixed costs are not paid off by accumulating months of
    // turnover. A dated break-even requires an explicit trajectory and cashflow.
    breakEvenMonths: null,
    marginOfSafety: comparableVolume !== null && comparableVolume > 0
      ? Math.round((comparableVolume - theoreticalUnits) / comparableVolume * 100) / 100 : null,
    contributionMargin,
    contributionMarginRatio,
  };
}
