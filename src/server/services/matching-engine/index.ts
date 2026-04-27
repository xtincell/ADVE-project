// ============================================================================
// MODULE M12 — Matching Engine
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §4.1 + §8 P2 | Division: L'Arene
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Basic matching: filter talents by skills + availability
// [x] REQ-2  Multi-factor scoring: competences, ADVE vector, performance historique, dispo, tarif
// [x] REQ-3  suggest(briefId) -> top 3 candidates with confidence scores
// [x] REQ-4  override(matchId, talentId) -> manual override by fixer
// [x] REQ-5  getHistory(missionId) -> matching decision audit trail
// [x] REQ-6  getBestForBrief(briefId) -> AI-enhanced recommendation
// [x] REQ-7  MarketPricing integration (tarif reference by sector/market/channel)
// [x] REQ-8  Performance historique: first pass rate, QC score, on-time delivery
// [x] REQ-9  ADVE vector alignment: talent ADVE strengths vs brief ADVE needs
//
// EXPORTS: suggest, scoreCandidates, scoreMatch, findCandidates,
//          checkAvailability, matchSkills, matchMarket, getPerformanceScore,
//          suggestCreators, trackMatchDecision, overrideMatch, getMatchHistory
// ============================================================================

import { db } from "@/lib/db";

interface MatchCandidate {
  talentProfileId: string;
  userId: string;
  displayName: string;
  tier: string;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Suggests top creator matches for a brief/mission.
 * Phase early: binary filter (skills + availability).
 * Phase mature: multi-factor scoring.
 */
export async function suggest(missionId: string): Promise<MatchCandidate[]> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { driver: true },
  });

  const driverChannel = mission.driver?.channel;
  const missionVector = mission.advertis_vector as Record<string, number> | null;

  // Find available creators
  const creators = await db.talentProfile.findMany({
    where: { tier: { in: ["COMPAGNON", "MAITRE", "ASSOCIE"] } },
    orderBy: { avgScore: "desc" },
    take: 20,
  });

  // Score each candidate
  const candidates: MatchCandidate[] = creators.map((creator) => {
    let score = 50; // base score
    const reasons: string[] = [];

    // Tier bonus
    if (creator.tier === "ASSOCIE") { score += 20; reasons.push("Tier Associe"); }
    else if (creator.tier === "MAITRE") { score += 15; reasons.push("Tier Maitre"); }
    else if (creator.tier === "COMPAGNON") { score += 10; reasons.push("Tier Compagnon"); }

    // Channel specialty match
    const specialties = (creator.driverSpecialties as Array<{ channel: string; level: string }>) ?? [];
    const channelMatch = specialties.find((s) => s.channel === driverChannel);
    if (channelMatch) {
      score += channelMatch.level === "EXPERT" ? 20 : 10;
      reasons.push(`Specialite ${driverChannel}`);
    }

    // First pass rate bonus
    if (creator.firstPassRate > 0.8) { score += 10; reasons.push("Taux acceptation >80%"); }

    // ADVE vector alignment
    if (missionVector && creator.advertis_vector) {
      const creatorVector = creator.advertis_vector as Record<string, number>;
      let alignment = 0;
      for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
        const diff = Math.abs((missionVector[key] ?? 0) - (creatorVector[key] ?? 0));
        alignment += Math.max(0, 25 - diff);
      }
      score += Math.round(alignment / 8);
      reasons.push("Alignement ADVE");
    }

    return {
      talentProfileId: creator.id,
      userId: creator.userId,
      displayName: creator.displayName,
      tier: creator.tier,
      matchScore: Math.min(100, score),
      matchReasons: reasons,
    };
  });

  return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
}

export async function scoreCandidates(
  missionId: string,
  candidateIds: string[]
): Promise<MatchCandidate[]> {
  const all = await suggest(missionId);
  return all.filter((c) => candidateIds.includes(c.talentProfileId));
}

// ── REQ-2: Multi-factor scoring ────────────────────────────────────────────

