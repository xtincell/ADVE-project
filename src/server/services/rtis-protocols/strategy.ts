import { projectDevotionFunnel } from "@/domain/devotion-ladder";
import { projectFinancialPillar } from "@/domain/unit-economics";
/**
 * PROTOCOLE STRATEGY (S) — deterministic projection of the chosen I set.
 * Reads A/D/V/E/R/T/I/S; proposes scenario subsets without changing I or arming execution.
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
  initiativeBudgetLabel,
  type RouteKey,
} from "@/lib/strategy/roadmap-routes";
import { canonTypeForInitiative } from "@/server/services/campaign-canon/plan";
import { summarizeCrossReferences, validatePillarCrossReferences } from "@/server/services/cross-validator";

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

/** Source targets are goals, never measurements. Do not guess a cadence or
 * choose an arbitrary KPI as the North Star when the source does not name it. */
function sourceFrequency(value: unknown): "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const frequencies: Record<string, "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY"> = {
    DAILY: "DAILY", QUOTIDIEN: "DAILY", QUOTIDIENNE: "DAILY", WEEKLY: "WEEKLY", HEBDOMADAIRE: "WEEKLY", HEBDO: "WEEKLY",
    MONTHLY: "MONTHLY", MENSUEL: "MONTHLY", MENSUELLE: "MONTHLY", QUARTERLY: "QUARTERLY", TRIMESTRIEL: "QUARTERLY", TRIMESTRIELLE: "QUARTERLY",
  };
  return frequencies[key];
}

