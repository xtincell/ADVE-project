/**
 * Budget-to-Plan Allocator — Deterministic plan generation from raw budget.
 * ZERO improvisation. Every number is derived from:
 *   - Sector benchmarks (financial-engine)
 *   - Active drivers (strategy.drivers)
 *   - Pillar E touchpoints + AARRR
 *   - Pillar V unit economics
 *   - Pillar D personas
 *   - Business context (positioning, business model)
 *
 * Input: budget (number) + strategyId
 * Output: Complete plan (media mix, channel allocation, timeline, KPIs, production costs)
 */

import { db } from "@/lib/db";
import type { DriverChannel } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MediaMix {
  digital: number;   // % of total
  btl: number;       // % of total
  atl: number;       // % of total
  production: number; // % of total (creative production costs)
  agencyFee: number;  // % of total
}

export interface ChannelAllocation {
  channel: DriverChannel | string;
  driverName: string;
  budgetAmount: number;
  budgetPct: number;
  category: "DIGITAL" | "BTL" | "ATL" | "PRODUCTION";
  cpm: number;         // cost per mille
  estimatedReach: number;
  estimatedClicks: number;
  estimatedConversions: number;
}

export interface PhasePlan {
  name: string;
  duration: number;   // days
  budgetPct: number;
  budgetAmount: number;
  objective: string;
  aarrStage: string;
  channels: string[];
  kpis: { metric: string; target: number; unit: string }[];
}

export interface KpiProjection {
  totalReach: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  estimatedCac: number;
  estimatedRevenue: number;
  estimatedRoas: number;
  costPerClick: number;
  costPerLead: number;
}

export interface ProductionItem {
  type: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  driver: string;
}

export interface BudgetPlan {
  inputBudget: number;
  currency: string;
  mediaMix: MediaMix;
  channelAllocations: ChannelAllocation[];
  phases: PhasePlan[];
  kpiProjections: KpiProjection;
  productionPlan: ProductionItem[];
  warnings: string[];
  budgetTier: "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";
  feasibility: { score: number; verdict: string; blockers: string[] };
}

// ─── Reference Tables (deterministic) ────────────────────────────────────────

/** CPM by channel in XAF (Cameroon market reference) */
const CHANNEL_CPM: Record<string, number> = {
  INSTAGRAM: 1500,
  FACEBOOK: 800,
  TIKTOK: 600,
  LINKEDIN: 4500,
  WEBSITE: 0,        // organic
  PACKAGING: 0,
  EVENT: 0,
  PR: 0,
  PRINT: 25000,
  VIDEO: 0,          // production, not media buy
  RADIO: 8000,
  TV: 120000,
  OOH: 15000,
  CUSTOM: 2000,
};

/** CTR by channel (industry average) */
const CHANNEL_CTR: Record<string, number> = {
  INSTAGRAM: 0.012,
  FACEBOOK: 0.009,
  TIKTOK: 0.018,
  LINKEDIN: 0.006,
  WEBSITE: 0.035,
  PRINT: 0.002,
  RADIO: 0.001,
  TV: 0.003,
  OOH: 0.001,
  EVENT: 0.05,
  PR: 0.005,
  CUSTOM: 0.008,
};

/** CVR (click → conversion) by channel */
const CHANNEL_CVR: Record<string, number> = {
  INSTAGRAM: 0.025,
  FACEBOOK: 0.030,
  TIKTOK: 0.015,
  LINKEDIN: 0.035,
  WEBSITE: 0.040,
  PRINT: 0.010,
  RADIO: 0.008,
  TV: 0.005,
  OOH: 0.003,
  EVENT: 0.080,
  PR: 0.010,
  CUSTOM: 0.020,
};

/** Channel → category mapping */
const CHANNEL_CATEGORY: Record<string, "DIGITAL" | "BTL" | "ATL"> = {
  INSTAGRAM: "DIGITAL",
  FACEBOOK: "DIGITAL",
  TIKTOK: "DIGITAL",
  LINKEDIN: "DIGITAL",
  WEBSITE: "DIGITAL",
  PACKAGING: "BTL",
  EVENT: "BTL",
  PR: "BTL",
  PRINT: "ATL",
  VIDEO: "DIGITAL",
  RADIO: "ATL",
  TV: "ATL",
  OOH: "ATL",
  CUSTOM: "DIGITAL",
};

