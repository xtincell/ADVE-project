import { z } from "zod";
import { db } from "@/lib/db";
import * as gloryTools from "@/server/services/glory-tools";
import * as guidelinesRenderer from "@/server/services/guidelines-renderer";
import * as seshatBridge from "@/server/services/seshat-bridge";

// ---------------------------------------------------------------------------
// Creative MCP Server
// Outils créatifs : exécution GLORY, briefs, calendrier éditorial,
// guidelines, brand guardian, évaluation créative, storytelling.
// ---------------------------------------------------------------------------

export const serverName = "creative";
export const serverDescription =
  "Serveur MCP Creative — Exécution créative GLORY, génération de briefs, guidelines, brand guardian, évaluation et storytelling pour LaFusée Industry OS.";

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
  // ---- GLORY Tool Execution ----
  {
    name: "glory_tool_execute",
    description:
      "Exécute un outil GLORY (Branding, Content, Strategy) et persiste le résultat dans la stratégie.",
    inputSchema: z.object({
      toolSlug: z.string().describe("Slug de l'outil GLORY (ex: brand-manifesto, content-pillar)"),
      strategyId: z.string().describe("ID de la stratégie"),
      input: z.record(z.string()).describe("Champs d'entrée requis par l'outil"),
    }),
    handler: async (input) => {
      return gloryTools.executeTool(
        input.toolSlug as string,
        input.strategyId as string,
        input.input as Record<string, string>
      );
    },
  },

  {
    name: "glory_tool_list",
    description:
      "Liste tous les outils GLORY disponibles avec leurs métadonnées (layer, pilier, driver, champs requis).",
    inputSchema: z.object({
      layer: z.enum(["BRAND", "CONTENT", "STRATEGY", "CREATIVE"]).optional().describe("Filtrer par couche"),
      pillar: z.string().optional().describe("Filtrer par pilier ADVE"),
    }),
    handler: async (input) => {
      const allTools = gloryTools.ALL_GLORY_TOOLS;
      let filtered = allTools;
      if (input.layer) {
        filtered = filtered.filter((t) => t.layer === input.layer);
      }
      if (input.pillar) {
        filtered = filtered.filter((t) => t.pillarKeys.includes(input.pillar as string));
      }
      return { tools: filtered, count: filtered.length };
    },
  },

  {
    name: "glory_tool_suggest",
    description:
      "Suggère le prochain outil GLORY à exécuter en fonction de l'avancement de la stratégie.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      // Use suggestTools with empty weaknesses/drivers as a basic suggestion
      return gloryTools.suggestTools([], [], "ACTIVE");
    },
  },

  // ---- Brief Generation ----
  {
    name: "brief_generate",
    description:
      "Génère un brief créatif complet pour une mission, enrichi avec les références SESHAT et le contexte stratégique.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      channel: z.string().describe("Canal de diffusion (social, print, video, web, etc.)"),
      objective: z.string().describe("Objectif de la mission"),
      tone: z.string().optional().describe("Ton souhaité (ex: audacieux, bienveillant, expert)"),
      targetAudience: z.string().optional().describe("Description de l'audience cible"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: { driver: true, strategy: true },
      });
      const strategy = mission.strategy;
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      const enrichment = await seshatBridge.enrichBrief({
        channel: input.channel as string,
        sector: bizCtx?.sector as string | undefined,
        market: bizCtx?.market as string | undefined,
      });
      const pillars = await db.pillar.findMany({ where: { strategyId: strategy.id } });
      return {
        missionId: input.missionId,
        brand: strategy.name,
        channel: input.channel,
        objective: input.objective,
        tone: input.tone ?? "professionnel",
        targetAudience: input.targetAudience,
        strategicContext: {
          pillars: pillars.map((p) => ({ key: p.key, content: p.content })),
          positioning: bizCtx?.positioningArchetype ?? null,
        },
        references: enrichment,
      };
    },
  },

  {
    name: "brief_from_driver",
    description:
      "Génère un brief à partir d'un driver existant, pré-rempli avec le canal, les guidelines et le contexte.",
    inputSchema: z.object({
      driverId: z.string().describe("ID du driver"),
      missionType: z.string().describe("Type de mission (ex: post-social, video-script, article)"),
    }),
    handler: async (input) => {
      const driver = await db.driver.findUniqueOrThrow({
        where: { id: input.driverId as string },
        include: { strategy: true },
      });
      return {
        driverId: driver.id,
        driverName: driver.name,
        channel: driver.channel,
        missionType: input.missionType,
        brand: driver.strategy?.name,
        briefTemplate: driver.briefTemplate,
        pillarPriority: driver.pillarPriority,
      };
    },
  },

  // ---- Content Calendar ----
  {
    name: "content_calendar_get",
    description:
      "Récupère le calendrier éditorial d'une campagne avec les missions planifiées par canal et par semaine.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      weeksAhead: z.number().int().min(1).max(12).default(4).describe("Nombre de semaines à afficher"),
    }),
    handler: async (input) => {
      const weeksAhead = (input.weeksAhead as number) ?? 4;
      const horizon = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
      const missions = await db.mission.findMany({
        where: {
          campaignId: input.campaignId as string,
          slaDeadline: { lte: horizon },
        },
        include: { driver: true },
        orderBy: { slaDeadline: "asc" },
      });
      // Group by week
      const byWeek: Record<string, typeof missions> = {};
      for (const m of missions) {
        if (!m.slaDeadline) continue;
        const weekStart = new Date(m.slaDeadline);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        if (!byWeek[key]) byWeek[key] = [];
        byWeek[key].push(m);
      }
      return { campaignId: input.campaignId, weeksAhead, calendar: byWeek };
    },
  },

  {
    name: "content_calendar_slot_create",
    description:
      "Crée un créneau dans le calendrier éditorial pour planifier une mission future.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      driverId: z.string().describe("ID du driver"),
      title: z.string().describe("Titre du créneau"),
      scheduledDate: z.string().describe("Date prévue (ISO)"),
      missionType: z.string().optional().describe("Type de contenu"),
    }),
    handler: async (input) => {
      // Look up the driver to get strategyId
      const driver = await db.driver.findUniqueOrThrow({ where: { id: input.driverId as string } });
      const mission = await db.mission.create({
        data: {
          driverId: input.driverId as string,
          strategyId: driver.strategyId,
          campaignId: input.campaignId as string,
          title: input.title as string,
          slaDeadline: new Date(input.scheduledDate as string),
          status: "DRAFT",
        },
      });
      return mission;
    },
  },

  // ---- Guidelines ----
  {
    name: "guidelines_generate",
    description:
      "Génère les guidelines créatives pour un driver en fonction du pilier ADVE, du canal et de la marque.",
    inputSchema: z.object({
      driverId: z.string().describe("ID du driver"),
    }),
    handler: async (input) => {
      const driver = await db.driver.findUniqueOrThrow({ where: { id: input.driverId as string } });
      return guidelinesRenderer.generateGuidelines(driver.strategyId);
    },
  },

  {
    name: "guidelines_get",
    description:
      "Récupère les guidelines existantes d'un driver pour consultation.",
    inputSchema: z.object({
      driverId: z.string().describe("ID du driver"),
    }),
    handler: async (input) => {
      const driver = await db.driver.findUniqueOrThrow({
        where: { id: input.driverId as string },
        select: { id: true, name: true, channel: true, pillarPriority: true, briefTemplate: true },
      });
      return driver;
    },
  },

  // ---- Brand Guardian ----
  {
    name: "brand_guardian_check",
    description:
      "Vérifie la conformité d'un contenu avec les guidelines de la marque (ton, identité visuelle, messages clés).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie de la marque"),
      content: z.string().describe("Contenu à vérifier"),
      contentType: z.enum(["text", "social_post", "email", "article", "script", "tagline"]).default("text"),
      channel: z.string().optional().describe("Canal de diffusion"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
        include: { pillars: true },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      return {
        brand: strategy.name,
        contentType: input.contentType,
        channel: input.channel,
        brandGuidelines: {
          positioning: bizCtx?.positioningArchetype ?? null,
          pillars: strategy.pillars.map((p) => ({ key: p.key, content: p.content })),
          tone: bizCtx?.tone ?? null,
        },
        contentToReview: input.content,
        status: "pending_ai_review",
      };
    },
  },

  // ---- Creative Evaluation ----
  {
    name: "creative_evaluate",
    description:
      "Évalue un livrable créatif selon les critères ADVE-RTIS : pertinence stratégique, qualité d'exécution, impact.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      deliverableUrl: z.string().optional().describe("URL du livrable"),
      evaluationCriteria: z
        .array(z.enum(["strategic_alignment", "execution_quality", "brand_consistency", "audience_impact", "originality"]))
        .optional()
        .describe("Critères d'évaluation"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: {
          driver: true,
          deliverables: { include: { qualityReviews: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      });
      const latestReview = mission.deliverables?.[0]?.qualityReviews?.[0] ?? null;
      return {
        missionId: mission.id,
        missionTitle: mission.title,
        driverChannel: mission.driver?.channel,
        latestReview,
        criteria: (input.evaluationCriteria as string[]) ?? [
          "strategic_alignment",
          "execution_quality",
          "brand_consistency",
        ],
      };
    },
  },

  // ---- Concept Generation ----
  {
    name: "concept_generate",
    description:
      "Génère des concepts créatifs pour une campagne à partir du brief et des références sectorielles.",
    inputSchema: z.object({
      campaignId: z.string().describe("ID de la campagne"),
      briefSummary: z.string().describe("Résumé du brief créatif"),
      numberOfConcepts: z.number().int().min(1).max(10).default(3),
      constraints: z.array(z.string()).optional().describe("Contraintes créatives"),
    }),
    handler: async (input) => {
      const campaign = await db.campaign.findUniqueOrThrow({
        where: { id: input.campaignId as string },
        include: { strategy: { include: { pillars: true } } },
      });
      const bizCtx = campaign.strategy?.businessContext as Record<string, unknown> | null;
      return {
        campaignId: campaign.id,
        brand: campaign.strategy?.name,
        briefSummary: input.briefSummary,
        numberOfConcepts: input.numberOfConcepts,
        constraints: input.constraints ?? [],
        strategicContext: {
          positioning: bizCtx?.positioningArchetype ?? null,
          pillars: campaign.strategy?.pillars?.map((p) => ({ key: p.key, content: p.content })),
        },
        status: "pending_ai_generation",
      };
    },
  },

  // ---- Script Writing ----
  {
    name: "script_write",
    description:
      "Génère un script (vidéo, audio, spot publicitaire) à partir du brief et des guidelines du driver.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      format: z.enum(["video_short", "video_long", "audio_spot", "podcast_segment", "live_script"]),
      duration: z.string().optional().describe("Durée cible (ex: 30s, 2min, 10min)"),
      keyMessages: z.array(z.string()).optional().describe("Messages clés à intégrer"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: { driver: { include: { strategy: true } } },
      });
      return {
        missionId: mission.id,
        format: input.format,
        duration: input.duration,
        keyMessages: input.keyMessages ?? [],
        brand: mission.driver?.strategy?.name,
        briefTemplate: mission.driver?.briefTemplate,
        status: "pending_ai_generation",
      };
    },
  },

  // ---- Social Copy ----
  {
    name: "social_copy_generate",
    description:
      "Génère des copies pour les réseaux sociaux (Facebook, Instagram, Twitter, LinkedIn, TikTok) avec ton adapté.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"]),
      topic: z.string().describe("Sujet du post"),
      tone: z.string().optional().describe("Ton souhaité"),
      includeHashtags: z.boolean().default(true),
      includeEmoji: z.boolean().default(true),
      numberOfVariants: z.number().int().min(1).max(5).default(3),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
        include: { pillars: true },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      return {
        brand: strategy.name,
        platform: input.platform,
        topic: input.topic,
        tone: input.tone ?? (bizCtx?.tone as string | undefined),
        includeHashtags: input.includeHashtags,
        includeEmoji: input.includeEmoji,
        numberOfVariants: input.numberOfVariants,
        brandVoice: {
          positioning: bizCtx?.positioningArchetype ?? null,
          tone: bizCtx?.tone ?? null,
        },
        status: "pending_ai_generation",
      };
    },
  },

  // ---- Storytelling ----
  {
    name: "storytelling_arc_generate",
    description:
      "Construit un arc narratif pour une campagne basé sur le mythe fondateur et le positionnement de la marque.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      arcType: z
        .enum(["hero_journey", "origin_story", "transformation", "community_saga", "challenge_quest"])
        .default("hero_journey")
        .describe("Type d'arc narratif"),
      chapters: z.number().int().min(1).max(12).default(5).describe("Nombre de chapitres"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
        include: { pillars: true },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      return {
        brand: strategy.name,
        arcType: input.arcType,
        chapters: input.chapters,
        foundingMyth: bizCtx?.foundingMyth ?? null,
        positioning: bizCtx?.positioningArchetype ?? null,
        pillars: strategy.pillars.map((p) => ({ key: p.key, content: p.content })),
        status: "pending_ai_generation",
      };
    },
  },

  {
    name: "storytelling_narrative_check",
    description:
      "Vérifie la cohérence narrative d'un contenu avec l'arc storytelling défini pour la marque.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      content: z.string().describe("Contenu narratif à vérifier"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      return {
        brand: strategy.name,
        contentToCheck: input.content,
        brandNarrative: {
          foundingMyth: bizCtx?.foundingMyth ?? null,
          tone: bizCtx?.tone ?? null,
          positioning: bizCtx?.positioningArchetype ?? null,
        },
        status: "pending_ai_review",
      };
    },
  },

  // ---- Creative Asset Library ----
  {
    name: "creative_assets_search",
    description:
      "Recherche dans la bibliothèque d'assets créatifs (visuels, templates, logos, éléments de marque).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      assetType: z.enum(["logo", "visual", "template", "icon", "font", "color_palette", "all"]).default("all"),
      tags: z.array(z.string()).optional().describe("Tags de recherche"),
    }),
    handler: async (input) => {
      const assets = await db.brandAsset.findMany({
        where: {
          strategyId: input.strategyId as string,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return { assets, count: assets.length };
    },
  },

  // ---- Brand Voice Audit ----
  {
    name: "brand_voice_audit",
    description:
      "Audite la voix de marque sur les dernières publications pour détecter les dérives par rapport aux guidelines.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      sampleSize: z.number().int().min(5).max(50).default(10).describe("Nombre de publications à auditer"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      const recentMissions = await db.mission.findMany({
        where: {
          strategyId: input.strategyId as string,
          status: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
        take: (input.sampleSize as number) ?? 10,
        include: { driver: true },
      });
      return {
        brand: strategy.name,
        tone: bizCtx?.tone ?? null,
        sampleSize: recentMissions.length,
        missions: recentMissions.map((m) => ({
          id: m.id,
          title: m.title,
          channel: m.driver?.channel,
        })),
        status: "pending_ai_audit",
      };
    },
  },
];
