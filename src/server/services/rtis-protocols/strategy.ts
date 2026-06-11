/**
 * PROTOCOLE STRATEGY (S) — Agent spécialisé de l'essaim MESTOR
 *
 * Input  : Piliers A, D, V, E, R, T, I (tous les 7 précédents)
 * Output : Pilier S complet (PillarSSchema)
 * Nature : DÉCISION — pioche dans I pour tracer la route vers le superfan
 *
 * S est la COMMANDE — ce qu'on choisit dans le MENU (I).
 * Son unique objectif : déplacer la Fenêtre d'Overton pour accumuler des superfans.
 *
 * Logique hybride :
 *   1. Fenêtre d'Overton (COMPOSE depuis T.overtonPosition + A.prophecy + D.positionnement)
 *   2. Sélection dans I (MESTOR_ASSIST — Commandant arbitre les choix)
 *   3. Roadmap 4 phases orientée Devotion (MESTOR_ASSIST)
 *   4. Sprint 90j (COMPOSE — extraction Phase 1 de la roadmap)
 *   5. KPI Dashboard (CALC — 1 KPI par pilier + North Star)
 *   6. Devotion Funnel + Overton Milestones (COMPOSE)
 *   7. Budget par Devotion (CALC)
 *   8. Synthèse exécutive (MESTOR_ASSIST)
 *
 * Cascade ADVERTIS : S puise dans A + D + V + E + R + T + I
 */

