/**
 * TALENT ENGINE — Chantier 6
 *
 * 3 composants :
 *   1. Vecteur ADVE vivant — recalculé automatiquement après chaque mission COMPLETED
 *   2. Matching amélioré — cosine similarity ADVE + spécialité + portfolio + first-pass
 *   3. Promotion auto — cron daily évalue et propose des promotions au Fixer
 */

import { db } from "@/lib/db";
import { PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";

// ── 1. Vecteur ADVE Vivant ────────────────────────────────────────────

/**
 * Recalculate a talent's ADVE vector from their completed missions.
 * Called automatically on mission completion.
 */
export async function recalculateTalentVector(userId: string): Promise<Record<string, number>> {
  const missions = await db.mission.findMany({
    where: { assigneeId: userId, status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      strategy: { select: { advertis_vector: true } },
      deliverables: {
        include: { qualityReviews: { select: { overallScore: true } } },
      },
    },
  });

  const weighted: Record<string, number> = {};
  for (const k of PILLAR_KEYS) weighted[k] = 0;
  let totalWeight = 0;

  for (const mission of missions) {
    const stratVec = (mission.strategy?.advertis_vector ?? null) as Record<string, number> | null;
    if (!stratVec) continue;

    const scores = mission.deliverables
      .flatMap(d => d.qualityReviews.map(r => r.overallScore))
      .filter((s): s is number => s !== null && s !== undefined);

    const avgQC = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
    const weight = avgQC / 10;

    for (const k of PILLAR_KEYS) {
      weighted[k] = (weighted[k] ?? 0) + (stratVec[k] ?? 0) * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    for (const k of PILLAR_KEYS) {
      weighted[k] = Math.round(((weighted[k] ?? 0) / totalWeight) * 100) / 100;
    }
  }

  const composite = PILLAR_KEYS.reduce((s, k) => s + (weighted[k] ?? 0), 0);
  const vector = { ...weighted, composite: Math.round(composite * 100) / 100, confidence: Math.min(0.95, missions.length / 20) };

  await db.talentProfile.updateMany({
    where: { userId },
    data: { advertis_vector: vector as never },
  });

  return vector;
}

// ── 2. Matching Amélioré ──────────────────────────────────────────────

interface MatchCandidate {
  userId: string;
  displayName: string;
  tier: string;
  matchScore: number;
  reasons: string[];
  confidence: number;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0, nA = 0, nB = 0;
  for (const k of PILLAR_KEYS) {
    const va = a[k] ?? 0, vb = b[k] ?? 0;
    dot += va * vb; nA += va * va; nB += vb * vb;
  }
  const mag = Math.sqrt(nA) * Math.sqrt(nB);
  return mag === 0 ? 0 : dot / mag;
}

/**
 * Multi-factor matching: ADVE similarity (40%) + specialty (20%) + first-pass (15%) + portfolio (15%) + availability (10%)
 */
export async function matchTalentsForMission(missionId: string, limit = 5): Promise<MatchCandidate[]> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: {
      strategy: { select: { advertis_vector: true } },
      driver: { select: { channel: true } },
    },
  });
  if (!mission) return [];

  const missionVec = (mission.strategy?.advertis_vector ?? {}) as Record<string, number>;
  const missionChannel = mission.driver?.channel;

  const talents = await db.talentProfile.findMany({
    where: { tier: { in: ["COMPAGNON", "MAITRE", "ASSOCIE"] } },
    include: { portfolioItems: { select: { pillarTags: true }, take: 10 } },
  });

  const activeCounts = await db.mission.groupBy({
    by: ["assigneeId"],
    where: { assigneeId: { in: talents.map(t => t.userId) }, status: { in: ["DRAFT", "IN_PROGRESS", "REVIEW"] } },
    _count: true,
  });
  const activeMap = new Map(activeCounts.map(m => [m.assigneeId, m._count]));

  const candidates: MatchCandidate[] = talents.map(talent => {
    let score = 0;
    const reasons: string[] = [];
    const talentVec = (talent.advertis_vector ?? {}) as Record<string, number>;

    // ADVE similarity (40%)
    const sim = cosineSimilarity(missionVec, talentVec);
    score += sim * 40;
    if (sim > 0.5) reasons.push(`ADVE ${Math.round(sim * 100)}%`);

    // Channel specialty (20%)
    const specs = (talent.driverSpecialties ?? []) as Array<Record<string, unknown>>;
    if (missionChannel && specs.some(s => s.channel === missionChannel || s.type === missionChannel)) {
      score += 20;
      reasons.push(`Spécialiste ${missionChannel}`);
    }

    // First-pass rate (15%)
    if (talent.firstPassRate !== null && talent.firstPassRate >= 80) { score += 15; reasons.push(`FP ${talent.firstPassRate}%`); }
    else if (talent.firstPassRate !== null && talent.firstPassRate >= 60) score += 8;

    // Portfolio (15%)
    const topPillar = PILLAR_KEYS.reduce((b, k) => (missionVec[k] ?? 0) > (missionVec[b] ?? 0) ? k : b, "a" as PillarKey);
    if (talent.portfolioItems.some(i => (((i.pillarTags ?? {}) as Record<string, number>)[topPillar] ?? 0) > 0.5)) {
      score += 15;
      reasons.push("Portfolio aligné");
    }

    // Availability (10%)
    const active = activeMap.get(talent.userId) ?? 0;
    const cap: Record<string, number> = { APPRENTI: 2, COMPAGNON: 3, MAITRE: 5, ASSOCIE: 8 };
    if (active < (cap[talent.tier] ?? 3)) { score += 10; reasons.push(`Dispo (${active}/${cap[talent.tier] ?? 3})`); }

    // Tier tiebreaker
    score += ({ APPRENTI: 0, COMPAGNON: 2, MAITRE: 4, ASSOCIE: 6 }[talent.tier] ?? 0);

    return { userId: talent.userId, displayName: talent.displayName ?? "", tier: talent.tier, matchScore: Math.round(score * 10) / 10, reasons, confidence: talent.totalMissions > 5 ? 0.8 : 0.5 };
  });

  return candidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}