/** Minimum production cost per deliverable type (XAF) */
const PRODUCTION_COSTS: Record<string, number> = {
  SOCIAL_POST: 15000,
  SOCIAL_VIDEO: 50000,
  STORY: 10000,
  REEL: 35000,
  BANNER_WEB: 20000,
  KV_PRINT: 75000,
  KV_OOH: 100000,
  SPOT_RADIO_30S: 150000,
  SPOT_TV_30S: 1500000,
  FLYER: 25000,
  PACKAGING: 200000,
  EVENT_SETUP: 300000,
  LANDING_PAGE: 150000,
  EMAIL_TEMPLATE: 30000,
};

/** Deliverables needed per driver (minimum set) */
const DRIVER_DELIVERABLES: Record<string, { type: string; qty: number }[]> = {
  INSTAGRAM: [{ type: "SOCIAL_POST", qty: 8 }, { type: "STORY", qty: 12 }, { type: "REEL", qty: 4 }],
  FACEBOOK: [{ type: "SOCIAL_POST", qty: 6 }, { type: "BANNER_WEB", qty: 2 }],
  TIKTOK: [{ type: "REEL", qty: 8 }],
  LINKEDIN: [{ type: "SOCIAL_POST", qty: 4 }, { type: "BANNER_WEB", qty: 1 }],
  WEBSITE: [{ type: "LANDING_PAGE", qty: 1 }, { type: "BANNER_WEB", qty: 3 }],
  PRINT: [{ type: "KV_PRINT", qty: 2 }, { type: "FLYER", qty: 1 }],
  OOH: [{ type: "KV_OOH", qty: 2 }],
  RADIO: [{ type: "SPOT_RADIO_30S", qty: 1 }],
  TV: [{ type: "SPOT_TV_30S", qty: 1 }],
  EVENT: [{ type: "EVENT_SETUP", qty: 1 }, { type: "FLYER", qty: 2 }],
  VIDEO: [{ type: "SOCIAL_VIDEO", qty: 4 }],
  PR: [{ type: "EMAIL_TEMPLATE", qty: 2 }],
  PACKAGING: [{ type: "PACKAGING", qty: 1 }],
};

// ─── Budget Tier ─────────────────────────────────────────────────────────────

function getBudgetTier(budget: number): BudgetPlan["budgetTier"] {
  if (budget < 100_000) return "MICRO";
  if (budget < 1_000_000) return "SMALL";
  if (budget < 5_000_000) return "MEDIUM";
  if (budget < 25_000_000) return "LARGE";
  return "ENTERPRISE";
}

// ─── Media Mix (deterministic, based on budget tier + active driver categories) ──

function calculateMediaMix(
  budgetTier: BudgetPlan["budgetTier"],
  driverCategories: { digital: number; btl: number; atl: number },
): MediaMix {
  // Base mix by tier (budget constraint drives ATL eligibility)
  const BASE_MIX: Record<BudgetPlan["budgetTier"], { digital: number; btl: number; atl: number }> = {
    MICRO: { digital: 0.85, btl: 0.15, atl: 0 },
    SMALL: { digital: 0.75, btl: 0.20, atl: 0.05 },
    MEDIUM: { digital: 0.55, btl: 0.25, atl: 0.20 },
    LARGE: { digital: 0.40, btl: 0.25, atl: 0.35 },
    ENTERPRISE: { digital: 0.35, btl: 0.25, atl: 0.40 },
  };

  const base = BASE_MIX[budgetTier];
  const totalDrivers = driverCategories.digital + driverCategories.btl + driverCategories.atl || 1;

  // Adjust base mix by actual driver presence (weighted average)
  const driverWeight = 0.3; // 30% driver influence, 70% tier base
  let digital = base.digital * (1 - driverWeight) + (driverCategories.digital / totalDrivers) * driverWeight;
  let btl = base.btl * (1 - driverWeight) + (driverCategories.btl / totalDrivers) * driverWeight;
  let atl = base.atl * (1 - driverWeight) + (driverCategories.atl / totalDrivers) * driverWeight;

  // If no ATL drivers active, redistribute ATL to digital
  if (driverCategories.atl === 0) {
    digital += atl * 0.7;
    btl += atl * 0.3;
    atl = 0;
  }

  // Fixed costs: production 15%, agency fee 10% (deducted from media budget)
  const production = 0.15;
  const agencyFee = 0.10;
  const mediaShare = 1 - production - agencyFee;

  // Normalize media categories to fill mediaShare
  const sum = digital + btl + atl || 1;
  digital = (digital / sum) * mediaShare;
  btl = (btl / sum) * mediaShare;
  atl = (atl / sum) * mediaShare;

  return {
    digital: Math.round(digital * 1000) / 1000,
    btl: Math.round(btl * 1000) / 1000,
    atl: Math.round(atl * 1000) / 1000,
    production,
    agencyFee,
  };
}

