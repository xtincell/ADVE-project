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

import { db } from "@/lib/db";

// ── Types ──────────────────────────────────────────────────────────────

interface RiskValidationEntry {
  riskRef?: string;
  marketEvidence: string;
  status: "CONFIRMED" | "DENIED" | "UNKNOWN";
  source: "ai_estimate" | "verified" | "calculated";
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
): Promise<{ entries: Array<Record<string, unknown>>; hasFreshData: boolean }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const entries = await db.knowledgeEntry.findMany({
    where: {
      OR: [
        { sector: { contains: sector, mode: "insensitive" } },
        { market: { contains: market, mode: "insensitive" } },
      ],
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { successScore: "desc" },
    take: 20,
  });

  return {
    entries: entries.map(e => ({
      type: e.entryType,
      sector: e.sector,
      market: e.market,
      data: e.data,
      score: e.successScore,
    })),
    hasFreshData: entries.length > 0,
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

async function generateTrackAnalysis(
  pillars: Record<string, Record<string, unknown> | null>,
  riskContent: Record<string, unknown> | null,
  seshatEntries: Array<Record<string, unknown>>,
  competitorData: Array<Record<string, unknown>>,
  strategyId: string,
): Promise<Record<string, unknown>> {
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

  const a = pillars.a ?? {};
  const d = pillars.d ?? {};

  const context = ["a", "d", "v", "e"]
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

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Tu es le Protocole Track de l'essaim MESTOR. Tu confrontes l'identité ADVE à la réalité marché.

RÈGLES CRITIQUES:
1. Les hypothèses que tu formules sont en status "HYPOTHESIS" ou "TESTING" — JAMAIS "VALIDATED". Seules des données externes ou l'opérateur peuvent valider.
2. Les TAM/SAM/SOM doivent porter un champ "source": "ai_estimate" si tu les estimes, "verified" si tu as une source.
3. L'overtonPosition doit refléter la PERCEPTION RÉELLE du marché, pas la perception souhaitée.
4. Le perceptionGap est l'écart entre overtonPosition (réalité) et A.prophecy + D.positionnement (cible).

Retourne UNIQUEMENT du JSON valide.`,
    prompt: `Données ADVE + R:

${context}

${rContext}
${seshatContext}
${competitorContext}

Produis le JSON avec ces champs:
{
  "hypothesisValidation": [{ "hypothesis": "", "validationMethod": "", "status": "HYPOTHESIS|TESTING", "evidence": "" }] (5+ items, PAS de VALIDATED),
  "tamSamSom": {
    "tam": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" },
    "sam": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" },
    "som": { "value": 0, "description": "", "source": "ai_estimate|verified", "sourceRef": "" }
  },
  "overtonPosition": {
    "currentPerception": "Comment le marché perçoit la marque MAINTENANT",
    "marketSegments": [{ "segment": "", "perception": "" }],
    "confidence": 0.0-1.0
  },
  "perceptionGap": {
    "currentPerception": "résumé overtonPosition",
    "targetPerception": "résumé A.prophecy + D.positionnement",
    "gapDescription": "l'écart à combler",
    "gapScore": 0-100
  },
  "competitorOvertonPositions": [{ "competitorName": "", "overtonPosition": "", "relativeToUs": "AHEAD|BEHIND|PARALLEL|DIVERGENT" }],
  "riskValidation": [{ "riskRef": "risque de R", "marketEvidence": "", "status": "CONFIRMED|DENIED|UNKNOWN", "source": "ai_estimate" }],
  "brandMarketFitScore": 0-100
}

Base-toi sur les données réelles fournies. Marque TOUTES les estimations comme "ai_estimate".`,
    maxTokens: 6000,
  });

  // Cost tracking
  await db.aICostLog.create({
    data: {
      strategyId, provider: "anthropic", model: "claude-sonnet-4-20250514",
      inputTokens: usage?.promptTokens ?? 0, outputTokens: usage?.completionTokens ?? 0,
      cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
      context: "protocole-track",
    },
  }).catch(() => {});

  // Parse with robust extractor (Chantier 10)
  try {
    const { extractJSON } = await import("@/server/services/utils/llm");
    const parsed = extractJSON(text) as Record<string, unknown>;
    // GUARD: force all hypotheses to HYPOTHESIS or TESTING (never VALIDATED from LLM)
    if (Array.isArray(parsed.hypothesisValidation)) {
      for (const h of parsed.hypothesisValidation as Array<Record<string, unknown>>) {
        if (h.status === "VALIDATED") h.status = "TESTING"; // Downgrade — only humans validate
      }
    }
    return parsed;
  } catch {
    return {};
  }
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

    // Step 1: SESHAT knowledge (CALC)
    const seshat = await loadSeshatKnowledge(sector, market);
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
      lastMarketDataRefresh: new Date().toISOString(),
      sectorKnowledgeReused: seshat.hasFreshData,
    };

    // Confidence — higher if sourced data available
    const sourceRatio = sourcedFields / Math.max(sourcedFields + aiFields, 1);
    const confidence = Math.min(0.85, 0.35 + sourceRatio * 0.3 + (seshat.hasFreshData ? 0.15 : 0));

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
