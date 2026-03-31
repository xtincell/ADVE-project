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
    if (creator.tier === "ASSOCIE") { score += 20; reasons.push("Tier Associé"); }
    else if (creator.tier === "MAITRE") { score += 15; reasons.push("Tier Maître"); }
    else if (creator.tier === "COMPAGNON") { score += 10; reasons.push("Tier Compagnon"); }

    // Channel specialty match
    const specialties = (creator.driverSpecialties as Array<{ channel: string; level: string }>) ?? [];
    const channelMatch = specialties.find((s) => s.channel === driverChannel);
    if (channelMatch) {
      score += channelMatch.level === "EXPERT" ? 20 : 10;
      reasons.push(`Spécialité ${driverChannel}`);
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
