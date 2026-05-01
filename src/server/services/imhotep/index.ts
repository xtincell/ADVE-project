/**
 * Imhotep — public API + handlers.
 *
 * 6ème Neter actif. Crew Programs governance : matching basé sur
 * devotion-potential (cf. ADR-0010 §3, gouvernance.ts).
 *
 * Architecture : Imhotep est un *thin orchestrator* qui :
 *  1. Délègue le calcul brut aux L3 services (talent-engine, matching-engine,
 *     qc-router, tier-evaluator)
 *  2. Pondère les résultats avec la téléologie devotion-potential
 *  3. Retourne le verdict gouverné
 *
 * Pas de duplication des algos L3 — Imhotep joue la fonction Mestor restreinte
 * au domaine Crew (cf. PANTHEON.md §2.6).
 */

import { db } from "@/lib/db";
import * as matchingEngine from "@/server/services/matching-engine";
import * as tierEvaluator from "@/server/services/tier-evaluator";
import * as qcRouter from "@/server/services/qc-router";
import * as teamAllocator from "@/server/services/team-allocator";
import { callLLMAndParse } from "@/server/services/llm-gateway";
import { computeCohortLift } from "./cohort";
import {
  buildMatchReasons,
  CrewMissingError,
  getDevotionInSector,
  hasManipulationFit,
  rerankByDevotionPotential,
  resolveStrategySector,
  TalentNotFoundError,
  weightDevotionPotential,
} from "./governance";
import type {
  ComposeTeamInput,
  ComposeTeamResult,
  EvaluateTierInput,
  EvaluateTierResult,
  MatchCandidate,
  MatchCreatorInput,
  MatchCreatorResult,
  RecommendTrainingInput,
  RecommendTrainingResult,
  RouteQcInput,
  RouteQcResult,
  TeamSlot,
  TrainingRecommendation,
} from "./types";
import type { ManipulationMode } from "@/server/services/ptah/types";

export { manifest } from "./manifest";

// ============================================================
// 1) MATCH CREATOR — devotion-potential matching for one mission
// ============================================================
export async function matchCreator(
  input: MatchCreatorInput,
): Promise<MatchCreatorResult> {
  const mission = await db.mission.findUnique({
    where: { id: input.missionId },
    select: {
      id: true,
      strategyId: true,
      briefData: true,
      title: true,
    },
  });
  if (!mission) throw new CrewMissingError(input.missionId);

  const sector = await resolveStrategySector(mission.strategyId);
  const briefData = (mission.briefData ?? {}) as {
    bucket?: string;
    requiredManipulation?: ManipulationMode[];
    sector?: string;
  };
  const requiredMode: ManipulationMode | null =
    briefData.requiredManipulation?.[0] ?? null;
  const effectiveSector = briefData.sector ?? sector;

  // 1. Délègue le scoring brut à matching-engine
  const rawCandidates = await matchingEngine.suggest(input.missionId);

  // 2. Hydrate avec driverSpecialties pour téléologie
  const profileIds = rawCandidates.map((c) => c.talentProfileId);
  const profiles = await db.talentProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, driverSpecialties: true },
  });
  type ProfileRow = { id: string; driverSpecialties: unknown };
  const profileMap = new Map<string, ProfileRow>(
    profiles.map((p: ProfileRow) => [p.id, p]),
  );

  // 3. Pondère + re-rank
  const weighted: MatchCandidate[] = rawCandidates.map((c) => {
    const profile = profileMap.get(c.talentProfileId);
    const devotion = getDevotionInSector(profile?.driverSpecialties, effectiveSector);
    const fit = requiredMode
      ? hasManipulationFit(profile?.driverSpecialties, requiredMode)
      : false;
    const finalScore = weightDevotionPotential(c.matchScore, devotion, fit);
    const reasons = buildMatchReasons(c.matchReasons, devotion, fit, requiredMode);
    return {
      talentProfileId: c.talentProfileId,
      userId: c.userId,
      displayName: c.displayName,
      tier: c.tier,
      matchScore: finalScore,
      devotionInSector: devotion,
      manipulationFit: fit,
      reasons,
    };
  });

  const ranked = rerankByDevotionPotential(weighted).slice(0, input.topN ?? 5);

  return {
    missionId: input.missionId,
    candidates: ranked,
    rationale: requiredMode
      ? `Matching pondéré devotion-footprint (sector=${effectiveSector}) + manipulation fit (${requiredMode}). Top ${ranked.length}/${rawCandidates.length}.`
      : `Matching pondéré devotion-footprint (sector=${effectiveSector}). Top ${ranked.length}/${rawCandidates.length}. ⚠ Aucun manipulation mode requis dans brief.`,
  };
}

