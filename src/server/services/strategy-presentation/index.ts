/**
 * Strategy Presentation — Assembly Service
 * Assembles all 13 sections of the strategic proposal from pillars, Glory outputs, and variables.
 * Strategy invents NOTHING — it only pulls from existing data.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { classifyBrand, createEmptyVector, PILLAR_NAMES } from "@/lib/types/advertis-vector";
import type { AdvertisVector } from "@/lib/types/advertis-vector";
import {
  mapExecutiveSummary,
  mapContexteDefi,
  mapAuditDiagnostic,
  mapPlateformeStrategique,
  mapTerritoireCreatif,
  mapPlanActivation,
  mapProductionLivrables,
  mapMediasDistribution,
  mapKpisMesure,
  mapBudget,
  mapTimelineGouvernance,
  mapEquipe,
  mapConditionsEtapes,
  mapPropositionValeur,
  mapExperienceEngagement,
  mapSwotInterne,
  mapSwotExterne,
  mapSignauxOpportunites,
  mapCatalogueActions,
  mapFenetreOverton,
  mapProfilSuperfan,
  mapCroissanceEvolution,
  checkSectionCompleteness,
} from "./section-mappers";
import type { StrategyPresentationDocument, CompletenessReport } from "./types";

// ─── Prisma Include (single comprehensive query) ────────────────────────────

const PRESENTATION_INCLUDE = {
  user: { select: { name: true, email: true, image: true } },
  operator: { select: { name: true, slug: true } },
  client: { select: { id: true, name: true, sector: true, country: true, contactName: true, contactEmail: true } },
  pillars: true,
  drivers: { where: { deletedAt: null } },
  campaigns: {
    include: {
      actions: true,
      executions: true,
      teamMembers: { include: { user: { select: { name: true, email: true, image: true } } } },
      milestones: { orderBy: { dueDate: "asc" as const } },
      budgetLines: true,
      aarrMetrics: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
  missions: {
    include: {
      deliverables: true,
      driver: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
  signals: { orderBy: { createdAt: "desc" as const }, take: 20 },
  gloryOutputs: { orderBy: { createdAt: "desc" as const } },
  devotionSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 5 },
  cultIndexSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 5 },
  superfanProfiles: { orderBy: { engagementDepth: "desc" as const }, take: 20 },
  communitySnapshots: { orderBy: { measuredAt: "desc" as const }, take: 10 },
  scoreSnapshots: { orderBy: { measuredAt: "desc" as const }, take: 12 },
  contracts: { orderBy: { createdAt: "desc" as const } },
  brandVariables: true,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrategyWithRelations = any;

// ─── Assembly ────────────────────────────────────────────────────────────────

export async function assemblePresentation(strategyId: string): Promise<StrategyPresentationDocument> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: PRESENTATION_INCLUDE,
  });

  const rawVector = (strategy.advertis_vector as AdvertisVector | null) ?? createEmptyVector();
  // Ensure confidence is always a valid number — older records may lack it
  const vector: AdvertisVector = {
    ...rawVector,
    confidence: typeof rawVector.confidence === "number" && !isNaN(rawVector.confidence)
      ? rawVector.confidence
      : rawVector.composite > 0 ? Math.min(rawVector.composite / 200, 1) : 0,
  };
  const classification = classifyBrand(vector.composite);

  return {
    meta: {
      strategyId: strategy.id,
      brandName: strategy.name,
      operatorName: strategy.operator?.name ?? null,
      generatedAt: new Date().toISOString(),
      vector,
      classification,
    },
    sections: {
      // Phase 1: ADVE
      executiveSummary: mapExecutiveSummary(strategy, vector, classification),
      contexteDefi: mapContexteDefi(strategy),
      plateformeStrategique: mapPlateformeStrategique(strategy),
      propositionValeur: mapPropositionValeur(strategy),
      territoireCreatif: mapTerritoireCreatif(strategy),
      experienceEngagement: mapExperienceEngagement(strategy),
      // Phase 2: R+T
      swotInterne: mapSwotInterne(strategy),
      swotExterne: mapSwotExterne(strategy),
      signaux: mapSignauxOpportunites(strategy),
      // Phase 3: I+S
      catalogueActions: mapCatalogueActions(strategy),
      planActivation: mapPlanActivation(strategy),
      fenetreOverton: mapFenetreOverton(strategy),
      mediasDistribution: mapMediasDistribution(strategy),
      productionLivrables: mapProductionLivrables(strategy),
      // Mesure & Superfan
      profilSuperfan: mapProfilSuperfan(strategy),
      kpisMesure: mapKpisMesure(strategy),
      croissanceEvolution: mapCroissanceEvolution(strategy),
      // Operationnel
      budget: mapBudget(strategy),
      timelineGouvernance: mapTimelineGouvernance(strategy),
      equipe: mapEquipe(strategy),
      conditionsEtapes: mapConditionsEtapes(strategy),
      // Legacy
      auditDiagnostic: mapAuditDiagnostic(strategy),
    },
  };
}

// ─── Token Management ────────────────────────────────────────────────────────

export async function getShareToken(strategyId: string): Promise<{ token: string; url: string }> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { businessContext: true },
  });

  const ctx = (strategy.businessContext as Record<string, unknown>) ?? {};
  const existing = ctx.presentationShareToken as string | undefined;

  if (existing) {
    return { token: existing, url: `/shared/strategy/${existing}` };
  }

  const token = crypto.randomBytes(24).toString("hex");
  await db.strategy.update({
    where: { id: strategyId },
    data: {
      businessContext: { ...ctx, presentationShareToken: token },
    },
  });

  return { token, url: `/shared/strategy/${token}` };
}

export async function resolveShareToken(token: string): Promise<string | null> {
  // Search across all strategies for the token in businessContext
  const strategies = await db.strategy.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, businessContext: true },
  });

  for (const s of strategies) {
    const ctx = s.businessContext as Record<string, unknown> | null;
    if (ctx?.presentationShareToken === token) {
      return s.id;
    }
  }

  return null;
}

// ─── Completeness ────────────────────────────────────────────────────────────

export async function checkCompleteness(strategyId: string): Promise<CompletenessReport> {
  const doc = await assemblePresentation(strategyId);
  return checkSectionCompleteness(doc);
}

// ─── Helpers exposed for tRPC ────────────────────────────────────────────────

export { PILLAR_NAMES };
