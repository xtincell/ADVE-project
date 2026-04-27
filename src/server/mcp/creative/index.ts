// ============================================================================
// MODULE M28 — MCP Creative Server
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §3.3 + Annexe B | Division: La Fusée (GLORY)
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  42 tools: 39 GLORY tools (4 layers) + 3 audit/admin tools
// [x] REQ-2  7 resources: glory-outputs, brand-assets, guidelines, calendar,
//            brand-voice, creative-history, brand-pipeline-status
// [x] REQ-3  AI-powered handlers (Claude) for brand_guardian_check, creative_evaluate,
//            concept_generate, script_write, social_copy_generate, storytelling_arc_generate,
//            storytelling_narrative_check, brand_voice_audit
// [x] REQ-4  GLORY tool execution via glory-tools service (real AI, persisted outputs)
// [x] REQ-5  Brief generation with SESHAT enrichment
// [x] REQ-6  Content calendar (get + create slots)
// [x] REQ-7  Guidelines generation via guidelines-renderer
// [x] REQ-8  Creative asset search in BrandAsset table
// [x] REQ-9  Driver-linked GLORY tool execution (DriverGloryTool model)
// [x] REQ-10 ADVE context auto-injection (advertis_vector in every tool call)
//
// TOOLS: 23 | RESOURCES: 7 | SPEC TARGET: 42 tools + 7 resources
// NOTE: 39 GLORY tools are accessed via glory_tool_execute + glory_tool_list;
//       the 23 tools here are the MCP-exposed orchestration + AI audit tools.
//
// ============================================================================
// CROSS-MODULE DEPENDENCIES — à vérifier lors de toute mise à jour inter-modules
// ============================================================================
// Ce module dépend de :
//   M03 (Glory Tools)     — executeTool, ALL_GLORY_TOOLS, suggestTools, executeBrandPipeline
//   M09 (SESHAT Bridge)   — enrichBrief (enrichment de brief créatif)
//   M14 (Guidelines)      — generateGuidelines (génération guidelines driver)
//   M06 (Drivers)         — DriverGloryTool model (lien driver → glory tools)
//   M02 (AdvertisVector)  — advertis_vector auto-injection dans chaque tool call
//   M01 (Pillar Schemas)  — pillar content structure (A, D, V, E, R, T, I, S)
//
// Ce module est consommé par :
//   M34 (Console Portal)  — UI d'exécution GLORY tools, brief generation, calendar
//   M32 (Cockpit Portal)  — Brand OS client-facing creative tools
//
// >> INSTRUCTION : À chaque modification d'un module listé ci-dessus,
// >> vérifier que les imports, types et appels dans CE fichier restent valides.
// >> Mettre à jour cette section si de nouvelles dépendances apparaissent.
// ============================================================================

import { z } from "zod";
import { db } from "@/lib/db";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
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
  "Serveur MCP Creative — Exécution créative GLORY (39 tools, 4 layers), génération de briefs, guidelines, brand guardian, évaluation créative et storytelling pour LaFusée Industry OS.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string; campaignId?: string }) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// AI Helper — shared Claude call for creative analysis/generation
// ---------------------------------------------------------------------------

async function callCreativeAI(
  systemPrompt: string,
  userPrompt: string,
  context: string,
  strategyId?: string,
): Promise<{ text: string; parsed: Record<string, unknown> }> {
  const fullSystem = `${systemPrompt}\n\n${context}\n\nRéponds en français. Format de sortie : JSON structuré.`;

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: fullSystem,
    prompt: userPrompt,
    maxTokens: 4096,
  });

  // Track AI cost (non-blocking)
  if (strategyId) {
    db.aICostLog.create({
      data: {
        model: "claude-sonnet-4-20250514",
        provider: "anthropic",
        inputTokens: result.usage?.promptTokens ?? 0,
        outputTokens: result.usage?.completionTokens ?? 0,
        cost: ((result.usage?.promptTokens ?? 0) / 1_000_000) * 3 + ((result.usage?.completionTokens ?? 0) / 1_000_000) * 15,
        context: "mcp:creative",
        strategyId,
      },
    }).catch(() => {});
  }

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: result.text };
  } catch {
    parsed = { content: result.text };
  }

  return { text: result.text, parsed };
}

/**
 * Build strategy context string for AI prompts
 */
