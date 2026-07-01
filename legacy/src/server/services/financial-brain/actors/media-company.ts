/**
 * Media Company Engine — Yield analysis and rate card generation
 */

import type { AdInventory, YieldAnalysis } from "../types";

export function analyzeMediaYield(inventory: AdInventory, fillRate: number = 0.70): YieldAnalysis {
  const { monthlyImpressions, baseCpm, premiumSlots, premiumMultiplier } = inventory;

  const standardSlots = monthlyImpressions - premiumSlots;
  const standardRevenue = (standardSlots / 1000) * baseCpm * fillRate;
  const premiumRevenue = (premiumSlots / 1000) * baseCpm * premiumMultiplier * fillRate;
  const actualRevenue = Math.round(standardRevenue + premiumRevenue);

  const potentialRevenue = Math.round(
    (standardSlots / 1000) * baseCpm + (premiumSlots / 1000) * baseCpm * premiumMultiplier,
  );

  const effectiveCpm = monthlyImpressions > 0
    ? Math.round((actualRevenue / (monthlyImpressions * fillRate)) * 1000)
    : 0;

  const revenueGap = potentialRevenue - actualRevenue;

  const optimizations: string[] = [];
  if (fillRate < 0.80) optimizations.push("Augmenter le fill rate via programmatic backfill");
  if (premiumSlots / monthlyImpressions < 0.20) optimizations.push("Augmenter la part premium (cible 20%+)");
  if (effectiveCpm < baseCpm * 0.8) optimizations.push("eCPM sous le base — negocier des deals directs");

  return {
    effectiveCpm,
    fillRate,
    potentialRevenue,
    actualRevenue,
    revenueGap,
    optimizations,
  };
}
