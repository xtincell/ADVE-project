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
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

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

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
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
    maxTokens: 8000,
  });

  await db.aICostLog.create({
    data: {
      strategyId, provider: "anthropic", model: "claude-sonnet-4-20250514",
      inputTokens: usage?.promptTokens ?? 0, outputTokens: usage?.completionTokens ?? 0,
      cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
      context: "protocole-strategy",
    },
  }).catch(() => {});

  // Parse with robust extractor (Chantier 10)
  try {
    const { extractJSON } = await import("@/server/services/utils/llm");
    return extractJSON(text) as Record<string, unknown>;
  } catch {
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

function buildBudgetByDevotion(sprint: unknown[]): Record<string, number> {
  if (!Array.isArray(sprint)) return {};
  const levels: Record<string, string> = {
    SPECTATEUR: "acquisition", INTERESSE: "acquisition",
    PARTICIPANT: "conversion", ENGAGE: "retention",
    AMBASSADEUR: "evangelisation", EVANGELISTE: "evangelisation",
  };
  const budget: Record<string, number> = { acquisition: 0, conversion: 0, retention: 0, evangelisation: 0 };
  // Placeholder — will be quantified with real budgets later
  for (const item of sprint) {
    const s = item as Record<string, unknown>;
    const devotion = s.devotionImpact as string ?? "SPECTATEUR";
    const bucket = levels[devotion] ?? "acquisition";
    budget[bucket] = (budget[bucket] ?? 0) + 1; // Count actions, not money (no budget per action yet)
  }
  return budget;
}

// ── Public API ────────────────────────────────────────────────────────

export async function executeProtocoleStrategy(strategyId: string): Promise<ProtocoleStrategyResult> {
  try {
    // Load ALL 7 piliers (A through I)
    const dbPillars = await db.pillar.findMany({
      where: { strategyId, key: { in: ["a", "d", "v", "e", "r", "t", "i"] } },
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

    // Step 7: Budget par Devotion (CALC)
    strategyContent.budgetByDevotion = buildBudgetByDevotion(strategyContent.sprint90Days as unknown[]);

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
