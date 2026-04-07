/**
 * Talent Engine — Creator lifecycle management, skill assessment, growth tracking.
 * Enriches TalentProfile with ADVE competency mapping + performance analytics.
 */
import { db } from "@/lib/db";

export async function getCreatorProfile(userId: string) {
  return db.talentProfile.findUnique({
    where: { userId },
    include: { portfolioItems: { take: 10 }, user: { select: { name: true, email: true } } },
  });
}

export async function getPerformanceAnalytics(talentProfileId: string) {
  const profile = await db.talentProfile.findUniqueOrThrow({ where: { id: talentProfileId } });
  const missions = await db.mission.findMany({
    where: { assigneeId: profile.userId, status: "COMPLETED" },
    select: { id: true, advertis_vector: true },
    take: 50,
  });

  // ADVE strength mapping from completed missions
  const pillarStrengths: Record<string, number> = { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0 };
  for (const m of missions) {
    const vec = m.advertis_vector as Record<string, number> | null;
    if (!vec) continue;
    for (const k of Object.keys(pillarStrengths)) {
      pillarStrengths[k]! += vec[k] ?? 0;
    }
  }
  if (missions.length > 0) {
    for (const k of Object.keys(pillarStrengths)) {
      pillarStrengths[k] = Math.round((pillarStrengths[k]! / missions.length) * 100) / 100;
    }
  }

  return {
    totalMissions: profile.totalMissions,
    firstPassRate: profile.firstPassRate,
    avgScore: profile.avgScore,
    tier: profile.tier,
    pillarStrengths,
    missionCount: missions.length,
  };
}
