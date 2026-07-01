/**
 * Break-Even Analysis — Standard break-even + monthly break-even
 */

import type { BreakEvenAnalysis, BreakEvenInput } from "./types";

export function calculateBreakeven(input: BreakEvenInput): BreakEvenAnalysis {
  const { fixedCosts, variableCostPerUnit, pricePerUnit, monthlyVolume } = input;

  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = pricePerUnit > 0 ? contributionMargin / pricePerUnit : 0;

  const breakEvenUnits = contributionMargin > 0
    ? Math.ceil(fixedCosts / contributionMargin)
    : Infinity;

  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  const breakEvenMonths = monthlyVolume && monthlyVolume > 0 && breakEvenUnits !== Infinity
    ? Math.ceil(breakEvenUnits / monthlyVolume)
    : null;

  // Margin of safety: how far above/below break-even is current volume
  const currentAnnualVolume = (monthlyVolume ?? 0) * 12;
  const marginOfSafety = breakEvenUnits !== Infinity && breakEvenUnits > 0
    ? (currentAnnualVolume - breakEvenUnits) / breakEvenUnits
    : 0;

  return {
    breakEvenUnits: breakEvenUnits === Infinity ? -1 : breakEvenUnits,
    breakEvenRevenue: breakEvenUnits === Infinity ? -1 : breakEvenRevenue,
    breakEvenMonths,
    marginOfSafety: Math.round(marginOfSafety * 100) / 100,
    contributionMargin,
    contributionMarginRatio: Math.round(contributionMarginRatio * 1000) / 1000,
  };
}
