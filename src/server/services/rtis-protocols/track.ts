import { ADVE_STORAGE_KEYS } from "@/domain";

/**
 * PROTOCOLE TRACK (T) — Agent spécialisé de l'essaim MESTOR
 *
 * Input  : Piliers A, D, V, E, R
 * Output : Pilier T complet (PillarTSchema)
 * Nature : CONFRONTATION — oppose l'identité ADVE à la réalité externe
 *
 * Logique hybride :
 *   1. Données sourcées en priorité — SESHAT knowledge (CALC — zéro LLM)
 *   2. Triangulation structurée depuis ADVE+R (COMPOSE)
 *   3. Hypothèses + TAM/SAM/SOM + Overton mesuré (MESTOR_ASSIST)
 *   4. Brand-Market Fit score (CALC — formule)
 *
 * Cascade ADVERTIS : T puise dans A + D + V + E + R
 *
 * RÈGLE CRITIQUE : T ne produit JAMAIS hypothesisValidation.status = "VALIDATED"
 * sans source externe. Le LLM peut produire HYPOTHESIS ou TESTING, jamais VALIDATED.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { PillarTSchema } from "@/lib/types/pillar-schemas";

// ADR-0063 / PR-K3-ter — sous-schémas. Le mega-appel (9 champs) est ÉCLATÉ en
// 4 sous-appels focalisés ; `.pick().partial()` valide strictement chaque champ
// présent, le pruner droppe les items malformés.
const HypothesesLLMSchema = PillarTSchema.pick({ hypothesisValidation: true, riskValidation: true }).partial();
const MarketLLMSchema = PillarTSchema.pick({ tamSamSom: true, brandMarketFitScore: true, marketReality: true }).partial();
const OvertonTLLMSchema = PillarTSchema.pick({ overtonPosition: true, perceptionGap: true, competitorOvertonPositions: true }).partial();
const WeakSignalLLMSchema = PillarTSchema.pick({ weakSignalAnalysis: true }).partial();

// ── Types ──────────────────────────────────────────────────────────────

interface RiskValidationEntry {
  riskRef?: string;
  marketEvidence: string;
  status: "CONFIRMED" | "DENIED" | "UNKNOWN";
  source: "ai_estimate" | "verified" | "calculated" | "external_saas";
}

export interface ProtocoleTrackResult {
  pillarKey: "t";
  content: Record<string, unknown>;
  confidence: number;
  sourcedDataCount: number;
  aiEstimateCount: number;
  error?: string;
}

// ── Step 1 : Données sourcées SESHAT (CALC — zéro LLM) ───────────────

async function loadSeshatKnowledge(
  sector: string,
  market: string,
  strategyId?: string,
): Promise<{ entries: Array<Record<string, unknown>>; hasFreshData: boolean; externalSignals: Array<Record<string, unknown>> }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [entries, externalSignals] = await Promise.all([
    db.knowledgeEntry.findMany({
      where: {
        OR: [
          { sector: { contains: sector, mode: "insensitive" } },
          { market: { contains: market, mode: "insensitive" } },
        ],
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { successScore: "desc" },
      take: 20,
    }),
    // v4 — Load recent EXTERNAL_SAAS signals for this strategy
    strategyId
      ? db.signal.findMany({
          where: {
            strategyId,
            type: "EXTERNAL_SAAS",
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  return {
    entries: entries.map(e => ({
      type: e.entryType,
      sector: e.sector,
      market: e.market,
      data: e.data,
      score: e.successScore,
    })),
    hasFreshData: entries.length > 0,
    externalSignals: externalSignals.map(s => ({
      type: s.type,
      data: s.data,
      createdAt: s.createdAt,
    })),
  };
}

async function loadCompetitorData(strategyId: string): Promise<Array<Record<string, unknown>>> {
  const snapshots = await db.competitorSnapshot.findMany({
    orderBy: { measuredAt: "desc" },
    take: 10,
  });
  return snapshots.map(s => ({
    name: s.name,
    sector: s.sector,
    positioning: s.positioning,
    strengths: s.strengths,
    weaknesses: s.weaknesses,
    estimatedScore: s.estimatedScore,
    source: s.source,
  }));
}

// ── Step 2 : Triangulation depuis ADVE+R (COMPOSE) ───────────────────

function buildTriangulation(
  pillars: Record<string, Record<string, unknown> | null>,
  seshatEntries: Array<Record<string, unknown>>,
): { triangulation: Record<string, unknown>; sourcedFields: number; aiFields: number } {
  const a = pillars.a ?? {};
  const d = pillars.d ?? {};
  const v = pillars.v ?? {};
  const r = pillars.r ?? {};

  let sourcedFields = 0;
  let aiFields = 0;

  // customerInterviews — extraire des verbatims ADVE (pas inventé)
  const customerData = a.publicCible || d.personas;
  const customerInterviews = customerData
    ? `Données clients extraites de ADVE: cible = ${typeof a.publicCible === "string" ? a.publicCible : "non défini"}, ${Array.isArray(d.personas) ? d.personas.length : 0} personas définis.`
    : undefined;
  if (customerInterviews) sourcedFields++; else aiFields++;

  // competitiveAnalysis — depuis D.paysageConcurrentiel
  const competitors = d.paysageConcurrentiel;
  const competitiveAnalysis = Array.isArray(competitors) && competitors.length > 0
    ? `${competitors.length} concurrents identifiés: ${(competitors as Array<Record<string, unknown>>).map(c => c.name).join(", ")}.`
    : undefined;
  if (competitiveAnalysis) sourcedFields++; else aiFields++;

  // trendAnalysis — depuis SESHAT si dispo
  const sectorBenchmarks = seshatEntries.filter(e => e.type === "SECTOR_BENCHMARK");
  const trendAnalysis = sectorBenchmarks.length > 0
    ? `${sectorBenchmarks.length} benchmarks sectoriels disponibles (données SESHAT < 30j).`
    : undefined;
  if (trendAnalysis) sourcedFields++; else aiFields++;

  // financialBenchmarks — depuis V.unitEconomics
  const ue = (v.unitEconomics ?? {}) as Record<string, unknown>;
  const financialBenchmarks = (typeof ue.cac === "number" || typeof ue.ltv === "number")
    ? `CAC: ${ue.cac ?? "N/A"}, LTV: ${ue.ltv ?? "N/A"}, ratio: ${typeof ue.ltvCacRatio === "number" ? ue.ltvCacRatio.toFixed(1) : "N/A"}.`
    : undefined;
  if (financialBenchmarks) sourcedFields++; else aiFields++;

  return {
    triangulation: {
      customerInterviews: customerInterviews ?? "Données insuffisantes — à enrichir par intake ou interviews.",
      competitiveAnalysis: competitiveAnalysis ?? "Aucun concurrent identifié dans le pilier D.",
      trendAnalysis: trendAnalysis ?? "Aucun benchmark sectoriel disponible dans SESHAT.",
      financialBenchmarks: financialBenchmarks ?? "Unit economics non renseignées dans le pilier V.",
    },
    sourcedFields,
    aiFields,
  };
}

// ── Step 3 : Overton position + hypothèses + TAM (MESTOR_ASSIST) ──────

/**
 * Un appel LLM focalisé pour le protocole Track : une seule sous-partie du
 * pilier T, validée par son propre sous-schéma. Applique AVANT validation
 * l'invariant protocole « le LLM ne valide jamais une hypothèse »
 * (status VALIDATED → TESTING). Retourne {} si l'appel échoue.
 */