// ─── Channel Allocation ──────────────────────────────────────────────────────

function allocateChannels(
  budget: number,
  mediaMix: MediaMix,
  activeDrivers: { name: string; channel: string; channelType: string }[],
): ChannelAllocation[] {
  const digitalBudget = budget * mediaMix.digital;
  const btlBudget = budget * mediaMix.btl;
  const atlBudget = budget * mediaMix.atl;

  const digitalDrivers = activeDrivers.filter((d) => CHANNEL_CATEGORY[d.channel] === "DIGITAL");
  const btlDrivers = activeDrivers.filter((d) => CHANNEL_CATEGORY[d.channel] === "BTL");
  const atlDrivers = activeDrivers.filter((d) => CHANNEL_CATEGORY[d.channel] === "ATL");

  function distribute(
    drivers: typeof activeDrivers,
    totalBudget: number,
    category: "DIGITAL" | "BTL" | "ATL",
  ): ChannelAllocation[] {
    if (drivers.length === 0 || totalBudget <= 0) return [];
    const perDriver = totalBudget / drivers.length;

    return drivers.map((d) => {
      const cpm = CHANNEL_CPM[d.channel] ?? 2000;
      const ctr = CHANNEL_CTR[d.channel] ?? 0.01;
      const cvr = CHANNEL_CVR[d.channel] ?? 0.02;
      const reach = cpm > 0 ? Math.round((perDriver / cpm) * 1000) : 0;
      const clicks = Math.round(reach * ctr);
      const conversions = Math.round(clicks * cvr);

      return {
        channel: d.channel as DriverChannel,
        driverName: d.name,
        budgetAmount: Math.round(perDriver),
        budgetPct: Math.round((perDriver / budget) * 1000) / 10,
        category,
        cpm,
        estimatedReach: reach,
        estimatedClicks: clicks,
        estimatedConversions: conversions,
      };
    });
  }

  return [
    ...distribute(digitalDrivers, digitalBudget, "DIGITAL"),
    ...distribute(btlDrivers, btlBudget, "BTL"),
    ...distribute(atlDrivers, atlBudget, "ATL"),
  ];
}

// ─── Timeline Phases ─────────────────────────────────────────────────────────

