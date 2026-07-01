import { z } from "zod";
import { db } from "@/lib/db";
import * as seshatBridge from "@/server/services/seshat-bridge";

// ---------------------------------------------------------------------------
// SESHAT MCP Server
// Outils de recherche externe : benchmarks, références créatives, codes
// sectoriels, contexte marché, identité visuelle concurrentielle, tendances,
// bonnes pratiques, études de cas.
// ---------------------------------------------------------------------------

export const serverName = "seshat";
export const serverDescription =
  "Serveur MCP SESHAT — Recherche de références externes, benchmarks, études de cas, tendances et bonnes pratiques pour enrichir les stratégies LaFusée Industry OS.";

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
  // ---- External Benchmark Search ----
  {
    name: "benchmark_search",
    description:
      "Recherche des benchmarks externes par secteur et marché. Combine les données SESHAT et le knowledge graph interne.",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité (ex: FMCG, Tech, Finance, Mode)"),
      market: z.string().optional().describe("Marché géographique (ex: Cameroun, Nigeria, Côte d'Ivoire)"),
      metric: z.string().optional().describe("Métrique spécifique (ex: CPA, CTR, conversion rate)"),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    handler: async (input) => {
      const [seshatResults, internalBenchmarks] = await Promise.all([
        seshatBridge.queryReferences({
          topic: input.metric ? `${input.sector} ${input.metric}` : (input.sector as string),
          sector: input.sector as string,
          market: input.market as string | undefined,
          limit: (input.limit as number) ?? 10,
        }),
        db.knowledgeEntry.findMany({
          where: {
            entryType: "SECTOR_BENCHMARK",
            sector: input.sector as string,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return { externalBenchmarks: seshatResults, internalBenchmarks };
    },
  },

  // ---- Creative Reference Finder ----
  {
    name: "creative_reference_find",
    description:
      "Trouve des références créatives (campagnes, visuels, concepts) pertinentes pour un brief ou un driver.",
    inputSchema: z.object({
      channel: z.string().describe("Canal créatif (social, video, print, OOH, digital)"),
      sector: z.string().optional().describe("Secteur d'activité"),
      style: z.string().optional().describe("Style recherché (minimaliste, bold, lifestyle, etc.)"),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    handler: async (input) => {
      const topic = [input.channel, input.sector, input.style].filter(Boolean).join(" ");
      const references = await seshatBridge.queryReferences({
        topic,
        sector: input.sector as string | undefined,
        limit: (input.limit as number) ?? 10,
      });
      return { channel: input.channel, style: input.style, references };
    },
  },

  // ---- Sector Code Lookup ----
  {
    name: "sector_code_lookup",
    description:
      "Recherche les codes et conventions d'un secteur : couleurs typiques, ton, formats, interdits réglementaires.",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité"),
      codeType: z
        .enum(["visual_identity", "tone_of_voice", "regulatory", "pricing", "distribution", "all"])
        .default("all")
        .describe("Type de code sectoriel"),
    }),
    handler: async (input) => {
      const entries = await db.knowledgeEntry.findMany({
        where: {
          sector: input.sector as string,
          entryType: "SECTOR_BENCHMARK",
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      });
      const seshatRefs = await seshatBridge.queryReferences({
        topic: `${input.sector} sector codes ${input.codeType}`,
        sector: input.sector as string,
        limit: 5,
      });
      return { sector: input.sector, codeType: input.codeType, entries, externalRefs: seshatRefs };
    },
  },

  // ---- Market Context ----
  {
    name: "market_context_get",
    description:
      "Récupère le contexte d'un marché : taille, croissance, acteurs clés, comportements consommateurs.",
    inputSchema: z.object({
      market: z.string().describe("Marché géographique (ex: Cameroun, Afrique de l'Ouest, Nigeria)"),
      sector: z.string().optional().describe("Secteur pour contextualiser"),
    }),
    handler: async (input) => {
      const topic = input.sector ? `${input.market} ${input.sector} market` : `${input.market} market`;
      const [seshatData, knowledgeEntries] = await Promise.all([
        seshatBridge.queryReferences({ topic, market: input.market as string, limit: 10 }),
        db.knowledgeEntry.findMany({
          where: {
            market: input.market as string,
            ...(input.sector ? { sector: input.sector as string } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      return { market: input.market, sector: input.sector, externalData: seshatData, internalData: knowledgeEntries };
    },
  },

  // ---- Competitor Visual Identity ----
  {
    name: "competitor_visual_identity",
    description:
      "Analyse l'identité visuelle d'un concurrent : palette, typographie, style photographique, territoire d'expression.",
    inputSchema: z.object({
      competitorName: z.string().describe("Nom du concurrent"),
      sector: z.string().optional().describe("Secteur d'activité du concurrent"),
    }),
    handler: async (input) => {
      const references = await seshatBridge.queryReferences({
        topic: `${input.competitorName} visual identity branding`,
        sector: input.sector as string | undefined,
        limit: 10,
      });
      const internalIntel = await db.knowledgeEntry.findMany({
        where: {
          entryType: "SECTOR_BENCHMARK",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return {
        competitor: input.competitorName,
        externalReferences: references,
        internalIntel,
      };
    },
  },

  // ---- Trend Analysis ----
  {
    name: "trend_analysis",
    description:
      "Analyse les tendances externes dans un secteur ou un marché : évolutions créatives, nouvelles pratiques, shifts culturels.",
    inputSchema: z.object({
      sector: z.string().describe("Secteur d'activité"),
      market: z.string().optional().describe("Marché géographique"),
      trendType: z
        .enum(["creative", "cultural", "technology", "consumer_behavior", "all"])
        .default("all")
        .describe("Type de tendance"),
    }),
    handler: async (input) => {
      const topic = `${input.sector} ${input.trendType !== "all" ? input.trendType : ""} trends`;
      const [seshatTrends, internalTrends] = await Promise.all([
        seshatBridge.queryReferences({
          topic,
          sector: input.sector as string,
          market: input.market as string | undefined,
          limit: 10,
        }),
        db.knowledgeEntry.findMany({
          where: {
            sector: input.sector as string,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      return { sector: input.sector, trendType: input.trendType, external: seshatTrends, internal: internalTrends };
    },
  },

  // ---- Best Practice Retrieval ----
  {
    name: "best_practice_retrieve",
    description:
      "Récupère les bonnes pratiques pour un canal, un format ou un objectif marketing spécifique.",
    inputSchema: z.object({
      topic: z.string().describe("Sujet de la bonne pratique (ex: email marketing, social ads, storytelling)"),
      sector: z.string().optional().describe("Secteur pour contextualiser"),
      channel: z.string().optional().describe("Canal spécifique"),
    }),
    handler: async (input) => {
      const searchTopic = [input.topic, input.sector, input.channel].filter(Boolean).join(" ");
      const [seshatPractices, internalPractices] = await Promise.all([
        seshatBridge.queryReferences({
          topic: `${searchTopic} best practices`,
          sector: input.sector as string | undefined,
          limit: 10,
        }),
        db.knowledgeEntry.findMany({
          where: {
            entryType: "SECTOR_BENCHMARK",
            ...(input.sector ? { sector: input.sector as string } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return { topic: input.topic, external: seshatPractices, internal: internalPractices };
    },
  },

  // ---- Case Study Search ----
  {
    name: "case_study_search",
    description:
      "Recherche des études de cas pertinentes : campagnes réussies, lancements, repositionnements, growth hacks.",
    inputSchema: z.object({
      query: z.string().describe("Requête de recherche"),
      sector: z.string().optional().describe("Secteur d'activité"),
      market: z.string().optional().describe("Marché géographique"),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    handler: async (input) => {
      const [seshatCases, internalCases] = await Promise.all([
        seshatBridge.queryReferences({
          topic: `${input.query} case study`,
          sector: input.sector as string | undefined,
          market: input.market as string | undefined,
          limit: (input.limit as number) ?? 10,
        }),
        db.knowledgeEntry.findMany({
          where: {
            entryType: "MISSION_OUTCOME",
            ...(input.sector ? { sector: input.sector as string } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);
      return { query: input.query, external: seshatCases, internal: internalCases };
    },
  },

  // ---- Reference Feedback ----
  {
    name: "reference_score",
    description:
      "Note la pertinence d'une référence SESHAT pour améliorer les recommandations futures (feedback loop).",
    inputSchema: z.object({
      referenceId: z.string().describe("ID de la référence"),
      score: z.number().min(1).max(5).describe("Score de pertinence (1 = non pertinent, 5 = excellent)"),
      comment: z.string().optional().describe("Commentaire optionnel"),
    }),
    handler: async (input) => {
      return seshatBridge.feedbackRelevance(input.referenceId as string, input.score as number);
    },
  },

  // ---- Brief Enrichment ----
  {
    name: "brief_enrich",
    description:
      "Enrichit un brief créatif avec des références externes, benchmarks et bonnes pratiques du secteur.",
    inputSchema: z.object({
      channel: z.string().describe("Canal du brief (social, video, print, etc.)"),
      sector: z.string().optional().describe("Secteur d'activité"),
      market: z.string().optional().describe("Marché géographique"),
      objective: z.string().optional().describe("Objectif marketing du brief"),
    }),
    handler: async (input) => {
      const enrichment = await seshatBridge.enrichBrief({
        channel: input.channel as string,
        sector: input.sector as string | undefined,
        market: input.market as string | undefined,
      });
      const benchmarks = input.sector
        ? await db.knowledgeEntry.findMany({
            where: { entryType: "SECTOR_BENCHMARK", sector: input.sector as string },
            take: 3,
          })
        : [];
      return { references: enrichment, benchmarks, channel: input.channel };
    },
  },

  // ---- Reference Catalog ----
  {
    name: "reference_catalog",
    description:
      "Catalogue des types de références disponibles dans SESHAT et état de la connexion.",
    inputSchema: z.object({}),
    handler: async () => {
      return {
        isAvailable: seshatBridge.isAvailable(),
        types: ["article", "case_study", "framework", "benchmark", "cultural_ref", "best_practice", "sector_code"],
      };
    },
  },

  // ---- Sector Summary ----
  {
    name: "sector_references_summary",
    description:
      "Résumé des références disponibles par secteur : volume, types, fraîcheur des données.",
    inputSchema: z.object({}),
    handler: async () => {
      const entries = await db.knowledgeEntry.findMany({
        where: { entryType: { in: ["SECTOR_BENCHMARK", "MISSION_OUTCOME", "BRIEF_PATTERN", "CAMPAIGN_TEMPLATE"] } },
      });
      const sectors = [...new Set(entries.map((e) => e.sector).filter(Boolean))];
      return sectors.map((sector) => ({
        sector,
        count: entries.filter((e) => e.sector === sector).length,
        types: [...new Set(entries.filter((e) => e.sector === sector).map((e) => e.entryType))],
      }));
    },
  },
];