import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import { PillarSSchema, collectInitiatives, ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";

// ADR-0063 — LLM-response sub-schema for the Strategy protocol. Picks the
// fields the prompt asks for and makes them optional ; each item still
// validates strictly so the pruner can drop malformed rows before persistence.
const StrategyLLMResponseSchema = PillarSSchema.pick({
  fenetreOverton: true,
  roadmap: true,
  sprint90Days: true,
  selectedFromI: true,
  rejectedFromI: true,
  axesStrategiques: true,
  facteursClesSucces: true,
  syntheseExecutive: true,
}).partial();

// ── Types ──────────────────────────────────────────────────────────────

export interface ProtocoleStrategyResult {
  pillarKey: "s";
  content: Record<string, unknown>;
  confidence: number;
  selectedFromICount: number;
  error?: string;
}

// ── Step 1 : Fenêtre d'Overton (COMPOSE) ──────────────────────────────

function buildOverton(
  pillars: Record<string, Record<string, unknown> | null>,
): Record<string, unknown> | null {
  const a = pillars.a ?? {};
  const d = pillars.d ?? {};
  const t = pillars.t ?? {};

  const overtonPos = t.overtonPosition as Record<string, unknown> | undefined;
  const percGap = t.perceptionGap as Record<string, unknown> | undefined;

  if (!overtonPos && !percGap) return null; // Can't build Overton without T data

  // Perception actuelle from T
  const perceptionActuelle = overtonPos?.currentPerception as string
    ?? percGap?.currentPerception as string
    ?? "Non mesurée — le protocole T n'a pas encore évalué la perception marché.";

  // Perception cible from A.prophecy + D.positionnement
  const prophecy = a.prophecy as Record<string, unknown> | string | undefined;
  const prophStr = typeof prophecy === "string" ? prophecy : (prophecy as Record<string, unknown>)?.worldTransformed as string ?? "";
  const posStr = d.positionnement as string ?? "";
  const perceptionCible = [prophStr, posStr].filter(Boolean).join(" — ") || "Non définie";

  const ecart = percGap?.gapDescription as string
    ?? `Écart entre "${perceptionActuelle.slice(0, 50)}" et "${perceptionCible.slice(0, 50)}"`;

  return {
    perceptionActuelle,
    perceptionCible,
    ecart,
    // strategieDeplacement sera enrichi par MESTOR_ASSIST dans generateStrategy
  };
}

// ── Steps 2-3 : Sélection dans I + Roadmap (MESTOR_ASSIST) ───────────

async function generateStrategy(
  pillars: Record<string, Record<string, unknown> | null>,
  overton: Record<string, unknown> | null,
  strategyId: string,
): Promise<Record<string, unknown>> {
  // LLM Gateway obligatoire (jamais @ai-sdk/anthropic direct) : circuit
  // breaker + fallback provider (gpt-5.5) + budget governance + cost tracking.
  const { callLLM } = await import("@/server/services/llm-gateway");

  const context = ["a", "d", "v", "e", "r", "t", "i"]
    .map(k => {
      const c = pillars[k];
      if (!c || Object.keys(c).length === 0) return `[${k.toUpperCase()}] Vide`;
      // For I, show the catalogue summary (not the full data to save tokens)
      if (k === "i") {
        const totalActions = (c as Record<string, unknown>).totalActions ?? "?";
        const innovations = (c as Record<string, unknown>).innovationsProduit;
        return `[I — INNOVATION]\ntotalActions: ${totalActions}\ninnovationsProduit: ${JSON.stringify(innovations ?? [], null, 2)}\n(catalogue complet disponible dans I.catalogueParCanal)`;
      }
      return `[${k.toUpperCase()}]\n${JSON.stringify(c, null, 2)}`;
    })
    .join("\n\n");

  const overtonContext = overton
    ? `\n\nFENÊTRE D'OVERTON (construite depuis T):\n${JSON.stringify(overton, null, 2)}`
    : "\n\nFenêtre d'Overton: non disponible (T.overtonPosition manquant).";

  // Get I catalogue for selection
  const iContent = pillars.i ?? {};
  const catalogueSummary = Object.entries((iContent.catalogueParCanal ?? {}) as Record<string, unknown[]>)
    .map(([canal, actions]) => `${canal}: ${Array.isArray(actions) ? actions.length : 0} actions`)
    .join(", ");

  const { text } = await callLLM({
    caller: "mestor:protocole-strategy",
    strategyId,
    model: "claude-sonnet-4-20250514",
    system: `Tu es le Protocole Strategy de l'essaim MESTOR. Tu prends les DÉCISIONS stratégiques.

S PIOCHE DANS I. Le pilier I contient le POTENTIEL TOTAL (${catalogueSummary}).
Ton rôle : SÉLECTIONNER les actions de I qui déplacent la Fenêtre d'Overton vers le superfan.

OBJECTIF UNIQUE : accumulation de superfans via déplacement de la Fenêtre d'Overton.

Devotion Ladder (du bas vers le haut) :
SPECTATEUR → INTÉRESSÉ → PARTICIPANT → ENGAGÉ → AMBASSADEUR → ÉVANGÉLISTE (= superfan)

Chaque phase de la roadmap doit avoir un objectifDevotion (quelle transition elle provoque).
Chaque action du sprint doit avoir un devotionImpact + un sourceRef vers I.

Retourne UNIQUEMENT du JSON valide.`,
    prompt: `Données ADVERTIS complètes (7 piliers):

${context}
${overtonContext}

Produis le JSON avec ces champs:
{
  "fenetreOverton": {
    "perceptionActuelle": "${overton?.perceptionActuelle ?? "..."}",
    "perceptionCible": "${overton?.perceptionCible ?? "..."}",
    "ecart": "${overton?.ecart ?? "..."}",
    "strategieDeplacement": [{ "etape": "", "action": "", "canal": "", "horizon": "Q1|Q2|Q3|Q4", "devotionTarget": "SPECTATEUR|INTERESSE|...", "riskRef": "risque R mitigé", "hypothesisRef": "hypothèse T" }] (5+)
  },
  "roadmap": [
    { "phase": "Phase 1 — Fondations (0-90j)", "objectif": "", "objectifDevotion": "SPECTATEUR → INTERESSE", "actions": [], "budget": 0, "duree": "3 mois" },
    { "phase": "Phase 2 — Engagement (3-6m)", "objectifDevotion": "INTERESSE → PARTICIPANT", ... },
    { "phase": "Phase 3 — Accélération (6-12m)", "objectifDevotion": "PARTICIPANT → ENGAGE", ... },
    { "phase": "Phase 4 — Culte (12-36m)", "objectifDevotion": "ENGAGE → EVANGELISTE", ... }
  ] (4 phases minimum),
  "sprint90Days": [{ "action": "", "owner": "", "kpi": "", "priority": 1, "devotionImpact": "SPECTATEUR|...", "sourceRef": "catalogueParCanal.DIGITAL[0]", "isRiskMitigation": false }] (8+),
  "selectedFromI": [{ "sourceRef": "catalogueParCanal.CANAL[index]", "action": "", "phase": "Phase N", "priority": 1 }] (10+),
  "rejectedFromI": [{ "sourceRef": "catalogueParCanal.CANAL[index]", "reason": "" }] (3+),
  "axesStrategiques": [{ "axe": "", "pillarsLinked": ["A","D",...], "kpis": [""] }] (3+),
  "facteursClesSucces": ["..."] (5+),
  "syntheseExecutive": "400+ chars — comment on déplace la perception pour transformer des spectateurs en évangélistes"
}`,
    maxOutputTokens: 8000,
  });

  // Cost tracking : géré par le gateway (trackCost) — plus de aICostLog manuel.

  // ADR-0063 — Parse + Zod validate at the LLM boundary.
  try {
    const { parseAndValidateLLM } = await import("@/server/services/utils/llm");
    const result = parseAndValidateLLM(text, StrategyLLMResponseSchema, {
      context: "protocole-strategy",
      mode: "prune",
    });
    if (result.partial) {
      console.warn(
        `[protocole-strategy] strategy=${strategyId} dropped ${result.droppedPaths.length} invalid LLM paths:`,
        result.droppedPaths.slice(0, 10),
      );
    }
    return result.data as Record<string, unknown>;
  } catch (err) {
    console.error(`[protocole-strategy] strategy=${strategyId} unrecoverable LLM output:`, err);
    return {};
  }
}

// ── Step 5 : KPI Dashboard (CALC) ────────────────────────────────────

function buildKPIDashboard(): Array<Record<string, unknown>> {
  return [
    { name: "Progression Devotion Ladder", pillar: "S", target: "+10% par trimestre", frequency: "MONTHLY" },
    { name: "Notoriété assistée", pillar: "A", target: "+5% par trimestre", frequency: "QUARTERLY" },
    { name: "Part de voix vs concurrents", pillar: "D", target: "Top 3 du secteur", frequency: "MONTHLY" },
    { name: "LTV/CAC ratio", pillar: "V", target: "≥ 3.0", frequency: "MONTHLY" },
    { name: "Taux engagement communauté", pillar: "E", target: "≥ 5%", frequency: "WEEKLY" },
    { name: "Risques mitigés", pillar: "R", target: "100% risques HIGH traités", frequency: "MONTHLY" },
    { name: "Hypothèses validées", pillar: "T", target: "≥ 3 validées", frequency: "QUARTERLY" },
    { name: "Actions potentiel activées", pillar: "I", target: "≥ 30% du catalogue", frequency: "QUARTERLY" },
  ];
}

// ── Step 6 : Devotion Funnel + Overton Milestones (COMPOSE) ───────────

function buildDevotionFunnel(roadmap: unknown[]): Array<Record<string, unknown>> {
  if (!Array.isArray(roadmap)) return [];
  return roadmap.map(phase => {
    const p = phase as Record<string, unknown>;
    return {
      phase: p.phase ?? "",
      spectateurs: 0,
      interesses: 0,
      participants: 0,
      engages: 0,
      ambassadeurs: 0,
      evangelistes: 0,
      // Will be quantified by the Fixer based on actual data
    };
  });
}

function buildOvertonMilestones(
  roadmap: unknown[],
  overton: Record<string, unknown> | null,
): Array<Record<string, unknown>> {
  if (!Array.isArray(roadmap) || !overton) return [];
  return roadmap.map((phase, i) => {
    const p = phase as Record<string, unknown>;
    return {
      phase: p.phase ?? `Phase ${i + 1}`,
      currentPerception: i === 0
        ? (overton.perceptionActuelle as string ?? "")
        : `Perception après ${p.phase ?? "cette phase"}`,
      targetPerception: i === roadmap.length - 1
        ? (overton.perceptionCible as string ?? "")
        : `Perception intermédiaire Phase ${i + 1}→${i + 2}`,
      measurementMethod: "Survey de perception + analyse T.overtonPosition",
    };
  });
}

// ── Step 7 : Budget par Devotion (CALC) ───────────────────────────────

function buildBudgetByDevotion(
  sprint: unknown[],
  totalBudget?: number,
  companyStage?: string,
): Record<string, number> {
  if (!Array.isArray(sprint)) return {};

  // If we have a real budget, distribute it by company stage using industry splits
  if (totalBudget && totalBudget > 0) {
    const STAGE_SPLITS: Record<string, Record<string, number>> = {
      STARTUP:  { acquisition: 0.50, conversion: 0.25, retention: 0.15, evangelisation: 0.10 },
      GROWTH:   { acquisition: 0.35, conversion: 0.25, retention: 0.25, evangelisation: 0.15 },
      MATURITY: { acquisition: 0.20, conversion: 0.20, retention: 0.35, evangelisation: 0.25 },
      DECLINE:  { acquisition: 0.15, conversion: 0.15, retention: 0.40, evangelisation: 0.30 },
    };
    const split = STAGE_SPLITS[companyStage ?? "GROWTH"] ?? STAGE_SPLITS.GROWTH!;

    // Weight by actual sprint action distribution
    const levels: Record<string, string> = {
      SPECTATEUR: "acquisition", INTERESSE: "acquisition",
      PARTICIPANT: "conversion", ENGAGE: "retention",
      AMBASSADEUR: "evangelisation", EVANGELISTE: "evangelisation",
    };
    const actionCounts: Record<string, number> = { acquisition: 0, conversion: 0, retention: 0, evangelisation: 0 };
    for (const item of sprint) {
      const s = item as Record<string, unknown>;
      const devotion = s.devotionImpact as string ?? "SPECTATEUR";
      const bucket = levels[devotion] ?? "acquisition";
      actionCounts[bucket] = (actionCounts[bucket] ?? 0) + 1;
    }
    const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0) || 1;

    // Blend: 60% stage-based split + 40% action-weighted split
    const budget: Record<string, number> = {};
    for (const bucket of Object.keys(split)) {
      const stagePct = split[bucket]!;
      const actionPct = (actionCounts[bucket] ?? 0) / totalActions;
      const blendedPct = stagePct * 0.60 + actionPct * 0.40;
      budget[bucket] = Math.round(totalBudget * blendedPct);
    }
    return budget;
  }

  // Fallback: count actions (legacy behavior when no budget available)
  const levels: Record<string, string> = {
    SPECTATEUR: "acquisition", INTERESSE: "acquisition",
    PARTICIPANT: "conversion", ENGAGE: "retention",
    AMBASSADEUR: "evangelisation", EVANGELISTE: "evangelisation",
  };
  const budget: Record<string, number> = { acquisition: 0, conversion: 0, retention: 0, evangelisation: 0 };
  for (const item of sprint) {
    const s = item as Record<string, unknown>;
    const devotion = s.devotionImpact as string ?? "SPECTATEUR";
    const bucket = levels[devotion] ?? "acquisition";
    budget[bucket] = (budget[bucket] ?? 0) + 1;
  }
  return budget;
}

