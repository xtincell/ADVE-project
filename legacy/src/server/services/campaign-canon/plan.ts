/**
 * plan.ts — Planificateur de campagnes canon (ADR-0119). PUR, déterministe, zéro LLM.
 *
 * Depuis les initiatives du Pilier I + les templates canon seedés + le tier de
 * marque, calcule les 3 campagnes canon (GTM_90 / ANNUAL / ALWAYS_ON) : objectifs
 * AARRR, dates, budget conseillé, et la répartition des actions. Les 3 NIVEAUX
 * d'exécution sont dérivés en aval par les outils — ici, un seul budget conseillé.
 */

export interface InitiativeLite {
  id: string;
  /** SPRINT_90 | PHASE_1 | PHASE_2 | LONG_TERM | null */
  timeframe?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
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
  startDate: Date;
  endDate: Date | null;
  recommendedBudget: number;
  actionIds: string[];
}

/** Mappe le timeframe d'une initiative → la campagne canon cible. PUR. */
export function canonTypeForTimeframe(timeframe: string | null | undefined): "GTM_90" | "ANNUAL" | "ALWAYS_ON" {
  switch (timeframe) {
    case "SPRINT_90":
      return "GTM_90";
    case "LONG_TERM":
      return "ALWAYS_ON";
    case "PHASE_1":
    case "PHASE_2":
      return "ANNUAL";
    default:
      return "ANNUAL"; // défaut prudent : la consolidation annuelle
  }
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

function initiativeBudget(i: InitiativeLite): number {
  const v = i.budgetMax ?? i.budgetMin ?? 0;
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Produit le plan des 3 campagnes canon. PUR. Une campagne par template ; les
 * initiatives sont réparties par timeframe ; le budget conseillé = somme des
 * budgets d'initiatives (× multiplicateur tier), sinon part du budget global.
 */
export function planCanonicalCampaigns(opts: {
  initiatives: InitiativeLite[];
  templates: CanonTemplateLite[];
  tierOrdinal: number;
  startDate: Date;
  globalBudget?: number | null;
}): PlannedCampaign[] {
  const mult = tierBudgetMultiplier(opts.tierOrdinal);
  const byType = new Map<string, InitiativeLite[]>();
  for (const i of opts.initiatives) {
    const t = canonTypeForTimeframe(i.timeframe);
    const arr = byType.get(t) ?? [];
    arr.push(i);
    byType.set(t, arr);
  }

  return [...opts.templates]
    .sort((a, b) => a.canonType.localeCompare(b.canonType))
    .map((tpl) => {
      const assigned = byType.get(tpl.canonType) ?? [];
      const summed = assigned.reduce((s, i) => s + initiativeBudget(i), 0);
      const base = summed > 0 ? summed : (opts.globalBudget ?? 0) * tpl.budgetShare;
      const recommendedBudget = Math.round(base * mult);
      const endDate = tpl.isAlwaysOn || tpl.durationDays == null ? null : addDays(opts.startDate, tpl.durationDays);
      return {
        canonType: tpl.canonType,
        label: tpl.label,
        aarrrPrimary: tpl.aarrrPrimary,
        aarrrSecondary: tpl.aarrrSecondary,
        isAlwaysOn: tpl.isAlwaysOn,
        startDate: opts.startDate,
        endDate,
        recommendedBudget,
        actionIds: assigned.map((i) => i.id),
      };
    });
}
