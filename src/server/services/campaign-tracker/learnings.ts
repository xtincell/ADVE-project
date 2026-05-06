/**
 * Campaign Tracker — Boucles d'apprentissage (Phase 19, ADR-0052 Cluster E).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 3 (4) :
 *   - learnings.oracleReconciler   — propose OPERATOR_AMEND_PILLAR_PROPOSAL[] post-campaign
 *   - learnings.vbEnrichment       — propose VariableBibleEnrichmentProposal[] reviewable
 *   - learnings.crewLoop           — score CrewPerformance par dimension (12 dims)
 *   - learnings.sequencesPromoter  — propose Sequence DRAFT→STABLE si campagne réussie
 *
 * Pattern : pas de mutation automatique. Toutes les modifications structurelles
 * (Oracle, variable-bible, sequences, Imhotep tier) passent par l'opérateur
 * qui valide la proposition avant émission de l'Intent canonique
 * (OPERATOR_AMEND_PILLAR ADR-0023, PROMOTE_SEQUENCE_LIFECYCLE ADR-0042).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import {
  type CampaignToOracleReconciliationResult,
  type OperatorAmendPillarProposal,
  type VariableBibleEnrichmentProposal,
  type CrewPerformanceScore,
  type SequencePromotionProposal,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster learnings.oracleReconciler (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface ReconcileToOracleInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * MVP heuristic : extrait des proposals minimales depuis le postmortem structuré.
 * PRODUCTION (ADR enfant `0052-E-postmortem-12q`) utilisera Glory tool
 * `campaign-to-oracle-reconciler` LLM pour proposals enrichies.
 *
 * Pattern : retourne **proposals** — l'opérateur émet ensuite OPERATOR_AMEND_PILLAR
 * Intents séparés (ADR-0023) avec validation manuelle. Pas de mutation auto.
 */
export async function reconcileCampaignToOracle(
  input: ReconcileToOracleInput,
): Promise<CampaignToOracleReconciliationResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      reports: {
        where: { reportType: "POSTMORTEM" },
        orderBy: { generatedAt: "desc" as const },
        take: 1,
        select: { id: true, postmortemStructured: true },
      },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];

  if (campaign.reports.length === 0) {
    degradationCodes.push("MISSING_POSTMORTEM_REPORT");
    return {
      campaignId: campaign.id,
      proposals: [],
      degradationCodes,
    };
  }

  const postmortem = campaign.reports[0]?.postmortemStructured;
  if (!postmortem) {
    degradationCodes.push("MISSING_POSTMORTEM_STRUCTURED");
    return {
      campaignId: campaign.id,
      proposals: [],
      degradationCodes,
    };
  }

  // MVP : pas de LLM call. Génère 0..N proposals depuis structured questions
  // qui ont des réponses non-triviales. PRODUCTION enrichira via Glory tool.
  const proposals = extractProposalsFromPostmortem(postmortem);

  return {
    campaignId: campaign.id,
    proposals,
    degradationCodes,
  };
}

