/**
 * Roadmap routes — PURE, client-safe (Layer: lib). No db, no LLM, no React.
 *
 * The 3 strategic ambitions of pillar S (Conservateur / Cible / Ambitieux)
 * are a deterministic projection of execution *momentum* (risk coverage +
 * committed initiatives). Extracted from `rtis-protocols/strategy.ts` so the
 * cockpit S editor can render the 3-route selector as a fallback when the
 * stored `S.computed.roadmapRoutes` is empty (e.g. a hand-authored canon S
 * that never ran the protocol) — the selector must never silently disappear.
 *
 * Re-exported by the server strategy protocol for the authoritative compute.
 */

import { ROADMAP_ROUTE_KEYS, INITIATIVE_TIMEFRAMES, type InitiativeBudgetSummary } from "@/lib/types/pillar-schemas";

export type RouteKey = (typeof ROADMAP_ROUTE_KEYS)[number];

/** Campaign envelopes are declared amounts, distinct from initiative estimates
 * and campaign line items. Never add different or unknown monetary units. */
export interface CampaignBudgetSummary {
  totalsByCurrency: Record<string, number>;
  unknownBudgetCount: number;
  unknownCurrencyCount: number;
  totalBudget: number | null;
}

export function aggregateCampaignBudgets(
  campaigns: ReadonlyArray<{ budget: unknown; budgetCurrency?: unknown }>,
): CampaignBudgetSummary {
  const totals = new Map<string, number>();
  let unknownBudgetCount = 0;
  let unknownCurrencyCount = 0;
  for (const campaign of campaigns) {
    const amount = campaign.budget;
    const currency = typeof campaign.budgetCurrency === "string" ? campaign.budgetCurrency.trim() : "";
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) unknownBudgetCount++;
    else if (!currency) unknownCurrencyCount++;
    else totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return {
    totalsByCurrency: Object.fromEntries(totals), unknownBudgetCount, unknownCurrencyCount,
    totalBudget: totals.size === 1 && unknownBudgetCount === 0 && unknownCurrencyCount === 0
      ? [...totals.values()][0]! : null,
  };
}

export function campaignBudgetLabel(summary: CampaignBudgetSummary): string {
  const partial = summary.unknownBudgetCount > 0 || summary.unknownCurrencyCount > 0;
  const fragments = Object.entries(summary.totalsByCurrency)
    .map(([currency, value]) => `${value.toLocaleString("fr-FR")} ${currency}${partial ? " chiffrés" : ""}`);
  if (summary.unknownBudgetCount > 0) fragments.push(`${summary.unknownBudgetCount} budget${summary.unknownBudgetCount > 1 ? "s" : ""} à préciser`);
  if (summary.unknownCurrencyCount > 0) fragments.push(`${summary.unknownCurrencyCount} devise${summary.unknownCurrencyCount > 1 ? "s" : ""} à préciser`);
  return fragments.join(" · ") || "Aucun budget de campagne déclaré";
}

interface RouteSpec {
  key: RouteKey;
  label: string;
  recommended: boolean;
  growthBase: number;
  growthSpan: number;
  cultBump: number;
  description: string;
}

export const ROUTE_SPECS: RouteSpec[] = [
  { key: "CONSERVATIVE", label: "Conservateur", recommended: false, growthBase: 10, growthSpan: 20, cultBump: 8, description: "Statu quo + optimisations marginales." },
  { key: "TARGET", label: "Cible", recommended: true, growthBase: 30, growthSpan: 46.67, cultBump: 16, description: "Activation Engagement + cascade R+T." },
  { key: "AMBITIOUS", label: "Ambitieux", recommended: false, growthBase: 70, growthSpan: 75, cultBump: 25, description: "Programme superfans + expansion régionale." },
];

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

// ── ADR-0089 : jeu de stratégie par route (PURE) ──────────────────────
//   CONSERVATIVE : SELECTED_FOR_ROADMAP court-terme (SPRINT_90 / PHASE_1)
//   TARGET       : toutes les SELECTED_FOR_ROADMAP
//   AMBITIOUS    : SELECTED + RECOMMENDED

export function routeInitiativeSet(
  key: RouteKey,
  initiatives: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const selected = initiatives.filter((a) => a.status === "SELECTED_FOR_ROADMAP");
  switch (key) {
    case "CONSERVATIVE":
      return selected.filter((a) => a.timeframe === "SPRINT_90" || a.timeframe === "PHASE_1");
    case "TARGET":
      return selected;
    case "AMBITIOUS":
      return [...selected, ...initiatives.filter((a) => a.status === "RECOMMENDED")];
  }
}