// ── computeRoadmapRoutes : 3 trajectoires (PURE, no LLM) ──────────────
// Conservateur / Cible (recommandé) / Ambitieux. The numbers are a
// deterministic projection of execution *momentum* (risk coverage + how many
// initiatives are selected) — the LLM is NOT pertinent here, so it is never
// called. Each route = base ambition + momentum-scaled span. Tuned so a
// momentum of ~0.6 yields roughly +22 / +58 / +115 % growth.

interface RouteSpec {
  key: (typeof ROADMAP_ROUTE_KEYS)[number];
  label: string;
  recommended: boolean;
  growthBase: number;
  growthSpan: number;
  cultBump: number;
  description: string;
}

const ROUTE_SPECS: RouteSpec[] = [
  { key: "CONSERVATIVE", label: "Conservateur", recommended: false, growthBase: 10, growthSpan: 20, cultBump: 8, description: "Statu quo + optimisations marginales." },
  { key: "TARGET", label: "Cible", recommended: true, growthBase: 30, growthSpan: 46.67, cultBump: 16, description: "Activation Engagement + cascade R+T." },
  { key: "AMBITIOUS", label: "Ambitieux", recommended: false, growthBase: 70, growthSpan: 75, cultBump: 25, description: "Programme superfans + expansion régionale." },
];

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

