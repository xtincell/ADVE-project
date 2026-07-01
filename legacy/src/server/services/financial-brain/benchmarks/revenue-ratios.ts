/**
 * Revenue Ratios — Marketing budget as % of revenue
 *
 * Varies by sector × company stage × company size.
 * These ratios are the industry standard for "how much should I spend?"
 */

import type { RevenueRatio } from "../types";
import { SOURCES } from "./metadata";

// ─── Revenue Ratio Matrix: SECTOR × STAGE → Ratio ──────────────────────────

const REVENUE_RATIOS: Record<string, Record<string, RevenueRatio>> = {
  FMCG: {
    STARTUP:  { marketingPct: 0.20, alwaysOnPct: 0.30, mediaVsProductionSplit: 0.65 },
    GROWTH:   { marketingPct: 0.15, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.60 },
    MATURITY: { marketingPct: 0.12, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.55 },
    DECLINE:  { marketingPct: 0.08, alwaysOnPct: 0.65, mediaVsProductionSplit: 0.50 },
  },
  TECH: {
    STARTUP:  { marketingPct: 0.30, alwaysOnPct: 0.50, mediaVsProductionSplit: 0.75 },
    GROWTH:   { marketingPct: 0.20, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.70 },
    MATURITY: { marketingPct: 0.12, alwaysOnPct: 0.65, mediaVsProductionSplit: 0.60 },
    DECLINE:  { marketingPct: 0.08, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.55 },
  },
  SERVICES: {
    STARTUP:  { marketingPct: 0.15, alwaysOnPct: 0.40, mediaVsProductionSplit: 0.55 },
    GROWTH:   { marketingPct: 0.10, alwaysOnPct: 0.50, mediaVsProductionSplit: 0.50 },
    MATURITY: { marketingPct: 0.08, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.45 },
    DECLINE:  { marketingPct: 0.06, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.40 },
  },
  RETAIL: {
    STARTUP:  { marketingPct: 0.18, alwaysOnPct: 0.35, mediaVsProductionSplit: 0.70 },
    GROWTH:   { marketingPct: 0.12, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.65 },
    MATURITY: { marketingPct: 0.10, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.60 },
    DECLINE:  { marketingPct: 0.07, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.55 },
  },
  HOSPITALITY: {
    STARTUP:  { marketingPct: 0.18, alwaysOnPct: 0.35, mediaVsProductionSplit: 0.60 },
    GROWTH:   { marketingPct: 0.12, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.55 },
    MATURITY: { marketingPct: 0.10, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.50 },
    DECLINE:  { marketingPct: 0.08, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.45 },
  },
  EDUCATION: {
    STARTUP:  { marketingPct: 0.15, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.55 },
    GROWTH:   { marketingPct: 0.10, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.50 },
    MATURITY: { marketingPct: 0.08, alwaysOnPct: 0.65, mediaVsProductionSplit: 0.45 },
    DECLINE:  { marketingPct: 0.06, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.40 },
  },
  BANQUE: {
    STARTUP:  { marketingPct: 0.10, alwaysOnPct: 0.50, mediaVsProductionSplit: 0.50 },
    GROWTH:   { marketingPct: 0.07, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.45 },
    MATURITY: { marketingPct: 0.05, alwaysOnPct: 0.75, mediaVsProductionSplit: 0.40 },
    DECLINE:  { marketingPct: 0.04, alwaysOnPct: 0.70, mediaVsProductionSplit: 0.35 },
  },
  MODE: {
    STARTUP:  { marketingPct: 0.25, alwaysOnPct: 0.35, mediaVsProductionSplit: 0.55 },
    GROWTH:   { marketingPct: 0.18, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.50 },
    MATURITY: { marketingPct: 0.15, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.45 },
    DECLINE:  { marketingPct: 0.10, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.40 },
  },
  GAMING: {
    STARTUP:  { marketingPct: 0.35, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.80 },
    GROWTH:   { marketingPct: 0.25, alwaysOnPct: 0.65, mediaVsProductionSplit: 0.75 },
    MATURITY: { marketingPct: 0.20, alwaysOnPct: 0.70, mediaVsProductionSplit: 0.70 },
    DECLINE:  { marketingPct: 0.12, alwaysOnPct: 0.65, mediaVsProductionSplit: 0.60 },
  },
  STARTUP: {
    STARTUP:  { marketingPct: 0.30, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.70 },
    GROWTH:   { marketingPct: 0.22, alwaysOnPct: 0.50, mediaVsProductionSplit: 0.65 },
    MATURITY: { marketingPct: 0.15, alwaysOnPct: 0.60, mediaVsProductionSplit: 0.55 },
    DECLINE:  { marketingPct: 0.10, alwaysOnPct: 0.55, mediaVsProductionSplit: 0.50 },
  },
};

const DEFAULT_RATIO: RevenueRatio = { marketingPct: 0.12, alwaysOnPct: 0.45, mediaVsProductionSplit: 0.55 };

// ─── Lookup Functions ───────────────────────────────────────────────────────

/**
 * Get the recommended marketing-to-revenue ratio for a sector and stage.
 */
export function getRevenueRatio(
  sector: string = "SERVICES",
  companyStage: string = "GROWTH",
): RevenueRatio {
  const sectorData = REVENUE_RATIOS[sector.toUpperCase()];
  if (!sectorData) return DEFAULT_RATIO;
  return sectorData[companyStage] ?? sectorData.GROWTH ?? DEFAULT_RATIO;
}

/**
 * Calculate recommended marketing budget from revenue
 */
export function getRecommendedBudgetFromRevenue(
  revenue: number,
  sector: string,
  companyStage: string,
  growthAmbition: number = 0.5,
): { budget: number; pct: number; source: string } {
  const ratio = getRevenueRatio(sector, companyStage);
  // Growth ambition scales from 0 (maintenance) to 1 (hypergrowth), adding up to 50% more
  const adjustedPct = ratio.marketingPct * (1 + growthAmbition * 0.5);
  return {
    budget: Math.round(revenue * adjustedPct),
    pct: adjustedPct,
    source: SOURCES.DELOITTE_CMO_SURVEY.name,
  };
}