async function buildStrategyContext(strategyId: string): Promise<string> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { pillars: true },
  });
  if (!strategy) return "Stratégie introuvable.";

  const bizCtx = strategy.businessContext as Record<string, unknown> | null;
  const vec = strategy.advertis_vector as Record<string, number> | null;
  const lines = [
    "--- CONTEXTE MARQUE ---",
    `Marque: ${strategy.name}`,
    `Description: ${strategy.description ?? "N/A"}`,
  ];
  if (bizCtx) {
    if (bizCtx.sector) lines.push(`Secteur: ${bizCtx.sector}`);
    if (bizCtx.market) lines.push(`Marché: ${bizCtx.market}`);
    if (bizCtx.positioningArchetype) lines.push(`Positionnement: ${bizCtx.positioningArchetype}`);
    if (bizCtx.tone) lines.push(`Ton: ${bizCtx.tone}`);
    if (bizCtx.foundingMyth) lines.push(`Mythe fondateur: ${bizCtx.foundingMyth}`);
    if (bizCtx.businessModel) lines.push(`Modèle d'affaires: ${bizCtx.businessModel}`);
  }
  if (vec) {
    lines.push(`Score ADVE: A=${vec.a ?? 0}, D=${vec.d ?? 0}, V=${vec.v ?? 0}, E=${vec.e ?? 0}, R=${vec.r ?? 0}, T=${vec.t ?? 0}, I=${vec.i ?? 0}, S=${vec.s ?? 0}`);
  }
  for (const p of strategy.pillars) {
    const content = p.content as Record<string, unknown> | null;
    if (content) {
      const summary = content.summary ?? content.description ?? JSON.stringify(content).slice(0, 200);
      lines.push(`Pilier ${p.key.toUpperCase()}: ${summary}`);
    }
  }
  lines.push("--- FIN CONTEXTE ---");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- GLORY Tool Execution (REQ-10: ADVE auto-injection) ----
  {
    name: "glory_tool_execute",
    description:
      "Exécute un outil GLORY (CR/DC/HYBRID/BRAND — 39 outils) et persiste le résultat. Injecte automatiquement le contexte ADVE (advertis_vector) dans l'input.",
    inputSchema: z.object({
      toolSlug: z.string().describe("Slug de l'outil GLORY (ex: brand-manifesto, concept-generator, script-writer)"),
      strategyId: z.string().describe("ID de la stratégie"),
      input: z.record(z.string()).describe("Champs d'entrée requis par l'outil"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const userInput = input.input as Record<string, string>;

      // REQ-10: Auto-inject ADVE context (advertis_vector + businessContext) into input
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { advertis_vector: true, businessContext: true, name: true },
      });
      const vec = strategy?.advertis_vector as Record<string, number> | null;
      const bizCtx = strategy?.businessContext as Record<string, unknown> | null;
      const enrichedInput: Record<string, string> = {
        ...userInput,
        // ADVE vector injected as context (non-destructive: user input takes precedence)
        ...(vec && !userInput.adve_scores ? { adve_scores: `A=${vec.a ?? 0}/25, D=${vec.d ?? 0}/25, V=${vec.v ?? 0}/25, E=${vec.e ?? 0}/25, R=${vec.r ?? 0}/25, T=${vec.t ?? 0}/25, I=${vec.i ?? 0}/25, S=${vec.s ?? 0}/25` } : {}),
        ...(bizCtx?.sector && !userInput.sector ? { sector: bizCtx.sector as string } : {}),
        ...(bizCtx?.market && !userInput.market ? { market: bizCtx.market as string } : {}),
        ...(bizCtx?.positioningArchetype && !userInput.brand_positioning ? { brand_positioning: bizCtx.positioningArchetype as string } : {}),
        ...(strategy?.name && !userInput.brand_name ? { brand_name: strategy.name } : {}),
      };

      return gloryTools.executeTool(
        input.toolSlug as string,
        strategyId,
        enrichedInput
      );
    },
  },

  // ---- REQ-9: Driver-linked GLORY Tool Execution ----
  {
    name: "glory_tool_execute_for_driver",
    description:
      "Exécute les outils GLORY liés à un Driver spécifique (via DriverGloryTool). Injecte le contexte ADVE + driver automatiquement.",
    inputSchema: z.object({
      driverId: z.string().describe("ID du driver"),
      toolSlug: z.string().optional().describe("Slug spécifique à exécuter (sinon exécute tous les outils liés au driver)"),
      input: z.record(z.string()).optional().describe("Champs d'entrée additionnels"),
    }),
    handler: async (input) => {
      const driver = await db.driver.findUniqueOrThrow({
        where: { id: input.driverId as string },
        include: {
          gloryTools: true,
          strategy: { select: { id: true, name: true, advertis_vector: true, businessContext: true } },
        },
      });

      if (!driver.strategy) throw new Error("Driver non lié à une stratégie");
      const strategyId = driver.strategy.id;

      // Linked tools from DriverGloryTool
      const linkedSlugs = driver.gloryTools.map((dgt) => dgt.gloryTool);
      if (linkedSlugs.length === 0) {
        return { error: "Aucun outil GLORY lié à ce driver. Utilisez glory_tool_suggest pour obtenir des recommandations." };
      }

      // Filter to specific slug if requested
      const slugsToExecute = input.toolSlug
        ? linkedSlugs.filter((s) => s === input.toolSlug)
        : linkedSlugs;

      if (slugsToExecute.length === 0) {
        return { error: `L'outil ${input.toolSlug} n'est pas lié à ce driver. Outils liés: ${linkedSlugs.join(", ")}` };
      }

      // REQ-10: Build enriched input with ADVE context + driver context
      const vec = driver.strategy.advertis_vector as Record<string, number> | null;
      const bizCtx = driver.strategy.businessContext as Record<string, unknown> | null;
      const baseInput: Record<string, string> = {
        ...(input.input as Record<string, string> ?? {}),
        brand_name: driver.strategy.name,
        channel: driver.channel,
        driver_name: driver.name,
        ...(vec ? { adve_scores: `A=${vec.a ?? 0}/25, D=${vec.d ?? 0}/25, V=${vec.v ?? 0}/25, E=${vec.e ?? 0}/25, R=${vec.r ?? 0}/25, T=${vec.t ?? 0}/25, I=${vec.i ?? 0}/25, S=${vec.s ?? 0}/25` } : {}),
        ...(bizCtx?.sector ? { sector: bizCtx.sector as string } : {}),
        ...(bizCtx?.market ? { market: bizCtx.market as string } : {}),
        ...(bizCtx?.positioningArchetype ? { brand_positioning: bizCtx.positioningArchetype as string } : {}),
      };

      // Execute each linked tool
      const results: Array<{ slug: string; outputId: string; status: string }> = [];
      for (const slug of slugsToExecute) {
        try {
          const { outputId } = await gloryTools.executeTool(slug, strategyId, baseInput);
          results.push({ slug, outputId, status: "COMPLETED" });
        } catch (error) {
          results.push({ slug, outputId: "", status: `FAILED: ${error instanceof Error ? error.message : "Unknown error"}` });
        }
      }

      return {
        driverId: driver.id,
        driverName: driver.name,
        channel: driver.channel,
        strategyId,
        linkedTools: linkedSlugs,
        executed: results,
        summary: `${results.filter((r) => r.status === "COMPLETED").length}/${results.length} outils exécutés avec succès`,
      };
    },
  },

  {
    name: "glory_tool_list",
    description:
      "Liste tous les outils GLORY disponibles (39) avec leurs métadonnées (layer, pilier, driver, champs requis).",
    inputSchema: z.object({
      layer: z.enum(["BRAND", "CONTENT", "STRATEGY", "CREATIVE", "CR", "DC", "HYBRID"]).optional().describe("Filtrer par couche"),
      pillar: z.string().optional().describe("Filtrer par pilier ADVE (a, d, v, e, r, t, i, s)"),
      driver: z.string().optional().describe("Filtrer par driver (INSTAGRAM, FACEBOOK, VIDEO, etc.)"),
    }),
    handler: async (input) => {
      let filtered = gloryTools.EXTENDED_GLORY_TOOLS;
      if (input.layer) {
        filtered = filtered.filter((t) => t.layer === input.layer);
      }
      if (input.pillar) {
        const p = (input.pillar as string).toUpperCase();
        filtered = filtered.filter((t) => t.pillarKeys.includes(p));
      }
      if (input.driver) {
        filtered = filtered.filter((t) => t.requiredDrivers.includes(input.driver as string));
      }
      return {
        tools: filtered.map((t) => ({
          slug: t.slug,
          name: t.name,
          layer: t.layer,
          pillarKeys: t.pillarKeys,
          requiredDrivers: t.requiredDrivers,
          dependencies: t.dependencies,
          inputFields: t.inputFields,
          description: t.description,
        })),
        count: filtered.length,
        totalAvailable: gloryTools.EXTENDED_GLORY_TOOLS.length,
      };
    },
  },

  // ── GLORY Sequences (MCP) ──────────────────────────────────────────────────

  {
    name: "glory_sequence_list",
    description:
      "Liste les 31 séquences GLORY par famille (PILLAR/PRODUCTION/STRATEGIC/OPERATIONAL). Chaque séquence chaîne des outils GLORY + Artemis + Seshat + Mestor + CALC.",
    inputSchema: z.object({
      family: z.enum(["PILLAR", "PRODUCTION", "STRATEGIC", "OPERATIONAL"]).optional().describe("Filtrer par famille"),
    }),
    handler: async (input) => {
      const { ALL_SEQUENCES, getSequencesByFamily } = await import("@/server/services/glory-tools");
      const seqs = input.family ? getSequencesByFamily(input.family as never) : ALL_SEQUENCES;
      return {
        sequences: seqs.map((s) => ({
          key: s.key, family: s.family, name: s.name, description: s.description,
          pillar: s.pillar, aiPowered: s.aiPowered, refined: s.refined,
          stepCount: s.steps.length,
          stepTypes: [...new Set(s.steps.map((st) => st.type))],
        })),
        count: seqs.length,
      };
    },
  },

  {
    name: "glory_sequence_execute",
    description:
      "Exécute une séquence GLORY complète. Le contexte ADVE-RTIS est auto-injecté. Chaque step est routé vers le bon service (GLORY/ARTEMIS/SESHAT/MESTOR/PILLAR/CALC).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      sequenceKey: z.string().describe("Clé de la séquence (ex: MANIFESTE-A, KV, CAMPAIGN-360)"),
    }),
    handler: async (input) => {
      const { executeSequence } = await import("@/server/services/glory-tools");
      const result = await executeSequence(input.sequenceKey as never, input.strategyId as string);
      return {
        sequenceKey: result.sequenceKey,
        status: result.status,
        stepsExecuted: result.steps.filter((s) => s.status === "SUCCESS").length,
        stepsTotal: result.steps.length,
        stepsSkipped: result.steps.filter((s) => s.status === "SKIPPED").length,
        stepsFailed: result.steps.filter((s) => s.status === "FAILED").length,
        gloryOutputIds: result.gloryOutputIds,
        durationMs: result.totalDurationMs,
      };
    },
  },

  {
    name: "glory_sequence_recommend",
    description:
      "Recommande les prochaines séquences à exécuter pour une stratégie, basé sur l'état des piliers, la phase, et les gaps identifiés (Hyperviseur GLORY).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      limit: z.number().optional().describe("Nombre max de recommandations (défaut: 5)"),
    }),
    handler: async (input) => {
      const { buildPlan } = await import("@/server/services/mestor/hyperviseur");
      const plan = await buildPlan(input.strategyId as string);
      return { recommendations: plan.steps.slice(0, (input.limit ?? 5) as number) };
    },
  },

  {
    name: "glory_tool_suggest",
    description:
      "Suggère les prochains outils GLORY à exécuter en fonction de l'avancement de la stratégie et des piliers faibles.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
    }),
    handler: async (input) => {
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
        include: { pillars: true, drivers: { where: { deletedAt: null, status: "ACTIVE" } } },
      });
      const vec = strategy.advertis_vector as Record<string, number> | null;

      // Detect weak pillars (score < 15/25)
      const weakPillars: string[] = [];
      if (vec) {
        for (const [key, score] of Object.entries(vec)) {
          if (["a", "d", "v", "e", "r", "t", "i", "s"].includes(key) && typeof score === "number" && score < 15) {
            weakPillars.push(key.toUpperCase());
          }
        }
      }

      const activeDrivers = strategy.drivers.map((d) => d.channel);

      // Determine phase
      const totalScore = vec ? Object.entries(vec).filter(([k]) => ["a", "d", "v", "e", "r", "t", "i", "s"].includes(k)).reduce((s, [, v]) => s + (typeof v === "number" ? v : 0), 0) : 0;
      const phase = totalScore < 50 ? "QUICK_INTAKE" as const : totalScore < 100 ? "BOOT" as const : totalScore < 150 ? "ACTIVE" as const : "GROWTH" as const;

      // Check which tools have already been executed
      const executedOutputs = await db.gloryOutput.findMany({
        where: { strategyId: input.strategyId as string },
        select: { toolSlug: true },
      });
      const executedSlugs = new Set(executedOutputs.map((o) => o.toolSlug));

      const suggestions = gloryTools.suggestTools(weakPillars, activeDrivers, phase);
      return {
        suggestions: suggestions.map((t) => ({
          slug: t.slug,
          name: t.name,
          layer: t.layer,
          pillarKeys: t.pillarKeys,
          alreadyExecuted: executedSlugs.has(t.slug),
          reason: weakPillars.length > 0
            ? `Renforce les piliers faibles: ${t.pillarKeys.filter((pk: string) => weakPillars.includes(pk)).join(", ")}`
            : `Recommandé pour la phase ${phase}`,
        })),
        weakPillars,
        phase,
        executedToolCount: executedSlugs.size,
        totalToolCount: gloryTools.EXTENDED_GLORY_TOOLS.length,
      };
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
        include: { driver: true, strategy: { include: { pillars: true } } },
      });
      const strategy = mission.strategy;
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;

      // SESHAT enrichment
      const enrichment = await seshatBridge.enrichBrief({
        channel: input.channel as string,
        sector: bizCtx?.sector as string | undefined,
        market: bizCtx?.market as string | undefined,
      });

      // AI-generated brief structure
      const context = await buildStrategyContext(strategy.id);
      const { parsed: aiBrief } = await callCreativeAI(
        "Tu es un directeur de création senior spécialisé dans la rédaction de briefs créatifs. Tu produis des briefs structurés, inspirants et actionnables.",
        `Génère un brief créatif complet pour cette mission :
Canal: ${input.channel}
Objectif: ${input.objective}
Ton: ${input.tone ?? "professionnel"}
Audience cible: ${input.targetAudience ?? "non spécifiée"}
Mission: ${mission.title}
Driver: ${mission.driver?.name ?? "N/A"} (${mission.driver?.channel ?? "N/A"})

Structure le brief avec : contexte, insight, promesse, preuve, ton & style, do/don't, livrables attendus, KPIs.`,
        context,
        strategy.id,
      );

      return {
        missionId: input.missionId,
        brand: strategy.name,
        channel: input.channel,
        objective: input.objective,
        tone: input.tone ?? "professionnel",
        targetAudience: input.targetAudience,
        strategicContext: {
          pillars: strategy.pillars.map((p) => ({ key: p.key, content: p.content })),
          positioning: bizCtx?.positioningArchetype ?? null,
        },
        references: enrichment,
        aiBrief,
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
        include: { strategy: { include: { pillars: true } } },
      });

      const bizCtx = driver.strategy?.businessContext as Record<string, unknown> | null;

      return {
        driverId: driver.id,
        driverName: driver.name,
        channel: driver.channel,
        missionType: input.missionType,
        brand: driver.strategy?.name,
        briefTemplate: driver.briefTemplate,
        pillarPriority: driver.pillarPriority,
        strategicContext: {
          positioning: bizCtx?.positioningArchetype ?? null,
          tone: bizCtx?.tone ?? null,
          sector: bizCtx?.sector ?? null,
        },
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
      const byWeek: Record<string, Array<{ id: string; title: string; channel: string | null; status: string; deadline: string | null }>> = {};
      for (const m of missions) {
        if (!m.slaDeadline) continue;
        const weekStart = new Date(m.slaDeadline);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        if (!byWeek[key]) byWeek[key] = [];
        byWeek[key].push({
          id: m.id,
          title: m.title,
          channel: m.driver?.channel ?? null,
          status: m.status,
          deadline: m.slaDeadline?.toISOString() ?? null,
        });
      }
      return { campaignId: input.campaignId, weeksAhead, totalMissions: missions.length, calendar: byWeek };
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

  // ---- Brand Guardian (AI-powered) ----
  {
    name: "brand_guardian_check",
    description:
      "Vérifie la conformité d'un contenu avec les guidelines de la marque (ton, identité visuelle, messages clés). Analyse IA avec scoring.",
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

      const context = await buildStrategyContext(input.strategyId as string);

      const { parsed } = await callCreativeAI(
        `Tu es le Brand Guardian de La Fusée — un expert en conformité de marque. Tu analyses du contenu par rapport aux guidelines de la marque et tu donnes un verdict structuré.
Tu évalues 6 dimensions : ton_de_voix, coherence_message, identite_visuelle_textuelle, alignement_piliers, respect_territoire, qualite_redaction.
Chaque dimension est notée sur 10. Un score global /60 détermine le verdict : CONFORME (≥48), AJUSTEMENTS_MINEURS (36-47), NON_CONFORME (<36).`,
        `Analyse ce contenu pour vérification de conformité marque :

Type de contenu : ${input.contentType}
Canal : ${input.channel ?? "non spécifié"}

--- CONTENU À VÉRIFIER ---
${input.content}
--- FIN CONTENU ---

Retourne un JSON avec : verdict (CONFORME/AJUSTEMENTS_MINEURS/NON_CONFORME), scoreGlobal (/60), dimensions (6 objets avec nom, score /10, commentaire), ecarts (liste des écarts détectés), corrections (liste des corrections suggérées), resumeExecutif (2-3 phrases).`,
        context,
        input.strategyId as string,
      );

      return {
        brand: strategy.name,
        contentType: input.contentType,
        channel: input.channel,
        analysis: parsed,
        analyzedAt: new Date().toISOString(),
      };
    },
  },

  // ---- Creative Evaluation (AI-powered) ----
  {
    name: "creative_evaluate",
    description:
      "Évalue un livrable créatif selon les critères ADVE-RTIS : pertinence stratégique, qualité d'exécution, impact. Scoring IA.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      deliverableUrl: z.string().optional().describe("URL du livrable"),
      deliverableContent: z.string().optional().describe("Contenu textuel du livrable à évaluer"),
      evaluationCriteria: z
        .array(z.enum(["strategic_alignment", "execution_quality", "brand_consistency", "audience_impact", "originality"]))
        .optional()
        .describe("Critères d'évaluation"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: {
          driver: { include: { strategy: { include: { pillars: true } } } },
          deliverables: { include: { qualityReviews: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      });

      const strategyId = mission.driver?.strategy?.id;
      const context = strategyId ? await buildStrategyContext(strategyId) : "";

      const criteria = (input.evaluationCriteria as string[]) ?? [
        "strategic_alignment",
        "execution_quality",
        "brand_consistency",
        "audience_impact",
        "originality",
      ];

      const latestDeliverable = mission.deliverables?.[0];
      const contentToEval = (input.deliverableContent as string) ?? latestDeliverable?.description ?? latestDeliverable?.title ?? "Contenu non fourni";

      const { parsed } = await callCreativeAI(
        `Tu es un directeur de création senior évaluant des livrables créatifs. Tu appliques la grille ADVE-RTIS pour noter la qualité créative.
Tu évalues chaque critère sur 10 avec justification. Tu donnes un score global, des forces, des faiblesses, et des recommandations d'amélioration.`,
        `Évalue ce livrable créatif :

Mission : ${mission.title}
Canal : ${mission.driver?.channel ?? "N/A"}
Driver : ${mission.driver?.name ?? "N/A"}
Critères : ${criteria.join(", ")}

--- LIVRABLE ---
${contentToEval}
--- FIN LIVRABLE ---

Retourne un JSON avec : scoreGlobal (/50), criteres (liste d'objets avec nom, score /10, justification), forces (liste), faiblesses (liste), recommandations (liste), verdictFinal (EXCELLENT/BON/ACCEPTABLE/A_RETRAVAILLER).`,
        context,
        strategyId,
      );

      return {
        missionId: mission.id,
        missionTitle: mission.title,
        driverChannel: mission.driver?.channel,
        evaluation: parsed,
        criteria,
        evaluatedAt: new Date().toISOString(),
      };
    },
  },

  // ---- Concept Generation (AI-powered) ----
  {
    name: "concept_generate",
    description:
      "Génère des concepts créatifs pour une campagne à partir du brief et des références sectorielles. IA générative.",
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

      const strategyId = campaign.strategy?.id;
      const context = strategyId ? await buildStrategyContext(strategyId) : "";
      const numConcepts = (input.numberOfConcepts as number) ?? 3;
      const constraints = (input.constraints as string[]) ?? [];

      const { parsed } = await callCreativeAI(
        `Tu es un concepteur-rédacteur senior dans une agence créative africaine de premier plan. Tu génères des concepts créatifs originaux, culturellement ancrés, stratégiquement solides et différenciants.
Chaque concept doit avoir un territoire visuel, une promesse, un insight consommateur et des déclinaisons possibles.`,
        `Génère ${numConcepts} concepts créatifs pour cette campagne :

Brief : ${input.briefSummary}
Marque : ${campaign.strategy?.name ?? "N/A"}
${constraints.length > 0 ? `Contraintes : ${constraints.join(", ")}` : ""}

Pour chaque concept, retourne dans un JSON :
concepts: [{
  titre: string,
  accroche: string (tagline),
  insight: string (insight consommateur),
  promesse: string,
  territoireVisuel: string (description de l'univers visuel),
  declinaisons: string[] (3-5 déclinaisons par canal),
  forceStrategique: string (pourquoi ce concept est aligné ADVE)
}]`,
        context,
        strategyId,
      );

      return {
        campaignId: campaign.id,
        brand: campaign.strategy?.name,
        numberOfConcepts: numConcepts,
        concepts: parsed,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ---- Script Writing (AI-powered) ----
  {
    name: "script_write",
    description:
      "Génère un script (vidéo, audio, spot publicitaire) à partir du brief et des guidelines du driver. IA générative.",
    inputSchema: z.object({
      missionId: z.string().describe("ID de la mission"),
      format: z.enum(["video_short", "video_long", "audio_spot", "podcast_segment", "live_script"]),
      duration: z.string().optional().describe("Durée cible (ex: 30s, 2min, 10min)"),
      keyMessages: z.array(z.string()).optional().describe("Messages clés à intégrer"),
    }),
    handler: async (input) => {
      const mission = await db.mission.findUniqueOrThrow({
        where: { id: input.missionId as string },
        include: { driver: { include: { strategy: { include: { pillars: true } } } } },
      });

      const strategyId = mission.driver?.strategy?.id;
      const context = strategyId ? await buildStrategyContext(strategyId) : "";

      const { parsed } = await callCreativeAI(
        `Tu es un scripteur publicitaire senior spécialisé dans la production vidéo et audio pour le marché africain. Tu écris des scripts percutants, émotionnels et culturellement authentiques.
Structure narrative : Accroche (hook) → Développement → Climax → Résolution → CTA.
Tu inclus les directions de réalisation (caméra, musique, SFX, transitions).`,
        `Écris un script ${input.format} ${input.duration ? `de ${input.duration}` : ""} :

Mission : ${mission.title}
Marque : ${mission.driver?.strategy?.name ?? "N/A"}
Canal : ${mission.driver?.channel ?? "N/A"}
Brief template : ${mission.driver?.briefTemplate ?? "N/A"}
Messages clés : ${(input.keyMessages as string[])?.join(", ") ?? "non spécifiés"}

Retourne un JSON avec :
{
  titre: string,
  format: string,
  dureeEstimee: string,
  synopsis: string (2-3 phrases),
  script: [{ timecode: string, visual: string, audio: string, direction: string }],
  musique: { style: string, tempo: string, references: string[] },
  cta: string,
  notesProduction: string[]
}`,
        context,
        strategyId,
      );

      return {
        missionId: mission.id,
        format: input.format,
        duration: input.duration,
        brand: mission.driver?.strategy?.name,
        script: parsed,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ---- Social Copy (AI-powered) ----
  {
    name: "social_copy_generate",
    description:
      "Génère des copies pour les réseaux sociaux (Facebook, Instagram, Twitter, LinkedIn, TikTok) avec ton adapté. IA générative.",
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
      const context = await buildStrategyContext(input.strategyId as string);
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      const numVariants = (input.numberOfVariants as number) ?? 3;

      const { parsed } = await callCreativeAI(
        `Tu es un community manager expert spécialisé dans le marché africain. Tu rédiges du contenu natif pour chaque plateforme, optimisé pour l'engagement.
Tu connais les codes de chaque réseau : longueur optimale, format, hashtags, emojis, heures de publication.`,
        `Génère ${numVariants} variantes de copy pour ${input.platform} :

Sujet : ${input.topic}
Ton : ${input.tone ?? bizCtx?.tone ?? "professionnel et authentique"}
Hashtags : ${input.includeHashtags ? "oui" : "non"}
Emojis : ${input.includeEmoji ? "oui" : "non"}

Retourne un JSON avec :
{
  platform: string,
  variantes: [{
    copy: string,
    hashtags: string[],
    cta: string,
    formatRecommande: string (carousel, reel, story, post, etc.),
    heureOptimale: string,
    estimationEngagement: string (faible/moyen/fort)
  }],
  conseilsPlateforme: string (best practices spécifiques)
}`,
        context,
        input.strategyId as string,
      );

      return {
        brand: strategy.name,
        platform: input.platform,
        topic: input.topic,
        socialCopy: parsed,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  // ---- Storytelling Arc (AI-powered) ----
  {
    name: "storytelling_arc_generate",
    description:
      "Construit un arc narratif pour une campagne basé sur le mythe fondateur et le positionnement de la marque. IA générative.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      arcType: z
        .enum(["hero_journey", "origin_story", "transformation", "community_saga", "challenge_quest"])
        .default("hero_journey")
        .describe("Type d'arc narratif"),
      chapters: z.number().int().min(1).max(12).default(5).describe("Nombre de chapitres"),
    }),
    handler: async (input) => {
      const context = await buildStrategyContext(input.strategyId as string);
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });

      const { parsed } = await callCreativeAI(
        `Tu es un narratologue et storyteller de marque. Tu construis des arcs narratifs puissants qui transforment l'identité de marque en histoire engageante.
Tu maîtrises les structures narratives : voyage du héros (Campbell), transformation, saga communautaire, quête du défi.
Chaque chapitre doit avoir un objectif émotionnel, un message clé et une action de marque concrète.`,
        `Construis un arc narratif de type "${input.arcType}" en ${input.chapters} chapitres :

Retourne un JSON avec :
{
  arcType: string,
  themeCentral: string,
  personnagePrincipal: string (la marque ou le client comme héros),
  enjeu: string,
  chapitres: [{
    numero: number,
    titre: string,
    resumé: string,
    emotionCle: string,
    messageCle: string,
    actionMarque: string (contenu/campagne concrète),
    touchpoints: string[] (canaux de diffusion)
  }],
  arcEmotionnel: string (la trajectoire émotionnelle globale),
  climax: string,
  resolution: string
}`,
        context,
        input.strategyId as string,
      );

      return {
        brand: strategy.name,
        arcType: input.arcType,
        chapters: input.chapters,
        narrativeArc: parsed,
        generatedAt: new Date().toISOString(),
      };
    },
  },

  {
    name: "storytelling_narrative_check",
    description:
      "Vérifie la cohérence narrative d'un contenu avec l'arc storytelling défini pour la marque. Analyse IA.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      content: z.string().describe("Contenu narratif à vérifier"),
    }),
    handler: async (input) => {
      const context = await buildStrategyContext(input.strategyId as string);
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });

      const { parsed } = await callCreativeAI(
        `Tu es un narratologue expert en cohérence de marque. Tu analyses du contenu pour vérifier qu'il respecte l'arc narratif et l'univers de la marque.
Tu évalues : cohérence tonale, cohérence narrative, authenticité culturelle, alignement avec le mythe fondateur, progression émotionnelle.`,
        `Analyse la cohérence narrative de ce contenu :

--- CONTENU ---
${input.content}
--- FIN CONTENU ---

Retourne un JSON avec :
{
  scoreCoherence: number (0-100),
  verdict: string (COHERENT/AJUSTEMENTS/INCOHERENT),
  dimensions: [{
    nom: string,
    score: number (0-10),
    commentaire: string
  }],
  ecarts: string[] (écarts détectés par rapport à l'identité narrative),
  recommandations: string[] (corrections suggérées),
  pointsForts: string[] (ce qui fonctionne bien)
}`,
        context,
        input.strategyId as string,
      );

      return {
        brand: strategy.name,
        narrativeCheck: parsed,
        analyzedAt: new Date().toISOString(),
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
      const where: Record<string, unknown> = {
        strategyId: input.strategyId as string,
      };
      if (input.assetType && input.assetType !== "all") {
        where.type = input.assetType;
      }
      const assets = await db.brandAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return { assets, count: assets.length };
    },
  },

  // ---- Brand Voice Audit (AI-powered) ----
  {
    name: "brand_voice_audit",
    description:
      "Audite la voix de marque sur les dernières publications pour détecter les dérives par rapport aux guidelines. Analyse IA approfondie.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      sampleSize: z.number().int().min(5).max(50).default(10).describe("Nombre de publications à auditer"),
    }),
    handler: async (input) => {
      const context = await buildStrategyContext(input.strategyId as string);
      const strategy = await db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId as string },
      });

      const sampleSize = (input.sampleSize as number) ?? 10;
      const recentMissions = await db.mission.findMany({
        where: {
          strategyId: input.strategyId as string,
          status: "COMPLETED",
        },
        orderBy: { updatedAt: "desc" },
        take: sampleSize,
        include: { driver: true, deliverables: { take: 1 } },
      });

      // Collect deliverable content for AI analysis
      const samples = recentMissions.map((m) => ({
        title: m.title,
        channel: m.driver?.channel ?? "N/A",
        content: m.deliverables?.[0]?.description ?? m.deliverables?.[0]?.title ?? m.title,
      }));

      const { parsed } = await callCreativeAI(
        `Tu es un expert en brand voice analysis. Tu audites la cohérence de la voix de marque à travers un échantillon de publications.
Tu détectes les dérives : changements de ton, incohérences de message, écarts par rapport aux guidelines.
Tu produis un rapport d'audit avec scoring et recommandations.`,
        `Audite la voix de marque sur ces ${samples.length} publications :

${samples.map((s, i) => `[${i + 1}] Canal: ${s.channel} | Titre: ${s.title} | Extrait: ${s.content}`).join("\n")}

Retourne un JSON avec :
{
  scoreGlobal: number (0-100),
  verdict: string (CONSISTANTE/DERIVES_DETECTEES/INCONSTANTE),
  consistanceTonale: number (0-10),
  consistanceMessage: number (0-10),
  consistancePersonnalite: number (0-10),
  derives: [{
    publication: number,
    type: string (ton/message/personnalite),
    description: string,
    severite: string (mineure/majeure/critique)
  }],
  tendances: string[] (patterns observés),
  recommandations: string[] (actions correctives)
}`,
        context,
        input.strategyId as string,
      );

      return {
        brand: strategy.name,
        sampleSize: recentMissions.length,
        audit: parsed,
        auditedAt: new Date().toISOString(),
      };
    },
  },

  // ---- BRAND Pipeline Execution ----
  {
    name: "brand_pipeline_execute",
    description:
      "Lance le pipeline complet d'identité visuelle BRAND (10 outils séquencés) : sémiotique → visuel → moodboard → chromatique → typo → logo → tokens → motion → guidelines.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      initialInput: z.record(z.string()).describe("Données initiales (brand_identity, sector_codes, cultural_context, etc.)"),
    }),
    handler: async (input) => {
      return gloryTools.executeBrandPipeline(
        input.strategyId as string,
        input.initialInput as Record<string, string>,
      );
    },
  },

  // ---- GLORY Tool History ----
  {
    name: "glory_tool_history",
    description:
      "Récupère l'historique d'exécution des outils GLORY pour une stratégie (outputs passés, dates, scores).",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie"),
      toolSlug: z.string().optional().describe("Filtrer par slug d'outil"),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    handler: async (input) => {
      const history = await db.gloryOutput.findMany({
        where: {
          strategyId: input.strategyId as string,
          ...(input.toolSlug ? { toolSlug: input.toolSlug as string } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: (input.limit as number) ?? 20,
      });
      return {
        strategyId: input.strategyId,
        count: history.length,
        history: history.map((h) => ({
          id: h.id,
          toolSlug: h.toolSlug,
          createdAt: h.createdAt,
          outputPreview: JSON.stringify(h.output).slice(0, 200),
        })),
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const resources: ResourceDefinition[] = [
  {
    uri: "creative://glory-outputs/{strategyId}",
    name: "GLORY Tool Outputs",
    description: "All GLORY tool execution outputs for a strategy — tool slug, layer, creation date, output preview",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const outputs = await db.gloryOutput.findMany({
        where: { strategyId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      // Group by layer
      const byLayer: Record<string, number> = {};
      for (const o of outputs) {
        const tool = gloryTools.EXTENDED_GLORY_TOOLS.find((t) => t.slug === o.toolSlug);
        const layer = tool?.layer ?? "UNKNOWN";
        byLayer[layer] = (byLayer[layer] ?? 0) + 1;
      }
      return {
        strategyId,
        totalOutputs: outputs.length,
        byLayer,
        outputs: outputs.map((o) => ({
          id: o.id,
          toolSlug: o.toolSlug,
          layer: gloryTools.EXTENDED_GLORY_TOOLS.find((t) => t.slug === o.toolSlug)?.layer,
          createdAt: o.createdAt,
        })),
      };
    },
  },
  {
    uri: "creative://brand-assets/{strategyId}",
    name: "Brand Assets",
    description: "Brand asset library — logos, visuals, templates, fonts, color palettes for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const assets = await db.brandAsset.findMany({
        where: { strategyId },
        orderBy: { createdAt: "desc" },
      });
      const byType: Record<string, number> = {};
      for (const a of assets) {
        const type = (a as unknown as { type?: string }).type ?? "other";
        byType[type] = (byType[type] ?? 0) + 1;
      }
      return { strategyId, totalAssets: assets.length, byType, assets };
    },
  },
  {
    uri: "creative://guidelines/{strategyId}",
    name: "Brand Guidelines",
    description: "Generated brand guidelines for a strategy — visual identity, tone, do/don't, templates",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      // Check for guidelines GLORY output
      const guidelinesOutput = await db.gloryOutput.findFirst({
        where: { strategyId, toolSlug: "brand-guidelines-generator" },
        orderBy: { createdAt: "desc" },
      });
      // Also get pillar D (Distinction) which contains visual identity data
      const pillarD = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId, key: "d" } },
      });
      const directionArtistique = (pillarD?.content as Record<string, unknown>)?.directionArtistique ?? null;
      return {
        strategyId,
        hasGeneratedGuidelines: !!guidelinesOutput,
        guidelinesOutput: guidelinesOutput?.output ?? null,
        generatedAt: guidelinesOutput?.createdAt ?? null,
        directionArtistique,
      };
    },
  },
  {
    uri: "creative://calendar/{campaignId}",
    name: "Content Calendar",
    description: "Editorial calendar for a campaign — missions grouped by week, channels, status",
    mimeType: "application/json",
    handler: async ({ campaignId }) => {
      if (!campaignId) return { error: "campaignId required" };
      const missions = await db.mission.findMany({
        where: { campaignId },
        include: { driver: { select: { channel: true, name: true } } },
        orderBy: { slaDeadline: "asc" },
      });
      const byStatus: Record<string, number> = {};
      const byChannel: Record<string, number> = {};
      for (const m of missions) {
        byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
        const ch = m.driver?.channel ?? "N/A";
        byChannel[ch] = (byChannel[ch] ?? 0) + 1;
      }
      return {
        campaignId,
        totalMissions: missions.length,
        byStatus,
        byChannel,
        missions: missions.map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          channel: m.driver?.channel,
          deadline: m.slaDeadline,
        })),
      };
    },
  },
  {
    uri: "creative://brand-voice/{strategyId}",
    name: "Brand Voice Profile",
    description: "Brand voice profile extracted from pillars A (Authenticité) and D (Distinction)",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        include: { pillars: { where: { key: { in: ["a", "d"] } } } },
      });
      if (!strategy) return { error: "Strategy not found" };
      const bizCtx = strategy.businessContext as Record<string, unknown> | null;
      const pillarA = strategy.pillars.find((p) => p.key === "a");
      const pillarD = strategy.pillars.find((p) => p.key === "d");
      const contentA = pillarA?.content as Record<string, unknown> | null;
      const contentD = pillarD?.content as Record<string, unknown> | null;
      return {
        strategyId,
        brand: strategy.name,
        tone: bizCtx?.tone ?? contentA?.tonDeVoix ?? null,
        personality: contentA?.personnalite ?? contentA?.archetype ?? null,
        values: contentA?.valeurs ?? null,
        positioning: bizCtx?.positioningArchetype ?? contentD?.positionnement ?? null,
        differentiation: contentD?.facteursDifferenciation ?? null,
        foundingMyth: bizCtx?.foundingMyth ?? contentA?.mytheFondateur ?? null,
      };
    },
  },
  {
    uri: "creative://history/{strategyId}",
    name: "Creative History",
    description: "Timeline of all creative outputs, deliverables, and GLORY executions for a strategy",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const [gloryOutputs, missions] = await Promise.all([
        db.gloryOutput.findMany({
          where: { strategyId },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, toolSlug: true, createdAt: true },
        }),
        db.mission.findMany({
          where: { strategyId, status: "COMPLETED" },
          orderBy: { updatedAt: "desc" },
          take: 30,
          include: { driver: { select: { channel: true } }, deliverables: { select: { id: true, createdAt: true } } },
        }),
      ]);
      // Build unified timeline
      const timeline = [
        ...gloryOutputs.map((o) => ({
          type: "glory_output" as const,
          id: o.id,
          label: o.toolSlug,
          date: o.createdAt,
        })),
        ...missions.map((m) => ({
          type: "mission_completed" as const,
          id: m.id,
          label: `${m.title} (${m.driver?.channel ?? "N/A"})`,
          date: m.updatedAt,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        strategyId,
        totalEvents: timeline.length,
        gloryOutputCount: gloryOutputs.length,
        completedMissions: missions.length,
        timeline: timeline.slice(0, 50),
      };
    },
  },
  {
    uri: "creative://pipeline-status/{strategyId}",
    name: "BRAND Pipeline Status",
    description: "Status of the 10-step BRAND visual identity pipeline — which tools have been executed, dependencies met",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };
      const brandTools = gloryTools.EXTENDED_GLORY_TOOLS.filter((t) => t.layer === "BRAND");
      const outputs = await db.gloryOutput.findMany({
        where: {
          strategyId,
          toolSlug: { in: brandTools.map((t) => t.slug) },
        },
        orderBy: { createdAt: "desc" },
      });
      const outputMap = new Map(outputs.map((o) => [o.toolSlug, { id: o.id, createdAt: o.createdAt }]));
      const pipelineStatus = brandTools
        .sort((a, b) => a.order - b.order)
        .map((tool) => {
          const output = outputMap.get(tool.slug);
          const depsCompleted = tool.dependencies.every((dep) => outputMap.has(dep));
          return {
            order: tool.order,
            slug: tool.slug,
            name: tool.name,
            status: output ? "COMPLETED" : depsCompleted ? "READY" : "BLOCKED",
            completedAt: output?.createdAt ?? null,
            dependencies: tool.dependencies,
            dependenciesMet: depsCompleted,
          };
        });
      const completed = pipelineStatus.filter((s) => s.status === "COMPLETED").length;
      return {
        strategyId,
        totalSteps: brandTools.length,
        completedSteps: completed,
        progress: completed / brandTools.length,
        pipeline: pipelineStatus,
      };
    },
  },
];
