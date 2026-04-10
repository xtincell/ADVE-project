/**
 * Budget Taxonomy — 5-axis classification for every franc spent
 *
 * Every budget line is classified on 5 simultaneous axes:
 *   1. Media Type:     ATL / BTL / TTL / DIGITAL / EXPERIENTIAL
 *   2. Working Type:   WORKING (reaches consumers) / NON_WORKING (overhead)
 *   3. Ownership:      PAID / OWNED / EARNED
 *   4. Operational:    MEDIA / PRODUCTION / TALENT / LOGISTICS / TECHNOLOGY / LEGAL / CONTINGENCY / AGENCY_FEE
 *   5. Campaign Phase: STRATEGY / CREATION / PRODUCTION / DIFFUSION / MESURE
 */

import type {
  BudgetAtom,
  BudgetTier,
  CampaignPhase,
  MediaOwnership,
  MediaType,
  OperationalCategory,
  TaxonomyBreakdown,
  WorkingType,
} from "./types";

// ─── Channel → Taxonomy Classification ──────────────────────────────────────

type ChannelClassification = {
  mediaType: MediaType;
  workingType: WorkingType;
  mediaOwnership: MediaOwnership;
  operationalCategory: OperationalCategory;
};

export const CHANNEL_TAXONOMY: Record<string, ChannelClassification> = {
  // ATL — Paid mass media
  TV:       { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  RADIO:    { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  PRINT:    { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  OOH:      { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  CINEMA:   { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  DOOH:     { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  TRANSIT:  { mediaType: "ATL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },

  // Digital — Paid social / programmatic
  INSTAGRAM:  { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  FACEBOOK:   { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  TIKTOK:     { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  LINKEDIN:   { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  YOUTUBE:    { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  GOOGLE_ADS: { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
  DISPLAY:    { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },

  // Digital — Owned channels (no media cost, tech/talent cost)
  WEBSITE:    { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "TECHNOLOGY" },
  EMAIL:      { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "TECHNOLOGY" },
  SMS:        { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "TECHNOLOGY" },
  APP:        { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "TECHNOLOGY" },

  // BTL — Below the line (direct, experiential)
  EVENT:          { mediaType: "BTL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },
  SAMPLING:       { mediaType: "BTL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },
  ACTIVATION_PDV: { mediaType: "BTL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },
  STREET_MARKETING: { mediaType: "BTL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },

  // Experiential
  EVENEMENTIEL:   { mediaType: "EXPERIENTIAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },
  POP_UP:         { mediaType: "EXPERIENTIAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "LOGISTICS" },

  // Earned — PR, UGC, organic
  PR:             { mediaType: "TTL", workingType: "NON_WORKING", mediaOwnership: "EARNED", operationalCategory: "TALENT" },
  UGC:            { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "EARNED", operationalCategory: "TALENT" },
  INFLUENCE:      { mediaType: "TTL", workingType: "WORKING", mediaOwnership: "EARNED", operationalCategory: "TALENT" },

  // Owned production assets
  PACKAGING:      { mediaType: "BTL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "PRODUCTION" },
  VIDEO:          { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "PRODUCTION" },
  PHOTO:          { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED", operationalCategory: "PRODUCTION" },

  // Generic fallback
  CUSTOM:         { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID", operationalCategory: "MEDIA" },
};

// ─── Working vs Non-Working Benchmarks ──────────────────────────────────────

/** Industry benchmark: % of budget that should be Working Media */
export const WORKING_RATIO_BY_TIER: Record<BudgetTier, number> = {
  MICRO: 0.80,       // 80% working — minimize waste
  SMALL: 0.70,       // 70% working — basic production
  MEDIUM: 0.65,      // 65% working — quality production
  LARGE: 0.60,       // 60% working — full production value
  ENTERPRISE: 0.55,  // 55% working — heavy prod + tech + talent
};

// ─── Earned / Owned / Paid Benchmarks ───────────────────────────────────────

/** Industry benchmark: Paid/Owned/Earned split by company stage */
export const EOP_SPLIT_BY_STAGE: Record<string, { paid: number; owned: number; earned: number }> = {
  STARTUP:  { paid: 0.70, owned: 0.20, earned: 0.10 },
  GROWTH:   { paid: 0.55, owned: 0.25, earned: 0.20 },
  MATURITY: { paid: 0.35, owned: 0.30, earned: 0.35 },
  DECLINE:  { paid: 0.45, owned: 0.30, earned: 0.25 },
};

// ─── Operational Category Benchmarks ────────────────────────────────────────

/** Industry benchmark: operational split by budget tier */
export const OPERATIONAL_SPLIT_BY_TIER: Record<BudgetTier, Record<OperationalCategory, number>> = {
  MICRO: {
    MEDIA: 0.65, PRODUCTION: 0.10, TALENT: 0.05, LOGISTICS: 0.05,
    TECHNOLOGY: 0.03, LEGAL: 0.00, CONTINGENCY: 0.02, AGENCY_FEE: 0.10,
  },
  SMALL: {
    MEDIA: 0.55, PRODUCTION: 0.12, TALENT: 0.08, LOGISTICS: 0.05,
    TECHNOLOGY: 0.03, LEGAL: 0.01, CONTINGENCY: 0.05, AGENCY_FEE: 0.11,
  },
  MEDIUM: {
    MEDIA: 0.48, PRODUCTION: 0.15, TALENT: 0.10, LOGISTICS: 0.05,
    TECHNOLOGY: 0.04, LEGAL: 0.01, CONTINGENCY: 0.05, AGENCY_FEE: 0.12,
  },
  LARGE: {
    MEDIA: 0.42, PRODUCTION: 0.15, TALENT: 0.12, LOGISTICS: 0.07,
    TECHNOLOGY: 0.05, LEGAL: 0.02, CONTINGENCY: 0.05, AGENCY_FEE: 0.12,
  },
  ENTERPRISE: {
    MEDIA: 0.38, PRODUCTION: 0.15, TALENT: 0.13, LOGISTICS: 0.08,
    TECHNOLOGY: 0.06, LEGAL: 0.02, CONTINGENCY: 0.06, AGENCY_FEE: 0.12,
  },
};

// ─── Campaign Phase Benchmarks ──────────────────────────────────────────────

/** Default phase split when no campaign profile overrides it */
export const DEFAULT_PHASE_SPLIT: Record<CampaignPhase, number> = {
  STRATEGY: 0.05,
  CREATION: 0.15,
  PRODUCTION: 0.15,
  DIFFUSION: 0.55,
  MESURE: 0.10,
};

// ─── Classification Functions ───────────────────────────────────────────────

/**
 * Classify a channel spend into a fully-tagged BudgetAtom
 */
export function classifyChannelSpend(
  channel: string,
  amount: number,
  currency: string,
  phase: CampaignPhase = "DIFFUSION",
): BudgetAtom {
  const classification = CHANNEL_TAXONOMY[channel.toUpperCase()] ?? CHANNEL_TAXONOMY.CUSTOM!;
  return {
    amount,
    currency,
    mediaType: classification.mediaType,
    workingType: classification.workingType,
    mediaOwnership: classification.mediaOwnership,
    operationalCategory: classification.operationalCategory,
    campaignPhase: phase,
  };
}

/**
 * Classify a non-channel spend (production, talent, tech, etc.)
 */
export function classifyOperationalSpend(
  category: OperationalCategory,
  amount: number,
  currency: string,
  phase: CampaignPhase = "PRODUCTION",
): BudgetAtom {
  const CATEGORY_DEFAULTS: Record<OperationalCategory, { mediaType: MediaType; workingType: WorkingType; mediaOwnership: MediaOwnership }> = {
    MEDIA:        { mediaType: "DIGITAL", workingType: "WORKING", mediaOwnership: "PAID" },
    PRODUCTION:   { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED" },
    TALENT:       { mediaType: "TTL", workingType: "NON_WORKING", mediaOwnership: "EARNED" },
    LOGISTICS:    { mediaType: "BTL", workingType: "NON_WORKING", mediaOwnership: "PAID" },
    TECHNOLOGY:   { mediaType: "DIGITAL", workingType: "NON_WORKING", mediaOwnership: "OWNED" },
    LEGAL:        { mediaType: "TTL", workingType: "NON_WORKING", mediaOwnership: "OWNED" },
    CONTINGENCY:  { mediaType: "TTL", workingType: "NON_WORKING", mediaOwnership: "OWNED" },
    AGENCY_FEE:   { mediaType: "TTL", workingType: "NON_WORKING", mediaOwnership: "PAID" },
  };

  const defaults = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.PRODUCTION!;
  return {
    amount,
    currency,
    mediaType: defaults.mediaType,
    workingType: defaults.workingType,
    mediaOwnership: defaults.mediaOwnership,
    operationalCategory: category,
    campaignPhase: phase,
  };
}

/**
 * Aggregate a list of BudgetAtoms into a TaxonomyBreakdown (5-axis summary)
 */
export function aggregateTaxonomy(atoms: BudgetAtom[], currency: string): TaxonomyBreakdown {
  const result: TaxonomyBreakdown = {
    byMediaType: { ATL: 0, BTL: 0, TTL: 0, DIGITAL: 0, EXPERIENTIAL: 0 },
    byWorkingType: { WORKING: 0, NON_WORKING: 0 },
    byMediaOwnership: { PAID: 0, OWNED: 0, EARNED: 0 },
    byOperationalCategory: { MEDIA: 0, PRODUCTION: 0, TALENT: 0, LOGISTICS: 0, TECHNOLOGY: 0, LEGAL: 0, CONTINGENCY: 0, AGENCY_FEE: 0 },
    byCampaignPhase: { STRATEGY: 0, CREATION: 0, PRODUCTION: 0, DIFFUSION: 0, MESURE: 0 },
    total: 0,
    currency,
  };

  for (const atom of atoms) {
    result.byMediaType[atom.mediaType] += atom.amount;
    result.byWorkingType[atom.workingType] += atom.amount;
    result.byMediaOwnership[atom.mediaOwnership] += atom.amount;
    result.byOperationalCategory[atom.operationalCategory] += atom.amount;
    result.byCampaignPhase[atom.campaignPhase] += atom.amount;
    result.total += atom.amount;
  }

  return result;
}

/**
 * Generate a recommended taxonomy split from a total budget, tier, and stage
 */
export function generateRecommendedTaxonomy(
  totalBudget: number,
  currency: string,
  tier: BudgetTier,
  companyStage: string,
): TaxonomyBreakdown {
  const opSplit = OPERATIONAL_SPLIT_BY_TIER[tier] ?? OPERATIONAL_SPLIT_BY_TIER.MEDIUM!;
  const eop = EOP_SPLIT_BY_STAGE[companyStage] ?? EOP_SPLIT_BY_STAGE.GROWTH!;
  const workingRatio = WORKING_RATIO_BY_TIER[tier] ?? 0.65;

  // Determine media type split from tier
  const hasAtl = tier !== "MICRO";
  const atlPct = hasAtl ? (tier === "ENTERPRISE" ? 0.35 : tier === "LARGE" ? 0.30 : tier === "MEDIUM" ? 0.15 : 0.05) : 0;
  const digitalPct = tier === "MICRO" ? 0.85 : tier === "SMALL" ? 0.65 : tier === "MEDIUM" ? 0.50 : 0.35;
  const btlPct = 1 - atlPct - digitalPct - 0.05; // 5% for TTL
  const ttlPct = 0.05;

  return {
    byMediaType: {
      ATL: Math.round(totalBudget * atlPct),
      BTL: Math.round(totalBudget * Math.max(0, btlPct)),
      TTL: Math.round(totalBudget * ttlPct),
      DIGITAL: Math.round(totalBudget * digitalPct),
      EXPERIENTIAL: 0,
    },
    byWorkingType: {
      WORKING: Math.round(totalBudget * workingRatio),
      NON_WORKING: Math.round(totalBudget * (1 - workingRatio)),
    },
    byMediaOwnership: {
      PAID: Math.round(totalBudget * eop.paid),
      OWNED: Math.round(totalBudget * eop.owned),
      EARNED: Math.round(totalBudget * eop.earned),
    },
    byOperationalCategory: Object.fromEntries(
      Object.entries(opSplit).map(([k, v]) => [k, Math.round(totalBudget * v)]),
    ) as Record<OperationalCategory, number>,
    byCampaignPhase: Object.fromEntries(
      Object.entries(DEFAULT_PHASE_SPLIT).map(([k, v]) => [k, Math.round(totalBudget * v)]),
    ) as Record<CampaignPhase, number>,
    total: totalBudget,
    currency,
  };
}