// ============================================================
// 2) COMPOSE TEAM — multi-bucket × manipulation modes
// ============================================================
export async function composeTeam(
  input: ComposeTeamInput,
): Promise<ComposeTeamResult> {
  const composition: TeamSlot[] = [];
  const warnings: string[] = [];

  // Resolve sector either from campaign or mission
  let sector = "UNKNOWN";
  if (input.missionId) {
    const m = await db.mission.findUnique({
      where: { id: input.missionId },
      select: { strategyId: true },
    });
    if (m?.strategyId) sector = await resolveStrategySector(m.strategyId);
  } else if (input.campaignId) {
    const c = await db.campaign.findUnique({
      where: { id: input.campaignId },
      select: { strategyId: true },
    });
    if (c?.strategyId) sector = await resolveStrategySector(c.strategyId);
  }

  // If a missionId is provided, ask team-allocator for the global capacity
  // picture first — Imhotep then narrows down per-bucket. The allocator
  // returns creators sorted by availability + match score (skill+ADVE),
  // we re-rerank with devotion-potential téléologie.
  type AllocatorCandidate = {
    userId: string;
    displayName: string;
    tier: string;
    matchScore: number;
    currentUtilization: number;
    reason: string;
  };
  let allocatorCandidates: AllocatorCandidate[] = [];
  if (input.missionId) {
    try {
      const sugg = await teamAllocator.suggestAllocation(input.missionId);
      allocatorCandidates = sugg.suggestedCreators.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        tier: c.tier,
        matchScore: c.matchScore,
        currentUtilization: c.currentUtilization,
        reason: c.reason,
      }));
    } catch {
      // Allocator failure (mission missing, DB error) — falls back to
      // per-bucket findMany below. Imhotep stays operational.
    }
  }

  for (let i = 0; i < input.buckets.length; i++) {
    const bucket = input.buckets[i]!;
    const mode = input.manipulationModes[
      i % input.manipulationModes.length
    ] as ManipulationMode;

    // Prefer allocator-pruned set if available (filters by bucket via bio
    // match) — fallback to direct findMany.
    let profiles: Array<{
      id: string;
      userId: string;
      displayName: string;
      tier: string;
      avgScore: number;
      firstPassRate: number;
      driverSpecialties: unknown;
    }> = [];
    if (allocatorCandidates.length > 0) {
      const userIds = allocatorCandidates.map((c) => c.userId);
      profiles = await db.talentProfile.findMany({
        where: {
          userId: { in: userIds },
          bio: { contains: bucket, mode: "insensitive" },
          tier: { in: ["MAITRE", "COMPAGNON"] },
        },
        orderBy: { avgScore: "desc" },
        take: 5,
        select: {
          id: true,
          userId: true,
          displayName: true,
          tier: true,
          avgScore: true,
          firstPassRate: true,
          driverSpecialties: true,
        },
      });
    }
    if (profiles.length === 0) {
      // Fallback: direct DB search, no allocator filtering
      profiles = await db.talentProfile.findMany({
        where: {
          bio: { contains: bucket, mode: "insensitive" },
          tier: { in: ["MAITRE", "COMPAGNON"] },
        },
        orderBy: { avgScore: "desc" },
        take: 5,
        select: {
          id: true,
          userId: true,
          displayName: true,
          tier: true,
          avgScore: true,
          firstPassRate: true,
          driverSpecialties: true,
        },
      });
    }
    if (profiles.length === 0) {
      warnings.push(`No candidate found for bucket=${bucket} mode=${mode}`);
      continue;
    }
    type ProfileShape = {
      id: string;
      userId: string;
      displayName: string;
      tier: string;
      avgScore: number;
      firstPassRate: number;
      driverSpecialties: unknown;
    };
    const candidates: MatchCandidate[] = profiles.map((p: ProfileShape) => {
      const devotion = getDevotionInSector(p.driverSpecialties, sector);
      const fit = hasManipulationFit(p.driverSpecialties, mode);
      const baseScore = 50
        + (p.tier === "MAITRE" ? 20 : 10)
        + Math.round(p.firstPassRate * 15);
      const finalScore = weightDevotionPotential(baseScore, devotion, fit);
      return {
        talentProfileId: p.id,
        userId: p.userId,
        displayName: p.displayName,
        tier: p.tier,
        matchScore: finalScore,
        devotionInSector: devotion,
        manipulationFit: fit,
        reasons: buildMatchReasons([`tier=${p.tier}`, `bucket=${bucket}`], devotion, fit, mode),
      };
    });
    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const winner = candidates[0]!;
    composition.push({
      bucket,
      manipulationMode: mode,
      candidate: winner,
    });
  }

  const cohesionScore = composition.length > 0
    ? Math.round(
        composition.reduce((s, c) => s + c.candidate.matchScore, 0) / composition.length,
      )
    : 0;

  return { composition, cohesionScore, warnings };
}

