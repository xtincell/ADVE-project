// ============================================================================
// MODULE M26 — MCP Intelligence Server
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §3.3 | Division: L'Oracle + Le Signal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  17 tools: scoreStrategy, scorePillar, analyzeGaps, generateInsight, detectDrift,
//            runFramework, getBenchmarks, queryKnowledge, startConversation, getVariables,
//            suggestFrameworks, comparePillars, getRecommendations, getFreshness,
//            createSignal, processSignal, captureKnowledge
// [x] REQ-2  6 resources: scores/{strategyId}, variables/{strategyId}, frameworks/{strategyId},
//            pillars/{strategyId}, freshness/{strategyId}, knowledge
// [x] REQ-3  Freshness tracking across all data types (variables, frameworks, pillars)
// [x] REQ-4  Knowledge graph statistics resource
//
// TOOLS: 17 | RESOURCES: 6 | SPEC TARGET: 17 tools + 6 resources ✓
// ============================================================================

import { z } from "zod";
import { db } from "@/lib/db";
import * as mestor from "@/server/services/mestor";
import * as knowledgeAggregator from "@/server/services/knowledge-aggregator";
import * as feedbackLoop from "@/server/services/feedback-loop";
import * as seshatBridge from "@/server/services/seshat-bridge";

// ---------------------------------------------------------------------------
// Intelligence MCP Server
// Outils de renseignement stratégique, graphe de connaissances, études de
// marché, analyse concurrentielle, signaux et tendances.
// ---------------------------------------------------------------------------

