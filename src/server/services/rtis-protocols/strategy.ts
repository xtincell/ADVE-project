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

import { z } from "zod";
import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import { PillarSSchema, collectNormalizedInitiatives, ROADMAP_ROUTE_KEYS } from "@/lib/types/pillar-schemas";
import {
  computeRoadmapRoutes,
  routeInitiativeSet,
  aggregateInitiativeSet,
  type RouteKey,
} from "@/lib/strategy/roadmap-routes";

// Re-export for backward compatibility (authoritative server compute).
export { computeRoadmapRoutes };

// ADR-0063 / PR-K3-ter — sous-schémas de réponse LLM. Le mega-appel (8 champs)
// est ÉCLATÉ en 4 sous-appels focalisés ; chacun valide sa propre sous-partie.
// Items validés strictement (le pruner droppe les lignes malformées).
const SelectionLLMSchema = PillarSSchema.pick({ selectedFromI: true, rejectedFromI: true }).partial();
const RoadmapLLMSchema = PillarSSchema.pick({ roadmap: true, sprint90Days: true }).partial();
const OvertonLLMSchema = PillarSSchema.pick({ fenetreOverton: true }).partial();
const SyntheseLLMSchema = PillarSSchema.pick({ axesStrategiques: true, facteursClesSucces: true, syntheseExecutive: true }).partial();

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

/**
 * Un appel LLM focalisé pour le protocole Strategy : une seule sous-partie du
 * pilier S, validée par son propre sous-schéma. Retourne {} si l'appel ou la
 * validation échoue — un sous-appel raté n'annule jamais les trois autres.
 */
async function callStrategyJSON(args: {
  strategyId: string;
  label: string;
  schema: z.ZodTypeAny;
  system: string;
  prompt: string;
  maxOutputTokens: number;
}): Promise<Record<string, unknown>> {
  // LLM Gateway obligatoire (jamais @ai-sdk/anthropic direct) : circuit breaker
  // + fallback provider + substitution Ollama locale + budget/cost tracking.
  const { callLLM } = await import("@/server/services/llm-gateway");
  const { parseAndValidateLLM } = await import("@/server/services/utils/llm");
  try {
    const { text } = await callLLM({
      caller: `mestor:protocole-strategy:${args.label}`,
      strategyId: args.strategyId,
      model: "claude-sonnet-4-20250514",
      system: args.system,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
    });
    const result = parseAndValidateLLM(text, args.schema, {
      context: `protocole-strategy:${args.label}`,
      mode: "prune",
    });
    if (result.partial) {
      console.warn(
        `[protocole-strategy:${args.label}] strategy=${args.strategyId} dropped ${result.droppedPaths.length} invalid paths:`,
        result.droppedPaths.slice(0, 10),
      );
    }
    return (result.data ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.warn(
      `[protocole-strategy:${args.label}] strategy=${args.strategyId} appel/validation échoué:`,
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}

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

  const baseSystem = `Tu es le Protocole Strategy de l'essaim MESTOR. Tu prends les DÉCISIONS stratégiques.

S PIOCHE DANS I. Le pilier I contient le POTENTIEL TOTAL (${catalogueSummary}).
Ton rôle : SÉLECTIONNER les actions de I qui déplacent la Fenêtre d'Overton vers le superfan.

OBJECTIF UNIQUE : accumulation de superfans via déplacement de la Fenêtre d'Overton.

Devotion Ladder (du bas vers le haut) :
SPECTATEUR → INTÉRESSÉ → PARTICIPANT → ENGAGÉ → AMBASSADEUR → ÉVANGÉLISTE (= superfan)

Base-toi STRICTEMENT sur les données fournies. Retourne UNIQUEMENT du JSON valide, sans markdown.`;

  const baseData = `Données ADVERTIS complètes (7 piliers):\n\n${context}${overtonContext}`;

  // Mega-appel (8 champs, 8000 tokens) ÉCLATÉ en 4 sous-appels focalisés — chacun
  // une partie cohérente du pilier S, validée par son sous-schéma. Indépendants
  // → parallèles (Ollama les sérialise sur le GPU local, mais chaque prompt reste
  // simple et fiable pour le 8B). Un sous-appel raté retombe sur {}.
  const [selection, roadmap, overtonGen, synthese] = await Promise.all([
    callStrategyJSON({
      strategyId, label: "selection", schema: SelectionLLMSchema, maxOutputTokens: 2500,
      system: baseSystem,
      prompt: `${baseData}\n\nSÉLECTIONNE dans le catalogue I (catalogueParCanal) les actions qui déplacent la Fenêtre d'Overton. Produis UNIQUEMENT :\n{ "selectedFromI": [{ "sourceRef": "catalogueParCanal.CANAL[index]", "action": "", "phase": "Phase N", "priority": 1 }] (10+), "rejectedFromI": [{ "sourceRef": "catalogueParCanal.CANAL[index]", "reason": "" }] (3+) }`,
    }),
    callStrategyJSON({
      strategyId, label: "roadmap", schema: RoadmapLLMSchema, maxOutputTokens: 3000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT la roadmap Devotion (4 phases) et le sprint 90 jours (Phase 1 détaillée). Chaque phase porte un objectifDevotion ; chaque action de sprint un devotionImpact + sourceRef vers I.\n{ "roadmap": [{ "phase": "Phase 1 — Fondations (0-90j)", "objectif": "", "objectifDevotion": "SPECTATEUR → INTERESSE", "actions": [], "budget": 0, "duree": "3 mois" }] (4 phases : Fondations / Engagement / Accélération / Culte), "sprint90Days": [{ "action": "", "owner": "", "kpi": "", "priority": 1, "devotionImpact": "SPECTATEUR", "sourceRef": "catalogueParCanal.DIGITAL[0]", "isRiskMitigation": false }] (8+) }`,
    }),
    callStrategyJSON({
      strategyId, label: "overton", schema: OvertonLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT la stratégie de déplacement de la Fenêtre d'Overton (5+ étapes concrètes) :\n{ "fenetreOverton": { "perceptionActuelle": ${JSON.stringify(overton?.perceptionActuelle ?? "...")}, "perceptionCible": ${JSON.stringify(overton?.perceptionCible ?? "...")}, "ecart": ${JSON.stringify(overton?.ecart ?? "...")}, "strategieDeplacement": [{ "etape": "", "action": "", "canal": "", "horizon": "Q1|Q2|Q3|Q4", "devotionTarget": "SPECTATEUR", "riskRef": "risque R mitigé", "hypothesisRef": "hypothèse T" }] (5+) } }`,
    }),
    callStrategyJSON({
      strategyId, label: "synthese", schema: SyntheseLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT la synthèse stratégique :\n{ "axesStrategiques": [{ "axe": "", "pillarsLinked": ["A","D"], "kpis": [""] }] (3+), "facteursClesSucces": ["..."] (5+), "syntheseExecutive": "400+ caractères : comment on déplace la perception pour transformer des spectateurs en évangélistes" }`,
    }),
  ]);

  // Fusion des 4 sous-réponses (champs disjoints → pas de collision).
  return { ...selection, ...roadmap, ...overtonGen, ...synthese };
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