async function callTrackJSON(args: {
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
  const { extractJSON, parseAndValidateLLM } = await import("@/server/services/utils/llm");
  try {
    const { text } = await callLLM({
      caller: `mestor:protocole-track:${args.label}`,
      strategyId: args.strategyId,
      model: "claude-sonnet-4-20250514",
      system: args.system,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
    });
    const rawParsed = extractJSON(text) as Record<string, unknown>;
    // Invariant protocole : seuls l'opérateur/des données externes valident.
    if (Array.isArray(rawParsed.hypothesisValidation)) {
      for (const h of rawParsed.hypothesisValidation as Array<Record<string, unknown>>) {
        if (h.status === "VALIDATED") h.status = "TESTING";
      }
    }
    const result = parseAndValidateLLM(JSON.stringify(rawParsed), args.schema, {
      context: `protocole-track:${args.label}`,
      mode: "prune",
    });
    if (result.partial) {
      console.warn(
        `[protocole-track:${args.label}] strategy=${args.strategyId} dropped ${result.droppedPaths.length} invalid paths:`,
        result.droppedPaths.slice(0, 10),
      );
    }
    return (result.data ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.warn(
      `[protocole-track:${args.label}] strategy=${args.strategyId} appel/validation échoué:`,
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}

async function generateTrackAnalysis(
  pillars: Record<string, Record<string, unknown> | null>,
  riskContent: Record<string, unknown> | null,
  seshatEntries: Array<Record<string, unknown>>,
  competitorData: Array<Record<string, unknown>>,
  strategyId: string,
): Promise<Record<string, unknown>> {
  // LLM Gateway obligatoire (jamais @ai-sdk/anthropic direct) : circuit
  // breaker + fallback provider (gpt-5.5) + budget governance + cost tracking.
  const { callLLM } = await import("@/server/services/llm-gateway");

  const a = pillars.a ?? {};
  const d = pillars.d ?? {};

  const context = [...ADVE_STORAGE_KEYS]
    .map(k => {
      const c = pillars[k];
      if (!c || Object.keys(c).length === 0) return `[${k.toUpperCase()}] Vide`;
      return `[${k.toUpperCase()}]\n${JSON.stringify(c, null, 2)}`;
    })
    .join("\n\n");

  const rContext = riskContent ? `[R]\n${JSON.stringify(riskContent, null, 2)}` : "[R] Vide";
  const seshatContext = seshatEntries.length > 0
    ? `\n\nDONNÉES SESHAT (${seshatEntries.length} entrées):\n${JSON.stringify(seshatEntries.slice(0, 5), null, 2)}`
    : "\n\nAucune donnée SESHAT disponible.";
  const competitorContext = competitorData.length > 0
    ? `\n\nDONNÉES CONCURRENTS (${competitorData.length}):\n${JSON.stringify(competitorData.slice(0, 5), null, 2)}`
    : "";

  const baseSystem = `Tu es le Protocole Track de l'essaim MESTOR. Tu confrontes l'identité ADVE à la réalité marché.

RÈGLES CRITIQUES:
1. Les hypothèses que tu formules sont en status "HYPOTHESIS" ou "TESTING" — JAMAIS "VALIDATED". Seules des données externes ou l'opérateur peuvent valider.
2. Les TAM/SAM/SOM doivent porter un champ "source": "ai_estimate" si tu les estimes, "verified" si tu as une source.
3. L'overtonPosition doit refléter la PERCEPTION RÉELLE du marché, pas la perception souhaitée.
4. Le perceptionGap est l'écart entre overtonPosition (réalité) et A.prophecy + D.positionnement (cible).
5. Base-toi sur les données réelles fournies. Marque TOUTES les estimations comme "ai_estimate". N'invente pas de chiffre précis sans le marquer ai_estimate.

Retourne UNIQUEMENT du JSON valide, sans markdown.`;

  const baseData = `Données ADVE + R:\n\n${context}\n\n${rContext}${seshatContext}${competitorContext}`;

  // Mega-appel (9 champs, 6000 tokens) ÉCLATÉ en 4 sous-appels focalisés.
  // L'invariant « le LLM ne valide jamais une hypothèse » (VALIDATED → TESTING)
  // est appliqué dans callTrackJSON avant la validation Zod. Indépendants →
  // parallèles (Ollama sérialise sur le GPU local). Un sous-appel raté → {}.
  const [hypotheses, market, overton, weakSignals] = await Promise.all([
    callTrackJSON({
      strategyId, label: "hypotheses", schema: HypothesesLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT les hypothèses à tester et la validation des risques :\n{ "hypothesisValidation": [{ "hypothesis": "", "validationMethod": "", "status": "HYPOTHESIS|TESTING", "evidence": "" }] (5+, PAS de VALIDATED), "riskValidation": [{ "riskRef": "risque de R", "marketEvidence": "", "status": "CONFIRMED|DENIED|UNKNOWN", "source": "ai_estimate" }] }`,
    }),
    callTrackJSON({
      strategyId, label: "market", schema: MarketLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT le dimensionnement marché, le fit et la réalité marché :\n{ "tamSamSom": { "tam": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" }, "sam": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" }, "som": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" } }, "brandMarketFitScore": 0, "marketReality": { "macroTrends": ["tendance macro 1", "tendance macro 2", "tendance macro 3"], "weakSignals": ["signal faible 1", "signal faible 2"] } }`,
    }),
    callTrackJSON({
      strategyId, label: "overton", schema: OvertonTLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT la position Overton, l'écart de perception et les positions concurrentes :\n{ "overtonPosition": { "currentPerception": "Comment le marché perçoit la marque MAINTENANT", "marketSegments": [{ "segment": "", "perception": "" }], "confidence": 0.5 }, "perceptionGap": { "currentPerception": "résumé overtonPosition", "targetPerception": "résumé A.prophecy + D.positionnement", "gapDescription": "l'écart à combler", "gapScore": 0 }, "competitorOvertonPositions": [{ "competitorName": "", "overtonPosition": "", "relativeToUs": "AHEAD|BEHIND|PARALLEL|DIVERGENT" }] }`,
    }),
    callTrackJSON({
      strategyId, label: "weak-signals", schema: WeakSignalLLMSchema, maxOutputTokens: 1500,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT l'analyse des signaux faibles :\n{ "weakSignalAnalysis": [{ "thesis": "hypothèse sur l'impact du signal", "rawEvent": "événement brut observé dans le secteur", "causalChain": [{ "from": "événement", "to": "effet intermédiaire", "mechanism": "mécanisme de causalité", "confidence": 0.6 }] }] }`,
    }),
  ]);

  // Fusion des 4 sous-réponses (champs disjoints → pas de collision).
  return { ...hypotheses, ...market, ...overton, ...weakSignals };
}

// ── Step 4 : Brand-Market Fit score (CALC) ────────────────────────────

function calculateBMF(trackContent: Record<string, unknown>): number {
  let score = 30; // Base

  // Triangulation completeness (+20 max)
  const tri = (trackContent.triangulation ?? {}) as Record<string, unknown>;
  const triFilled = ["customerInterviews", "competitiveAnalysis", "trendAnalysis", "financialBenchmarks"]
    .filter(k => typeof tri[k] === "string" && (tri[k] as string).length > 20).length;
  score += triFilled * 5;

  // Hypothesis validation (+20 max)
  const hyps = (trackContent.hypothesisValidation ?? []) as Array<Record<string, unknown>>;
  const testedOrValidated = hyps.filter(h => h.status === "TESTING" || h.status === "VALIDATED").length;
  score += Math.min(20, testedOrValidated * 4);

  // TAM/SAM/SOM presence (+15 max)
  const tam = (trackContent.tamSamSom ?? {}) as Record<string, unknown>;
  if (tam.tam) score += 5;
  if (tam.sam) score += 5;
  if (tam.som) score += 5;

  // Perception gap score — inverted (smaller gap = better fit) (+15 max)
  const gap = (trackContent.perceptionGap ?? {}) as Record<string, unknown>;
  const gapScore = typeof gap.gapScore === "number" ? gap.gapScore : 50;
  score += Math.round((100 - gapScore) * 0.15);

  return Math.min(100, Math.max(0, score));
}

// ── Public API ────────────────────────────────────────────────────────

export async function executeProtocoleTrack(strategyId: string): Promise<ProtocoleTrackResult> {
  try {
    // Load all pillars A-R
    const dbPillars = await db.pillar.findMany({
      where: { strategyId, key: { in: ["a", "d", "v", "e", "r"] } },
    });
    const pillars: Record<string, Record<string, unknown> | null> = { a: null, d: null, v: null, e: null, r: null };
    for (const p of dbPillars) {
      pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;
    }

    const a = pillars.a ?? {};
    const sector = (a.secteur as string) ?? "";
    const market = (a.pays as string) ?? "";

    // Step 1: SESHAT knowledge + external SaaS signals (CALC)
    const seshat = await loadSeshatKnowledge(sector, market, strategyId);
    const competitorData = await loadCompetitorData(strategyId);

    // Step 2: Triangulation (COMPOSE)
    const { triangulation, sourcedFields, aiFields } = buildTriangulation(pillars, seshat.entries);

    // Step 3: Track analysis (MESTOR_ASSIST)
    const trackAnalysis = await generateTrackAnalysis(pillars, pillars.r ?? null, seshat.entries, competitorData, strategyId);

    // Step 4: BMF score (CALC)
    const mergedContent = { triangulation, ...trackAnalysis };
    const bmf = calculateBMF(mergedContent);

    // Market data metadata
    const content: Record<string, unknown> = {
      ...mergedContent,
      brandMarketFitScore: bmf,
      marketDataSources: seshat.entries.map(e => ({
        sourceType: e.type,
        title: `Knowledge: ${e.sector}/${e.market}`,
        reliability: (e.score as number) / 100,
      })),
      // v4 — Include external SaaS signal context
      externalSaasSignals: seshat.externalSignals,
      externalSaasSignalCount: seshat.externalSignals.length,
      lastMarketDataRefresh: new Date().toISOString(),
      sectorKnowledgeReused: seshat.hasFreshData,
    };

    // Confidence — higher if sourced data available
    // v4 — boost +0.10 when external SaaS signals contribute verified data
    const sourceRatio = sourcedFields / Math.max(sourcedFields + aiFields, 1);
    const externalSignalBoost = seshat.externalSignals.length > 0 ? 0.10 : 0;
    const confidence = Math.min(0.90, 0.35 + sourceRatio * 0.3 + (seshat.hasFreshData ? 0.15 : 0) + externalSignalBoost);

    return {
      pillarKey: "t",
      content,
      confidence,
      sourcedDataCount: sourcedFields + seshat.entries.length,
      aiEstimateCount: aiFields,
    };
  } catch (err) {
    return {
      pillarKey: "t",
      content: {},
      confidence: 0,
      sourcedDataCount: 0,
      aiEstimateCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