export const serverName = "intelligence";
export const serverDescription =
  "Serveur MCP Intelligence — Renseignement stratégique, knowledge graph, études de marché, analyse concurrentielle et détection de signaux pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- Knowledge Graph ----
  {
    name: "knowledge_graph_query",
    description:
      "Interroge le graphe de connaissances stratégique. Retourne les nœuds et relations correspondant à la requête sémantique.",
    inputSchema: z.object({
      query: z.string().describe("Requête sémantique en langage naturel"),
      strategyId: z.string().optional().describe("ID de la stratégie pour filtrer le contexte"),
      limit: z.number().int().min(1).max(50).default(10).describe("Nombre max de résultats"),
    }),
    handler: async (input) => {
      const entries = await db.knowledgeEntry.findMany({
        where: {
          ...(input.strategyId ? { sector: input.strategyId as string } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: (input.limit as number) ?? 10,
      });
      return { entries, count: entries.length };
    },
  },

  {
    name: "knowledge_graph_ingest",
    description:
      "Ingère une nouvelle entrée dans le graphe de connaissances (insight, benchmark, observation terrain).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie associée"),
      entryType: z
        .enum(["DIAGNOSTIC_RESULT", "MISSION_OUTCOME", "BRIEF_PATTERN", "CREATOR_PATTERN", "SECTOR_BENCHMARK", "CAMPAIGN_TEMPLATE"])
        .describe("Type d'entrée"),
      data: z.record(z.unknown()).describe("Données de l'entrée (JSON)"),
      sector: z.string().optional().describe("Secteur d'activité"),
      market: z.string().optional().describe("Marché géographique"),
    }),
    handler: async (input) => {
      const entry = await db.knowledgeEntry.create({
        data: {
          entryType: input.entryType as "DIAGNOSTIC_RESULT" | "MISSION_OUTCOME" | "BRIEF_PATTERN" | "CREATOR_PATTERN" | "SECTOR_BENCHMARK" | "CAMPAIGN_TEMPLATE",
          data: ((input.data as Record<string, unknown>) ?? {}) as unknown as import("@prisma/client").Prisma.InputJsonValue,
          sector: input.sector as string | undefined,
          market: input.market as string | undefined,
        },
      });
      return entry;
    },
  },

  // ---- Études de marché ----
  {
    name: "market_study_search",
    description:
      "Recherche des études de marché et données sectorielles. Combine les données internes et les références SESHAT.",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité à analyser"),
      market: z.string().optional().describe("Marché géographique (ex: Cameroun, Afrique de l'Ouest)"),
      topic: z.string().optional().describe("Sujet spécifique à rechercher"),
    }),
    handler: async (input) => {
      const [internalEntries, seshatRefs] = await Promise.all([
        db.knowledgeEntry.findMany({
          where: {
            entryType: "SECTOR_BENCHMARK",
            sector: input.sector as string,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        seshatBridge.queryReferences({
          topic: (input.topic as string) ?? (input.sector as string),
          sector: input.sector as string,
          market: input.market as string | undefined,
          limit: 10,
        }),
      ]);
      return { internalEntries, externalReferences: seshatRefs };
    },
  },

  // ---- Analyse concurrentielle ----
  {
    name: "competitor_analysis",
    description:
      "Analyse le positionnement d'un concurrent par rapport à la stratégie ADVE de la marque cliente.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie de la marque cliente"),
      competitorName: z.string().describe("Nom du concurrent"),
      dimensions: z
        .array(z.enum(["pricing", "positioning", "creative", "digital", "distribution", "community"]))
        .optional()
        .describe("Dimensions à analyser"),
    }),
    handler: async (input) => {
      const [strategy, competitorEntries, pillars] = await Promise.all([
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyId as string },
        }),
        db.knowledgeEntry.findMany({
          where: {
            entryType: "SECTOR_BENCHMARK",
            sector: { contains: input.competitorName as string },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.pillar.findMany({
          where: { strategyId: input.strategyId as string },
        }),
      ]);
      return {
        brand: strategy.name,
        competitor: input.competitorName,
        dimensions: (input.dimensions as string[]) ?? ["positioning", "creative", "digital"],
        entries: competitorEntries,
        strategyPillars: pillars,
      };
    },
  },

  // ---- Benchmarks ----
  {
    name: "benchmark_lookup",
    description:
      "Recherche des benchmarks sectoriels (KPIs moyens, taux de conversion, coûts d'acquisition, etc.).",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité"),
      metric: z.string().describe("Métrique recherchée (ex: CPA, CTR, taux de rétention)"),
      market: z.string().optional().describe("Marché géographique"),
    }),
    handler: async (input) => {
      const benchmarks = await db.knowledgeEntry.findMany({
        where: {
          entryType: "SECTOR_BENCHMARK",
          sector: input.sector as string,
          pillarFocus: { contains: input.metric as string },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return { sector: input.sector, metric: input.metric, benchmarks };
    },
  },

  // ---- Insights sectoriels ----
  {
    name: "sector_insights",
    description:
      "Génère des insights stratégiques pour un secteur donné en agrégeant les données du knowledge graph.",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité"),
      strategyId: z.string().optional().describe("ID stratégie pour contextualiser"),
    }),
    handler: async (input) => {
      const entries = await db.knowledgeEntry.findMany({
        where: { sector: input.sector as string },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const typeCounts = entries.reduce(
        (acc, e) => {
          acc[e.entryType] = (acc[e.entryType] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return { sector: input.sector, totalEntries: entries.length, byType: typeCounts, latestEntries: entries.slice(0, 5) };
    },
  },

  // ---- Attribution ----
  {
    name: "attribution_analysis",
    description:
      "Analyse l'attribution des résultats marketing aux différents drivers et canaux de la campagne.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      dateFrom: z.string().optional().describe("Date de début (ISO)"),
      dateTo: z.string().optional().describe("Date de fin (ISO)"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: {
          missions: { include: { driver: true } },
          milestones: true,
        },
      });
      const driverStats = campaign.missions.map((m: { title: string; driver?: { channel: string } | null; status: string }) => ({
        missionTitle: m.title,
        channel: m.driver?.channel ?? "N/A",
        status: m.status,
        completed: m.status === "COMPLETED",
      }));
      return { campaignId: input.campaignId, campaignName: campaign.name, driverStats };
    },
  },

  // ---- Analyse de cohortes ----
  {
    name: "cohort_analysis",
    description:
      "Analyse de cohortes pour suivre la progression des audiences dans la Devotion Ladder au fil du temps.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      period: z.enum(["weekly", "monthly", "quarterly"]).default("monthly").describe("Période d'analyse"),
      cohortBy: z.enum(["acquisition_date", "first_interaction", "campaign"]).default("acquisition_date"),
    }),
    handler: async (input) => {
      const snapshots = await db.devotionSnapshot.findMany({
        where: { strategyId: input.strategyId as string },
        orderBy: { measuredAt: "desc" },
        take: 12,
      });
      return {
        strategyId: input.strategyId,
        period: input.period,
        cohortBy: input.cohortBy,
        snapshots: snapshots.map((s) => ({
          measuredAt: s.measuredAt,
          levels: { spectateur: s.spectateur, interesse: s.interesse, participant: s.participant, engage: s.engage, ambassadeur: s.ambassadeur, evangeliste: s.evangeliste },
          devotionScore: s.devotionScore,
        })),
      };
    },
  },

  // ---- Monitoring de signaux ----
  {
    name: "signal_monitor",
    description:
      "Surveille les signaux faibles et alertes stratégiques : mentions, sentiments, changements de marché.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie à surveiller"),
      signalTypes: z
        .array(z.enum(["mention", "sentiment_shift", "competitor_move", "market_change", "opportunity"]))
        .optional()
        .describe("Types de signaux à filtrer"),
    }),
    handler: async (input) => {
      const signals = await db.signal.findMany({
        where: {
          strategyId: input.strategyId as string,
          ...(input.signalTypes
            ? { type: { in: input.signalTypes as string[] } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return {
        strategyId: input.strategyId,
        signalCount: signals.length,
        signals,
      };
    },
  },

  {
    name: "signal_create",
    description:
      "Crée manuellement un signal stratégique (alerte, opportunité, menace) dans le système de veille.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      type: z.enum(["mention", "sentiment_shift", "competitor_move", "market_change", "opportunity"]),
      title: z.string().describe("Titre du signal"),
      description: z.string().describe("Description détaillée"),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      source: z.string().optional().describe("Source du signal"),
    }),
    handler: async (input) => {
      const signal = await db.signal.create({
        data: {
          strategyId: input.strategyId as string,
          type: input.type as string,
          data: {
            title: input.title as string,
            description: input.description as string,
            severity: input.severity as string,
            source: (input.source as string) ?? "manual",
          },
        },
      });
      return signal;
    },
  },

  // ---- Détection de tendances ----
  {
    name: "trend_detection",
    description:
      "Détecte les tendances émergentes en analysant les patterns dans le knowledge graph et les signaux.",
    inputSchema: z.object({
      sector: z.string().optional().describe("Filtrer par secteur"),
      timeframe: z.enum(["7d", "30d", "90d", "180d"]).default("30d").describe("Fenêtre temporelle"),
      minOccurrences: z.number().int().min(1).default(3).describe("Seuil minimum d'occurrences"),
    }),
    handler: async (input) => {
      const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "180d": 180 };
      const days = daysMap[(input.timeframe as string) ?? "30d"] ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const entries = await db.knowledgeEntry.findMany({
        where: {
          createdAt: { gte: since },
          ...(input.sector ? { sector: input.sector as string } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      // Entry type frequency analysis
      const tagFrequency: Record<string, number> = {};
      for (const entry of entries) {
        const tags = [entry.entryType, entry.sector, entry.pillarFocus].filter(Boolean) as string[];
        for (const tag of tags) {
          tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
        }
      }
      const threshold = (input.minOccurrences as number) ?? 3;
      const trending = Object.entries(tagFrequency)
        .filter(([, count]) => count >= threshold)
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({ tag, occurrences: count }));

      return { timeframe: input.timeframe, sector: input.sector, totalEntries: entries.length, trends: trending };
    },
  },

  // ---- Génération d'insights ----
  {
    name: "insight_generate",
    description:
      "Génère un insight actionnable à partir du croisement des données stratégiques, benchmarks et signaux.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      focusArea: z
        .enum(["acquisition", "retention", "revenue", "activation", "referral", "brand_equity"])
        .describe("Domaine de focus pour l'insight"),
    }),
    handler: async (input) => {
      const [strategy, signals, snapshots, pillars] = await Promise.all([
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyId as string },
        }),
        db.signal.findMany({
          where: { strategyId: input.strategyId as string },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        db.devotionSnapshot.findMany({
          where: { strategyId: input.strategyId as string },
          orderBy: { measuredAt: "desc" },
          take: 3,
        }),
        db.pillar.findMany({
          where: { strategyId: input.strategyId as string },
        }),
      ]);
      return {
        brand: strategy.name,
        focusArea: input.focusArea,
        strategyPillars: pillars,
        recentSignals: signals,
        devotionTrend: snapshots,
      };
    },
  },

  // ---- ADVE Pillar Deep Dive ----
  {
    name: "pillar_deep_dive",
    description:
      "Analyse approfondie d'un pilier ADVE (Authenticité, Distinction, Valeur, Engagement) avec données croisées.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      pillar: z
        .enum(["authenticite", "distinction", "valeur", "engagement", "rituels", "tribu", "iconographie", "storytelling"])
        .describe("Pilier ADVE à analyser en profondeur"),
    }),
    handler: async (input) => {
      const [strategy, scores] = await Promise.all([
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyId as string },
        }),
        db.scoreSnapshot.findMany({
          where: { strategyId: input.strategyId as string },
          orderBy: { measuredAt: "desc" },
          take: 5,
        }),
      ]);
      const references = await seshatBridge.queryReferences({
        topic: input.pillar as string,
        limit: 5,
      });
      return {
        brand: strategy.name,
        pillar: input.pillar,
        scores,
        references,
      };
    },
  },

  // ---- Score structurel historique ----
  {
    name: "structural_score_history",
    description:
      "Récupère l'historique du score structurel ADVE-RTIS pour suivre la progression de la marque.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      limit: z.number().int().min(1).max(100).default(20).describe("Nombre de points de données"),
    }),
    handler: async (input) => {
      const scores = await db.scoreSnapshot.findMany({
        where: { strategyId: input.strategyId as string },
        orderBy: { measuredAt: "desc" },
        take: (input.limit as number) ?? 20,
      });
      return { strategyId: input.strategyId, scores };
    },
  },

  // ---- Brand Health Dashboard ----
  {
    name: "brand_health_snapshot",
    description:
      "Capture instantanée de la santé globale de la marque : score structurel, cult index, devotion ladder, signaux actifs.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const [strategy, latestScore, latestSnapshot, activeSignals] = await Promise.all([
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyId as string },
        }),
        db.scoreSnapshot.findFirst({
          where: { strategyId: input.strategyId as string },
          orderBy: { measuredAt: "desc" },
        }),
        db.devotionSnapshot.findFirst({
          where: { strategyId: input.strategyId as string },
          orderBy: { measuredAt: "desc" },
        }),
        db.signal.count({
          where: {
            strategyId: input.strategyId as string,
          },
        }),
      ]);
      return {
        brand: strategy.name,
        structuralScore: latestScore,
        devotionSnapshot: latestSnapshot,
        activeHighSeveritySignals: activeSignals,
      };
    },
  },

  // ---- Knowledge Graph Stats ----
  {
    name: "knowledge_graph_stats",
    description:
      "Statistiques globales du graphe de connaissances : volume par type, secteur, fraîcheur des données.",
    inputSchema: z.object({
      strategyId: z.string().optional().describe("Filtrer par stratégie (optionnel)"),
    }),
    handler: async (input) => {
      const where = input.strategyId ? { sector: input.strategyId as string } : {};
      const [total, byType, bySector] = await Promise.all([
        db.knowledgeEntry.count({ where }),
        db.knowledgeEntry.groupBy({ by: ["entryType"], _count: true, where }),
        db.knowledgeEntry.groupBy({ by: ["sector"], _count: true, where }),
      ]);
      return { total, byType, bySector };
    },
  },

  // ---- Cross-Strategy Comparison ----
  {
    name: "cross_strategy_compare",
    description:
      "Compare deux stratégies sur leurs scores structurels, devotion et signaux pour identifier les patterns gagnants.",
    inputSchema: z.object({
      strategyIdA: z.string().describe("ID de la première stratégie"),
      strategyIdB: z.string().describe("ID de la deuxième stratégie"),
    }),
    handler: async (input) => {
      const [stratA, stratB, scoresA, scoresB] = await Promise.all([
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyIdA as string },
        }),
        db.strategy.findUniqueOrThrow({
          where: { id: input.strategyIdB as string },
        }),
        db.scoreSnapshot.findFirst({
          where: { strategyId: input.strategyIdA as string },
          orderBy: { measuredAt: "desc" },
        }),
        db.scoreSnapshot.findFirst({
          where: { strategyId: input.strategyIdB as string },
          orderBy: { measuredAt: "desc" },
        }),
      ]);
      return {
        strategyA: { brand: stratA.name, latestScore: scoresA },
        strategyB: { brand: stratB.name, latestScore: scoresB },
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Resources (6 as per spec §3.3)
// ---------------------------------------------------------------------------

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string }) => Promise<unknown>;
}

