/**
 * Seasonal Factors — Monthly CPM/conversion adjustment factors
 *
 * Advertising costs and effectiveness vary by month due to
 * competition, consumer behavior, and commercial events.
 */

import type { SeasonalFactor } from "../types";

// ─── Seasonal Factors by Sector ─────────────────────────────────────────────

/** Factor > 1.0 = higher CPM / more competition that month */
export const SEASONAL_FACTORS: Record<string, SeasonalFactor[]> = {
  FMCG: [
    { month: 1,  factor: 0.85, label: "Post-fetes, slow start" },
    { month: 2,  factor: 0.90, label: "Saint-Valentin petit boost" },
    { month: 3,  factor: 1.10, label: "Ramadan (FMCG peak)" },
    { month: 4,  factor: 1.15, label: "Ramadan suite + Paques" },
    { month: 5,  factor: 0.95 },
    { month: 6,  factor: 0.90, label: "Ete calme" },
    { month: 7,  factor: 0.85, label: "Vacances" },
    { month: 8,  factor: 1.05, label: "Rentree" },
    { month: 9,  factor: 1.00 },
    { month: 10, factor: 1.00 },
    { month: 11, factor: 1.15, label: "Black Friday" },
    { month: 12, factor: 1.30, label: "Fetes de fin d'annee" },
  ],
  RETAIL: [
    { month: 1,  factor: 1.10, label: "Soldes hiver" },
    { month: 2,  factor: 0.90 },
    { month: 3,  factor: 1.00, label: "Ramadan" },
    { month: 4,  factor: 0.95 },
    { month: 5,  factor: 1.00, label: "Fete des Meres" },
    { month: 6,  factor: 1.05, label: "Soldes ete" },
    { month: 7,  factor: 0.80, label: "Vacances" },
    { month: 8,  factor: 1.15, label: "Rentree scolaire" },
    { month: 9,  factor: 1.00 },
    { month: 10, factor: 0.95 },
    { month: 11, factor: 1.25, label: "Black Friday / Cyber Monday" },
    { month: 12, factor: 1.35, label: "Noel" },
  ],
  TECH: [
    { month: 1,  factor: 1.10, label: "CES / New year goals" },
    { month: 2,  factor: 0.90 },
    { month: 3,  factor: 0.95 },
    { month: 4,  factor: 0.90 },
    { month: 5,  factor: 0.95 },
    { month: 6,  factor: 1.00 },
    { month: 7,  factor: 0.85, label: "Vacances dev" },
    { month: 8,  factor: 0.90 },
    { month: 9,  factor: 1.15, label: "Rentrée tech / iPhone" },
    { month: 10, factor: 1.10, label: "Product launches" },
    { month: 11, factor: 1.20, label: "Black Friday tech" },
    { month: 12, factor: 1.10, label: "Year-end deals" },
  ],
  DEFAULT: [
    { month: 1,  factor: 0.90 },
    { month: 2,  factor: 0.90 },
    { month: 3,  factor: 1.00 },
    { month: 4,  factor: 1.00 },
    { month: 5,  factor: 1.00 },
    { month: 6,  factor: 0.90 },
    { month: 7,  factor: 0.85 },
    { month: 8,  factor: 1.00 },
    { month: 9,  factor: 1.00 },
    { month: 10, factor: 1.00 },
    { month: 11, factor: 1.15 },
    { month: 12, factor: 1.25 },
  ],
};

/**
 * Get the seasonal factor for a sector and month
 */
export function getSeasonalFactor(sector: string, month: number): SeasonalFactor {
  const factors = SEASONAL_FACTORS[sector.toUpperCase()] ?? SEASONAL_FACTORS.DEFAULT!;
  return factors.find(f => f.month === month) ?? { month, factor: 1.0 };
}

/**
 * Get the average seasonal factor for a date range (useful for multi-month campaigns)
 */
export function getAverageSeasonalFactor(sector: string, startMonth: number, endMonth: number): number {
  const factors = SEASONAL_FACTORS[sector.toUpperCase()] ?? SEASONAL_FACTORS.DEFAULT!;
  let sum = 0;
  let count = 0;
  for (let m = startMonth; m <= endMonth; m++) {
    const month = ((m - 1) % 12) + 1;
    sum += factors.find(f => f.month === month)?.factor ?? 1.0;
    count++;
  }
  return count > 0 ? sum / count : 1.0;
}
