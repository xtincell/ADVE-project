/**
 * plan.ts — Planificateur de campagnes canon (ADR-0119). PUR, déterministe, zéro LLM.
 *
 * Depuis les initiatives du Pilier I + les templates canon seedés + le tier de
 * marque, calcule les 3 campagnes canon (GTM_90 / ANNUAL / ALWAYS_ON) : objectifs
 * AARRR, dates, budget conseillé, et la répartition des actions. Les 3 NIVEAUX
 * d'exécution sont dérivés en aval par les outils — ici, un seul budget conseillé.
 */

import { aggregateInitiativeSet } from "@/lib/strategy/roadmap-routes";
import { CAMPAIGN_CANON_TYPES, INITIATIVE_CADENCES, type InitiativeBudgetSummary } from "@/lib/types/pillar-schemas";

export interface InitiativeLite {
  id: string;
  /** SPRINT_90 | PHASE_1 | PHASE_2 | LONG_TERM | null */
  timeframe?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  budget?: number;
  budgetRange?: { min: number; max: number };
  budgetPeriod?: string;
  budgetBasis?: string;
  campaignCanonType?: string;
  cadence?: string;
}

export interface CanonTemplateLite {
  canonType: string; // GTM_90 | ANNUAL | ALWAYS_ON
  label: string;
  aarrrPrimary: string;
  aarrrSecondary: string;
  durationDays: number | null;
  isAlwaysOn: boolean;
  budgetShare: number;
}

export interface PlannedCampaign {
  canonType: string;
  label: string;
  aarrrPrimary: string;
  aarrrSecondary: string;
  isAlwaysOn: boolean;
  startDate: Date | null;
  endDate: Date | null;
  recommendedBudget: number | null;
  budgetSummary: InitiativeBudgetSummary;
  actionIds: string[];
}

/** A time horizon is not a recurrence. Long term is never proof of always-on. */
export function canonTypeForTimeframe(timeframe: string | null | undefined): "GTM_90" | "ANNUAL" | null {
  if (timeframe === "SPRINT_90") return "GTM_90";
  if (["PHASE_1", "PHASE_2"].includes(timeframe ?? "")) return "ANNUAL";
  return null;
}

/** Preserve an explicit campaign family. Cadence and monetary period remain
 * independent: a monthly campaign can have both setup and recurring costs. */
export function canonTypeForInitiative(i: InitiativeLite): string | null {
  if ((CAMPAIGN_CANON_TYPES as readonly unknown[]).includes(i.campaignCanonType)) return i.campaignCanonType!;
  if (i.timeframe === "SPRINT_90") return "GTM_90";
  if (i.cadence !== "ONE_SHOT" && (INITIATIVE_CADENCES as readonly unknown[]).includes(i.cadence)) return "ALWAYS_ON";
  const horizon = canonTypeForTimeframe(i.timeframe);
  if (horizon) return horizon;
  if (i.cadence === "ONE_SHOT") return "PUNCTUAL";
  return null;
}

export function campaignInitiativeBudget(i: InitiativeLite): Record<string, unknown> {
  const min = i.budgetRange?.min ?? i.budgetMin;
  const max = i.budgetRange?.max ?? i.budgetMax;
  const bounded = typeof min === "number" && Number.isFinite(min) && min >= 0
    && typeof max === "number" && Number.isFinite(max) && max >= min;
  return { id: i.id, timeframe: i.timeframe, budgetPeriod: i.budgetPeriod, budgetBasis: i.budgetBasis,
    ...(bounded && min !== max ? { budgetRange: { min, max } }
      : { budget: typeof i.budget === "number" ? i.budget : bounded ? min : undefined }) };
}

/**
 * Multiplicateur de budget selon le tier de marque (0=LATENT … 7=ICONE).
 * Plus la marque est mature, plus l'enveloppe conseillée est large. PUR.
 */
export function tierBudgetMultiplier(tierOrdinal: number): number {
  const o = Number.isFinite(tierOrdinal) ? Math.max(0, Math.min(7, tierOrdinal)) : 0;
  return Math.round((0.7 + o * 0.05) * 100) / 100; // 0.70 (LATENT) → 1.05 (ICONE)
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Produit le plan des 3 campagnes canon. PUR. Une campagne par template ; les
 * initiatives sont réparties par timeframe ; le budget conseillé = somme des
 * budgets d'initiatives comparables. Les bornes et périodes restent explicites ;
 * les coefficients de templates/tier ne remplacent pas les coûts source.
 */
export function planCanonicalCampaigns(opts: {
  initiatives: InitiativeLite[];
  templates: CanonTemplateLite[];
  tierOrdinal: number;
  startDate: Date | null;
  globalBudget?: number | null;
}): PlannedCampaign[] {
  const byType = new Map<string, InitiativeLite[]>();
  for (const i of opts.initiatives) {
    const t = canonTypeForInitiative(i);
    if (!t) continue;
    const arr = byType.get(t) ?? [];
    arr.push(i);
    byType.set(t, arr);
  }

  return [...opts.templates]
    .sort((a, b) => a.canonType.localeCompare(b.canonType))
    .map((tpl) => {
      const assigned = byType.get(tpl.canonType) ?? [];
      const amounts = aggregateInitiativeSet(assigned.map(campaignInitiativeBudget), []);
      // A template share or brand tier cannot alter actual source costs. No
      // action, unknown cost, range or recurring unit => no scalar envelope.
      const recommendedBudget = assigned.length ? amounts.totalBudget ?? null : null;
      const endDate = !opts.startDate || tpl.isAlwaysOn || tpl.durationDays == null ? null : addDays(opts.startDate, tpl.durationDays);
      return {
        canonType: tpl.canonType,
        label: tpl.label,
        aarrrPrimary: tpl.aarrrPrimary,
        aarrrSecondary: tpl.aarrrSecondary,
        isAlwaysOn: tpl.isAlwaysOn,
        startDate: opts.startDate,
        endDate,
        recommendedBudget,
        budgetSummary: amounts.budgetSummary,
        actionIds: assigned.map((i) => i.id),
      };
    });
}