export function generateStrategy(pillars: Record<string, Record<string, unknown> | null>, routeKey: RouteKey): Record<string, unknown> {
  const matrix = Array.isArray(pillars.r?.probabilityImpactMatrix) ? pillars.r!.probabilityImpactMatrix as Array<Record<string, unknown>> : [];
  const selected = routeInitiativeSet(routeKey, collectNormalizedInitiatives(pillars.i) as unknown as Array<Record<string, unknown>>, { riskMatrix: matrix }) as unknown as ReturnType<typeof collectNormalizedInitiatives>;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const identity = (id: string) => ({ sourceRef: id, ...(uuid.test(id) ? { sourceInitiativeId: id } : {}) });
  const aggregate = (actions: typeof selected) => aggregateInitiativeSet(actions as unknown as Array<Record<string, unknown>>, [], pillars.v?.strategyBudgetModel);
  const selectedBudget = aggregate(selected);
  const rows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)) : [];
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
  const kpiDefinitions = rows(pillars.e?.kpis).flatMap((kpi) => {
    const name = text(kpi.name), target = text(kpi.target) ?? (typeof kpi.target === "number" && Number.isFinite(kpi.target) ? String(kpi.target) : undefined);
    const frequency = sourceFrequency(kpi.frequency);
    if (!name) return [];
    const qualification = kpi.qualification === "PROPOSED" || kpi.qualification === "DECLARED" ? kpi.qualification : undefined;
    return [{ name, target: target ?? null, frequency: frequency ?? null, pillar: "E" as const,
      ...(qualification ? { qualification } : {}),
      ...Object.fromEntries(["definition", "unit", "observationWindow", "targetContext", "sourceNotes"]
        .flatMap(key => text(kpi[key]) ? [[key, kpi[key]]] : [])),
    }];
  });
  // The dashboard contains actionable goals. A documented North Star definition
  // remains useful even while its numeric goal or monitoring cadence is pending.
  const kpiDashboard = kpiDefinitions.filter(kpi => kpi.target !== null && kpi.frequency !== null);
  const northStars = kpiDefinitions.filter(kpi => /\bnorth[\s-]*star\b|\betoile polaire\b/i.test(kpi.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
  // Multiple explicit candidates need a decision; array ordering is not one.
  const northStar = northStars.length === 1 ? northStars[0] : undefined;
  const teamStructure = rows(pillars.a?.equipeDirigeante).flatMap(member => {
    const name = text(member.nom), title = text(member.role), responsibility = text(member.responsabilites) ?? text(member.bio);
    return name && title && responsibility ? [{ name, title, responsibility }] : [];
  });
  const campaignGroups = new Map<string, typeof selected>();
  for (const action of selected) {
    const key = [canonTypeForInitiative(action) ?? "UNASSIGNED", action.cadence ?? "", action.budgetPeriod ?? ""].join(":");
    const group = campaignGroups.get(key) ?? []; group.push(action); campaignGroups.set(key, group);
  }
  const campaignLabels: Record<string, string> = { GTM_90: "Lancement / traction 90 jours", ANNUAL: "Programme annuel", ALWAYS_ON: "Boucle permanente", PUNCTUAL: "Activation ponctuelle" };
  const roadmap = [...campaignGroups.values()].map(actions => {
    const amounts = aggregate(actions);
    const first = actions[0]!, canonType = canonTypeForInitiative(first);
    return { phase: canonType ? campaignLabels[canonType] : "Campagne à qualifier", ...(canonType ? { canonType } : {}),
      ...(first.cadence ? { cadence: first.cadence } : {}),
      objectif: actions.map(a => a.objectif).filter(Boolean).join(" ; "),
      actions: actions.map(a => a.action), actionRefs: actions.map(a => a.id),
      ...(amounts.totalBudget !== undefined ? { budget: amounts.totalBudget } : {}), budgetSummary: amounts.budgetSummary };
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
    if (amount !== undefined && (actions.length || selectedBudget.budgetSummary.plan)) budgetByDevotion[bucket] = amount;
  }
  return {
    ...(typeof target === "string" && target.trim() ? { visionStrategique: target } : {}),
    overtonMilestones: selected.filter(a => a.overtonShift && typeof current === "string" && current.trim()).map(a => ({
      phase: a.timeframe ? TF_PHASE_LABEL[a.timeframe] : "Échéance à préciser", currentPerception: current, targetPerception: a.overtonShift,
      ...(a.objectif ? { measurementMethod: `Objectif à vérifier : ${a.objectif}` } : {}),
    })),
    rejectedFromI: collectNormalizedInitiatives(pillars.i).filter(a => a.preference === "REJECTED").map(a => ({ ...identity(a.id), action: a.action, reason: "Rejetée dans le catalogue" })),
    selectedFromI: selected.map((a, index) => ({ ...identity(a.id), action: a.action, ...(a.timeframe ? { phase: TF_PHASE_LABEL[a.timeframe] } : {}), priority: index + 1 })),
    roadmap,
    sprint90Days: selected.filter(a => a.timeframe === "SPRINT_90").map((a, index) => ({ ...identity(a.id), action: a.action,
      ...(a.objectif ? { kpi: a.objectif } : {}), priority: index + 1,
      isRiskMitigation: a.mitigatesRiskIds.some(id => matrix.some(risk => risk.id === id)),
      ...(a.devotionImpact ? { devotionImpact: a.devotionImpact } : {}) })),
    ...(selectedBudget.budgetSummary.plan ? { budgetBreakdown: Object.fromEntries(Object.entries(selectedBudget.budgetSummary.plan.byCategory).map(([k, range]) => [k, range.max])) } : {}),
    fenetreOverton, axesStrategiques, facteursClesSucces, ...(selectedBudget.totalBudget !== undefined ? { globalBudget: selectedBudget.totalBudget } : {}), budgetByDevotion,
    syntheseExecutive: `${selected.length} action(s) proposée(s) pour ce scénario depuis le catalogue. ${initiativeBudgetLabel(selectedBudget.totalBudget, selectedBudget.budgetSummary)}. ${selectedBudget.budgetSummary.unassignedTimeframeCount} horizon(s) à préciser. Ces montants ne constituent pas une dépense mesurée.`,
    kpiDashboard, ...(northStar ? { northStarKPI: Object.fromEntries(Object.entries(northStar).filter(([key]) => key !== "pillar")) } : {}),
    ...(teamStructure.length ? { teamStructure } : {}), devotionFunnel: projectDevotionFunnel(pillars.e?.devotionProjection),
    recommandationsPrioritaires: selected.map((a, index) => ({ recommendation: a.action, source: "I", priority: index + 1 })),
  };
}

// The same deterministic scenario sets feed both the dashboard and its plan.
// A source objective is retained verbatim; no sales forecast or KPI is invented.

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
  const activeSet = routeInitiativeSet(selectedRouteKey, initiatives, { riskMatrix: matrix });
  const agg = aggregateInitiativeSet(activeSet, matrix, pillars.v?.strategyBudgetModel);

  // Momentum des projections : toujours le jeu TARGET (scénarios invariants).
  const targetAgg = selectedRouteKey === "TARGET" ? agg : aggregateInitiativeSet(routeInitiativeSet("TARGET", initiatives, { riskMatrix: matrix }), matrix, pillars.v?.strategyBudgetModel);

  const overtonPos = t.overtonPosition as Record<string, unknown> | undefined;
  const percGap = t.perceptionGap as Record<string, unknown> | undefined;
  const overtonPosition = overtonPos || percGap
    ? {
        current: (overtonPos?.currentPerception ?? percGap?.currentPerception ?? "Non mesurée") as string,
        target: (percGap?.targetPerception ?? "Non définie") as string,
        ...(typeof percGap?.gapScore === "number" ? { gapScore: percGap.gapScore as number } : {}),
      }
    : undefined;

  // A count of unresolved observations is not a measured coherence score.
  const coherenceRisks = Array.isArray(r.coherenceRisks) ? (r.coherenceRisks as unknown[]) : undefined;
  const coherenceIssueCount = coherenceRisks?.length;

  const devotionFunnel = projectDevotionFunnel(pillars.e?.devotionProjection);

  // 3 roadmap trajectories — PURE projection, no LLM (ADR-0088). Chaque route
  // porte son jeu de stratégie calculé (ADR-0089).
  const roadmapRoutes = computeRoadmapRoutes({
    planning: pillars.v?.strategyBudgetModel,
    riskCoverage: targetAgg.riskCoverage,
    selectedInitiativeCount: activeSet.length,
    baseRevenue: opts?.baseRevenue,
    baseCultIndex: opts?.baseCultIndex,
    initiatives,
    riskMatrix: matrix,
    selectedRouteKey,
  });

  // Validate the plan being produced, not the previous stored S. The existing
  // cross-validator owns the formula; risk observations are a different count.
  const coherenceChecks = validatePillarCrossReferences({ ...pillars,
    s: generateStrategy(pillars, selectedRouteKey) });
  const coherenceSummary = summarizeCrossReferences(coherenceChecks);

  return {
    ...(agg.totalBudget !== undefined ? { totalBudget: agg.totalBudget } : {}),
    budgetSummary: agg.budgetSummary,
    budgetByPhase: agg.budgetByPhase,
    ...(agg.riskCoverage !== undefined ? { riskCoverage: agg.riskCoverage } : {}),
    mitigatedRiskIds: agg.mitigatedRiskIds,
    selectedInitiativeCount: agg.initiativeCount,
    ...(devotionFunnel ? { devotionFunnel } : {}),
    ...(overtonPosition ? { overtonPosition } : {}),
    ...(coherenceIssueCount !== undefined ? { coherenceIssueCount } : {}),
    coherenceScore: coherenceSummary.score,
    coherenceSummary,
    coherenceChecks,
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
      const content = (p.content ?? null) as Record<string, unknown> | null;
      pillars[p.key] = p.key === "v" && content ? projectFinancialPillar(content) : content;
    }
    // An explicit route decision is part of this calculation, not a preliminary
    // persisted S version. Source initiatives remain untouched.
    if (selectedRouteKey) {
      const previous = pillars.s ?? {};
      pillars.s = { ...previous, computed: { ...((previous.computed ?? {}) as Record<string, unknown>), selectedRouteKey } };
    }

    const ue = (pillars.v?.unitEconomics ?? {}) as Record<string, unknown>;
    const computed = computePillarS(pillars, {
      baseRevenue: typeof ue.caVise === "number" ? ue.caVise : undefined,
    });
    const strategyContent = generateStrategy(pillars, computed.selectedRouteKey as RouteKey);
    // Absence participates in concurrency checking, including a previously absent S.
    const versions = new Map(dbPillars.map(p => [p.key, p.currentVersion]));
    strategyContent._sourcePillarVersions = Object.fromEntries(PILLAR_STORAGE_KEYS.map(key => [key, versions.get(key) ?? null]));

    // Pure computed dashboard (ADR-0088) — aggregations over the relational
    // backbone. Recomputed here and again by the recommendation apply path
    // whenever an initiative is selected/linked.
    strategyContent.computed = computed;
    strategyContent.coherenceScore = computed.coherenceScore;

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