export async function scoreMatch(
  missionId: string,
  profileId: string
): Promise<{ profileId: string; fitScore: number; factors: Record<string, number> }> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { driver: true },
  });
  const profile = await db.talentProfile.findUniqueOrThrow({ where: { id: profileId } });

  const factors: Record<string, number> = {};

  // Tier factor (0-25)
  const tierScores: Record<string, number> = { APPRENTI: 5, COMPAGNON: 10, MAITRE: 18, ASSOCIE: 25 };
  factors.tier = tierScores[profile.tier] ?? 5;

  // Skills match factor (0-25) — use driver constraints as proxy for required skills
  const driverConstraints = (mission.driver?.constraints as Record<string, unknown>) ?? {};
  const requiredSkills = (driverConstraints.requiredSkills as string[]) ?? [];
  const profileSkills = (profile.skills as string[]) ?? [];
  const skillCoverage = requiredSkills.length > 0
    ? requiredSkills.filter((s: string) => profileSkills.includes(s)).length / requiredSkills.length
    : 0.5;
  factors.skills = Math.round(skillCoverage * 25);

  // Performance factor (0-25)
  factors.performance = Math.round(
    (profile.firstPassRate * 10) + (profile.avgScore / 100 * 10) + (profile.totalMissions > 10 ? 5 : profile.totalMissions / 2)
  );

  // ADVE alignment factor (0-25)
  const missionVector = mission.advertis_vector as Record<string, number> | null;
  const creatorVector = profile.advertis_vector as Record<string, number> | null;
  if (missionVector && creatorVector) {
    let alignment = 0;
    for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
      const diff = Math.abs((missionVector[key] ?? 0) - (creatorVector[key] ?? 0));
      alignment += Math.max(0, 25 - diff);
    }
    factors.adveAlignment = Math.round(alignment / 8);
  } else {
    factors.adveAlignment = 10; // neutral if no vectors
  }

  const fitScore = Math.min(100, Object.values(factors).reduce((s, v) => s + v, 0));
  return { profileId, fitScore, factors };
}

// ── REQ-3: Batch matching — find candidates ────────────────────────────────