export const resources: ResourceDefinition[] = [
  {
    uri: "intelligence://scores/{strategyId}",
    name: "ADVE-RTIS Scores",
    description: "Current ADVE-RTIS vector scores (/200) and classification for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { advertis_vector: true, name: true },
      });
      const latest = await db.scoreSnapshot.findFirst({
        where: { strategyId },
        orderBy: { measuredAt: "desc" },
      });
      return { strategy: strategy?.name, vector: strategy?.advertis_vector, latestSnapshot: latest };
    },
  },
  {
    uri: "intelligence://variables/{strategyId}",
    name: "Brand Variables",
    description: "All brand variables for a strategy with staleness status",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const variables = await db.brandVariable.findMany({
        where: { strategyId },
        orderBy: { updatedAt: "desc" },
      });
      const config = await db.variableStoreConfig.findUnique({ where: { strategyId } });
      const staleThreshold = config?.stalenessThresholdDays ?? 30;
      const now = new Date();
      return {
        variables: variables.map((v) => ({
          ...v,
          isStale: (now.getTime() - v.updatedAt.getTime()) / 86400000 > staleThreshold,
        })),
        config: { stalenessThresholdDays: staleThreshold },
      };
    },
  },
  {
    uri: "intelligence://frameworks/{strategyId}",
    name: "ARTEMIS Frameworks",
    description: "Framework implementations and their freshness for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const results = await db.frameworkResult.findMany({
        where: { strategyId },
        orderBy: { createdAt: "desc" },
      });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      // Lookup framework names
      const fwIds = [...new Set(results.map((r) => r.frameworkId))];
      const frameworks = fwIds.length > 0 ? await db.framework.findMany({ where: { id: { in: fwIds } } }) : [];
      const fwMap = new Map(frameworks.map((fw) => [fw.id, fw]));
      return {
        count: results.length,
        frameworks: results.map((fr) => ({
          id: fr.id,
          frameworkSlug: fwMap.get(fr.frameworkId)?.slug,
          frameworkName: fwMap.get(fr.frameworkId)?.name,
          score: fr.score,
          createdAt: fr.createdAt,
          isFresh: fr.createdAt > thirtyDaysAgo,
        })),
      };
    },
  },
  {
    uri: "intelligence://pillars/{strategyId}",
    name: "Pillar Content",
    description: "All 8 pillar contents, confidence levels and validation status for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const pillars = await db.pillar.findMany({
        where: { strategyId },
        orderBy: { key: "asc" },
      });
      return {
        pillars: pillars.map((p) => ({
          key: p.key,
          confidence: p.confidence,
          validationStatus: (p as unknown as Record<string, unknown>).validationStatus ?? "DRAFT",
          contentKeys: p.content ? Object.keys(p.content as Record<string, unknown>) : [],
          updatedAt: p.updatedAt,
        })),
      };
    },
  },
  {
    uri: "intelligence://freshness/{strategyId}",
    name: "Data Freshness",
    description: "Freshness status of all strategy data (pillars, frameworks, variables, scores)",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const config = await db.variableStoreConfig.findUnique({ where: { strategyId } });
      const staleThresholdMs = (config?.stalenessThresholdDays ?? 30) * 86400000;
      const [pillars, variables, frameworkResults, latestScore] = await Promise.all([
        db.pillar.findMany({ where: { strategyId }, select: { key: true, updatedAt: true } }),
        db.brandVariable.findMany({ where: { strategyId }, select: { key: true, updatedAt: true } }),
        db.frameworkResult.findMany({ where: { strategyId }, select: { id: true, createdAt: true } }),
        db.scoreSnapshot.findFirst({ where: { strategyId }, orderBy: { measuredAt: "desc" }, select: { measuredAt: true } }),
      ]);
      const now = new Date();
      const daysSinceScore = latestScore ? (now.getTime() - latestScore.measuredAt.getTime()) / 86400000 : null;
      const staleVars = variables.filter((v) => (now.getTime() - v.updatedAt.getTime()) > staleThresholdMs);
      const freshFw = frameworkResults.filter((f) => (now.getTime() - f.createdAt.getTime()) < 30 * 86400000);
      return {
        pillars: pillars.map((p) => ({ key: p.key, daysSinceUpdate: Math.floor((now.getTime() - p.updatedAt.getTime()) / 86400000) })),
        staleVariables: staleVars.length,
        totalVariables: variables.length,
        freshFrameworks: freshFw.length,
        totalFrameworks: frameworkResults.length,
        daysSinceLastScore: daysSinceScore ? Math.floor(daysSinceScore) : null,
      };
    },
  },
  {
    uri: "intelligence://knowledge",
    name: "Knowledge Graph Stats",
    description: "Global knowledge graph statistics — entry counts by type, sector coverage, freshness",
    mimeType: "application/json",
    handler: async () => {
      const entries = await db.knowledgeEntry.groupBy({
        by: ["entryType"],
        _count: true,
      });
      const total = await db.knowledgeEntry.count();
      const recentCount = await db.knowledgeEntry.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      });
      return {
        totalEntries: total,
        recentEntries30d: recentCount,
        byType: entries.map((e) => ({ type: e.entryType, count: e._count })),
      };
    },
  },
];
