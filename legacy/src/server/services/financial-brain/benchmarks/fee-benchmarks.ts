/**
 * Fee Benchmarks — Agency & Freelance pricing by country × type × tier
 */

import type { FeeBenchmark } from "../types";
import { SOURCES } from "./metadata";

// ─── Agency Fee Benchmarks (per country × agency type) ──────────────────────
// dayRate = XAF unless noted, retainer = monthly XAF

export const AGENCY_FEE_BENCHMARKS: Record<string, Record<string, FeeBenchmark>> = {
  Cameroun: {
    COMMUNICATION:       { commissionRange: [0.08, 0.15], dayRateRange: [150_000, 500_000],   retainerRange: [500_000, 5_000_000] },
    DIGITAL:             { commissionRange: [0.10, 0.20], dayRateRange: [100_000, 400_000],   retainerRange: [300_000, 3_000_000] },
    MEDIA_BUYING:        { commissionRange: [0.03, 0.08], dayRateRange: [200_000, 600_000],   retainerRange: [1_000_000, 8_000_000] },
    RELATIONS_PUBLIQUES: { commissionRange: [0.00, 0.05], dayRateRange: [150_000, 500_000],   retainerRange: [500_000, 5_000_000] },
    PRODUCTION:          { commissionRange: [0.00, 0.05], dayRateRange: [100_000, 800_000],   retainerRange: [500_000, 5_000_000] },
    EVENEMENTIEL:        { commissionRange: [0.05, 0.15], dayRateRange: [100_000, 400_000],   retainerRange: [300_000, 3_000_000] },
  },
  "Cote d'Ivoire": {
    COMMUNICATION:       { commissionRange: [0.08, 0.15], dayRateRange: [150_000, 550_000],   retainerRange: [500_000, 5_500_000] },
    DIGITAL:             { commissionRange: [0.10, 0.18], dayRateRange: [100_000, 400_000],   retainerRange: [300_000, 3_500_000] },
    MEDIA_BUYING:        { commissionRange: [0.03, 0.10], dayRateRange: [200_000, 600_000],   retainerRange: [1_000_000, 8_000_000] },
  },
  Nigeria: {
    COMMUNICATION:       { commissionRange: [0.08, 0.15], dayRateRange: [120_000, 450_000],   retainerRange: [400_000, 4_000_000] },
    DIGITAL:             { commissionRange: [0.10, 0.20], dayRateRange: [80_000, 350_000],    retainerRange: [250_000, 2_500_000] },
    MEDIA_BUYING:        { commissionRange: [0.03, 0.10], dayRateRange: [150_000, 500_000],   retainerRange: [800_000, 7_000_000] },
  },
  France: {
    // EUR values (will be contextual from currency)
    COMMUNICATION:       { commissionRange: [0.08, 0.12], dayRateRange: [800, 2_500],          retainerRange: [3_000, 25_000] },
    DIGITAL:             { commissionRange: [0.10, 0.15], dayRateRange: [600, 2_000],          retainerRange: [2_000, 15_000] },
    MEDIA_BUYING:        { commissionRange: [0.03, 0.06], dayRateRange: [1_000, 3_000],        retainerRange: [5_000, 40_000] },
    RELATIONS_PUBLIQUES: { commissionRange: [0.00, 0.03], dayRateRange: [800, 2_500],          retainerRange: [3_000, 20_000] },
    PRODUCTION:          { commissionRange: [0.00, 0.03], dayRateRange: [500, 3_500],          retainerRange: [2_000, 15_000] },
    EVENEMENTIEL:        { commissionRange: [0.05, 0.12], dayRateRange: [600, 2_000],          retainerRange: [2_000, 15_000] },
  },
};

// ─── Freelance Fee Benchmarks (per country × specialty × tier) ──────────────