// ── 3. Promotion Auto ─────────────────────────────────────────────────

export interface PromotionProposal {
  userId: string;
  displayName: string;
  currentTier: string;
  suggestedTier: string;
  recommendation: "PROMOTE" | "MAINTAIN" | "DEMOTE";
  criteria: Record<string, { required: number; actual: number; met: boolean }>;
  reason: string;
}

const PROMO_CRITERIA: Record<string, { missions: number; fp: number; reviews: number; collab?: number }> = {
  COMPAGNON: { missions: 10, fp: 70, reviews: 3 },
  MAITRE: { missions: 30, fp: 85, reviews: 15, collab: 5 },
  ASSOCIE: { missions: 60, fp: 90, reviews: 30, collab: 15 },
};
const TIER_ORDER = ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"];

export async function evaluateAllPromotions(): Promise<PromotionProposal[]> {
  const talents = await db.talentProfile.findMany();
  const proposals: PromotionProposal[] = [];

  for (const t of talents) {
    const idx = TIER_ORDER.indexOf(t.tier);
    if (idx < 0) continue;

    // Promotion check
    const next = TIER_ORDER[idx + 1];
    if (next && PROMO_CRITERIA[next]) {
      const c = PROMO_CRITERIA[next]!;
      const checks: Record<string, { required: number; actual: number; met: boolean }> = {
        missions: { required: c.missions, actual: t.totalMissions, met: t.totalMissions >= c.missions },
        firstPass: { required: c.fp, actual: t.firstPassRate ?? 0, met: (t.firstPassRate ?? 0) >= c.fp },
        reviews: { required: c.reviews, actual: t.peerReviews, met: t.peerReviews >= c.reviews },
      };
      if (c.collab) checks.collab = { required: c.collab, actual: t.collabMissions, met: t.collabMissions >= c.collab };

      if (Object.values(checks).every(x => x.met)) {
        proposals.push({ userId: t.userId, displayName: t.displayName ?? "", currentTier: t.tier, suggestedTier: next, recommendation: "PROMOTE", criteria: checks, reason: `Critères ${next} remplis` });
      }
    }

    // Demotion check
    if (t.totalMissions >= 5 && (t.firstPassRate ?? 100) < 50) {
      const prev = TIER_ORDER[Math.max(0, idx - 1)];
      if (prev && prev !== t.tier) {
        proposals.push({ userId: t.userId, displayName: t.displayName ?? "", currentTier: t.tier, suggestedTier: prev, recommendation: "DEMOTE", criteria: { firstPass: { required: 50, actual: t.firstPassRate ?? 0, met: false } }, reason: `FP ${t.firstPassRate}% < 50%` });
      }
    }
  }

  return proposals;
}
