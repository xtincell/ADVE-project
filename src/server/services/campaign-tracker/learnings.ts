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
 * PRODUCTION (ADR enfant `0056-postmortem-12q`) utilisera Glory tool
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

/**
 * MVP — extraction Glory tool LLM `postmortem-12q` puis transformation des
 * réponses Q1/Q2/Q9/Q11 en OperatorAmendPillarProposal (4 questions canon
 * qui touchent ADVE — Big Idea/Manifesto/Pillar regression/Variable bible).
 *
 * Le LLM est censé déjà avoir tourné via le Glory tool `postmortem-12q` lors
 * du postmortem submission. Ici on transforme le JSON `postmortemStructured`
 * en proposals reviewable par l'opérateur.
 */
function extractProposalsFromPostmortem(payload: unknown): readonly OperatorAmendPillarProposal[] {
  if (typeof payload !== "object" || payload === null) return [];
  const pm = payload as Record<string, { answer?: string; score?: number; evidenceUrls?: string[] }>;
  const proposals: OperatorAmendPillarProposal[] = [];

  // Q1 — La Big Idea s'est-elle imposée ? → si score < 0.5, propose amendement A
  if (pm.q1 && typeof pm.q1.score === "number" && pm.q1.score < 0.5 && pm.q1.answer) {
    proposals.push({
      pillarKey: "a",
      fieldPath: "preuvesAuthenticite",
      currentValue: null,
      proposedValue: pm.q1.answer,
      mode: "LLM_REPHRASE",
      rationale: `Postmortem Q1 score=${pm.q1.score.toFixed(2)} : Big Idea n'a pas suffisamment imposée. Évidence : ${pm.q1.answer}`,
      impactedOracleSections: ["a-preuves-authenticite", "a-archetype"],
    });
  }

  // Q2 — Le Manifesto a-t-il été respecté ? → gap measurable
  if (pm.q2 && typeof pm.q2.score === "number" && pm.q2.score < 0.5 && pm.q2.answer) {
    proposals.push({
      pillarKey: "a",
      fieldPath: "originMyth",
      currentValue: null,
      proposedValue: pm.q2.answer,
      mode: "LLM_REPHRASE",
      rationale: `Postmortem Q2 score=${pm.q2.score.toFixed(2)} : Manifesto pas respecté. Évidence : ${pm.q2.answer}`,
      impactedOracleSections: ["a-manifesto"],
    });
  }

  // Q9 — Quel pillar a régressé silencieusement ? → propose amendement
  if (pm.q9 && typeof pm.q9.answer === "string") {
    const detectedPillar = extractPillarFromAnswer(pm.q9.answer);
    if (detectedPillar) {
      proposals.push({
        pillarKey: detectedPillar,
        fieldPath: "regressionAudit",
        currentValue: null,
        proposedValue: pm.q9.answer,
        mode: "LLM_REPHRASE",
        rationale: `Postmortem Q9 (Loi 1 audit) — pillar ${detectedPillar.toUpperCase()} régressé silencieusement.`,
        impactedOracleSections: [`${detectedPillar}-overview`],
      });
    }
  }

  // Q11 — Quel apprentissage entre dans la variable-bible ? (D pillar default)
  if (pm.q11 && typeof pm.q11.answer === "string" && pm.q11.answer.length > 20) {
    proposals.push({
      pillarKey: "d",
      fieldPath: "learningCorpus",
      currentValue: null,
      proposedValue: pm.q11.answer,
      mode: "PATCH_DIRECT",
      rationale: `Postmortem Q11 — nouvel apprentissage à intégrer variable-bible.`,
      impactedOracleSections: ["d-positionnement", "d-promesseMaitre"],
    });
  }

  return proposals;
}

