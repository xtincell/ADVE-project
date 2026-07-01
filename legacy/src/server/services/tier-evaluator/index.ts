import { db } from "@/lib/db";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

interface TierEvaluation {
  talentProfileId: string;
  currentTier: GuildTier;
  recommendation: "PROMOTE" | "MAINTAIN" | "DEMOTE";
  suggestedTier: GuildTier;
  criteria: Record<string, { required: number; actual: number; met: boolean }>;
}

const PROMOTION_CRITERIA: Record<GuildTier, Record<string, number>> = {
  APPRENTI: {}, // Entry level
  COMPAGNON: { totalMissions: 10, firstPassRate: 0.7, peerReviews: 3 },
  MAITRE: { totalMissions: 30, firstPassRate: 0.85, peerReviews: 15, collabMissions: 5 },
  ASSOCIE: { totalMissions: 60, firstPassRate: 0.9, peerReviews: 30, collabMissions: 15 },
};

const TIER_UP: Record<GuildTier, GuildTier> = {
  APPRENTI: "COMPAGNON",
  COMPAGNON: "MAITRE",
  MAITRE: "ASSOCIE",
  ASSOCIE: "ASSOCIE",
};

const TIER_DOWN: Record<GuildTier, GuildTier> = {
  APPRENTI: "APPRENTI",
  COMPAGNON: "APPRENTI",
  MAITRE: "COMPAGNON",
  ASSOCIE: "MAITRE",
};

export async function evaluateCreator(talentProfileId: string): Promise<TierEvaluation> {
  const profile = await db.talentProfile.findUniqueOrThrow({
    where: { id: talentProfileId },
  });

  const currentTier = profile.tier as GuildTier;
  const nextTier = TIER_UP[currentTier];
  const promotionReqs = PROMOTION_CRITERIA[nextTier];

  const criteria: Record<string, { required: number; actual: number; met: boolean }> = {};
  let allMet = true;

  const profileMetrics: Record<string, number> = {
    totalMissions: profile.totalMissions ?? 0,
    firstPassRate: profile.firstPassRate ?? 0,
    peerReviews: profile.peerReviews ?? 0,
    collabMissions: profile.collabMissions ?? 0,
  };

  for (const [key, required] of Object.entries(promotionReqs)) {
    const actual = profileMetrics[key] ?? 0;
    const met = actual >= required;
    criteria[key] = { required, actual, met };
    if (!met) allMet = false;
  }

  // Check for demotion (first pass rate drops significantly)
  const shouldDemote = currentTier !== "APPRENTI" && profile.firstPassRate < 0.5 && profile.totalMissions > 5;

  let recommendation: "PROMOTE" | "MAINTAIN" | "DEMOTE" = "MAINTAIN";
  let suggestedTier = currentTier;

  if (shouldDemote) {
    recommendation = "DEMOTE";
    suggestedTier = TIER_DOWN[currentTier];
  } else if (allMet && nextTier !== currentTier) {
    recommendation = "PROMOTE";
    suggestedTier = nextTier;
  }

  return { talentProfileId, currentTier, recommendation, suggestedTier, criteria };
}
