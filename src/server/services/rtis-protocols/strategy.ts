/**
 * PROTOCOLE STRATEGY (S) — deterministic projection of the chosen I set.
 * Reads A/D/V/E/R/T/I/S; never chooses, promotes or writes initiatives.
 * Narrative assistance remains explicit in Notoria. Sparse sources remain a
 * partial draft; the strict review contract is not padded or weakened.
 */

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import { collectNormalizedInitiatives, ROADMAP_ROUTE_KEYS, INITIATIVE_TIMEFRAMES } from "@/lib/types/pillar-schemas";
import {
  computeRoadmapRoutes,
  routeInitiativeSet,
  aggregateInitiativeSet,
  type RouteKey,
} from "@/lib/strategy/roadmap-routes";

// Re-export for backward compatibility (authoritative server compute).
export { computeRoadmapRoutes };

// Calculation consumes existing decisions. Narrative assistance belongs to the
// explicit Notoria path and is never a prerequisite for reading the roadmap.

// ── Types ──────────────────────────────────────────────────────────────

export interface ProtocoleStrategyResult {
  pillarKey: "s";
  content: Record<string, unknown>;
  confidence: number;
  selectedFromICount: number;
  error?: string;
}

// ── Compose only what the source actually contains ───────────────────

type Tf = (typeof INITIATIVE_TIMEFRAMES)[number];
const TF_PHASE_LABEL: Record<Tf, string> = { SPRINT_90: "Sprint 90 jours", PHASE_1: "Phase 1", PHASE_2: "Phase 2", LONG_TERM: "Long terme" };
const PILLAR_LABEL: Record<string, string> = { A: "Authenticité", D: "Distinction", V: "Valeur", E: "Engagement" };

function generateStrategy(pillars: Record<string, Record<string, unknown> | null>): Record<string, unknown> {
  const selected = collectNormalizedInitiatives(pillars.i).filter(a => a.status === "SELECTED_FOR_ROADMAP");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const identity = (id: string) => ({ sourceRef: id, ...(uuid.test(id) ? { sourceInitiativeId: id } : {}) });
  const aggregate = (actions: typeof selected) => aggregateInitiativeSet(actions as unknown as Array<Record<string, unknown>>, []);
  const selectedBudget = aggregate(selected);
  const roadmap = [...INITIATIVE_TIMEFRAMES, undefined].flatMap(tf => {
    const actions = selected.filter(a => a.timeframe === tf);
    const amounts = aggregate(actions);
    return actions.length ? [{ phase: tf ? TF_PHASE_LABEL[tf] : "Échéance à préciser", objectif: actions.map(a => a.objectif).filter(Boolean).join(" ; ").slice(0, 200),
      actions: actions.map(a => a.action), ...(amounts.totalBudget !== undefined ? { budget: amounts.totalBudget } : {}), budgetSummary: amounts.budgetSummary }] : [];
  });
  const axesStrategiques = [...new Set(selected.map(a => a.pilierImpact).filter(Boolean))].map(key => ({
    axe: `Activer ${PILLAR_LABEL[key!] ?? key}`, pillarsLinked: [key, "S"],
    kpis: selected.filter(a => a.pilierImpact === key).map(a => a.objectif).filter(Boolean),
  }));
  const r = pillars.r ?? {};
  const mitigations = Array.isArray(r.mitigationPriorities) ? r.mitigationPriorities as Array<Record<string, unknown>> : [];
  const facteursClesSucces = mitigations.flatMap(m => typeof m.action === "string" && m.action.trim() ? [m.action] : []);
  const overton = pillars.t?.overtonPosition as Record<string, unknown> | undefined;
  const gap = pillars.t?.perceptionGap as Record<string, unknown> | undefined;
  const prophecy = pillars.a?.prophecy;
  const target = gap?.targetPerception ?? (typeof prophecy === "string" ? prophecy : (prophecy as Record<string, unknown> | undefined)?.worldTransformed);
  const current = overton?.currentPerception ?? gap?.currentPerception;
  const fenetreOverton = {
    ...(typeof current === "string" && current.trim() ? { perceptionActuelle: current } : {}),
    ...(typeof target === "string" && target.trim() ? { perceptionCible: target } : {}),
    ...(typeof gap?.gapDescription === "string" && gap.gapDescription.trim() ? { ecart: gap.gapDescription } : {}),
    strategieDeplacement: selected.map((a, index) => ({ etape: `Étape ${index + 1}`, action: a.action, canal: a.channel,
      ...(a.timeframe ? { horizon: TF_PHASE_LABEL[a.timeframe] } : {}), ...(a.devotionImpact ? { devotionTarget: a.devotionImpact } : {}) })),
  };
  // Only an actual declared level assigns money. Unknown is not acquisition;
  // action counts are not currency, nor are unobserved audience counts zero.
  const buckets: Record<string, string> = { SPECTATEUR: "acquisition", INTERESSE: "acquisition", PARTICIPANT: "conversion",
    ENGAGE: "retention", AMBASSADEUR: "evangelisation", EVANGELISTE: "evangelisation" };
  const budgetByDevotion: Record<string, number> = {};
  for (const bucket of new Set(Object.values(buckets))) {
    const actions = selected.filter(a => a.devotionImpact && buckets[a.devotionImpact] === bucket);
    const amount = aggregate(actions).totalBudget;
    if (actions.length && amount !== undefined) budgetByDevotion[bucket] = amount;
  }
  return {
    selectedFromI: selected.map((a, index) => ({ ...identity(a.id), action: a.action, ...(a.timeframe ? { phase: TF_PHASE_LABEL[a.timeframe] } : {}), priority: index + 1 })),
    roadmap,
    sprint90Days: selected.filter(a => a.timeframe === "SPRINT_90").map((a, index) => ({ ...identity(a.id), action: a.action,
      ...(a.objectif ? { kpi: a.objectif } : {}), priority: index + 1, ...(a.devotionImpact ? { devotionImpact: a.devotionImpact } : {}) })),
    fenetreOverton, axesStrategiques, facteursClesSucces, ...(selectedBudget.totalBudget !== undefined ? { globalBudget: selectedBudget.totalBudget } : {}), budgetByDevotion,
    syntheseExecutive: `${selected.length} action(s) conservée(s) dans le catalogue. Montants chiffrés : ${selectedBudget.budgetSummary.knownSubtotal}, dont ${selectedBudget.budgetSummary.estimatedCount} estimation(s). ${selectedBudget.budgetSummary.unknownCount} budget(s) et ${selectedBudget.budgetSummary.unassignedTimeframeCount} échéance(s) à préciser. Ces montants ne constituent pas une dépense mesurée.`,
    kpiDashboard: [], devotionFunnel: [], overtonMilestones: [],
  };
}

