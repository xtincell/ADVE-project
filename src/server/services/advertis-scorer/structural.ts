import { db } from "@/lib/db";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";
import { scorePillarStructural, type PillarScoreInput } from "@/lib/utils/scoring";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import type { ScorableType } from "./index";

/**
 * Deterministic structural scoring per pillar.
 * Formula from Annexe G: score = (atomes/requis * 15) + (collections/totales * 7) + (cross_refs/requises * 3)
 * Max 25 per pillar.
 *
 * This function MUST produce identical results for identical inputs (variance = 0).
 */
export async function scoreStructural(
  type: ScorableType,
  id: string
): Promise<Record<PillarKey, number>> {
  const scores: Record<string, number> = {};

  for (const pillar of PILLAR_KEYS) {
    const input = await getPillarInputs(type, id, pillar);
    scores[pillar] = scorePillarStructural(input);
  }

  return scores as Record<PillarKey, number>;
}

/**
 * Retrieves the structural input counts for a given pillar.
 * Counts atoms (filled fields), collections (complete groups), and cross-references.
 */
async function getPillarInputs(
  type: ScorableType,
  id: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  if (type === "strategy") {
    return getStrategyPillarInputs(id, pillar);
  }
  if (type === "campaign") {
    return getCampaignPillarInputs(id, pillar);
  }
  if (type === "mission") {
    return getMissionPillarInputs(id, pillar);
  }

  // Default: return empty inputs for types not yet implemented
  return {
    atomesValides: 0,
    atomesRequis: 1,
    collectionsCompletes: 0,
    collectionsTotales: 1,
    crossRefsValides: 0,
    crossRefsRequises: 1,
  };
}

/**
 * Contract-aware strategy pillar scoring.
 *
 * Uses the Pillar Maturity Contract to validate the RIGHT fields, not just count
 * any non-empty fields. The three scoring dimensions map to:
 *
 *   atomes   = COMPLETE stage requirements satisfied (the fields Glory tools need)
 *   collections = array fields with minimum item counts satisfied
 *   crossRefs = ENRICHED stage requirements satisfied (cross-pillar data)
 */
async function getStrategyPillarInputs(
  strategyId: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  const pillarContent = await db.pillar.findUnique({
    where: { strategyId_key: { strategyId, key: pillar } },
  });

  const contract = getContract(pillar);
  const content = (pillarContent?.content ?? null) as Record<string, unknown> | null;

  if (!content || !contract) {
    const totalComplete = contract?.stages.COMPLETE.length ?? 8;
    const totalEnriched = contract?.stages.ENRICHED.length ?? 4;
    return {
      atomesValides: 0,
      atomesRequis: Math.max(totalComplete, 1),
      collectionsCompletes: 0,
      collectionsTotales: Math.max(countArrayRequirements(contract), 1),
      crossRefsValides: 0,
      crossRefsRequises: Math.max(totalEnriched, 1),
    };
  }

  // Use the maturity assessor — pure in-memory computation
  const assessment = assessPillar(pillar, content, contract);

  // atomes = COMPLETE requirements satisfied (what Glory needs)
  const atomesRequis = contract.stages.COMPLETE.length || 1;
  const atomesValides = assessment.satisfied.length;

  // collections = array fields with sufficient items
  const arrayReqs = contract.stages.COMPLETE.filter(r =>
    r.validator === "min_items"
  );
  const collectionsTotales = Math.max(arrayReqs.length, 1);
  const collectionsCompletes = arrayReqs.filter(r =>
    assessment.satisfied.includes(r.path)
  ).length;

  // crossRefs = ENRICHED stage requirements (cross-pillar enrichment from RTIS)
  const enrichedReqs = contract.stages.ENRICHED;
  const crossRefsRequises = Math.max(enrichedReqs.length, 1);
  const crossRefsValides = enrichedReqs.filter(r =>
    assessment.satisfied.includes(r.path)
  ).length;

  return {
    atomesValides,
    atomesRequis,
    collectionsCompletes,
    collectionsTotales,
    crossRefsValides,
    crossRefsRequises,
  };
}

/** Count how many COMPLETE requirements are array-type validators */
function countArrayRequirements(
  contract: import("@/lib/types/pillar-maturity").PillarMaturityContract | null
): number {
  if (!contract) return 2;
  return contract.stages.COMPLETE.filter(r => r.validator === "min_items").length || 1;
}

// ============================================================================
// CAMPAIGN SCORING
// ============================================================================

/**
 * Score campaigns by evaluating operational completeness per ADVE pillar.
 * A = objectives clarity, D = creative assets, V = budget/value, E = team/engagement,
 * R = risk (milestones), T = tracking (AARRR), I = implementation (actions/executions),
 * S = strategy (briefs/reports)
 */
