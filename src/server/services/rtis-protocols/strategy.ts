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
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import { PillarSSchema, collectNormalizedInitiatives, ROADMAP_ROUTE_KEYS, INITIATIVE_TIMEFRAMES, BUDGET_ESTIME_FCFA } from "@/lib/types/pillar-schemas";
import {
  computeRoadmapRoutes,
  routeInitiativeSet,
  aggregateInitiativeSet,
  type RouteKey,
} from "@/lib/strategy/roadmap-routes";
import { sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

// Re-export for backward compatibility (authoritative server compute).
export { computeRoadmapRoutes };

// S est désormais MÉCANIQUE (déterministe) : sélection, roadmap, overton, axes,
// facteurs et budgets sont CALCULÉS depuis I/V/T/R (cf. generateStrategy plus
// bas). Seule la synthèse exécutive narrative reste 1 appel LLM OPTIONNEL,
// skippé proprement si indisponible — le squelette ne dépend jamais du LLM.
const SyntheseLLMSchema = PillarSSchema.pick({ syntheseExecutive: true }).partial();

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
      // Contexte 8 piliers + 2-3K de sortie → modèle Ollama rapide à contexte
      // intermédiaire (16K) plutôt que hermes3-ctx (64K, spill CPU) ou
      // hermes3:8b (4K, tronque). Inerte sans Ollama (cloud ignore l'option).
      ollamaModel: process.env.OLLAMA_STRUCTURED_MODEL ?? "hermes3-fast",
      // Force du JSON valide côté provider (Ollama/OpenAI). Sans ça le 8B local
      // ajoute des préambules en prose / double les accolades → extractJSON KO.
      responseFormat: "json_object",
      // LOT 1e — entrée non fiable neutralisée (anti-injection) : le prompt porte
      // nom de marque + perceptions + axes dérivés de l'ADVE fondateur
      // (sanitizeInline côté appelant) → rappel sécurité dans le system.
      system: `${UNTRUSTED_NOTICE}\n\n${args.system}`,
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

// ── S MÉCANIQUE — composition déterministe (ADR-0088 étendu) ─────────────────
// S ne devine plus : il SÉLECTIONNE et ORDONNE le catalogue I de façon
// déterministe, dans l'enveloppe budgétaire RÉELLE de V, et déplace l'Overton
// MESURÉ par T. Aucune inférence LLM dans le squelette → zéro souci d'affichage.
// Seule la prose de syntheseExecutive reste 1 appel LLM OPTIONNEL.

type Tf = (typeof INITIATIVE_TIMEFRAMES)[number];
const TF_PHASE_LABEL: Record<Tf, string> = { SPRINT_90: "Phase 1", PHASE_1: "Phase 2", PHASE_2: "Phase 3", LONG_TERM: "Phase 4" };
const TF_HORIZON: Record<Tf, string> = { SPRINT_90: "Q1", PHASE_1: "Q2", PHASE_2: "Q3", LONG_TERM: "Q4" };
const DEVOTION_BY_PHASE: Record<Tf, string> = { SPRINT_90: "SPECTATEUR", PHASE_1: "INTERESSE", PHASE_2: "PARTICIPANT", LONG_TERM: "AMBASSADEUR" };
const PILLAR_LABEL: Record<string, string> = { A: "Authenticité", D: "Distinction", V: "Valeur", E: "Engagement" };

interface SelectedAction {
  ref: string; channel: string; action: string; objectif: string;
  pilierImpact: string | null; budget: number; timeframe: Tf;
}

/** Sélection DÉTERMINISTE des actions I, dans l'enveloppe budgétaire RÉELLE de V. */
function selectInitiativesMechanical(
  iContent: Record<string, unknown>,
  budgetCom: number | null,
): { selected: SelectedAction[]; selectedFromI: Array<Record<string, unknown>> } {
  const cat = (iContent.catalogueParCanal ?? {}) as Record<string, Array<Record<string, unknown>>>;
  type Cand = { ref: string; channel: string; action: string; objectif: string; pilierImpact: string | null; budget: number; score: number };
  const cands: Cand[] = [];
  for (const [channel, arr] of Object.entries(cat)) {
    if (!Array.isArray(arr)) continue;
    arr.forEach((a, idx) => {
      const action = String(a.action ?? "").trim();
      if (!action) return;
      const be = (a.budgetEstime === "LOW" || a.budgetEstime === "MEDIUM" || a.budgetEstime === "HIGH") ? a.budgetEstime : "MEDIUM";
      const pilierImpact = (a.pilierImpact === "A" || a.pilierImpact === "D" || a.pilierImpact === "V" || a.pilierImpact === "E") ? a.pilierImpact : null;
      let score = 1;
      if (pilierImpact) score += 2;                                          // fait avancer un pilier ADVE
      if (typeof a.overtonShift === "string" && a.overtonShift) score += 2;  // déplace l'Overton
      if (be === "LOW") score += 1;                                          // sobre = priorisé à valeur égale
      cands.push({ ref: `catalogueParCanal.${channel}[${idx}]`, channel, action, objectif: String(a.objectif ?? ""), pilierImpact, budget: BUDGET_ESTIME_FCFA[be], score });
    });
  }
  // Tri déterministe : score décroissant, budget croissant (moins cher gagne), réf (stable).
  cands.sort((x, y) => y.score - x.score || x.budget - y.budget || x.ref.localeCompare(y.ref));

  const envelope = budgetCom != null && budgetCom > 0 ? budgetCom : Infinity;
  const MIN_KEEP = 6, MAX_KEEP = 14;
  const selectedCands: Cand[] = [];
  let spent = 0;
  for (const c of cands) {
    if (selectedCands.length >= MAX_KEEP) break;
    if (spent + c.budget > envelope && selectedCands.length >= MIN_KEEP) continue; // garde un socle même si l'enveloppe est petite
    selectedCands.push(c);
    spent += c.budget;
  }

  const N = Math.max(selectedCands.length, 1);
  const selected: SelectedAction[] = selectedCands.map((c, i) => {
    const r = i / N;
    const timeframe: Tf = r < 0.35 ? "SPRINT_90" : r < 0.6 ? "PHASE_1" : r < 0.85 ? "PHASE_2" : "LONG_TERM";
    return { ref: c.ref, channel: c.channel, action: c.action, objectif: c.objectif, pilierImpact: c.pilierImpact, budget: c.budget, timeframe };
  });
  const selectedFromI = selected.map((s, i) => ({ sourceRef: s.ref, action: s.action, phase: TF_PHASE_LABEL[s.timeframe], priority: i + 1 }));
  return { selected, selectedFromI };
}

/** Roadmap 4 phases déterministe depuis les actions sélectionnées (groupées par timeframe). */
function buildRoadmapMechanical(selected: SelectedAction[]): Array<Record<string, unknown>> {
  const phases: Array<{ tf: Tf; phase: string; objectifDevotion: string; duree: string }> = [
    { tf: "SPRINT_90", phase: "Phase 1 — Fondations (0-90j)", objectifDevotion: "SPECTATEUR → INTÉRESSÉ", duree: "3 mois" },
    { tf: "PHASE_1", phase: "Phase 2 — Engagement (3-6 mois)", objectifDevotion: "INTÉRESSÉ → PARTICIPANT", duree: "3 mois" },
    { tf: "PHASE_2", phase: "Phase 3 — Accélération (6-12 mois)", objectifDevotion: "PARTICIPANT → AMBASSADEUR", duree: "6 mois" },
    { tf: "LONG_TERM", phase: "Phase 4 — Culte (12 mois+)", objectifDevotion: "AMBASSADEUR → ÉVANGÉLISTE", duree: "12 mois+" },
  ];
  return phases.map((p) => {
    const acts = selected.filter((s) => s.timeframe === p.tf);
    const titres = acts.slice(0, 3).map((a) => a.action.slice(0, 45)).join(", ");
    return {
      phase: p.phase,
      objectif: acts.length ? `${acts.length} action(s) prioritaires : ${titres}` : "Phase de consolidation",
      objectifDevotion: p.objectifDevotion,
      actions: acts.map((a) => a.action.slice(0, 180)),
      budget: acts.reduce((sum, a) => sum + a.budget, 0),
      duree: p.duree,
    };
  });
}

/** Sprint 90 jours = les actions SPRINT_90 sélectionnées. */
function buildSprintMechanical(selected: SelectedAction[]): Array<Record<string, unknown>> {
  return selected.filter((s) => s.timeframe === "SPRINT_90").map((a, i) => ({
    action: a.action,
    kpi: (a.objectif || "À définir").slice(0, 200),
    priority: i + 1,
    devotionImpact: "SPECTATEUR",
    sourceRef: a.ref,
  }));
}

/** strategieDeplacement Overton = parcours déterministe des actions sélectionnées. */
function buildStrategieDeplacement(selected: SelectedAction[]): Array<Record<string, unknown>> {
  return selected.slice(0, 6).map((s, i) => ({
    etape: `Étape ${i + 1} — ${s.action.slice(0, 60)}`,
    action: s.action.slice(0, 200),
    canal: s.channel.slice(0, 60),
    horizon: TF_HORIZON[s.timeframe],
    devotionTarget: DEVOTION_BY_PHASE[s.timeframe],
  }));
}

/** axesStrategiques déterministes — un axe par pilier ADVE couvert (≥3 garantis). */
function buildAxesMechanical(selected: SelectedAction[]): Array<Record<string, unknown>> {
  const byPillar = new Map<string, SelectedAction[]>();
  for (const s of selected) {
    const p = s.pilierImpact ?? "A";
    if (!byPillar.has(p)) byPillar.set(p, []);
    byPillar.get(p)!.push(s);
  }
  const axes: Array<Record<string, unknown>> = [];
  for (const [p, acts] of byPillar) {
    axes.push({ axe: `Activer ${PILLAR_LABEL[p] ?? p} (${acts.length} action${acts.length > 1 ? "s" : ""})`, pillarsLinked: [p, "S"], kpis: [`${acts.length} action(s) ${p} exécutée(s)`, "Progression Devotion Ladder"] });
  }
  const padAxes: Array<Record<string, unknown>> = [
    { axe: "Déplacer la Fenêtre d'Overton", pillarsLinked: ["T", "S"], kpis: ["Réduction du perception gap"] },
    { axe: "Tenir l'enveloppe budgétaire", pillarsLinked: ["V", "S"], kpis: ["Budget consommé / budget alloué"] },
    { axe: "Convertir les spectateurs en superfans", pillarsLinked: ["E", "S"], kpis: ["% évangélistes par trimestre"] },
  ];
  let i = 0;
  while (axes.length < 3 && i < padAxes.length) axes.push(padAxes[i++]!);
  return axes;
}

/** facteursClesSucces déterministes depuis R (mitigations) + T (fit) — ≥3 garantis. */
function buildFacteursMechanical(pillars: Record<string, Record<string, unknown> | null>): string[] {
  const r = pillars.r ?? {};
  const t = pillars.t ?? {};
  const out: string[] = [];
  const mp = Array.isArray(r.mitigationPriorities) ? (r.mitigationPriorities as Array<Record<string, unknown>>) : [];
  for (const m of mp.slice(0, 3)) {
    if (typeof m.action === "string" && m.action.trim()) out.push(`Mitiger : ${m.action.slice(0, 180)}`);
  }
  const bmf = typeof t.brandMarketFitScore === "number" ? t.brandMarketFitScore : null;
  if (bmf != null) out.push(`Consolider le Brand-Market Fit (actuel ${bmf}/100)`.slice(0, 200));
  const defaults = [
    "Exécution disciplinée du sprint 90 jours",
    "Respect strict de l'enveloppe budgétaire (V)",
    "Mesure continue de la Devotion Ladder",
    "Déplacement progressif de la Fenêtre d'Overton",
  ];
  let i = 0;
  while (out.length < 5 && i < defaults.length) out.push(defaults[i++]!);
  return out.slice(0, 7);
}

/** Synthèse exécutive déterministe (fallback si le LLM est indisponible). */
function buildSyntheseTemplate(
  pillars: Record<string, Record<string, unknown> | null>,
  selected: SelectedAction[],
  globalBudget: number,
): string {
  const nom = String((pillars.a as Record<string, unknown>)?.nomMarque ?? "La marque");
  const fcfa = globalBudget >= 1_000_000 ? `${(globalBudget / 1_000_000).toFixed(1)} M FCFA` : `${Math.round(globalBudget / 1000)} k FCFA`;
  const sprint = selected.filter((s) => s.timeframe === "SPRINT_90").length;
  const covered = new Set(selected.map((s) => s.pilierImpact).filter(Boolean)).size;
  return `${nom} engage une trajectoire en 4 phases (Fondations → Engagement → Accélération → Culte) articulée autour de ${selected.length} actions sélectionnées dans son catalogue de potentiel, pour une enveloppe de ${fcfa}. Le sprint de 90 jours mobilise ${sprint} action(s) prioritaire(s) pour amorcer la conversion des spectateurs en participants. La stratégie active ${covered} levier(s) ADVE et déplace progressivement la Fenêtre d'Overton vers la perception cible, en transformant l'audience en communauté de superfans. Chaque phase est budgétée et reliée à un palier de la Devotion Ladder.`;
}

/**
 * COMPOSE le pilier S de façon MÉCANIQUE (déterministe). Remplace les 4 appels
 * LLM fragiles (sélection/roadmap/overton/synthèse) par du calcul ancré sur
 * I (catalogue) + V (budget réel) + T (Overton mesuré) + R (risques). Seule la
 * `syntheseExecutive` narrative reste 1 appel LLM OPTIONNEL (fallback templaté)
 * — le squelette ne dépend JAMAIS du LLM, donc plus de souci d'affichage.
 */
async function generateStrategy(
  pillars: Record<string, Record<string, unknown> | null>,
  overton: Record<string, unknown> | null,
  strategyId: string,
): Promise<Record<string, unknown>> {
  const iContent = (pillars.i ?? {}) as Record<string, unknown>;
  const v = (pillars.v ?? {}) as Record<string, unknown>;
  const ue = (v.unitEconomics ?? {}) as Record<string, unknown>;
  const budgetCom = typeof ue.budgetCom === "number" && ue.budgetCom > 0 ? ue.budgetCom : null;

  // 1. Sélection déterministe dans l'enveloppe V.
  const { selected, selectedFromI } = selectInitiativesMechanical(iContent, budgetCom);

  // 2-5. Roadmap, sprint, overton, axes, facteurs, budget — tout CALCULÉ.
  const roadmap = buildRoadmapMechanical(selected);
  const sprint90Days = buildSprintMechanical(selected);
  const fenetreOverton = { ...(overton ?? {}), strategieDeplacement: buildStrategieDeplacement(selected) };
  const axesStrategiques = buildAxesMechanical(selected);
  const facteursClesSucces = buildFacteursMechanical(pillars);
  const globalBudget = selected.reduce((s, a) => s + a.budget, 0);

  // 6. Synthèse exécutive — 1 appel LLM OPTIONNEL, fallback templaté déterministe.
  let syntheseExecutive = buildSyntheseTemplate(pillars, selected, globalBudget);
  try {
    // LOT 1e — entrée non fiable neutralisée (anti-injection) : nom de marque,
    // perceptions Overton et libellés d'axes dérivent du contenu ADVE fondateur
    // (les axes reprennent le texte des actions du catalogue I). Interpolés au
    // fil de phrases → sanitizeInline (casse fences/balises de rôle, plafonne).
    // Les compteurs/budget sont des nombres internes calculés → laissés bruts.
    const ctx = [
      `Marque : ${sanitizeInline((pillars.a as Record<string, unknown>)?.nomMarque ?? "", { max: 200 })}`,
      `Perception actuelle : ${sanitizeInline((overton as Record<string, unknown>)?.perceptionActuelle ?? "?", { max: 600 })}`,
      `Perception cible : ${sanitizeInline((overton as Record<string, unknown>)?.perceptionCible ?? "?", { max: 600 })}`,
      `${selected.length} actions retenues, budget ${globalBudget} FCFA`,
      `Axes : ${sanitizeInline(axesStrategiques.map((a) => a.axe).join("; "), { max: 1000 })}`,
    ].join("\n");
    const res = await callStrategyJSON({
      strategyId, label: "synthese", schema: SyntheseLLMSchema, maxOutputTokens: 1200,
      system: "Tu es le Protocole Strategy. Rédige une synthèse exécutive narrative (≥400 caractères) en français à partir d'éléments DÉJÀ DÉCIDÉS. N'invente AUCUN chiffre. Réponds en JSON strict.",
      prompt: `${ctx}\n\nProduis UNIQUEMENT : { "syntheseExecutive": "…synthèse de 400+ caractères…" }`,
    });
    if (typeof res.syntheseExecutive === "string" && res.syntheseExecutive.length >= 200) {
      syntheseExecutive = res.syntheseExecutive;
    }
  } catch { /* fallback templaté déjà en place */ }

  return { selectedFromI, roadmap, sprint90Days, fenetreOverton, axesStrategiques, facteursClesSucces, syntheseExecutive, globalBudget };
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

// ── I→S link : persister la sélection S sur le blob I (ADR-0088) ──────────
//
// computePillarS n'agrège QUE les initiatives du blob I en status
// SELECTED_FOR_ROADMAP. Or les actions GÉNÉRÉES sont RECOMMENDED (proposées).
// La sélection du protocole S (`selectedFromI`) doit donc être réinjectée sur
// le blob I, sinon S voit 0 initiative (cas générique). Le canon (écrit main)
// porte déjà SELECTED_FOR_ROADMAP, d'où sa cohérence — cette étape donne la
// même cohérence au contenu généré.

/** Phase de roadmap (libellé libre LLM) → timeframe INITIATIVE canonique. */
function phaseToTimeframe(phase: unknown): (typeof INITIATIVE_TIMEFRAMES)[number] {
  const p = String(phase ?? "").toLowerCase();
  if (p.includes("sprint") || p.includes("90") || /phase\s*1\b/.test(p) || p.includes("fondation")) return "SPRINT_90";
  if (/phase\s*2\b/.test(p) || p.includes("engagement")) return "PHASE_1";
  if (/phase\s*3\b/.test(p) || p.includes("accel") || p.includes("accél")) return "PHASE_2";
  return "LONG_TERM";
}

const normLoose = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Marque en SELECTED_FOR_ROADMAP (+ timeframe dérivé de la phase) les actions
 * du blob I retenues par `selectedFromI`. Match : sourceRef
 * `catalogueParCanal.CANAL[idx]` d'abord, repli sur le texte d'action. PURE —
 * retourne une copie du blob + le nombre promu (0 = rien à persister).
 */
export function promoteSelectedInBlob(
  iContent: Record<string, unknown> | null,
  selectedFromI: Array<Record<string, unknown>>,
): { content: Record<string, unknown>; promoted: number } {
  const content = (iContent ? JSON.parse(JSON.stringify(iContent)) : {}) as Record<string, unknown>;
  const cat = (content.catalogueParCanal ?? {}) as Record<string, Array<Record<string, unknown>>>;
  let promoted = 0;
  const mark = (a: Record<string, unknown>, phase: unknown): boolean => {
    if (a.status === "SELECTED_FOR_ROADMAP") return false; // déjà retenue
    a.status = "SELECTED_FOR_ROADMAP";
    a.timeframe = phaseToTimeframe(phase);
    return true;
  };
  for (const sel of selectedFromI) {
    let done = false;
    const m = /catalogueParCanal\.([A-Za-z_]+)\s*\[\s*(\d+)\s*\]/.exec(String(sel.sourceRef ?? ""));
    if (m) {
      const arr = cat[m[1]!];
      const idx = Number(m[2]);
      if (Array.isArray(arr) && arr[idx]) done = mark(arr[idx]!, sel.phase);
    }
    if (!done) {
      const target = normLoose(sel.action);
      if (target) {
        outer: for (const arr of Object.values(cat)) {
          if (!Array.isArray(arr)) continue;
          for (const a of arr) {
            const at = normLoose(a.action);
            if (at && (at === target || at.includes(target) || target.includes(at))) { done = mark(a, sel.phase); if (done) break outer; }
          }
        }
      }
    }
    if (done) promoted++;
  }
  content.catalogueParCanal = cat;
  return { content, promoted };
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

    // I→S link (ADR-0088) — persister la sélection sur le blob I AVANT
    // d'agréger : computePillarS ne compte que les actions SELECTED_FOR_ROADMAP
    // du blob. On promeut les actions retenues (selectedFromI), on persiste le
    // blob I (status-only → n'affecte pas le cache completionLevel/D-2), et on
    // re-matérialise BrandAction pour que le panel reflète la sélection.
    const selFromI = (strategyContent.selectedFromI ?? []) as Array<Record<string, unknown>>;
    if (selFromI.length > 0 && pillars.i) {
      const { content: promotedI, promoted } = promoteSelectedInBlob(pillars.i, selFromI);
      if (promoted > 0) {
        pillars.i = promotedI; // computePillarS (ci-dessous) lit pillars.i en mémoire
        try {
          await db.pillar.update({
            where: { strategyId_key: { strategyId, key: "i" } },
            data: { content: promotedI as unknown as Prisma.InputJsonValue },
          });
          const { syncBrandActionsFromBlob } = await import("@/server/services/artemis/action-db/materializer");
          await syncBrandActionsFromBlob(strategyId);
        } catch (err) {
          console.warn("[protocole-S] writeback I / matérialisation échoué:", err instanceof Error ? err.message : err);
        }
        console.log(`[protocole-S] ${promoted}/${selFromI.length} action(s) I promues SELECTED_FOR_ROADMAP`);
      }
    }

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