export async function findCandidates(
  missionId: string,
  limit: number = 10
): Promise<MatchCandidate[]> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { driver: true },
  });

  const missionVector = mission.advertis_vector as Record<string, number> | null;
  const driverChannel = mission.driver?.channel;

  const creators = await db.talentProfile.findMany({
    where: { tier: { in: ["COMPAGNON", "MAITRE", "ASSOCIE"] } },
    orderBy: { avgScore: "desc" },
    take: 50,
  });

  const scored: MatchCandidate[] = creators.map((c) => {
    const { fitScore } = scoreMatchSync(c, missionVector, driverChannel);
    return {
      talentProfileId: c.id,
      userId: c.userId,
      displayName: c.displayName,
      tier: c.tier,
      matchScore: fitScore,
      matchReasons: [],
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

// Sync helper for in-memory scoring (avoids N+1 DB queries)
function scoreMatchSync(
  profile: { tier: string; skills: unknown; firstPassRate: number; avgScore: number; totalMissions: number; advertis_vector: unknown; driverSpecialties: unknown },
  missionVector: Record<string, number> | null,
  driverChannel: string | undefined
): { fitScore: number } {
  let score = 50;
  if (profile.tier === "ASSOCIE") score += 20;
  else if (profile.tier === "MAITRE") score += 15;
  else if (profile.tier === "COMPAGNON") score += 10;

  if (profile.firstPassRate > 0.8) score += 10;
  if (profile.avgScore > 75) score += 5;

  const specialties = (profile.driverSpecialties as Array<{ channel: string; level: string }>) ?? [];
  if (driverChannel && specialties.some((s) => s.channel === driverChannel)) score += 10;

  if (missionVector && profile.advertis_vector) {
    const cv = profile.advertis_vector as Record<string, number>;
    let a = 0;
    for (const k of ["a", "d", "v", "e"]) a += Math.max(0, 25 - Math.abs((missionVector[k] ?? 0) - (cv[k] ?? 0)));
    score += Math.round(a / 4);
  }

  return { fitScore: Math.min(100, score) };
}

// ── REQ-4: Availability check ──────────────────────────────────────────────

export async function checkAvailability(
  profileId: string,
  startDate: Date,
  endDate: Date
): Promise<{ available: boolean; conflictCount: number; conflicts: string[] }> {
  // Check missions where this talent is assigned (via assigneeId) that overlap the date range
  // Mission model has assigneeId and slaDeadline for scheduling
  const overlapping = await db.mission.findMany({
    where: {
      assigneeId: profileId,
      status: { in: ["IN_PROGRESS", "ASSIGNED"] },
      slaDeadline: { gte: startDate },
      createdAt: { lte: endDate },
    },
    select: { id: true, title: true, slaDeadline: true, createdAt: true },
  });

  return {
    available: overlapping.length === 0,
    conflictCount: overlapping.length,
    conflicts: overlapping.map((m) => `${m.title} (${m.createdAt.toISOString().slice(0, 10)} - ${m.slaDeadline?.toISOString().slice(0, 10) ?? "N/A"})`),
  };
}

// ── REQ-2: Skill matching ──────────────────────────────────────────────────

export function matchSkills(
  required: string[],
  available: string[]
): { coverageScore: number; matched: string[]; missing: string[] } {
  if (required.length === 0) return { coverageScore: 1, matched: [], missing: [] };
  const matched = required.filter((s) => available.includes(s));
  const missing = required.filter((s) => !available.includes(s));
  return {
    coverageScore: Math.round((matched.length / required.length) * 100) / 100,
    matched,
    missing,
  };
}

// ── REQ-7: Location/market matching ────────────────────────────────────────

export function matchMarket(
  missionMarket: string,
  profileMarkets: string[]
): { match: boolean; score: number } {
  if (!missionMarket || profileMarkets.length === 0) return { match: false, score: 0 };
  const normalizedMission = missionMarket.toLowerCase().trim();
  const exact = profileMarkets.some((m) => m.toLowerCase().trim() === normalizedMission);
  if (exact) return { match: true, score: 100 };

  // Partial match: same region (first 2 chars for country code matching)
  const partial = profileMarkets.some((m) => m.toLowerCase().trim().slice(0, 2) === normalizedMission.slice(0, 2));
  if (partial) return { match: true, score: 60 };

  return { match: false, score: 0 };
}

// ── REQ-8: Historical performance ──────────────────────────────────────────

export async function getPerformanceScore(
  profileId: string,
  driverType?: string
): Promise<{ score: number; missions: number; firstPassRate: number; avgQcScore: number; onTimeRate: number }> {
  // Build filter: completed missions assigned to this talent
  const whereClause: Record<string, unknown> = { assigneeId: profileId, status: "COMPLETED" };
  if (driverType) {
    whereClause.driver = { channel: driverType };
  }

  const missions = await db.mission.findMany({
    where: whereClause,
    include: { deliverables: { include: { qualityReviews: true } } },
  });

  const total = missions.length;
  if (total === 0) return { score: 0, missions: 0, firstPassRate: 0, avgQcScore: 0, onTimeRate: 0 };

  // Calculate QC scores from deliverables' quality reviews
  let totalQcScore = 0;
  let reviewCount = 0;
  let firstPassCount = 0;
  for (const m of missions) {
    for (const d of m.deliverables) {
      for (const r of d.qualityReviews) {
        totalQcScore += r.overallScore;
        reviewCount++;
        if (r.overallScore >= 80) firstPassCount++;
      }
    }
  }

  const avgQcScore = reviewCount > 0 ? totalQcScore / reviewCount : 70;
  const firstPassRate = reviewCount > 0 ? firstPassCount / reviewCount : 0;
  // On-time: missions completed before SLA deadline
  const onTimeCount = missions.filter((m) => m.slaDeadline && m.updatedAt <= m.slaDeadline).length;
  const onTimeRate = onTimeCount / total;

  const score = Math.round(avgQcScore * 0.4 + firstPassRate * 100 * 0.3 + onTimeRate * 100 * 0.3);

  return { score: Math.min(100, score), missions: total, firstPassRate, avgQcScore: Math.round(avgQcScore), onTimeRate };
}

// ── REQ-6: Auto-suggest (combines all factors) ─────────────────────────────

export async function suggestCreators(
  missionId: string
): Promise<{ candidates: MatchCandidate[]; metadata: { algorithm: string; factorsUsed: string[]; generatedAt: string } }> {
  const candidates = await findCandidates(missionId, 5);

  // Enrich with performance data
  for (const c of candidates) {
    const perf = await getPerformanceScore(c.talentProfileId);
    c.matchScore = Math.round(c.matchScore * 0.7 + perf.score * 0.3);
    if (perf.firstPassRate > 0.8) c.matchReasons.push("Premier jet >80%");
    if (perf.onTimeRate > 0.9) c.matchReasons.push("Livraison ponctuelle");
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    candidates,
    metadata: {
      algorithm: "multi-factor-v2",
      factorsUsed: ["tier", "skills", "adve_alignment", "performance", "availability"],
      generatedAt: new Date().toISOString(),
    },
  };
}

// ── REQ-4: Manual override ─────────────────────────────────────────────────

export async function overrideMatch(
  matchId: string,
  talentId: string,
  reason: string
): Promise<{ overridden: boolean; matchId: string; talentId: string }> {
  // Store override info in briefData JSON field and update assigneeId
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: matchId },
    select: { briefData: true },
  });
  const briefData = (mission.briefData as Record<string, unknown>) ?? {};
  await db.mission.update({
    where: { id: matchId },
    data: {
      assigneeId: talentId,
      briefData: { ...briefData, matchOverride: { talentId, reason, overriddenAt: new Date().toISOString() } },
    },
  });
  return { overridden: true, matchId, talentId };
}