// ============================================================
// 3) EVALUATE TIER — tier promotion recommendation
// ============================================================
export async function evaluateTier(
  input: EvaluateTierInput,
): Promise<EvaluateTierResult> {
  const profile = await db.talentProfile.findUnique({
    where: { id: input.talentProfileId },
    select: {
      id: true,
      tier: true,
      avgScore: true,
      firstPassRate: true,
      totalMissions: true,
    },
  });
  if (!profile) throw new TalentNotFoundError(input.talentProfileId);

  // Délègue à tier-evaluator. Le résultat (PROMOTE/MAINTAIN/DEMOTE +
  // suggestedTier + criteria) est traduit vers la signature Imhotep
  // (recommendedTier + reasons texte synthétiques).
  let recommended = profile.tier;
  const reasons: string[] = [];
  try {
    const result = await tierEvaluator.evaluateCreator(input.talentProfileId);
    if (result?.recommendation === "PROMOTE" && result.suggestedTier) {
      recommended = result.suggestedTier;
    } else if (result?.recommendation === "DEMOTE" && result.suggestedTier) {
      recommended = result.suggestedTier;
    }
    if (result?.criteria) {
      for (const [name, c] of Object.entries(result.criteria)) {
        reasons.push(
          `${name}: required=${c.required} actual=${c.actual} met=${c.met ? "yes" : "no"}`,
        );
      }
    }
  } catch {
    // Heuristique de fallback (tier-evaluator unavailable)
    if (
      profile.tier === "APPRENTI" &&
      profile.totalMissions >= 8 &&
      profile.avgScore >= 7.5 &&
      profile.firstPassRate >= 0.7
    ) {
      recommended = "COMPAGNON";
      reasons.push("8+ missions completed, avg ≥ 7.5, first-pass ≥ 70%");
    } else if (
      profile.tier === "COMPAGNON" &&
      profile.totalMissions >= 25 &&
      profile.avgScore >= 8.5 &&
      profile.firstPassRate >= 0.85
    ) {
      recommended = "MAITRE";
      reasons.push("25+ missions completed, avg ≥ 8.5, first-pass ≥ 85%");
    } else {
      reasons.push("Thresholds not met for promotion (fallback heuristic)");
    }
  }

  return {
    talentProfileId: profile.id,
    currentTier: profile.tier,
    recommendedTier: recommended,
    promote: recommended !== profile.tier,
    reasons,
    metrics: {
      avgScore: profile.avgScore,
      firstPassRate: profile.firstPassRate,
      totalMissions: profile.totalMissions,
    },
  };
}