function extractProposalsFromPostmortem(payload: unknown): readonly OperatorAmendPillarProposal[] {
  if (typeof payload !== "object" || payload === null) return [];
  // MVP placeholder : retourne array vide. PRODUCTION extraira via Glory tool LLM.
  return [];
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster learnings.vbEnrichment (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface EnrichVariableBibleInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

interface EnrichVariableBibleResult {
  readonly campaignId: string;
  readonly proposals: readonly VariableBibleEnrichmentProposal[];
  readonly degradationCodes: readonly string[];
}

/**
 * MVP : extrait patterns depuis CampaignAction réussies (bigIdeaCoherenceScore élevé
 * + AARRR metrics > target). PRODUCTION = LLM analysis cross-campagnes.
 */
export async function enrichVariableBibleFromCampaign(
  input: EnrichVariableBibleInput,
): Promise<EnrichVariableBibleResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  // MVP placeholder. PRODUCTION enrichira via Glory tool LLM.
  return {
    campaignId: campaign.id,
    proposals: [],
    degradationCodes: ["MVP_HEURISTIC_NO_LLM_EXTRACTION"],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster learnings.crewLoop (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface EvaluateCrewPerformanceInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

interface EvaluateCrewPerformanceResult {
  readonly campaignId: string;
  readonly scores: readonly CrewPerformanceScore[];
  readonly degradationCodes: readonly string[];
}

/**
 * MVP : score uniforme 50 par dimension pour chaque CampaignTeamMember.
 * PRODUCTION : calcul réel via Glory tool `crew-performance-evaluator` (ADR enfant).
 */
const CREW_DIMENSIONS_12 = [
  "deliverable_quality",
  "deadline_respect",
  "team_collaboration",
  "client_communication",
  "creative_originality",
  "strategic_alignment",
  "technical_execution",
  "issue_resolution",
  "documentation",
  "cost_discipline",
  "innovation",
  "ownership",
] as const;

export async function evaluateCrewPerformance(
  input: EvaluateCrewPerformanceInput,
): Promise<EvaluateCrewPerformanceResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      teamMembers: {
        select: { id: true, userId: true, role: true },
      },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];
  if (campaign.teamMembers.length === 0) {
    degradationCodes.push("NO_TEAM_MEMBERS");
  }

  // MVP : retour neutre 50 par dimension + tier HOLD par défaut.
  const scores: CrewPerformanceScore[] = campaign.teamMembers.map((tm) => {
    const byDimension = Object.fromEntries(
      CREW_DIMENSIONS_12.map((d) => [d, 50] as const),
    );
    return {
      campaignTeamMemberId: tm.id,
      userId: tm.userId,
      byDimension,
      composite: 50,
      tierRecommendation: "HOLD" as const,
      recommendedCourses: [],
    };
  });

  degradationCodes.push("MVP_NEUTRAL_SCORING");

  return {
    campaignId: campaign.id,
    scores,
    degradationCodes,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster learnings.sequencesPromoter (READY/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface ProposeSequencePromotionInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
  readonly sequenceKey: string;
}

/**
 * Évalue si la sequence runtime utilisée pendant la campagne mérite promotion
 * `lifecycle: DRAFT → STABLE` (ADR-0042). Critères de succès :
 *   - tierDelta > 0 (Loi 1 conservation altitude positive)
 *   - cultIndexDelta > 0 (Cluster B — culte renforcé)
 *   - altitudeRegression = false (pas de régression silencieuse pillar)
 *   - timesReused >= 3 (preuve de robustesse cross-clients)
 */
export async function proposeSequencePromotionFromCampaign(
  input: ProposeSequencePromotionInput,
): Promise<SequencePromotionProposal> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      tierBrandSnapshot: true,
      tierBrandFinal: true,
      cultIndexSnapshotPre: true,
      cultIndexSnapshotPost: true,
      altitudeRegression: true,
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const tierSnap = campaign.tierBrandSnapshot as { compositeScore?: number } | null;
  const tierFinal = campaign.tierBrandFinal as { compositeScore?: number } | null;
  const cultPre = campaign.cultIndexSnapshotPre as { score?: number } | null;
  const cultPost = campaign.cultIndexSnapshotPost as { score?: number } | null;

  const tierDelta = tierSnap?.compositeScore && tierFinal?.compositeScore
    ? tierFinal.compositeScore - tierSnap.compositeScore
    : 0;
  const cultIndexDelta = cultPre?.score && cultPost?.score ? cultPost.score - cultPre.score : null;
  const altitudeRegression = campaign.altitudeRegression ?? false;

  // Heuristic MVP : timesReused n'est pas tracké encore — placeholder à 1.
  // Vague 4 (post-PRODUCTION) ajoutera SequenceReuseTracker model.
  const timesReused = 1;

  let recommendation: SequencePromotionProposal["recommendation"];
  if (tierDelta > 0 && (cultIndexDelta === null || cultIndexDelta >= 0) && !altitudeRegression && timesReused >= 3) {
    recommendation = "PROMOTE_NOW";
  } else if (tierDelta > 0 && !altitudeRegression && timesReused < 3) {
    recommendation = "WAIT_FOR_MORE_REUSES";
  } else {
    recommendation = "REFUSE_INSUFFICIENT_SIGNALS";
  }

  return {
    sequenceKey: input.sequenceKey,
    currentLifecycle: "DRAFT",
    proposedLifecycle: recommendation === "PROMOTE_NOW" ? "STABLE" : "DRAFT",
    campaignSuccessSignals: {
      tierDelta,
      cultIndexDelta,
      altitudeRegression,
      timesReused,
    },
    recommendation,
  };
}
