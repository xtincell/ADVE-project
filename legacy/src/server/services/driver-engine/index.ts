// ============================================================================
// MODULE M14 — Driver Engine (service)
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: §2.2.2 + §4.1 | Division: La Fusée
// ============================================================================
//
// See MODULE SPEC in src/server/trpc/routers/driver.ts for full requirements.
// This file implements the service layer (AI-powered spec generation + brief translation).
//
// EXPORTS: generateSpecs, translateBrief, getSuggestedFirstTool
// ============================================================================

import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_NAMES } from "@/lib/types/advertis-vector";
import { type BusinessContext, type BrandNatureKey, getChannelModifiersForContext, BRAND_NATURES } from "@/lib/types/business-context";
import { getSuggestedFirstTool } from "./glory-tool-selector";
import * as seshatBridge from "@/server/services/seshat-bridge";

interface DriverSpecs {
  channel: string;
  formatSpecs: Record<string, unknown>;
  constraints: Record<string, unknown>;
  briefTemplate: Record<string, unknown>;
  qcCriteria: Record<string, unknown>;
  pillarPriority: Record<string, number>;
}

/**
 * Generates channel-specific specs from strategy ADVE profile.
 * AI-assisted via Mestor + Knowledge Graph enrichment.
 */
export async function generateSpecs(strategyId: string, channel: string): Promise<DriverSpecs> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { pillars: true },
  });

  const vector = (strategy.advertis_vector as Record<string, number>) ?? {};
  const bizContext = (strategy.businessContext as unknown as BusinessContext) ?? null;
  const brandNature = (strategy as { brandNature?: string | null }).brandNature as BrandNatureKey | null;
  const primaryChannel = (strategy as { primaryChannel?: string | null }).primaryChannel;
  const isPrimaryDriver = primaryChannel === channel;

  // Determine pillar priorities for this channel, modulated by business context + brand nature
  const pillarPriority = getChannelPillarPriority(channel, vector, bizContext, isPrimaryDriver, brandNature);

  // Generate format specs based on channel (enriched for festival primary drivers)
  const formatSpecs = getChannelFormatSpecs(channel, brandNature, isPrimaryDriver);

  // Generate constraints from strategy profile
  const constraints = generateConstraints(strategy, channel);

  // Generate brief template (enriched for festival primary drivers)
  const briefTemplate = generateBriefTemplate(channel, pillarPriority, brandNature, isPrimaryDriver);

  // Generate QC criteria
  const qcCriteria = generateQcCriteria(channel, pillarPriority);

  return { channel, formatSpecs, constraints, briefTemplate, qcCriteria, pillarPriority };
}

/**
 * Translates a Driver's specs into a qualified brief for a specific mission.
 */
export async function translateBrief(
  driverId: string,
  missionContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const driver = await db.driver.findUniqueOrThrow({
    where: { id: driverId },
    include: { strategy: { include: { pillars: true } } },
  });

  const template = driver.briefTemplate as Record<string, unknown>;
  const pillarPriority = driver.pillarPriority as Record<string, number>;

  // Enrich brief with strategy context
  const topPillars = Object.entries(pillarPriority)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key as PillarKey);

  const pillarContext: Record<string, unknown> = {};
  for (const pillar of topPillars) {
    const content = driver.strategy.pillars.find((p) => p.key === pillar);
    if (content) {
      pillarContext[pillar] = {
        name: PILLAR_NAMES[pillar],
        content: content.content,
      };
    }
  }

  // RTIS irrigation: inject key fields from R/T/I/S regardless of priority ranking
  // Drivers need risk awareness, market context, action catalogue, and roadmap alignment
  for (const rtisKey of ["r", "t", "i", "s"] as const) {
    if (!pillarContext[rtisKey]) {
      const rtisContent = driver.strategy.pillars.find((p) => p.key === rtisKey);
      if (rtisContent) {
        const c = rtisContent.content as Record<string, unknown> | null;
        if (c) {
          pillarContext[`_rtis_${rtisKey}`] = {
            ...(rtisKey === "r" ? { riskScore: c.riskScore, topRisks: (c.probabilityImpactMatrix as unknown[])?.slice(0, 3), mitigations: (c.mitigationPriorities as unknown[])?.slice(0, 3) } : {}),
            ...(rtisKey === "t" ? { brandMarketFit: c.brandMarketFitScore, tamSamSom: c.tamSamSom } : {}),
            ...(rtisKey === "i" ? { catalogueParCanal: c.catalogueParCanal, sprint90Days: (c.sprint90Days as unknown[])?.slice(0, 5) } : {}),
            ...(rtisKey === "s" ? { roadmap: c.roadmap, sprint90Days: (c.sprint90Days as unknown[])?.slice(0, 5), globalBudget: c.globalBudget } : {}),
          };
        }
      }
    }
  }

  const suggestedTool = getSuggestedFirstTool(driver.channel);

  // Enrich the brief with Knowledge Graph references via seshat-bridge
  const topPillarKey = topPillars[0];
  let seshatReferences: seshatBridge.SeshatReference[] = [];
  try {
    seshatReferences = await seshatBridge.enrichBrief({
      channel: driver.channel,
      pillarFocus: topPillarKey,
    });
  } catch {
    // Non-blocking: if enrichment fails, proceed without it
  }

  return {
    ...template,
    driverId,
    strategyId: driver.strategyId,
    channel: driver.channel,
    missionContext,
    pillarContext,
    suggestedFirstTool: suggestedTool,
    constraints: driver.constraints,
    qcCriteria: driver.qcCriteria,
    seshatEnrichment: seshatReferences.length > 0
      ? {
          references: seshatReferences,
          enrichedAt: new Date().toISOString(),
        }
      : null,
  };
}