function extractPillarFromAnswer(answer: string): "a" | "d" | "v" | "e" | null {
  const lower = answer.toLowerCase();
  if (/\bauthenticit[eé]|pillar a\b|pilier a\b/.test(lower)) return "a";
  if (/\bdistinction\b|pillar d\b|pilier d\b|positionnement/.test(lower)) return "d";
  if (/\bvaleur|pillar v\b|pilier v\b|promesse/.test(lower)) return "v";
  if (/\bengagement\b|pillar e\b|pilier e\b|communaut[eé]/.test(lower)) return "e";
  return null;
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
 * MVP — extrait patterns depuis CampaignAction avec bigIdeaCoherenceScore élevé
 * (>= 0.7) + AARRR metrics réalisés. Génère VariableBibleEnrichmentProposal[]
 * structurées BIBLE_A/D/V/E selon pillarServed dominant de chaque action.
 *
 * PRODUCTION : LLM analysis cross-campagnes via Glory tool dédié.
 */
export async function enrichVariableBibleFromCampaign(
  input: EnrichVariableBibleInput,
): Promise<EnrichVariableBibleResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      actions: {
        where: { bigIdeaCoherenceScore: { gte: 0.7 } },
        select: {
          id: true,
          name: true,
          actionType: true,
          category: true,
          pillarServed: true,
          bigIdeaCoherenceScore: true,
          manipulationModeApplied: true,
          aarrStage: true,
        },
      },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const degradationCodes: string[] = [];
  if (campaign.actions.length === 0) {
    degradationCodes.push("NO_HIGH_COHERENCE_ACTIONS");
  }

  const proposals: VariableBibleEnrichmentProposal[] = campaign.actions.map((a) => {
    const dominantPillar = (a.pillarServed[0] ?? "D").toUpperCase();
    const bibleScope =
      dominantPillar === "A"
        ? "BIBLE_A"
        : dominantPillar === "V"
          ? "BIBLE_V"
          : dominantPillar === "E"
            ? "BIBLE_E"
            : "BIBLE_D";

    return {
      summary: `Action "${a.name}" (${a.category}/${a.actionType}, mode ${a.manipulationModeApplied ?? "?"}) a performé bigIdeaCoherenceScore=${a.bigIdeaCoherenceScore?.toFixed(2)} sur AARRR ${a.aarrStage ?? "?"}. Capitaliser le pattern.`,
      bibleScope: bibleScope as VariableBibleEnrichmentProposal["bibleScope"],
      entry: {
        actionType: a.actionType,
        category: a.category,
        manipulationMode: a.manipulationModeApplied,
        aarrStage: a.aarrStage,
        coherenceScore: a.bigIdeaCoherenceScore,
        pillarServed: a.pillarServed,
      },
      confidence: typeof a.bigIdeaCoherenceScore === "number" ? a.bigIdeaCoherenceScore : 0.7,
      evidenceCampaignActionIds: [a.id],
    };
  });

  if (proposals.length === 0 && degradationCodes.length === 0) {
    degradationCodes.push("NO_PROPOSALS_GENERATED");
  }

  return {
    campaignId: campaign.id,
    proposals,
    degradationCodes,
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

  // MVP — invoque Glory tool `crew-performance-evaluator` par membre. Si erreur
  // LLM → retombe sur neutre 50 (fail-safe). PRODUCTION : grille canonique
  // ADR-0052-E-crew + calibration coefficients via variable-bible Imhotep.
  const { executeTool } = await import("@/server/services/artemis/tools/engine");

  const scores: CrewPerformanceScore[] = await Promise.all(
    campaign.teamMembers.map(async (tm) => {
      try {
        const { output } = await executeTool("crew-performance-evaluator", input.strategyId, {
          member_role: String(tm.role),
          member_actions_count: "0", // PRODUCTION : compter via CampaignAction.driverId / assignment
          campaign_outcome: "unknown",
          evidence_corpus: `userId=${tm.userId} role=${tm.role}`,
        });
        return parseCrewScoreOutput(tm.id, tm.userId, output);
      } catch {
        // Fail-safe neutre
        const byDimension = Object.fromEntries(
          CREW_DIMENSIONS_12.map((d) => [d, 50] as const),
        );
        return {
          campaignTeamMemberId: tm.id,
          userId: tm.userId,
          byDimension,
          composite: 50,
          tierRecommendation: "HOLD" as const,
          recommendedCourses: [] as readonly string[],
        };
      }
    }),
  );

  if (scores.every((s) => s.composite === 50)) {
    degradationCodes.push("LLM_FALLBACK_ALL_NEUTRAL");
  }

  return {
    campaignId: campaign.id,
    scores,
    degradationCodes,
  };
}

function parseCrewScoreOutput(
  campaignTeamMemberId: string,
  userId: string,
  output: Record<string, unknown>,
): CrewPerformanceScore {
  const byDimensionRaw = output.byDimension as Record<string, unknown> | undefined;
  const byDimension: Record<string, number> = {};
  for (const dim of CREW_DIMENSIONS_12) {
    const v = byDimensionRaw?.[dim];
    byDimension[dim] = typeof v === "number" ? Math.max(0, Math.min(100, v)) : 50;
  }
  const composite = typeof output.composite === "number"
    ? Math.max(0, Math.min(100, output.composite))
    : Object.values(byDimension).reduce((a, b) => a + b, 0) / CREW_DIMENSIONS_12.length;
  const tierRaw = String(output.tierRecommendation ?? "HOLD").toUpperCase();
  const tierRecommendation: CrewPerformanceScore["tierRecommendation"] =
    tierRaw === "PROMOTE" || tierRaw === "DEMOTE" ? tierRaw : "HOLD";
  const recommendedCourses = Array.isArray(output.recommendedCourses)
    ? output.recommendedCourses.filter((c): c is string => typeof c === "string")
    : [];
  return {
    campaignTeamMemberId,
    userId,
    byDimension,
    composite,
    tierRecommendation,
    recommendedCourses,
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
