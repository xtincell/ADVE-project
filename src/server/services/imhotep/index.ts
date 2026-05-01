/**
 * Imhotep — Crew Programs full activation handlers (Phase 14, ADR-0019).
 *
 * Imhotep orchestre les 5 services satellites Crew (matching-engine,
 * talent-engine, team-allocator, tier-evaluator, qc-router) sous gouvernance
 * unifiée Mestor → Imhotep → satellite.
 *
 * 6ème Neter actif. Cap APOGEE = 7 (Anubis 7ème via ADR-0020).
 *
 * Cf. PANTHEON.md §2.6, ADR-0010, ADR-0019.
 */

import { db } from "@/lib/db";
import {
  assertMissionReadyForCrew,
  assertTalentProfileExists,
  CrewBudgetExceededError,
} from "./governance";
import type {
  ImhotepAssembleCrewPayload,
  ImhotepAssembledCrew,
  ImhotepCertificationResult,
  ImhotepCertifyTalentPayload,
  ImhotepCrewProgramPlaceholder,
  ImhotepDraftCrewProgramPayload,
  ImhotepEnrollFormationPayload,
  ImhotepEnrollmentResult,
  ImhotepEvaluateTierPayload,
  ImhotepFormationRecommendation,
  ImhotepMatchTalentToMissionPayload,
  ImhotepMatchTalentToMissionResult,
  ImhotepQcDeliverablePayload,
  ImhotepQcResult,
  ImhotepRecommendFormationPayload,
  ImhotepTierEvaluation,
} from "./types";

export { manifest } from "./manifest";

// ─── Roles → satellite mapping ─────────────────────────────────────────────

/**
 * Default roles to fulfill for a crew if Mission.briefData doesn't specify.
 * Sector-aware via the future strategy enrichment ; for Phase 14 a stable
 * default that covers the typical creative mission.
 */
const DEFAULT_ROLES = ["concepteur-redacteur", "directeur-creation", "designer", "qc-reviewer"] as const;

// ─── 1. draftCrewProgram (Phase 13 compat + Phase 14 enrichment) ──────────

/**
 * Draft a crew program brief. Phase 14+ produces a real draft with sector-aware
 * role mapping ; Phase 13 stub behavior remains accessible via a degraded mode
 * if the strategy is missing (back-compat with Oracle dormant section).
 */
export async function draftCrewProgram(
  payload: ImhotepDraftCrewProgramPayload,
): Promise<ImhotepCrewProgramPlaceholder> {
  const strategy = await db.strategy.findUnique({
    where: { id: payload.strategyId },
    select: { id: true, name: true },
  });

  // Phase 14+ : real draft (status DRAFT)
  if (strategy) {
    const sector = payload.sector ?? "general";
    return {
      placeholder: `Crew program ${sector} — ${DEFAULT_ROLES.length} rôles requis pour la stratégie « ${strategy.name} ». ADRs: ADR-0010 + ADR-0019.`,
      status: "DRAFT",
      adrRefs: ["ADR-0010", "ADR-0019"],
      scaffoldedAt: new Date().toISOString(),
      rolesRequired: DEFAULT_ROLES,
      estimatedBudgetUsd: undefined, // Calculé via market-pricing dans assembleCrew
    };
  }

  // Phase 13 back-compat path (strategy absent → dormant placeholder)
  return {
    placeholder: payload.sector
      ? `Crew program ${payload.sector} — strategy non trouvée, placeholder dormant. Cf. ADR-0010 + ADR-0019.`
      : "Crew program — strategy non trouvée, placeholder dormant. Cf. ADR-0010 + ADR-0019.",
    status: "DORMANT_PRE_RESERVED",
    adrRefs: ["ADR-0010", "ADR-0019"],
    scaffoldedAt: new Date().toISOString(),
  };
}

// ─── 2. matchTalentToMission ──────────────────────────────────────────────

export async function matchTalentToMission(
  payload: ImhotepMatchTalentToMissionPayload,
): Promise<ImhotepMatchTalentToMissionResult> {
  await assertMissionReadyForCrew(payload.missionId);
  const minScore = payload.minMatchScore ?? 0.6;
  const limit = payload.limit ?? 5;

  const matching = await import("@/server/services/matching-engine");
  const candidates = await matching.suggest(payload.missionId);

  const filtered = candidates
    .filter((c) => c.matchScore >= minScore)
    .slice(0, limit);

  return {
    missionId: payload.missionId,
    candidates: filtered.map((c) => ({
      talentProfileId: c.talentProfileId,
      userId: c.userId,
      displayName: c.displayName,
      tier: c.tier,
      matchScore: c.matchScore,
      matchReasons: c.matchReasons,
    })),
    recommendedTalentProfileId: filtered[0]?.talentProfileId ?? null,
  };
}