// ============================================================
// 4) ROUTE QC — assign reviewer to a deliverable
// ============================================================
export async function routeQc(input: RouteQcInput): Promise<RouteQcResult> {
  // Délègue à qc-router pour le picking algorithmique. Le qc-router
  // retourne reviewerId potentiellement null (aucun candidat trouvé) et
  // un reviewType plus large (AUTOMATED). Imhotep refuse les verdicts
  // sans reviewer humain et restreint au triplet PEER/FIXER/CLIENT
  // (l'AUTOMATED est dispatché à part).
  const assigned = await qcRouter.routeReview(input.deliverableId);
  if (!assigned.reviewerId) {
    throw new Error(
      `qc-router could not assign a reviewer for deliverable ${input.deliverableId}: ${assigned.reason}`,
    );
  }
  if (assigned.reviewType === "AUTOMATED") {
    throw new Error(
      `qc-router returned AUTOMATED for deliverable ${input.deliverableId}; Imhotep handles human reviews only`,
    );
  }
  // If preferredType is given and disagrees with router, log it but
  // honour the router (operator override channel is Mestor.emitIntent).
  const preferred = input.preferredType;
  const rationale = preferred && preferred !== assigned.reviewType
    ? `Routed to ${assigned.reviewType} despite preferredType=${preferred} — router policy: ${assigned.reason}`
    : assigned.reason;
  return {
    deliverableId: input.deliverableId,
    reviewerId: assigned.reviewerId,
    reviewType: assigned.reviewType,
    rationale,
  };
}