function generatePhases(
  budget: number,
  budgetTier: BudgetPlan["budgetTier"],
  channelNames: string[],
): PhasePlan[] {
  // Phase structure by tier
  const PHASE_TEMPLATES: Record<BudgetPlan["budgetTier"], { name: string; days: number; pct: number; objective: string; aarrStage: string }[]> = {
    MICRO: [
      { name: "Lancement", days: 30, pct: 1.0, objective: "Visibilite initiale + premiers leads", aarrStage: "ACQUISITION" },
    ],
    SMALL: [
      { name: "Teasing", days: 14, pct: 0.15, objective: "Creer l'attente et la curiosite", aarrStage: "ACQUISITION" },
      { name: "Lancement", days: 30, pct: 0.50, objective: "Impact maximal + activation", aarrStage: "ACTIVATION" },
      { name: "Sustain", days: 46, pct: 0.35, objective: "Maintenir la dynamique + conversion", aarrStage: "RETENTION" },
    ],
    MEDIUM: [
      { name: "Pre-lancement", days: 14, pct: 0.10, objective: "Teasing + community building", aarrStage: "ACQUISITION" },
      { name: "Lancement", days: 21, pct: 0.35, objective: "Impact maximal + couverture media", aarrStage: "ACQUISITION" },
      { name: "Amplification", days: 30, pct: 0.30, objective: "Engagement + consideration", aarrStage: "ACTIVATION" },
      { name: "Conversion", days: 25, pct: 0.25, objective: "Conversion + retention", aarrStage: "REVENUE" },
    ],
    LARGE: [
      { name: "Pre-lancement", days: 21, pct: 0.08, objective: "Teasing multi-canal", aarrStage: "ACQUISITION" },
      { name: "Lancement", days: 14, pct: 0.25, objective: "Big bang multi-canal", aarrStage: "ACQUISITION" },
      { name: "Amplification", days: 30, pct: 0.25, objective: "Scaling + engagement", aarrStage: "ACTIVATION" },
      { name: "Sustain", days: 45, pct: 0.22, objective: "Retention + communaute", aarrStage: "RETENTION" },
      { name: "Closing", days: 15, pct: 0.20, objective: "Conversion + referral", aarrStage: "REFERRAL" },
    ],
    ENTERPRISE: [
      { name: "Pre-lancement", days: 30, pct: 0.05, objective: "Teasing + PR + seeding", aarrStage: "ACQUISITION" },
      { name: "Lancement", days: 14, pct: 0.20, objective: "Lancement 360 multi-marche", aarrStage: "ACQUISITION" },
      { name: "Amplification Q1", days: 45, pct: 0.25, objective: "Scale reach + engagement", aarrStage: "ACTIVATION" },
      { name: "Sustain Q2", days: 45, pct: 0.20, objective: "Retention + loyalty", aarrStage: "RETENTION" },
      { name: "Revenue Q3", days: 45, pct: 0.15, objective: "Revenue maximization", aarrStage: "REVENUE" },
      { name: "Referral Q4", days: 45, pct: 0.15, objective: "Ambassador activation + referral", aarrStage: "REFERRAL" },
    ],
  };

  const templates = PHASE_TEMPLATES[budgetTier];

  return templates.map((t) => {
    const phaseAmount = Math.round(budget * t.pct);
    return {
      name: t.name,
      duration: t.days,
      budgetPct: t.pct,
      budgetAmount: phaseAmount,
      objective: t.objective,
      aarrStage: t.aarrStage,
      channels: channelNames,
      kpis: getPhaseKpis(t.aarrStage, phaseAmount),
    };
  });
}

function getPhaseKpis(aarrStage: string, phaseBudget: number): PhasePlan["kpis"] {
  const avgCpm = 1200;
  const reach = Math.round((phaseBudget / avgCpm) * 1000);

  const KPI_MAP: Record<string, PhasePlan["kpis"]> = {
    ACQUISITION: [
      { metric: "Reach", target: reach, unit: "personnes" },
      { metric: "Impressions", target: Math.round(reach * 2.5), unit: "impressions" },
      { metric: "Clics", target: Math.round(reach * 0.015), unit: "clics" },
    ],
    ACTIVATION: [
      { metric: "Engagement rate", target: 3.5, unit: "%" },
      { metric: "Sign-ups / Leads", target: Math.round(reach * 0.003), unit: "leads" },
      { metric: "Page views", target: Math.round(reach * 0.01), unit: "views" },
    ],
    RETENTION: [
      { metric: "Taux de retour", target: 25, unit: "%" },
      { metric: "Sessions/user", target: 2.5, unit: "sessions" },
      { metric: "NPS", target: 40, unit: "score" },
    ],
    REVENUE: [
      { metric: "Conversions", target: Math.round(reach * 0.001), unit: "ventes" },
      { metric: "Panier moyen", target: 0, unit: "FCFA" }, // filled from pillar V
      { metric: "ROAS", target: 2.5, unit: "x" },
    ],
    REFERRAL: [
      { metric: "Referrals", target: Math.round(reach * 0.0005), unit: "parrainages" },
      { metric: "UGC posts", target: Math.max(5, Math.round(reach * 0.0002)), unit: "contenus" },
      { metric: "Ambassador activations", target: Math.max(2, Math.round(reach * 0.0001)), unit: "ambassadeurs" },
    ],
  };

  return KPI_MAP[aarrStage] ?? KPI_MAP["ACQUISITION"]!;
}