// ── computeRoadmapRoutes : 3 trajectoires (PURE, no LLM) ──────────────
// Conservateur / Cible (recommandé) / Ambitieux. The numbers are a
// deterministic projection of execution *momentum* (risk coverage + how many
// initiatives are selected) — the LLM is NOT pertinent here, so it is never
// called. Each route = base ambition + momentum-scaled span. Tuned so a
// momentum of ~0.6 yields roughly +22 / +58 / +115 % growth.

// ── computePillarS : PURE COMPUTED DASHBOARD (ADR-0088 + ADR-0089) ────
// S accepts no static text input — its numeric dashboard is aggregated from
// the relational backbone : selected initiatives (status=SELECTED_FOR_ROADMAP)
// + their budgets/FK risk links, the risk matrix, and T.overtonPosition. Pure,
// deterministic, reused by executeProtocoleStrategy AND the recommendation
// apply path (so S recomputes whenever an initiative is selected/linked).
//
// ADR-0089 — l'ambition retenue (`selectedRouteKey`, default TARGET) pilote
// le dashboard principal : les agrégations portent sur le JEU DE STRATÉGIE de
// la route sélectionnée. La sélection est persistée dans computed et survit
// aux recomputes (lue depuis le S précédent via `pillars.s`).

export function computePillarS(
  pillars: Record<string, Record<string, unknown> | null>,
  opts?: { roadmap?: unknown[]; baseRevenue?: number; baseCultIndex?: number; selectedRouteKey?: RouteKey },
): Record<string, unknown> {
  const i = pillars.i ?? {};
  const r = pillars.r ?? {};
  const t = pillars.t ?? {};

  // Base d'actions normalisée (format unifié + budget numérique dérivé de
  // budgetEstime) → les agrégations budget/risque de S sont cohérentes même
  // quand les actions n'ont qu'un budget qualitatif (canon, génération LLM).
  const initiatives = collectNormalizedInitiatives(i) as unknown as Array<Record<string, unknown>>;
  const selected = initiatives.filter((a) => a.status === "SELECTED_FOR_ROADMAP");

  // ADR-0089 — résolution de l'ambition retenue : override explicite >
  // sélection persistée dans le S précédent > default TARGET.
  const prevComputed = (pillars.s?.computed ?? {}) as Record<string, unknown>;
  const prevKey = typeof prevComputed.selectedRouteKey === "string"
    && (ROADMAP_ROUTE_KEYS as readonly string[]).includes(prevComputed.selectedRouteKey)
    ? (prevComputed.selectedRouteKey as RouteKey)
    : undefined;
  const selectedRouteKey: RouteKey = opts?.selectedRouteKey ?? prevKey ?? "TARGET";

  const matrix = Array.isArray(r.probabilityImpactMatrix)
    ? (r.probabilityImpactMatrix as Array<Record<string, unknown>>)
    : [];

  // Dashboard principal = agrégations sur le jeu de la route sélectionnée.
  // TARGET (default) = toutes les SELECTED_FOR_ROADMAP — identique au
  // comportement pré-ADR-0089.
  const activeSet = routeInitiativeSet(selectedRouteKey, initiatives);
  const agg = aggregateInitiativeSet(activeSet, matrix);

  // Momentum des projections : toujours le jeu TARGET (scénarios invariants).
  const targetAgg = selectedRouteKey === "TARGET" ? agg : aggregateInitiativeSet(selected, matrix);

  const overtonPos = t.overtonPosition as Record<string, unknown> | undefined;
  const percGap = t.perceptionGap as Record<string, unknown> | undefined;
  const overtonPosition = overtonPos || percGap
    ? {
        current: (overtonPos?.currentPerception ?? percGap?.currentPerception ?? "Non mesurée") as string,
        target: (percGap?.targetPerception ?? "Non définie") as string,
        ...(typeof percGap?.gapScore === "number" ? { gapScore: percGap.gapScore as number } : {}),
      }
    : undefined;

  // Each unresolved cross-pillar coherence risk costs 15 points (floored at 0).
  const coherenceRisks = Array.isArray(r.coherenceRisks) ? (r.coherenceRisks as unknown[]) : undefined;
  const coherenceScore = coherenceRisks ? Math.max(0, 100 - Math.min(100, coherenceRisks.length * 15)) : undefined;

  const devotionFunnel: unknown[] = [];

  // 3 roadmap trajectories — PURE projection, no LLM (ADR-0088). Chaque route
  // porte son jeu de stratégie calculé (ADR-0089).
  const roadmapRoutes = computeRoadmapRoutes({
    riskCoverage: targetAgg.riskCoverage,
    selectedInitiativeCount: selected.length,
    baseRevenue: opts?.baseRevenue,
    baseCultIndex: opts?.baseCultIndex,
    initiatives,
    riskMatrix: matrix,
    selectedRouteKey,
  });

  return {
    ...(agg.totalBudget !== undefined ? { totalBudget: agg.totalBudget } : {}),
    budgetSummary: agg.budgetSummary,
    budgetByPhase: agg.budgetByPhase,
    ...(agg.riskCoverage !== undefined ? { riskCoverage: agg.riskCoverage } : {}),
    mitigatedRiskIds: agg.mitigatedRiskIds,
    selectedInitiativeCount: agg.initiativeCount,
    ...(devotionFunnel ? { devotionFunnel } : {}),
    ...(overtonPosition ? { overtonPosition } : {}),
    ...(coherenceScore !== undefined ? { coherenceScore } : {}),
    roadmapRoutes,
    selectedRouteKey,
    computedAt: new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────

export async function executeProtocoleStrategy(strategyId: string, transaction?: Prisma.TransactionClient, selectedRouteKey?: RouteKey): Promise<ProtocoleStrategyResult> {
  try {
    // Load ALL 8 piliers (A through S) — ADR-0089 : le S précédent porte la
    // sélection d'ambition (computed.selectedRouteKey), qui survit aux regens.
    const dbPillars = await (transaction ?? db).pillar.findMany({
      where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    });
    const pillars: Record<string, Record<string, unknown> | null> = {};
    for (const p of dbPillars) {
      pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;
    }
    // An explicit route decision is part of this calculation, not a preliminary
    // persisted S version. Source initiatives remain untouched.
    if (selectedRouteKey) {
      const previous = pillars.s ?? {};
      pillars.s = { ...previous, computed: { ...((previous.computed ?? {}) as Record<string, unknown>), selectedRouteKey } };
    }

    const strategyContent = generateStrategy(pillars);
    const ue = (pillars.v?.unitEconomics ?? {}) as Record<string, unknown>;
    // Absence participates in concurrency checking, including a previously absent S.
    const versions = new Map(dbPillars.map(p => [p.key, p.currentVersion]));
    strategyContent._sourcePillarVersions = Object.fromEntries(PILLAR_STORAGE_KEYS.map(key => [key, versions.get(key) ?? null]));

    // Pure computed dashboard (ADR-0088) — aggregations over the relational
    // backbone. Recomputed here and again by the recommendation apply path
    // whenever an initiative is selected/linked.
    strategyContent.computed = computePillarS(pillars, {
      roadmap: strategyContent.roadmap as unknown[],
      baseRevenue: typeof ue.caVise === "number" ? ue.caVise : undefined,
    });

    // Count selectedFromI
    const selectedFromI = (strategyContent.selectedFromI ?? []) as unknown[];

    // A deterministic total proves neither strategic quality nor human review.
    const confidence = 0;

    return { pillarKey: "s", content: strategyContent, confidence, selectedFromICount: selectedFromI.length };
  } catch (err) {
    return {
      pillarKey: "s",
      content: {},
      confidence: 0,
      selectedFromICount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