export const FREELANCE_FEE_BENCHMARKS: Record<string, Record<string, Record<string, { dayRate: number }>>> = {
  Cameroun: {
    design:   { APPRENTI: { dayRate: 25_000 }, COMPAGNON: { dayRate: 60_000 }, MAITRE: { dayRate: 150_000 }, ASSOCIE: { dayRate: 300_000 } },
    copy:     { APPRENTI: { dayRate: 20_000 }, COMPAGNON: { dayRate: 50_000 }, MAITRE: { dayRate: 120_000 }, ASSOCIE: { dayRate: 250_000 } },
    strategy: { APPRENTI: { dayRate: 30_000 }, COMPAGNON: { dayRate: 80_000 }, MAITRE: { dayRate: 200_000 }, ASSOCIE: { dayRate: 400_000 } },
    media:    { APPRENTI: { dayRate: 25_000 }, COMPAGNON: { dayRate: 65_000 }, MAITRE: { dayRate: 160_000 }, ASSOCIE: { dayRate: 350_000 } },
    video:    { APPRENTI: { dayRate: 30_000 }, COMPAGNON: { dayRate: 75_000 }, MAITRE: { dayRate: 200_000 }, ASSOCIE: { dayRate: 500_000 } },
    photo:    { APPRENTI: { dayRate: 25_000 }, COMPAGNON: { dayRate: 60_000 }, MAITRE: { dayRate: 150_000 }, ASSOCIE: { dayRate: 400_000 } },
    dev:      { APPRENTI: { dayRate: 30_000 }, COMPAGNON: { dayRate: 80_000 }, MAITRE: { dayRate: 200_000 }, ASSOCIE: { dayRate: 500_000 } },
  },
  France: {
    design:   { APPRENTI: { dayRate: 250 }, COMPAGNON: { dayRate: 450 }, MAITRE: { dayRate: 800 }, ASSOCIE: { dayRate: 1_500 } },
    copy:     { APPRENTI: { dayRate: 200 }, COMPAGNON: { dayRate: 400 }, MAITRE: { dayRate: 700 }, ASSOCIE: { dayRate: 1_200 } },
    strategy: { APPRENTI: { dayRate: 300 }, COMPAGNON: { dayRate: 600 }, MAITRE: { dayRate: 1_200 }, ASSOCIE: { dayRate: 2_500 } },
    media:    { APPRENTI: { dayRate: 250 }, COMPAGNON: { dayRate: 500 }, MAITRE: { dayRate: 900 }, ASSOCIE: { dayRate: 1_800 } },
    video:    { APPRENTI: { dayRate: 300 }, COMPAGNON: { dayRate: 600 }, MAITRE: { dayRate: 1_200 }, ASSOCIE: { dayRate: 2_500 } },
  },
};

// ─── Agency Health Benchmarks ───────────────────────────────────────────────

/** Revenue per head benchmarks by agency type (annual, XAF) */
export const AGENCY_HEALTH_BENCHMARKS: Record<string, { revenuePerHead: { min: number; max: number }; targetMarginPct: { min: number; max: number }; targetUtilization: { min: number; max: number } }> = {
  COMMUNICATION:       { revenuePerHead: { min: 15_000_000, max: 25_000_000 }, targetMarginPct: { min: 0.15, max: 0.25 }, targetUtilization: { min: 0.65, max: 0.80 } },
  DIGITAL:             { revenuePerHead: { min: 12_000_000, max: 20_000_000 }, targetMarginPct: { min: 0.20, max: 0.35 }, targetUtilization: { min: 0.70, max: 0.85 } },
  MEDIA_BUYING:        { revenuePerHead: { min: 20_000_000, max: 40_000_000 }, targetMarginPct: { min: 0.10, max: 0.15 }, targetUtilization: { min: 0.70, max: 0.85 } },
  PRODUCTION:          { revenuePerHead: { min: 10_000_000, max: 18_000_000 }, targetMarginPct: { min: 0.25, max: 0.40 }, targetUtilization: { min: 0.60, max: 0.75 } },
  EVENEMENTIEL:        { revenuePerHead: { min: 8_000_000,  max: 15_000_000 }, targetMarginPct: { min: 0.20, max: 0.35 }, targetUtilization: { min: 0.55, max: 0.75 } },
  RELATIONS_PUBLIQUES: { revenuePerHead: { min: 12_000_000, max: 22_000_000 }, targetMarginPct: { min: 0.15, max: 0.25 }, targetUtilization: { min: 0.65, max: 0.80 } },
};

// ─── Lookup Functions ───────────────────────────────────────────────────────

export function getAgencyFeeBenchmark(country: string, agencyType: string): FeeBenchmark | null {
  return AGENCY_FEE_BENCHMARKS[country]?.[agencyType] ?? AGENCY_FEE_BENCHMARKS.Cameroun?.[agencyType] ?? null;
}

export function getFreelanceDayRate(country: string, specialty: string, tier: string): number {
  return FREELANCE_FEE_BENCHMARKS[country]?.[specialty]?.[tier]?.dayRate
    ?? FREELANCE_FEE_BENCHMARKS.Cameroun?.[specialty]?.[tier]?.dayRate
    ?? 50_000;
}
