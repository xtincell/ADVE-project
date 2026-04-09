/**
 * Market Intelligence Engine — T pillar orchestrator
 *
 * Runs targeted market research using brand ADVE data as search intent.
 * Results are stored in KnowledgeEntry for cross-brand sector reuse.
 * A brand in the same sector doesn't pay for a new study if fresh data exists.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { collectMarketSignals, type CollectionStrategy } from "./signal-collector";
import { analyzeWeakSignals, buildSearchContext, type WeakSignal } from "./weak-signal-analyzer";

const FRESH_DATA_MAX_DAYS = 30;

export interface MarketIntelligenceResult {
  pillarContent: Record<string, unknown>;
  weakSignals: WeakSignal[];
  sectorReused: boolean;
  sourcesUsed: number;
  confidence: number;
}

/**
 * Check if sector knowledge already exists and is fresh enough
 */
export async function checkSectorKnowledge(
  sector: string,
  market?: string,
  maxAgeDays = FRESH_DATA_MAX_DAYS,
): Promise<{ exists: boolean; entries: Array<{ id: string; data: unknown; createdAt: Date }>; freshEnough: boolean }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const entries = await db.knowledgeEntry.findMany({
    where: {
      entryType: "SECTOR_BENCHMARK",
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      ...(market ? { market: { contains: market, mode: "insensitive" as Prisma.QueryMode } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, data: true, createdAt: true },
  });

  const freshEntries = entries.filter(e => e.createdAt >= cutoff);

  return {
    exists: entries.length > 0,
    entries,
    freshEnough: freshEntries.length > 0,
  };
}

/**
 * Main orchestration: run full market intelligence for a strategy's T pillar
 */
export async function runMarketIntelligence(
  strategyId: string,
  options?: { forceRefresh?: boolean },
): Promise<MarketIntelligenceResult> {
  // 1. Build search context from ADVE pillars
  const searchContext = await buildSearchContext(strategyId);

  // 2. Check for reusable sector knowledge
  let sectorReused = false;
  let existingData: unknown[] = [];

  if (!options?.forceRefresh && searchContext.sector) {
    const sectorCheck = await checkSectorKnowledge(searchContext.sector, searchContext.market);
    if (sectorCheck.freshEnough) {
      sectorReused = true;
      existingData = sectorCheck.entries.map(e => e.data);
    }
  }

  // 3. Collect fresh signals if needed
  const collectionConfig: CollectionStrategy = {
    strategyId,
    sector: searchContext.sector,
    market: searchContext.market,
    keywords: searchContext.keywords,
    competitors: searchContext.competitors,
    frequency: "DAILY",
  };

  const freshSignals = sectorReused ? [] : await collectMarketSignals(collectionConfig);

  // 4. Analyze weak signals with causal chains
  const weakSignals = await analyzeWeakSignals(
    freshSignals,
    searchContext,
    strategyId,
  );

  // 5. Load existing ADVE+R context for T synthesis
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const pillarMap: Record<string, unknown> = {};
  for (const p of pillars) pillarMap[p.key.toUpperCase()] = p.content;

  const adveRContext = ["A", "D", "V", "E", "R"]
    .map(k => {
      const content = pillarMap[k];
      return content ? `## Pilier ${k}\n${JSON.stringify(content, null, 2)}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  // 6. LLM synthesis: combine real market data + ADVE context → structured T
  const marketDataSection = sectorReused
    ? `## DONNÉES SECTEUR RÉUTILISÉES (fraîches, même secteur)\n${JSON.stringify(existingData.slice(0, 3), null, 2)}`
    : `## SIGNAUX MARCHÉ COLLECTÉS (${freshSignals.length} signaux)\n${freshSignals.map(s => `- ${s.title}: ${s.content}`).join("\n")}`;

  const weakSignalsSection = weakSignals.length > 0
    ? `## SIGNAUX FAIBLES DÉTECTÉS (${weakSignals.length} thèses)\n${weakSignals.map(ws =>
        `### ${ws.thesis} (confiance: ${Math.round(ws.confidence * 100)}%)\n` +
        `Chaîne causale: ${ws.causalChain.map(c => `${c.from} → ${c.to}`).join(" → ")}\n` +
        `Impact: ${ws.brandImpact}\n` +
        `Signaux de soutien: ${ws.supportingSignals.length} signaux renforçant cette thèse`
      ).join("\n\n")}`
    : "";

  const systemPrompt = `Tu es un analyste stratégique senior spécialisé en intelligence de marché.
Tu produis le pilier T (Track) du protocole ADVE-RTIS : triangulation marché, validation d'hypothèses, TAM/SAM/SOM, et score brand-market fit.

IMPORTANT : Base-toi sur les DONNÉES RÉELLES fournies. Ne les invente pas.
Les signaux faibles doivent être intégrés dans l'analyse de tendances et les hypothèses.

Format JSON strict conforme au schema PillarT :
{
  "triangulation": {
    "customerInterviews": "synthèse des insights clients",
    "competitiveAnalysis": "analyse concurrentielle",
    "trendAnalysis": "analyse des tendances macro et micro",
    "financialBenchmarks": "benchmarks financiers du secteur"
  },
  "hypothesisValidation": [
    { "hypothesis": "...", "validationMethod": "...", "status": "HYPOTHESIS|TESTING|VALIDATED|INVALIDATED", "evidence": "..." }
  ],
  "marketReality": {
    "macroTrends": ["tendance 1", "tendance 2", "tendance 3"],
    "weakSignals": ["signal faible 1", "signal faible 2"]
  },
  "tamSamSom": {
    "tam": { "value": 0, "description": "..." },
    "sam": { "value": 0, "description": "..." },
    "som": { "value": 0, "description": "..." }
  },
  "brandMarketFitScore": 0-100,
  "weakSignalAnalysis": [...],
  "marketDataSources": [...],
  "lastMarketDataRefresh": "ISO date",
  "sectorKnowledgeReused": true/false
}`;

  const result = await callLLM({
    system: systemPrompt,
    prompt: `Produis le pilier T (Track) pour cette marque.\n\n${adveRContext}\n\n${marketDataSection}\n\n${weakSignalsSection}\n\nJSON uniquement.`,
    caller: "mestor:market-intelligence",
    strategyId,
    maxTokens: 8000,
  });

  let pillarContent: Record<string, unknown>;
  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    pillarContent = match ? JSON.parse(match[0]) : {};
  } catch {
    pillarContent = {};
  }

  // Inject metadata
  pillarContent.lastMarketDataRefresh = new Date().toISOString();
  pillarContent.sectorKnowledgeReused = sectorReused;
  pillarContent.weakSignalAnalysis = weakSignals;
  pillarContent.marketDataSources = freshSignals.map(s => ({
    sourceType: s.sourceType,
    title: s.title,
    collectedAt: s.collectedAt ?? new Date().toISOString(),
    reliability: s.relevance,
  }));

  // 7. Persist T pillar
  const confidence = sectorReused ? 0.75 : 0.80;
  // Persist via Gateway
  const { writePillar } = await import("@/server/services/pillar-gateway");
  await writePillar({
    strategyId,
    pillarKey: "t" as import("@/lib/types/advertis-vector").PillarKey,
    operation: { type: "MERGE_DEEP", patch: pillarContent as Record<string, unknown> },
    author: { system: "MESTOR", reason: "Market intelligence T pillar generation" },
    options: { confidenceDelta: 0.05 },
  });

  // 8. Store as sector knowledge for cross-brand reuse
  if (!sectorReused && searchContext.sector) {
    await db.knowledgeEntry.create({
      data: {
        entryType: "SECTOR_BENCHMARK",
        sector: searchContext.sector,
        market: searchContext.market,
        data: {
          type: "market_intelligence_t_pillar",
          pillarContent: JSON.parse(JSON.stringify(pillarContent)),
          weakSignals: JSON.parse(JSON.stringify(weakSignals)),
          generatedFor: strategyId,
          generatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        successScore: (pillarContent.brandMarketFitScore as number ?? 50) / 100,
        sampleSize: freshSignals.length + existingData.length,
      },
    });
  }

  return {
    pillarContent,
    weakSignals,
    sectorReused,
    sourcesUsed: freshSignals.length + existingData.length,
    confidence,
  };
}