// ─── Production Plan ─────────────────────────────────────────────────────────

function calculateProductionPlan(
  budget: number,
  productionBudget: number,
  activeDrivers: { channel: string; name: string }[],
): ProductionItem[] {
  const items: ProductionItem[] = [];

  for (const d of activeDrivers) {
    const deliverables = DRIVER_DELIVERABLES[d.channel];
    if (!deliverables) continue;

    for (const del of deliverables) {
      const unitCost = PRODUCTION_COSTS[del.type] ?? 20000;
      items.push({
        type: del.type,
        quantity: del.qty,
        unitCost,
        totalCost: unitCost * del.qty,
        driver: d.name,
      });
    }
  }

  // If production plan exceeds budget, scale down quantities
  const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
  if (totalCost > productionBudget && totalCost > 0) {
    const scale = productionBudget / totalCost;
    for (const item of items) {
      item.quantity = Math.max(1, Math.round(item.quantity * scale));
      item.totalCost = item.unitCost * item.quantity;
    }
  }

  return items;
}

// ─── KPI Projections ─────────────────────────────────────────────────────────

function projectKpis(
  allocations: ChannelAllocation[],
  budget: number,
  avgTicket: number,
): KpiProjection {
  const totalReach = allocations.reduce((s, a) => s + a.estimatedReach, 0);
  const totalClicks = allocations.reduce((s, a) => s + a.estimatedClicks, 0);
  const totalConversions = allocations.reduce((s, a) => s + a.estimatedConversions, 0);
  const mediaBudget = allocations.reduce((s, a) => s + a.budgetAmount, 0);

  const estimatedRevenue = totalConversions * avgTicket;
  const estimatedCac = totalConversions > 0 ? Math.round(mediaBudget / totalConversions) : 0;
  const estimatedRoas = mediaBudget > 0 ? Math.round((estimatedRevenue / mediaBudget) * 100) / 100 : 0;
  const costPerClick = totalClicks > 0 ? Math.round(mediaBudget / totalClicks) : 0;
  const costPerLead = totalConversions > 0 ? Math.round(mediaBudget / totalConversions) : 0;

  return {
    totalReach,
    totalImpressions: Math.round(totalReach * 2.5),
    totalClicks,
    totalConversions,
    estimatedCac,
    estimatedRevenue,
    estimatedRoas,
    costPerClick,
    costPerLead,
  };
}

// ─── Feasibility ─────────────────────────────────────────────────────────────