type RouteKey = (typeof ROADMAP_ROUTE_KEYS)[number];

// ── ADR-0089 : jeu de stratégie par route (PURE, no LLM) ──────────────
// Chaque ambition correspond à un sous-ensemble déterministe du backbone
// d'initiatives — 3 jeux de stratégie dérivés des MÊMES données :
//   CONSERVATIVE : initiatives sélectionnées court-terme (SPRINT_90/PHASE_1)
//                  — statu quo + optimisations marginales.
//   TARGET       : toutes les initiatives SELECTED_FOR_ROADMAP — le programme
//                  engagé par l'opérateur.
//   AMBITIOUS    : SELECTED + RECOMMENDED — extension du programme (superfans
//                  + expansion), candidates IA incluses.

function routeInitiativeSet(
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

function aggregateInitiativeSet(
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
  // Execution momentum 0..1 — half from risk coverage, half from how many
  // initiatives the operator has actually committed to the roadmap. Toujours
  // calculé sur le jeu TARGET (status=SELECTED) : les projections sont des
  // SCÉNARIOS du même backbone, invariantes au choix d'ambition.
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
    // ADR-0089 — jeu de stratégie de la route (sous-ensemble déterministe).
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

  const initiatives = collectInitiatives(i) as Array<Record<string, unknown>>;
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
  const coherenceRisks = Array.isArray(r.coherenceRisks) ? (r.coherenceRisks as unknown[]) : [];
  const coherenceScore = Math.max(0, 100 - Math.min(100, coherenceRisks.length * 15));

  const devotionFunnel = opts?.roadmap ? buildDevotionFunnel(opts.roadmap) : undefined;

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
    totalBudget: agg.totalBudget,
    budgetByPhase: agg.budgetByPhase,
    ...(agg.riskCoverage !== undefined ? { riskCoverage: agg.riskCoverage } : {}),
    mitigatedRiskIds: agg.mitigatedRiskIds,
    selectedInitiativeCount: agg.initiativeCount,
    ...(devotionFunnel ? { devotionFunnel } : {}),
    ...(overtonPosition ? { overtonPosition } : {}),
    coherenceScore,
    roadmapRoutes,
    selectedRouteKey,
    computedAt: new Date().toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────

export async function executeProtocoleStrategy(strategyId: string): Promise<ProtocoleStrategyResult> {
  try {
    // Load ALL 8 piliers (A through S) — ADR-0089 : le S précédent porte la
    // sélection d'ambition (computed.selectedRouteKey), qui survit aux regens.
    const dbPillars = await db.pillar.findMany({
      where: { strategyId, key: { in: [...PILLAR_STORAGE_KEYS] } },
    });
    const pillars: Record<string, Record<string, unknown> | null> = {};
    for (const p of dbPillars) {
      pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;
    }

    // Step 1: Fenêtre d'Overton (COMPOSE)
    const overton = buildOverton(pillars);

    // Steps 2-3: Sélection + Roadmap + Synthèse (MESTOR_ASSIST)
    const strategyContent = await generateStrategy(pillars, overton, strategyId);

    // Merge Overton base with MESTOR_ASSIST enrichment
    if (overton && strategyContent.fenetreOverton) {
      const generated = strategyContent.fenetreOverton as Record<string, unknown>;
      strategyContent.fenetreOverton = {
        ...overton,
        ...generated,
        // Keep the COMPOSE-built perception fields, overlay the LLM-generated strategy
        perceptionActuelle: overton.perceptionActuelle,
        perceptionCible: overton.perceptionCible,
        ecart: overton.ecart,
        strategieDeplacement: generated.strategieDeplacement ?? [],
      };
    } else if (overton) {
      strategyContent.fenetreOverton = overton;
    }

    // Step 5: KPI Dashboard (CALC)
    if (!strategyContent.kpiDashboard) {
      strategyContent.kpiDashboard = buildKPIDashboard();
    }
    strategyContent.northStarKPI = {
      name: "Progression Devotion Ladder",
      target: "+10% d'évangélistes par trimestre",
      frequency: "MONTHLY",
      currentValue: "À mesurer",
    };

    // Step 6: Devotion Funnel + Overton Milestones (COMPOSE)
    strategyContent.devotionFunnel = buildDevotionFunnel(strategyContent.roadmap as unknown[]);
    strategyContent.overtonMilestones = buildOvertonMilestones(strategyContent.roadmap as unknown[], overton);

    // Step 7: Budget par Devotion (CALC) — now with real FCFA amounts
    const pillarV = pillars.v as Record<string, unknown> | null;
    const ue = (pillarV?.unitEconomics ?? {}) as Record<string, unknown>;
    const declaredBudget = typeof ue.budgetCom === "number" ? ue.budgetCom : undefined;
    const businessCtx = (pillarV as any)?.businessContext as Record<string, unknown> | undefined;
    const companyStage = businessCtx?.companyStage as string | undefined;
    strategyContent.budgetByDevotion = buildBudgetByDevotion(
      strategyContent.sprint90Days as unknown[],
      declaredBudget ?? (strategyContent.globalBudget as number | undefined),
      companyStage,
    );

    // Pure computed dashboard (ADR-0088) — aggregations over the relational
    // backbone. Recomputed here and again by the recommendation apply path
    // whenever an initiative is selected/linked.
    strategyContent.computed = computePillarS(pillars, {
      roadmap: strategyContent.roadmap as unknown[],
      baseRevenue: typeof ue.caVise === "number" ? ue.caVise : undefined,
    });

    // Count selectedFromI
    const selectedFromI = (strategyContent.selectedFromI ?? []) as unknown[];

    // Confidence
    const hasOverton = !!strategyContent.fenetreOverton;
    const hasRoadmap = Array.isArray(strategyContent.roadmap) && (strategyContent.roadmap as unknown[]).length >= 3;
    const hasSprint = Array.isArray(strategyContent.sprint90Days) && (strategyContent.sprint90Days as unknown[]).length >= 5;
    const confidence = Math.min(0.85, 0.3 + (hasOverton ? 0.2 : 0) + (hasRoadmap ? 0.15 : 0) + (hasSprint ? 0.15 : 0) + Math.min(0.1, selectedFromI.length * 0.01));

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