async function getCampaignPillarInputs(
  campaignId: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      actions: true,
      amplifications: true,
      teamMembers: true,
      milestones: true,
      approvals: true,
      assets: true,
      briefs: true,
      reports: true,
      fieldOps: true,
      aarrMetrics: true,
      budgetLines: true,
      links: true,
    },
  });

  if (!campaign) {
    return { atomesValides: 0, atomesRequis: 1, collectionsCompletes: 0, collectionsTotales: 1, crossRefsValides: 0, crossRefsRequises: 1 };
  }

  const obj = campaign.objectives as Record<string, unknown> | null;
  const vec = campaign.advertis_vector as Record<string, number> | null;

  // Pillar-specific scoring inputs
  const pillarMap: Record<PillarKey, PillarScoreInput> = {
    a: {
      // Authenticité — objectives, description, ADVE vector
      atomesValides: (obj?.description ? 1 : 0) + (campaign.name ? 1 : 0) + (vec?.a ? 1 : 0) + (campaign.startDate ? 1 : 0) + (campaign.endDate ? 1 : 0),
      atomesRequis: 5,
      collectionsCompletes: campaign.links.length >= 1 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.strategyId ? 1 : 0,
      crossRefsRequises: 1,
    },
    d: {
      // Distinction — creative assets, approvals
      atomesValides: Math.min(campaign.assets.length, 5),
      atomesRequis: 5,
      collectionsCompletes: campaign.assets.length >= 3 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.approvals.filter((a) => a.status === "APPROVED").length > 0 ? 1 : 0,
      crossRefsRequises: 1,
    },
    v: {
      // Valeur — budget, budget lines
      atomesValides: (campaign.budget ? 1 : 0) + Math.min(campaign.budgetLines.length, 4),
      atomesRequis: 5,
      collectionsCompletes: campaign.budgetLines.length >= 3 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.amplifications.length > 0 ? 1 : 0,
      crossRefsRequises: 1,
    },
    e: {
      // Engagement — team, field ops
      atomesValides: Math.min(campaign.teamMembers.length, 4) + Math.min(campaign.fieldOps.length, 2),
      atomesRequis: 6,
      collectionsCompletes: campaign.teamMembers.length >= 3 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.fieldOps.length > 0 ? 1 : 0,
      crossRefsRequises: 1,
    },
    r: {
      // Risk — milestones as risk controls
      atomesValides: Math.min(campaign.milestones.length, 5),
      atomesRequis: 5,
      collectionsCompletes: campaign.milestones.filter((m) => m.completed).length >= 1 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: 0,
      crossRefsRequises: 1,
    },
    t: {
      // Track — AARRR metrics, amplification metrics
      atomesValides: Math.min(campaign.aarrMetrics.length, 3) + (campaign.amplifications.length > 0 ? 1 : 0),
      atomesRequis: 4,
      collectionsCompletes: campaign.aarrMetrics.length >= 3 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.reports.length > 0 ? 1 : 0,
      crossRefsRequises: 1,
    },
    i: {
      // Implementation — actions, executions
      atomesValides: Math.min(campaign.actions.length, 6),
      atomesRequis: 6,
      collectionsCompletes: campaign.actions.length >= 3 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.links.length > 0 ? 1 : 0,
      crossRefsRequises: 1,
    },
    s: {
      // Stratégie — briefs, reports
      atomesValides: Math.min(campaign.briefs.length, 3) + Math.min(campaign.reports.length, 2),
      atomesRequis: 5,
      collectionsCompletes: campaign.briefs.length >= 2 ? 1 : 0,
      collectionsTotales: 1,
      crossRefsValides: campaign.strategyId ? 1 : 0,
      crossRefsRequises: 1,
    },
  };

  return pillarMap[pillar];
}

// ============================================================================
// MISSION SCORING
// ============================================================================

async function getMissionPillarInputs(
  missionId: string,
  pillar: PillarKey
): Promise<PillarScoreInput> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: { deliverables: true },
  });

  if (!mission) {
    return { atomesValides: 0, atomesRequis: 1, collectionsCompletes: 0, collectionsTotales: 1, crossRefsValides: 0, crossRefsRequises: 1 };
  }

  const briefData = mission.briefData as Record<string, unknown> | null;
  const delivCount = mission.deliverables.length;
  const briefFields = briefData ? Object.values(briefData).filter((v) => v !== null && v !== undefined && v !== "").length : 0;

  // Simplified scoring: missions are mostly about Implementation + Distinction
  const baseAtoms = briefFields + delivCount + (mission.assigneeId ? 1 : 0) + (mission.description ? 1 : 0);
  const totalReq = pillar === "i" ? 6 : pillar === "d" ? 4 : 3;

  return {
    atomesValides: Math.min(baseAtoms, totalReq),
    atomesRequis: totalReq,
    collectionsCompletes: delivCount >= 2 ? 1 : 0,
    collectionsTotales: 1,
    crossRefsValides: (mission.strategyId ? 1 : 0) + (mission.campaignId ? 1 : 0),
    crossRefsRequises: 2,
  };
}