// ─── 3. assembleCrew ───────────────────────────────────────────────────────

export async function assembleCrew(
  payload: ImhotepAssembleCrewPayload,
): Promise<ImhotepAssembledCrew> {
  await assertMissionReadyForCrew(payload.missionId);

  const teamAllocator = await import("@/server/services/team-allocator");
  const allocation = await teamAllocator.suggestAllocation(payload.missionId);

  const roles = payload.rolesRequired ?? DEFAULT_ROLES;
  // Mutable working arrays — narrowed back to readonly via the return value.
  const members: Array<{
    role: string;
    userId: string;
    displayName: string;
    tier: string;
    currentUtilization: number;
    matchScore: number;
  }> = [];
  const unfilled: Array<{ role: string; reason: string }> = [];

  let estimatedCostUsd = 0;

  for (const role of roles) {
    const candidate = allocation.suggestedCreators.find(
      (c) => c.matchScore > 0 && c.currentUtilization < 0.95,
    );
    if (!candidate) {
      unfilled.push({ role, reason: "no available creator with match" });
      continue;
    }
    members.push({
      role,
      userId: candidate.userId,
      displayName: candidate.displayName,
      tier: candidate.tier,
      currentUtilization: candidate.currentUtilization,
      matchScore: candidate.matchScore,
    });
    // Tier-based daily rate proxy ; market-pricing service will refine.
    const tierRate = candidate.tier === "MASTER" ? 800 : candidate.tier === "SENIOR" ? 500 : 250;
    estimatedCostUsd += tierRate;
  }

  if (payload.budgetCapUsd && estimatedCostUsd > payload.budgetCapUsd) {
    throw new CrewBudgetExceededError(
      payload.missionId,
      estimatedCostUsd,
      payload.budgetCapUsd,
    );
  }

  // Persist crew composition into Mission.briefData (no new model — anti-doublon NEFER).
  await db.mission.update({
    where: { id: payload.missionId },
    data: {
      briefData: {
        crew: members.map((m) => ({ role: m.role, userId: m.userId })),
        crewAssembledAt: new Date().toISOString(),
        crewEstimatedCostUsd: estimatedCostUsd,
      },
    },
  });

  return {
    missionId: payload.missionId,
    members,
    estimatedCostUsd,
    unfilled,
  };
}

// ─── 4. evaluateTier ───────────────────────────────────────────────────────

export async function evaluateTier(
  payload: ImhotepEvaluateTierPayload,
): Promise<ImhotepTierEvaluation> {
  await assertTalentProfileExists(payload.talentProfileId);

  const tierEvaluator = await import("@/server/services/tier-evaluator");
  const evalRes = await tierEvaluator.evaluateCreator(payload.talentProfileId);

  const action: ImhotepTierEvaluation["action"] =
    evalRes.recommendation === "PROMOTE"
      ? "PROMOTE"
      : evalRes.recommendation === "DEMOTE"
        ? "DEMOTE"
        : "HOLD";

  // Flatten criteria { required, actual, met } → Record<string, number> (actual values).
  const criteriaActual: Record<string, number> = {};
  let metCount = 0;
  let totalCount = 0;
  for (const [key, val] of Object.entries(evalRes.criteria)) {
    criteriaActual[key] = val.actual;
    if (val.met) metCount++;
    totalCount++;
  }

  return {
    talentProfileId: payload.talentProfileId,
    currentTier: String(evalRes.currentTier),
    recommendedTier: String(evalRes.suggestedTier),
    action,
    criteria: criteriaActual,
    rationale:
      action === "HOLD"
        ? `Maintien tier ${evalRes.currentTier} — ${metCount}/${totalCount} critères de promotion satisfaits.`
        : action === "PROMOTE"
          ? `Promotion ${evalRes.currentTier} → ${evalRes.suggestedTier} — ${metCount}/${totalCount} critères atteints.`
          : `Démotion ${evalRes.currentTier} → ${evalRes.suggestedTier} — performance insuffisante (${metCount}/${totalCount} critères).`,
  };
}