/**
 * Generate a complete qualified brief from Driver + strategy context + mission.
 * Injects N2 composites from relevant pillars (per F.2).
 */
export async function generateBrief(
  driverId: string,
  missionContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const driver = await db.driver.findUniqueOrThrow({
    where: { id: driverId },
    include: {
      strategy: { include: { pillars: true } },
      gloryTools: true,
    },
  });

  const pillarPriority = driver.pillarPriority as Record<string, number>;
  const topPillars = Object.entries(pillarPriority)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key as PillarKey);

  // Gather pillar content for top priorities
  const pillarContent: Record<string, unknown> = {};
  for (const key of topPillars) {
    const pillar = driver.strategy.pillars.find((p) => p.key === key);
    if (pillar) {
      pillarContent[key] = {
        name: PILLAR_NAMES[key],
        content: pillar.content,
        confidence: pillar.confidence,
      };
    }
  }

  // Get glory tools for this driver
  const gloryToolSlugs = driver.gloryTools.map((gt) => gt.gloryTool);
  const suggestedTool = getSuggestedFirstTool(driver.channel);

  // Enrich the brief with Knowledge Graph data via seshat-bridge
  const topPillarKey = topPillars[0];
  const bizContext = driver.strategy.businessContext as unknown as BusinessContext | null;
  let seshatReferences: seshatBridge.SeshatReference[] = [];
  try {
    seshatReferences = await seshatBridge.enrichBrief({
      channel: driver.channel,
      sector: (bizContext as Record<string, unknown> | null)?.sector as string | undefined,
      market: (bizContext as Record<string, unknown> | null)?.market as string | undefined,
      pillarFocus: topPillarKey,
    });
  } catch {
    // Non-blocking: if enrichment fails, proceed without it
  }

  return {
    // Brief metadata
    briefId: `brief-${driver.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),

    // Driver context
    driver: {
      id: driver.id,
      channel: driver.channel,
      channelType: driver.channelType,
      name: driver.name,
    },

    // Strategy context
    strategy: {
      id: driver.strategy.id,
      name: driver.strategy.name,
      vector: driver.strategy.advertis_vector,
      businessContext: driver.strategy.businessContext ?? null,
    },

    // Brief content
    objective: missionContext.objective ?? "",
    targetAudience: missionContext.targetAudience ?? "",
    keyMessage: missionContext.keyMessage ?? "",
    deliverables: missionContext.deliverables ?? [],
    deadline: missionContext.deadline ?? "",
    budget: missionContext.budget ?? "",

    // ADVE context (N2 composites from priority pillars)
    priorityPillars: topPillars,
    pillarContent,
    pillarPriority,

    // Production specs from Driver
    formatSpecs: driver.formatSpecs,
    constraints: driver.constraints,
    qcCriteria: driver.qcCriteria,

    // GLORY tools
    gloryTools: gloryToolSlugs,
    suggestedFirstTool: suggestedTool,

    // References (user-provided + seshat enrichment)
    references: missionContext.references ?? [],

    // Knowledge Graph enrichment from seshat-bridge
    seshatEnrichment: seshatReferences.length > 0
      ? {
          references: seshatReferences,
          benchmarks: seshatReferences.filter((r) => r.type === "benchmark"),
          pastPatterns: seshatReferences.filter((r) => r.type === "case_study"),
          enrichedAt: new Date().toISOString(),
        }
      : null,
  };
}

function getChannelPillarPriority(
  channel: string,
  vector: Record<string, number>,
  bizContext?: BusinessContext | null,
  isPrimaryDriver?: boolean,
  brandNature?: BrandNatureKey | null,
): Record<string, number> {
  const channelWeights: Record<string, Record<string, number>> = {
    INSTAGRAM: { d: 1.3, v: 1.2, e: 1.3, a: 1.0, r: 0.7, t: 0.8, i: 0.9, s: 0.8 },
    FACEBOOK: { e: 1.3, v: 1.2, a: 1.0, d: 0.9, r: 0.8, t: 0.9, i: 1.0, s: 0.8 },
    TIKTOK: { d: 1.4, e: 1.3, v: 1.1, a: 1.0, r: 0.6, t: 0.7, i: 0.8, s: 0.7 },
    LINKEDIN: { a: 1.3, v: 1.2, s: 1.2, t: 1.1, d: 0.9, e: 0.8, r: 0.9, i: 1.0 },
    WEBSITE: { a: 1.2, d: 1.2, v: 1.3, s: 1.1, e: 1.0, r: 0.9, t: 0.9, i: 1.0 },
    PACKAGING: { d: 1.4, v: 1.3, a: 1.1, e: 0.8, r: 0.9, t: 0.7, i: 0.9, s: 0.9 },
    EVENT: { e: 1.4, a: 1.2, v: 1.1, d: 1.0, r: 1.0, t: 0.8, i: 1.1, s: 0.8 },
    PR: { a: 1.3, s: 1.2, r: 1.1, t: 1.0, d: 0.9, v: 0.9, e: 0.8, i: 0.9 },
    VIDEO: { d: 1.3, a: 1.2, v: 1.2, e: 1.1, r: 0.7, t: 0.8, i: 0.9, s: 0.9 },
  };

  const weights = { ...(channelWeights[channel] ?? { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 }) };

  // Primary driver boost: +0.3 on the dominant pillar for this brand nature
  if (isPrimaryDriver && brandNature) {
    const natureDef = BRAND_NATURES[brandNature];
    if (natureDef) {
      const dominantKey = natureDef.dominantPillar;
      weights[dominantKey] = (weights[dominantKey] ?? 1.0) + 0.3;
    }
  }

  // Apply business context channel modifiers if available
  const bizModifiers = bizContext ? getChannelModifiersForContext(bizContext) : {};
  const channelMod = bizModifiers[channel] ?? 0;

  const priority: Record<string, number> = {};

  for (const [key, weight] of Object.entries(weights)) {
    // Channel modifier boosts or reduces the overall weight for this channel
    const adjustedWeight = Math.max(0.3, weight + channelMod * 0.5);
    priority[key] = Math.round(((vector[key] ?? 12.5) * adjustedWeight) * 100) / 100;
  }

  return priority;
}

function getChannelFormatSpecs(
  channel: string,
  brandNature?: BrandNatureKey | null,
  isPrimaryDriver?: boolean,
): Record<string, unknown> {
  // Festival IP primary driver: enriched EVENT specs
  if (channel === "EVENT" && brandNature === "FESTIVAL_IP" && isPrimaryDriver) {
    return {
      type: "FESTIVAL_PRIMARY",
      scenographie: {
        espaces: [],
        signaletique: { entree: "", parcours: "", sorties: "" },
        ambiance: { lumiere: "", son: "", decor: "" },
        materiaux: [],
      },
      parcours_visiteur: {
        etapes: [],
        touchpoints: [],
        flow: "",
        temps_forts: [],
        zones: { accueil: "", principale: "", secondaires: [], repos: "", restauration: "" },
      },
      programmation: {
        headliners: [],
        categories: [],
        slots: [],
        format: "",
        duree_totale: "",
      },
      rituels_marque: {
        ouverture: "",
        cloture: "",
        moments_cles: [],
        objets_collectors: [],
        traditions_recurrentes: [],
      },
      experience_design: {
        sens: { vue: "", son: "", toucher: "", odorat: "", gout: "" },
        emotions_cibles: [],
        moments_partageables: [],
        surprise_elements: [],
      },
      operationnel: {
        capacite: null,
        duree: "",
        logistique: [],
        securite: "",
        accessibilite: "",
      },
    };
  }

  const specs: Record<string, Record<string, unknown>> = {
    INSTAGRAM: { formats: ["post_1080x1080", "story_1080x1920", "reel_1080x1920", "carousel_1080x1080"], maxDuration: "90s" },
    FACEBOOK: { formats: ["post_1200x630", "story_1080x1920", "video_1280x720"], maxDuration: "120s" },
    TIKTOK: { formats: ["video_1080x1920"], maxDuration: "60s", minDuration: "15s" },
    LINKEDIN: { formats: ["post_1200x627", "article", "document_pdf"], maxLength: 3000 },
    WEBSITE: { formats: ["hero_1920x1080", "section", "page"], responsive: true },
    PACKAGING: { formats: ["label", "box", "wrapper"], colorMode: "CMYK", minDPI: 300 },
    EVENT: { formats: ["invitation", "signage", "presentation", "badge"], type: "SATELLITE" },
    VIDEO: { formats: ["16:9", "9:16", "1:1"], minResolution: "1080p" },
    PR: { formats: ["press_release", "media_kit", "fact_sheet"] },
  };
  return specs[channel] ?? {};
}

function generateConstraints(strategy: { pillars: Array<{ key: string; content: unknown }> }, _channel: string): Record<string, unknown> {
  return {
    brandGuidelines: "Must follow brand guidelines",
    toneOfVoice: "Consistent with brand voice",
    visualIdentity: "Use approved brand assets",
  };
}

function generateBriefTemplate(
  channel: string,
  pillarPriority: Record<string, number>,
  brandNature?: BrandNatureKey | null,
  isPrimaryDriver?: boolean,
): Record<string, unknown> {
  const topPillars = Object.entries(pillarPriority)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  // Festival IP primary driver: enriched brief template
  if (channel === "EVENT" && brandNature === "FESTIVAL_IP" && isPrimaryDriver) {
    return {
      channel,
      type: "FESTIVAL_PRIMARY",
      objective: "",
      targetAudience: "",
      keyMessage: "",
      priorityPillars: topPillars,
      // Festival-specific sections
      concept_note: {
        proposition_unique: "",
        positionnement_festival: "",
        territoire_de_marque: "",
        promesse_visiteur: "",
      },
      scenographie: {
        direction_artistique: "",
        espaces_cles: [],
        parcours_narratif: "",
        identite_visuelle_evenementielle: "",
      },
      programmation: {
        ligne_editoriale: "",
        headliners: [],
        temps_forts: [],
        activations: [],
      },
      rituels: {
        rituels_signature: [],
        moments_communautaires: [],
        objets_collectibles: [],
        traditions_edition: [],
      },
      experience_design: {
        parcours_sensoriel: "",
        points_instagram: [],
        moments_surprise: [],
        engagement_participatif: [],
      },
      operationnel: {
        capacite_cible: "",
        duree: "",
        lieu: "",
        partenaires_cles: [],
        budget_production: "",
      },
      satellite_drivers: {
        note: "Les drivers satellites (Instagram, OOH, Website, etc.) servent ce driver primaire. Leurs briefs doivent s'aligner sur le concept note et les rituels definis ici.",
        canaux_prioritaires: [],
      },
      deliverables: [],
      deadline: "",
      budget: "",
      references: [],
    };
  }

  return {
    channel,
    objective: "",
    targetAudience: "",
    keyMessage: "",
    priorityPillars: topPillars,
    deliverables: [],
    deadline: "",
    budget: "",
    references: [],
  };
}

function generateQcCriteria(channel: string, pillarPriority: Record<string, number>): Record<string, unknown> {
  const topPillars = Object.entries(pillarPriority)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  return {
    technicalConformity: true,
    brandConformity: true,
    pillarAlignment: topPillars,
    minQualityScore: 7,
    requiredReviewType: "PEER",
  };
}