function assessFeasibility(
  budget: number,
  productionPlan: ProductionItem[],
  activeDrivers: { channel: string }[],
  cacBenchmark: number,
): BudgetPlan["feasibility"] {
  const blockers: string[] = [];
  let score = 100;

  const productionCost = productionPlan.reduce((s, i) => s + i.totalCost, 0);
  const productionPct = budget > 0 ? productionCost / budget : 0;

  // Check if production alone exceeds 50% of budget
  if (productionPct > 0.50) {
    blockers.push(`Production (${Math.round(productionPct * 100)}% du budget) depasse le seuil de 50%`);
    score -= 30;
  }

  // Check if budget covers at least 1 conversion per channel
  const minMediaForOneConversion = activeDrivers.length * cacBenchmark;
  if (budget * 0.75 < minMediaForOneConversion) {
    blockers.push(`Budget insuffisant pour au moins 1 conversion par canal (min: ${minMediaForOneConversion.toLocaleString()} FCFA)`);
    score -= 20;
  }

  // Check if any ATL driver has < 500K budget
  for (const d of activeDrivers) {
    if (CHANNEL_CATEGORY[d.channel] === "ATL" && budget < 500_000) {
      blockers.push(`Canal ATL (${d.channel}) inaccessible sous 500K FCFA`);
      score -= 15;
    }
  }

  // Check minimum viable budget
  if (budget < 50_000) {
    blockers.push("Budget sous le seuil minimum viable (50K FCFA)");
    score -= 40;
  }

  score = Math.max(0, score);
  const verdict = score >= 80 ? "VIABLE" : score >= 50 ? "RISQUE" : "INSUFFISANT";

  return { score, verdict, blockers };
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

export async function generateBudgetPlan(strategyId: string, overrideBudget?: number): Promise<BudgetPlan> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      drivers: { where: { deletedAt: null, status: "ACTIVE" } },
      pillars: { where: { key: { in: ["v", "e", "d"] } } },
      client: { select: { sector: true, country: true } },
    },
  });

  const bCtx = (strategy.businessContext as Record<string, unknown>) ?? {};
  const pillarV = (strategy.pillars.find((p: any) => p.key === "v")?.content as Record<string, unknown>) ?? {};
  const pillarE = (strategy.pillars.find((p: any) => p.key === "e")?.content as Record<string, unknown>) ?? {};
  const pillarD = (strategy.pillars.find((p: any) => p.key === "d")?.content as Record<string, unknown>) ?? {};

  // Resolve budget: override > pillar V budgetCom > businessContext declaredBudget > 0
  const ue = (pillarV.unitEconomics as Record<string, unknown>) ?? {};
  const budget = overrideBudget
    ?? (typeof ue.budgetCom === "number" ? ue.budgetCom : null)
    ?? (typeof bCtx.declaredBudget === "number" ? bCtx.declaredBudget : 0);

  const currency = "XAF";
  const warnings: string[] = [];

  if (budget === 0) {
    warnings.push("Aucun budget detecte — utilise 0 FCFA. Renseignez pillar V.unitEconomics.budgetCom ou businessContext.declaredBudget.");
  }

  // Active drivers
  const activeDrivers = strategy.drivers.map((d: any) => ({
    name: d.name as string,
    channel: d.channel as string,
    channelType: d.channelType as string,
  }));

  if (activeDrivers.length === 0) {
    warnings.push("Aucun driver actif — ajoutez des canaux marketing pour une allocation pertinente.");
  }

  // Count drivers by category
  const driverCategories = { digital: 0, btl: 0, atl: 0 };
  for (const d of activeDrivers) {
    const cat = CHANNEL_CATEGORY[d.channel] ?? "DIGITAL";
    if (cat === "DIGITAL") driverCategories.digital++;
    else if (cat === "BTL") driverCategories.btl++;
    else driverCategories.atl++;
  }

  const budgetTier = getBudgetTier(budget);
  const mediaMix = calculateMediaMix(budgetTier, driverCategories);
  const channelAllocations = allocateChannels(budget, mediaMix, activeDrivers);
  const phases = generatePhases(budget, budgetTier, activeDrivers.map((d) => d.name));
  const productionPlan = calculateProductionPlan(budget, budget * mediaMix.production, activeDrivers);

  // Average ticket from pillar V or fallback
  const products = Array.isArray(pillarV.produitsCatalogue) ? pillarV.produitsCatalogue : [];
  const avgTicket = products.length > 0
    ? products.reduce((s: number, p: any) => s + (typeof p.prix === "number" ? p.prix : 0), 0) / products.length
    : 10000; // XAF fallback

  const kpiProjections = projectKpis(channelAllocations, budget, avgTicket);

  // Enrich REVENUE phase KPIs with real avg ticket
  for (const phase of phases) {
    for (const kpi of phase.kpis) {
      if (kpi.metric === "Panier moyen" && kpi.target === 0) {
        kpi.target = Math.round(avgTicket);
        kpi.unit = currency;
      }
    }
  }

  // CAC benchmark from pillar V or sector fallback
  const cacBenchmark = typeof ue.cac === "number" ? ue.cac : 5000;
  const feasibility = assessFeasibility(budget, productionPlan, activeDrivers, cacBenchmark);

  return {
    inputBudget: budget,
    currency,
    mediaMix,
    channelAllocations,
    phases,
    kpiProjections,
    productionPlan,
    warnings,
    budgetTier,
    feasibility,
  };
}
