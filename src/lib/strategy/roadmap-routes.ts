/** Deterministic scenario proposals from the existing catalogue. No LLM,
 * performance forecast or execution authorization. ADR-0228. */

import { initiativePreference, ROADMAP_ROUTE_KEYS, INITIATIVE_TIMEFRAMES, type InitiativeBudgetSummary } from "@/lib/types/pillar-schemas";

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
  description: string;
}

export const ROUTE_SPECS: RouteSpec[] = [
  { key: "CONSERVATIVE", label: "Conservateur", recommended: false, description: "Traiter les risques prioritaires avec un ensemble resserré d’actions." },
  { key: "TARGET", label: "Cible", recommended: true, description: "Étendre la couverture aux risques, publics et objectifs du catalogue." },
  { key: "AMBITIOUS", label: "Ambitieux", recommended: false, description: "Élargir les canaux et les étapes d’engagement utiles, sans ajouter les doublons." },
];


// ADR-0228: S selects proposals; catalogue preferences do not preselect a plan.

export function routeInitiativeSet(
  key: RouteKey,
  initiatives: Array<Record<string, unknown>>,
  context: { riskMatrix?: Array<Record<string, unknown>> } = {},
): Array<Record<string, unknown>> {
  // Preferences are input, never a preselected plan. A rejected entry needs
  // explicit reintegration; an AI recommendation is an ordinary candidate.
  const eligible = initiatives.filter(a => typeof a.id === "string"
    && initiativePreference(a) !== "REJECTED"
    && !["CANCELLED", "EXECUTED"].includes(String(a.status)));
  const matrix = context.riskMatrix ?? [];
  const riskIds = new Set(matrix.flatMap(r => typeof r.id === "string" ? [r.id] : []));
  const critical = new Set(matrix.filter(r => Number(r.severity) >= 67
    || (r.impact === "HIGH" && r.probability !== "LOW"))
    .flatMap(r => typeof r.id === "string" ? [`risk:${r.id}`] : []));
  const strings = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const features = (a: Record<string, unknown>) => new Set([
    ...strings(a.mitigatesRiskIds).filter(id => !matrix.length || riskIds.has(id)).map(id => `risk:${id}`),
    ...strings(a.targetsPersonaIds).map(id => `persona:${id}`),
    ...(typeof a.pilierImpact === "string" ? [`pillar:${a.pilierImpact}`] : []),
    ...(typeof a.channel === "string" ? [`channel:${a.channel}`] : []),
    ...(typeof a.devotionImpact === "string" ? [`devotion:${a.devotionImpact}`] : []),
  ]);
  const featureMap = new Map(eligible.map(a => [a.id, features(a)]));
  const allFeatures = new Set([...featureMap.values()].flatMap(f => [...f]));
  const baseObjectives = new Set([...allFeatures].filter(f => !f.startsWith("channel:") && !f.startsWith("devotion:")));
  // Coverage first, then catalogue preference, then known cost. No arbitrary
  // action quota, fabricated budget ceiling or percentage of the catalogue.
  const cost = (a: Record<string, unknown>) => typeof a.budget === "number" && Number.isFinite(a.budget) && a.budget >= 0 ? a.budget : Infinity;
  const compare = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    Number(initiativePreference(b) === "FAVORITE") - Number(initiativePreference(a) === "FAVORITE")
    || cost(a) - cost(b) || String(a.id).localeCompare(String(b.id));
  const selected: Array<Record<string, unknown>> = [];
  const covered = new Set<string>();
  const include = (a: Record<string, unknown>) => { selected.push(a); for (const f of featureMap.get(a.id) ?? []) covered.add(f); };
  const extend = (objectives: Set<string>, pool: typeof eligible) => {
    while ([...objectives].some(f => !covered.has(f))) {
      const ranked = pool.filter(a => !selected.some(x => x.id === a.id)).map(a => ({ a,
        gain: [...(featureMap.get(a.id) ?? [])].filter(f => objectives.has(f) && !covered.has(f)).length,
      })).filter(x => x.gain > 0).sort((a, b) => b.gain - a.gain || compare(a.a, b.a));
      if (!ranked[0]) break;
      include(ranked[0].a);
    }
  };
  const shortTerm = eligible.filter(a => a.timeframe !== "LONG_TERM" && a.timeframe !== "PHASE_2");
  extend(critical, shortTerm);
  if (!selected.length && shortTerm.length) include([...shortTerm].sort(compare)[0]!);
  if (key === "CONSERVATIVE") return selected;
  extend(baseObjectives, eligible);
  if (!selected.length && eligible.length) include([...eligible].sort(compare)[0]!);
  if (key === "TARGET") return selected;
  extend(allFeatures, eligible);
  return selected;
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


  return ROUTE_SPECS.map((r) => {


    const route: Record<string, unknown> = {
      key: r.key,
      label: r.label,
      recommended: r.recommended,

      description: r.description,
      projectionAssumptions: {},
    };
    if (input.selectedRouteKey) {
      route.selected = r.key === input.selectedRouteKey;
    }
    if (input.initiatives) {
      const set = routeInitiativeSet(r.key, input.initiatives, { riskMatrix: input.riskMatrix });
      const agg = aggregateInitiativeSet(set, input.riskMatrix ?? []);
      route.initiativeIds = agg.initiativeIds;
      route.selectionBasis = "CATALOGUE_COVERAGE_RULES_V1";
      route.selectionReasons = set.map(a => ({ initiativeId: a.id,
        reasons: [initiativePreference(a) === "FAVORITE" ? "Favori du catalogue" : "Candidat neutre du catalogue",
          ...(Array.isArray(a.mitigatesRiskIds) && a.mitigatesRiskIds.length ? ["Liens aux risques à traiter"] : []),
          ...(Array.isArray(a.targetsPersonaIds) && a.targetsPersonaIds.length ? ["Publics ciblés"] : []),
          ...(a.pilierImpact ? [`Objectif ${a.pilierImpact}`] : []),
          ...(a.channel ? [`Canal ${a.channel}`] : [])],
      }));
      route.initiatives = set.map(a => ({ id: a.id, action: a.action, objectif: a.objectif, channel: a.channel,
        preference: initiativePreference(a), ...(typeof a.budget === "number" ? { budget: a.budget } : {}),
        budgetBasis: a.budgetBasis, ...(a.timeframe ? { timeframe: a.timeframe } : {}),
        mitigatesRiskIds: Array.isArray(a.mitigatesRiskIds) ? a.mitigatesRiskIds : [],
      }));
      route.initiativeCount = agg.initiativeCount;
      if (agg.totalBudget !== undefined) route.totalBudget = agg.totalBudget;
      route.budgetSummary = agg.budgetSummary;
      route.budgetByPhase = agg.budgetByPhase;
      if (agg.riskCoverage !== undefined) route.riskCoverage = agg.riskCoverage;
    }
    return route;
  });
}

/** Membership of the saved current scenario, not operational execution flags.
 * Legacy routes must be recalculated before they can be used as this contract. */
export function currentScenarioIds(s: unknown): Set<string> {
  const content = s && typeof s === "object" ? s as Record<string, unknown> : {};
  const computed = content.computed as Record<string, unknown> | undefined;
  const routes = Array.isArray(computed?.roadmapRoutes) ? computed.roadmapRoutes as Array<Record<string, unknown>> : [];
  const route = routes.find(r => r.key === computed?.selectedRouteKey && r.selectionBasis === "CATALOGUE_COVERAGE_RULES_V1");
  return new Set(Array.isArray(route?.initiativeIds) ? route.initiativeIds.filter((id): id is string => typeof id === "string") : []);
}