export function aggregateInitiativeSet(
  set: Array<Record<string, unknown>>,
  riskMatrix: Array<Record<string, unknown>>,
): {
  initiativeIds: string[];
  initiativeCount: number;
  totalBudget?: number;
  budgetSummary: InitiativeBudgetSummary;
  budgetByPhase: Record<string, number>;
  mitigatedRiskIds: string[];
  riskCoverage?: number;
} {
  const budgetOf = (a: Record<string, unknown>) => typeof a.budget === "number" && Number.isFinite(a.budget) && a.budget >= 0 ? a.budget : undefined;
  const budgetSummary: InitiativeBudgetSummary = { knownSubtotal: 0, declaredSubtotal: 0, estimatedSubtotal: 0,
    declaredCount: 0, estimatedCount: 0, unknownCount: 0, unassignedTimeframeCount: 0 };
  const budgetByPhase: Record<string, number> = {};
  const unknownPhases = new Set<string>();
  for (const a of set) {
    const budget = budgetOf(a);
    const tf = typeof a.timeframe === "string" && (INITIATIVE_TIMEFRAMES as readonly string[]).includes(a.timeframe) ? a.timeframe : undefined;
    if (!tf) budgetSummary.unassignedTimeframeCount++;
    if (budget === undefined) {
      budgetSummary.unknownCount++;
      if (tf) unknownPhases.add(tf);
      continue;
    }
    budgetSummary.knownSubtotal += budget;
    if (a.budgetBasis === "QUALITATIVE_ESTIMATE") {
      budgetSummary.estimatedCount++; budgetSummary.estimatedSubtotal += budget;
    } else {
      budgetSummary.declaredCount++; budgetSummary.declaredSubtotal += budget;
    }
    if (tf) budgetByPhase[tf] = (budgetByPhase[tf] ?? 0) + budget;
  }
  for (const phase of unknownPhases) delete budgetByPhase[phase];
  const totalBudget = budgetSummary.unknownCount === 0 ? budgetSummary.knownSubtotal : undefined;
  const initiativeIds = set
    .map((a) => a.id)
    .filter((id): id is string => typeof id === "string");
  const mitigatedRiskIds = [
    ...new Set(set.flatMap((a) => (Array.isArray(a.mitigatesRiskIds) ? (a.mitigatesRiskIds as string[]) : []))),
  ];
  // lafusee:allow-adhoc-completion: risk-mitigation coverage ratio (covered ÷ total risks), not a pillar-completion metric
  const riskCoverage = riskMatrix.length > 0
    ? Math.round(
        (riskMatrix.filter((rk) => typeof rk.id === "string" && mitigatedRiskIds.includes(rk.id as string)).length /
          riskMatrix.length) * 100,
      )
    : undefined;
  return { initiativeIds, initiativeCount: set.length, ...(totalBudget !== undefined ? { totalBudget } : {}), budgetSummary, budgetByPhase, mitigatedRiskIds, riskCoverage };
}

/** Shared client wording for complete/partial amounts and qualitative estimates. */
export function initiativeBudgetLabel(total: unknown, summary: unknown): string {
  const s = summary && typeof summary === "object" ? summary as Partial<InitiativeBudgetSummary> : undefined;
  const amount = typeof total === "number" && Number.isFinite(total) ? total
    : typeof s?.knownSubtotal === "number" && (s.declaredCount ?? 0) + (s.estimatedCount ?? 0) > 0 ? s.knownSubtotal : undefined;
  const parts = amount !== undefined ? [`${new Intl.NumberFormat("fr-FR").format(amount)} F${(s?.unknownCount ?? 0) > 0 ? " chiffrés" : ""}`]
    : (s?.unknownCount ?? 0) > 0 ? [] : ["Budget à préciser"];
  if ((s?.unknownCount ?? 0) > 0) parts.push(`${s!.unknownCount} budget${s!.unknownCount! > 1 ? "s" : ""} à préciser`);
  if ((s?.estimatedCount ?? 0) > 0) parts.push(`${s!.estimatedCount} estimation${s!.estimatedCount! > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export function roadmapAssumptionsLabel(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const assumptions = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof assumptions.riskCoverage === "number") parts.push(`Couverture des risques supposée : ${assumptions.riskCoverage} %`);
  if (typeof assumptions.baseCultIndex === "number") parts.push(`Indice actuel supposé : ${assumptions.baseCultIndex}/100`);
  return parts.length ? parts.join(" · ") : null;
}

export function computeRoadmapRoutes(input: {
  riskCoverage?: number;
  selectedInitiativeCount: number;
  baseRevenue?: number;
  baseCultIndex?: number;
  /** ADR-0089 — backbone complet pour dériver le jeu de stratégie par route. */
  initiatives?: Array<Record<string, unknown>>;
  riskMatrix?: Array<Record<string, unknown>>;
  /** ADR-0089 — ambition retenue ; marque `selected` sur la route correspondante. */
  selectedRouteKey?: RouteKey;
}): Array<Record<string, unknown>> {
  const cov = (input.riskCoverage ?? 30) / 100;
  const sel = Math.min(input.selectedInitiativeCount, 20) / 20;
  const momentum = Math.max(0, Math.min(1, cov * 0.5 + sel * 0.5));
  const baseCult = input.baseCultIndex ?? 60;

  return ROUTE_SPECS.map((r) => {
    const projectedGrowthPct = Math.round(r.growthBase + r.growthSpan * momentum);
    const targetCultIndex = Math.round(clampPct(baseCult + r.cultBump * (0.6 + 0.4 * momentum)));
    const route: Record<string, unknown> = {
      key: r.key,
      label: r.label,
      recommended: r.recommended,
      projectedGrowthPct,
      targetCultIndex,
      description: r.description,
      projectionAssumptions: {
        ...(input.riskCoverage === undefined ? { riskCoverage: 30 } : {}),
        ...(input.baseCultIndex === undefined ? { baseCultIndex: 60 } : {}),
      },
    };
    if (typeof input.baseRevenue === "number" && input.baseRevenue > 0) {
      route.projectedRevenue = Math.round(input.baseRevenue * (1 + projectedGrowthPct / 100));
    }
    if (input.selectedRouteKey) {
      route.selected = r.key === input.selectedRouteKey;
    }
    if (input.initiatives) {
      const set = routeInitiativeSet(r.key, input.initiatives);
      const agg = aggregateInitiativeSet(set, input.riskMatrix ?? []);
      route.initiativeIds = agg.initiativeIds;
      route.initiativeCount = agg.initiativeCount;
      if (agg.totalBudget !== undefined) route.totalBudget = agg.totalBudget;
      route.budgetSummary = agg.budgetSummary;
      route.budgetByPhase = agg.budgetByPhase;
      if (agg.riskCoverage !== undefined) route.riskCoverage = agg.riskCoverage;
    }
    return route;
  });
}