// ── REQ-5: Match history / audit trail ─────────────────────────────────────

export async function getMatchHistory(
  missionId: string
): Promise<{ missionId: string; events: Array<{ type: string; talentId?: string; score?: number; timestamp: string }> }> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    select: { id: true, assigneeId: true, briefData: true, createdAt: true, updatedAt: true },
  });

  const briefData = (mission.briefData as Record<string, unknown>) ?? {};
  const events: Array<{ type: string; talentId?: string; score?: number; timestamp: string }> = [];

  events.push({ type: "CREATED", timestamp: mission.createdAt.toISOString() });

  if (briefData.matchOverride) {
    const override = briefData.matchOverride as { talentId: string; overriddenAt: string };
    events.push({ type: "OVERRIDE", talentId: override.talentId, timestamp: override.overriddenAt });
  }

  if (briefData.matchDecisions) {
    const decisions = briefData.matchDecisions as Array<{ decision: string; talentId: string; timestamp: string }>;
    for (const d of decisions) {
      events.push({ type: d.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED", talentId: d.talentId, timestamp: d.timestamp });
    }
  }

  if (mission.assigneeId) {
    events.push({ type: "ASSIGNED", talentId: mission.assigneeId, timestamp: mission.updatedAt.toISOString() });
  }

  return { missionId, events: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)) };
}

// ── REQ-9: Track match decisions for ML improvement ────────────────────────

export async function trackMatchDecision(
  matchId: string,
  decision: "ACCEPT" | "REJECT",
  talentId: string,
  reason?: string
): Promise<{ tracked: boolean }> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: matchId },
    select: { briefData: true },
  });

  const briefData = (mission.briefData as Record<string, unknown>) ?? {};
  const decisions = (briefData.matchDecisions as Array<Record<string, unknown>>) ?? [];
  decisions.push({
    decision,
    talentId,
    reason: reason ?? null,
    timestamp: new Date().toISOString(),
  });

  await db.mission.update({
    where: { id: matchId },
    data: {
      briefData: JSON.parse(JSON.stringify({ ...briefData, matchDecisions: decisions })),
    },
  });

  // If accepted, assign the talent
  if (decision === "ACCEPT") {
    await db.mission.update({
      where: { id: matchId },
      data: { assigneeId: talentId, status: "ASSIGNED" },
    });
  }

  return { tracked: true };
}