// ─── 5. enrollFormation ────────────────────────────────────────────────────

export async function enrollFormation(
  payload: ImhotepEnrollFormationPayload,
): Promise<ImhotepEnrollmentResult> {
  const existing = await db.enrollment.findFirst({
    where: { courseId: payload.courseId, userId: payload.userId },
  });

  if (existing) {
    return {
      enrollmentId: existing.id,
      status: "ALREADY_ENROLLED",
      startedAt: existing.createdAt.toISOString(),
    };
  }

  const enrollment = await db.enrollment.create({
    data: {
      courseId: payload.courseId,
      userId: payload.userId,
      status: "ENROLLED",
      progress: 0,
    },
  });

  return {
    enrollmentId: enrollment.id,
    status: "ENROLLED",
    startedAt: enrollment.createdAt.toISOString(),
  };
}

// ─── 6. certifyTalent ──────────────────────────────────────────────────────

export async function certifyTalent(
  payload: ImhotepCertifyTalentPayload,
): Promise<ImhotepCertificationResult> {
  await assertTalentProfileExists(payload.talentProfileId);

  const certification = await db.talentCertification.create({
    data: {
      talentProfileId: payload.talentProfileId,
      name: payload.certificationName,
      category: payload.category,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      // Cast required for Prisma Json input — Record<string, unknown> n'est pas
      // assignable directement à InputJsonValue (TS strict). Pattern utilisé
      // ailleurs dans le codebase (cf. ptah/governance.ts).
      metadata: (payload.metadata ?? {}) as never,
    },
  });

  return {
    certificationId: certification.id,
    talentProfileId: certification.talentProfileId,
    name: certification.name,
    issuedAt: certification.issuedAt.toISOString(),
  };
}

// ─── 7. qcDeliverable ──────────────────────────────────────────────────────

export async function qcDeliverable(
  payload: ImhotepQcDeliverablePayload,
): Promise<ImhotepQcResult> {
  const qcRouter = await import("@/server/services/qc-router");

  if (payload.reviewerId) {
    // Explicit assignment path.
    const assigned = await qcRouter.assignReviewer(payload.deliverableId, payload.reviewerId);
    return {
      deliverableId: payload.deliverableId,
      routedTo: "ASSIGNED",
      reviewId: assigned.reviewId,
    };
  }

  // Default routing path : qcRouter chooses reviewType (AUTOMATED | PEER | FIXER | CLIENT).
  const routed = await qcRouter.routeReview(payload.deliverableId);
  if (routed.reviewType === "AUTOMATED") {
    const auto = await qcRouter.automatedQc(payload.deliverableId);
    return {
      deliverableId: payload.deliverableId,
      routedTo: "AUTOMATED",
      reviewId: null,
      automatedScore: auto.score,
    };
  }

  // Manual review : actually create the review assignment via assignReviewer.
  if (routed.reviewerId) {
    const assigned = await qcRouter.assignReviewer(
      payload.deliverableId,
      routed.reviewerId,
      routed.reviewType,
    );
    return {
      deliverableId: payload.deliverableId,
      routedTo: routed.reviewType,
      reviewId: assigned.reviewId,
    };
  }

  // No reviewer available — escalate state, no review id yet.
  return {
    deliverableId: payload.deliverableId,
    routedTo: "ESCALATED",
    reviewId: null,
  };
}

// ─── 8. recommendFormation ─────────────────────────────────────────────────

export async function recommendFormation(
  payload: ImhotepRecommendFormationPayload,
): Promise<ImhotepFormationRecommendation> {
  const filter: { isPublished: boolean; pillarFocus?: { contains: string } } = {
    isPublished: true,
  };
  if (payload.skillGap) {
    filter.pillarFocus = { contains: payload.skillGap };
  }

  const courses = await db.course.findMany({
    where: filter,
    take: 3,
    orderBy: { order: "asc" },
  });

  return {
    userId: payload.userId,
    recommendedCourses: courses.map((c) => ({
      courseId: c.id,
      title: c.title,
      rationale: payload.skillGap
        ? `Cible le gap de compétence "${payload.skillGap}" via le pilier ${c.pillarFocus ?? "généraliste"}.`
        : `Recommandé par Imhotep dans la catégorie ${c.category}.`,
      estimatedDurationMin: c.duration ?? 60,
    })),
  };
}