// ============================================================
// 5) RECOMMEND TRAINING — Académie suggestions based on review gaps
// ============================================================
export async function recommendTraining(
  input: RecommendTrainingInput,
): Promise<RecommendTrainingResult> {
  const profile = await db.talentProfile.findUnique({
    where: { id: input.talentProfileId },
    select: {
      id: true,
      bio: true,
      driverSpecialties: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { overallScore: true, improvements: true },
      },
    },
  });
  if (!profile) throw new TalentNotFoundError(input.talentProfileId);

  // Extract weakness from latest reviews (improvements field is Json[])
  type ReviewRow = { overallScore: number | null; improvements: unknown };
  const improvements: string[] = (profile.reviews as ReviewRow[])
    .flatMap((r: ReviewRow) => {
      const v = r.improvements;
      if (Array.isArray(v)) return v as string[];
      return [];
    })
    .map((s: string) => s.toLowerCase());

  // Derive specialty for course filtering
  const ds = profile.driverSpecialties as { specialty?: string } | null;
  const specialty = ds?.specialty ?? null;

  // Map specialty → category fit
  const categoryFit: Record<string, string[]> = {
    "creative-direction": ["CREATIVE", "DESIGN"],
    "copywriting":        ["CREATIVE", "MARKETING"],
    "photography":        ["CREATIVE"],
    "video":              ["CREATIVE"],
    "community":          ["MARKETING", "STRATEGY"],
    "mobile-ios":         ["TECH"],
    "mobile-android":     ["TECH"],
    "web-fullstack":      ["TECH", "DESIGN"],
    "ux-ui":              ["DESIGN"],
    "strategy":           ["STRATEGY"],
    "production":         ["CREATIVE"],
    "editorial":          ["CREATIVE", "MARKETING"],
    "animation":          ["CREATIVE"],
    "sound":              ["CREATIVE"],
    "data":               ["STRATEGY"],
  };
  const categories = specialty && categoryFit[specialty]
    ? categoryFit[specialty]
    : ["CREATIVE", "STRATEGY"];

  const courses = await db.course.findMany({
    where: {
      isPublished: true,
      category: { in: categories },
    },
    take: 10,
    select: { id: true, title: true, pillarFocus: true, level: true, description: true },
  });

  type CourseRow = {
    id: string;
    title: string;
    pillarFocus: string | null;
    level: string;
    description: string | null;
  };

  // Phase A — heuristique pure + cohort lift (tier-1)
  const cohortLift = await computeCohortLift(input.talentProfileId);
  const heuristicRecos: TrainingRecommendation[] = courses
    .slice(0, 3)
    .map((c: CourseRow) => {
      const matchHit = improvements.some((imp: string) =>
        (c.description?.toLowerCase().includes(imp.split(" ")[0] ?? "") ?? false) ||
        c.title.toLowerCase().includes(imp.split(" ")[0] ?? "")
      );
      const cohort = cohortLift.get(c.id);
      // Cohort signal boost : up to +0.3 si peer-validated
      const cohortBoost = cohort ? Math.round(cohort.cohortLiftSignal * 30) / 100 : 0;
      const baseLift = matchHit ? 0.6 : 0.3;
      const finalLift = Math.min(1, baseLift + cohortBoost);
      const cohortNote = cohort && cohort.enrollments >= 3
        ? ` Validé par ${cohort.enrollments} pairs (signal=${cohort.cohortLiftSignal.toFixed(2)}).`
        : "";
      return {
        courseId: c.id,
        courseTitle: c.title,
        pillarFocus: c.pillarFocus,
        reason: matchHit
          ? `Adresse une gap identifiée dans review récente (${improvements[0]?.slice(0, 40) ?? "n/a"}).${cohortNote}`
          : `Cours ${c.level} aligné spécialité ${specialty ?? "générique"}.${cohortNote}`,
        expectedScoreLift: finalLift,
      };
    });

  // Phase B — fallback LLM si heuristic confidence faible (Q5B hybrid)
  // Confidence = ratio de recos avec matchHit. Si < 50% → LLM call pour
  // ranking + reason texte plus fin. Skip si pas d'improvements.
  const matchHitCount = heuristicRecos.filter((r) => r.expectedScoreLift >= 0.6).length;
  const confidence = heuristicRecos.length > 0 ? matchHitCount / heuristicRecos.length : 0;
  const NEEDS_LLM = confidence < 0.5 && improvements.length > 0 && courses.length > 0;

  let recommendations = heuristicRecos;
  if (NEEDS_LLM) {
    try {
      const courseList = (courses as CourseRow[]).map((c) => ({
        id: c.id,
        title: c.title,
        level: c.level,
        pillarFocus: c.pillarFocus,
        description: (c.description ?? "").slice(0, 200),
      }));
      const llmJson = await callLLMAndParse({
        system:
          "You are Imhotep, master of crew programs at La Fusée. Given a creator's review weaknesses (improvements) and a list of available Académie courses, return the 3 best-fit courses ranked by expected score lift. Score lift is between 0.1 and 1.0 (higher = stronger improvement signal).",
        prompt: `Creator specialty: ${specialty ?? "(unknown)"}. Recent review weaknesses (latest first): ${JSON.stringify(improvements)}. Available courses: ${JSON.stringify(courseList)}. Return strict JSON: { "recommendations": [{ "courseId": string, "expectedScoreLift": number, "reason": string }] } with exactly 3 entries, all courseId from the list.`,
        caller: "imhotep:recommendTraining",
        purpose: "agent",
        maxTokens: 800,
      });
      const arr = (llmJson as { recommendations?: Array<{ courseId: string; expectedScoreLift: number; reason: string }> }).recommendations;
      if (Array.isArray(arr) && arr.length >= 1) {
        const courseMap = new Map<string, CourseRow>(
          (courses as CourseRow[]).map((c: CourseRow) => [c.id, c]),
        );
        const llmRecos: TrainingRecommendation[] = arr
          .filter((r) => courseMap.has(r.courseId))
          .slice(0, 3)
          .map((r) => {
            const c = courseMap.get(r.courseId)!;
            return {
              courseId: c.id,
              courseTitle: c.title,
              pillarFocus: c.pillarFocus,
              reason: typeof r.reason === "string" ? r.reason.slice(0, 200) : "LLM-ranked match",
              expectedScoreLift: Math.max(0.1, Math.min(1, Number(r.expectedScoreLift) || 0.4)),
            };
          });
        if (llmRecos.length > 0) recommendations = llmRecos;
      }
    } catch {
      // LLM down or invalid JSON — keep heuristic recos
    }
  }

  return {
    talentProfileId: profile.id,
    recommendations,
  };
}
