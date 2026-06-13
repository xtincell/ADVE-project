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

import { ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";

export type RouteKey = (typeof ROADMAP_ROUTE_KEYS)[number];

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
  totalBudget: number;
  budgetByPhase: Record<string, number>;
  mitigatedRiskIds: string[];
  riskCoverage?: number;
} {
  const budgetOf = (a: Record<string, unknown>) => (typeof a.budget === "number" ? a.budget : 0);
  const totalBudget = set.reduce((sum, a) => sum + budgetOf(a), 0);
  const budgetByPhase: Record<string, number> = {};
  for (const a of set) {
    const tf = typeof a.timeframe === "string" ? a.timeframe : "LONG_TERM";
    budgetByPhase[tf] = (budgetByPhase[tf] ?? 0) + budgetOf(a);
  }
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
  return { initiativeIds, initiativeCount: set.length, totalBudget, budgetByPhase, mitigatedRiskIds, riskCoverage };
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
      route.totalBudget = agg.totalBudget;
      route.budgetByPhase = agg.budgetByPhase;
      if (agg.riskCoverage !== undefined) route.riskCoverage = agg.riskCoverage;
    }
    return route;
  });
}
