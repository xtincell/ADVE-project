/**
 * Fee Structures — Agency & Freelance remuneration models
 *
 * 6 fee models: Commission, Retainer, Project, Performance, Hybrid RC, Hybrid RP
 * All calculations are pure deterministic math.
 */

import type { FeeCalculationInput, FeeCalculationResult, FeeModel } from "./types";

// ─── Fee Calculators ────────────────────────────────────────────────────────

function calculateCommission(input: FeeCalculationInput): FeeCalculationResult {
  const mediaBudget = input.mediaBudget ?? 0;
  const rate = input.commissionRate ?? 0.10;
  const totalFee = Math.round(mediaBudget * rate);
  const months = input.durationMonths ?? 12;
  return {
    model: "COMMISSION",
    totalFee,
    monthlyFee: Math.round(totalFee / months),
    effectiveRate: rate,
    breakdown: { mediaCommission: totalFee },
  };
}

function calculateRetainer(input: FeeCalculationInput): FeeCalculationResult {
  const monthly = input.monthlyRetainer ?? 0;
  const months = input.durationMonths ?? 12;
  const totalFee = monthly * months;
  const effectiveRate = input.mediaBudget ? totalFee / input.mediaBudget : 0;
  return {
    model: "RETAINER",
    totalFee,
    monthlyFee: monthly,
    effectiveRate,
    breakdown: { retainer: totalFee },
  };
}

function calculateProject(input: FeeCalculationInput): FeeCalculationResult {
  const hoursCost = input.hoursCost ?? 0;
  const markup = input.markupPct ?? 0.25;
  const totalFee = Math.round(hoursCost * (1 + markup));
  const months = input.durationMonths ?? 3;
  return {
    model: "PROJECT",
    totalFee,
    monthlyFee: Math.round(totalFee / months),
    effectiveRate: markup,
    breakdown: { cost: hoursCost, markup: totalFee - hoursCost },
  };
}

function calculatePerformance(input: FeeCalculationInput): FeeCalculationResult {
  const revenue = input.revenueGenerated ?? 0;
  const rate = input.performanceRate ?? 0.10;
  const cap = input.performanceCap;
  const rawFee = Math.round(revenue * rate);
  const totalFee = cap ? Math.min(rawFee, cap) : rawFee;
  const months = input.durationMonths ?? 12;
  return {
    model: "PERFORMANCE",
    totalFee,
    monthlyFee: Math.round(totalFee / months),
    effectiveRate: revenue > 0 ? totalFee / revenue : 0,
    breakdown: { performanceFee: totalFee, ...(cap && rawFee > cap ? { cappedAmount: rawFee - totalFee } : {}) },
  };
}

function calculateHybridRC(input: FeeCalculationInput): FeeCalculationResult {
  const retainer = calculateRetainer(input);
  const commission = calculateCommission(input);
  const totalFee = retainer.totalFee + commission.totalFee;
  const months = input.durationMonths ?? 12;
  const effectiveRate = input.mediaBudget ? totalFee / input.mediaBudget : 0;
  return {
    model: "HYBRID_RC",
    totalFee,
    monthlyFee: Math.round(totalFee / months),
    effectiveRate,
    breakdown: { retainer: retainer.totalFee, commission: commission.totalFee },
  };
}

function calculateHybridRP(input: FeeCalculationInput): FeeCalculationResult {
  const retainer = calculateRetainer(input);
  const performance = calculatePerformance(input);
  const totalFee = retainer.totalFee + performance.totalFee;
  const months = input.durationMonths ?? 12;
  const effectiveRate = input.revenueGenerated ? totalFee / input.revenueGenerated : 0;
  return {
    model: "HYBRID_RP",
    totalFee,
    monthlyFee: Math.round(totalFee / months),
    effectiveRate,
    breakdown: { retainer: retainer.totalFee, performanceBonus: performance.totalFee },
  };
}

// ─── Router ─────────────────────────────────────────────────────────────────

const CALCULATORS: Record<FeeModel, (input: FeeCalculationInput) => FeeCalculationResult> = {
  COMMISSION: calculateCommission,
  RETAINER: calculateRetainer,
  PROJECT: calculateProject,
  PERFORMANCE: calculatePerformance,
  HYBRID_RC: calculateHybridRC,
  HYBRID_RP: calculateHybridRP,
};

export function calculateFee(input: FeeCalculationInput): FeeCalculationResult {
  const calc = CALCULATORS[input.model];
  return calc(input);
}

/**
 * Compare all fee models for a given scenario to help choose
 */
export function compareFeeModels(
  mediaBudget: number,
  monthlyRetainer: number,
  hoursCost: number,
  revenueGenerated: number,
  durationMonths: number = 12,
): Array<FeeCalculationResult & { model: FeeModel }> {
  const base: Omit<FeeCalculationInput, "model"> = {
    mediaBudget,
    monthlyRetainer,
    hoursCost,
    revenueGenerated,
    durationMonths,
    commissionRate: 0.10,
    markupPct: 0.25,
    performanceRate: 0.10,
  };

  const models: FeeModel[] = ["COMMISSION", "RETAINER", "PROJECT", "PERFORMANCE", "HYBRID_RC", "HYBRID_RP"];
  return models.map(model => calculateFee({ ...base, model }));
}

// ─── Fee Benchmarks Reference ───────────────────────────────────────────────

/** Standard commission rates by agency type */
export const COMMISSION_RATES: Record<string, { min: number; max: number; typical: number }> = {
  COMMUNICATION:       { min: 0.08, max: 0.15, typical: 0.12 },
  MEDIA_BUYING:        { min: 0.03, max: 0.08, typical: 0.05 },
  DIGITAL:             { min: 0.10, max: 0.20, typical: 0.15 },
  RELATIONS_PUBLIQUES: { min: 0.00, max: 0.05, typical: 0.00 },  // Mostly retainer
  PRODUCTION:          { min: 0.00, max: 0.05, typical: 0.00 },  // Mostly project
  EVENEMENTIEL:        { min: 0.05, max: 0.15, typical: 0.10 },
};

/** Standard markup rates for project-based work */
export const PROJECT_MARKUP_RATES: Record<string, number> = {
  APPRENTI:  0.15,
  COMPAGNON: 0.25,
  MAITRE:    0.40,
  ASSOCIE:   0.50,
};
