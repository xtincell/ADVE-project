import { db } from "@/lib/db";

export interface CreatorLoad {
  userId: string;
  displayName: string;
  tier: string;
  activeMissions: number;
  pendingReviews: number;
  totalLoad: number; // weighted score
  capacity: number; // max concurrent missions based on tier
  utilization: number; // 0-1
}

export interface BottleneckAlert {
  type: "overloaded" | "underutilized" | "no_reviewer" | "tier_gap";
  severity: "low" | "medium" | "high";
  message: string;
  affectedUsers: string[];
}

export interface AllocationSuggestion {
  missionId: string;
  suggestedCreators: Array<{
    userId: string;
    displayName: string;
    tier: string;
    currentUtilization: number;
    matchScore: number;
    reason: string;
  }>;
}

export interface CapacityReport {
  totalCreators: number;
  totalCapacity: number;
  totalLoad: number;
  overallUtilization: number;
  byTier: Record<string, {
    count: number;
    totalCapacity: number;
    totalLoad: number;
    utilization: number;
  }>;
  availableSlots: number;
  bottlenecks: BottleneckAlert[];
  recommendations: string[];
}

const TIER_CAPACITY: Record<string, number> = {
  APPRENTI: 3,
  COMPAGNON: 5,
  MAITRE: 8,
  ASSOCIE: 12,
};

/**
 * Return current workload per creator (active missions count, hours).
 */
export async function getLoadByCreator(): Promise<CreatorLoad[]> {
  return getCreatorLoads();
}

/**
 * Get consolidated load view per creator.
 */
export async function getCreatorLoads(): Promise<CreatorLoad[]> {
  const profiles = await db.talentProfile.findMany({
    include: { user: { select: { id: true, name: true } } },
  });

  const loads: CreatorLoad[] = [];

  for (const profile of profiles) {
    // Count active missions where this user is assigned via commissions
    const activeMissions = await db.commission.count({
      where: {
        talentId: profile.userId,
        mission: {
          status: { in: ["IN_PROGRESS", "REVIEW"] },
        },
      },
    });

    // Count pending reviews assigned to this user
    const pendingReviews = await db.qualityReview.count({
      where: {
        reviewerId: profile.userId,
        verdict: "ACCEPTED",
        overallScore: 0,
      },
    });

    const capacity = TIER_CAPACITY[profile.tier] ?? 3;
    const totalLoad = activeMissions + pendingReviews * 0.5;
    const utilization = Math.min(1, totalLoad / capacity);

    loads.push({
      userId: profile.userId,
      displayName: profile.displayName,
      tier: profile.tier,
      activeMissions,
      pendingReviews,
      totalLoad,
      capacity,
      utilization,
    });
  }

  return loads.sort((a, b) => b.utilization - a.utilization);
}

/**
 * Find creators at >80% capacity.
 */
export async function detectBottlenecks(): Promise<BottleneckAlert[]> {
  const loads = await getCreatorLoads();
  const alerts: BottleneckAlert[] = [];

  // Check for overloaded creators (>80% as specified)
  const overloaded = loads.filter((l) => l.utilization > 0.8);
  if (overloaded.length > 0) {
    alerts.push({
      type: "overloaded",
      severity: overloaded.some((l) => l.utilization > 0.95) ? "high" : "medium",
      message: `${overloaded.length} creator(s) above 80% capacity`,
      affectedUsers: overloaded.map((l) => l.displayName),
    });
  }

  // Check for underutilized creators
  const underutilized = loads.filter((l) => l.utilization < 0.2 && l.tier !== "APPRENTI");
  if (underutilized.length > 0) {
    alerts.push({
      type: "underutilized",
      severity: "low",
      message: `${underutilized.length} experienced creator(s) underutilized (<20% capacity)`,
      affectedUsers: underutilized.map((l) => l.displayName),
    });
  }

  // Check for tier gaps (no MAITRE+ for reviews)
  const maitresAndUp = loads.filter((l) => l.tier === "MAITRE" || l.tier === "ASSOCIE");
  if (maitresAndUp.length === 0) {
    alerts.push({
      type: "tier_gap",
      severity: "high",
      message: "No MAITRE or ASSOCIE available for advanced peer reviews",
      affectedUsers: [],
    });
  }

  // Check for review bottleneck
  const totalPendingReviews = loads.reduce((sum, l) => sum + l.pendingReviews, 0);
  const availableReviewers = loads.filter((l) => l.tier !== "APPRENTI" && l.utilization < 0.8);
  if (totalPendingReviews > availableReviewers.length * 3) {
    alerts.push({
      type: "no_reviewer",
      severity: "medium",
      message: `${totalPendingReviews} pending reviews but only ${availableReviewers.length} available reviewers`,
      affectedUsers: availableReviewers.map((l) => l.displayName),
    });
  }

  return alerts;
}

/**
 * Suggest best creator allocation for a mission considering workload,
 * tier compatibility, and driver specialties.
 */
export async function suggestAllocation(missionId: string): Promise<AllocationSuggestion> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: {
      driver: true,
      strategy: true,
    },
  });

  const loads = await getCreatorLoads();

  // Get all talent profiles with their specialties
  const profiles = await db.talentProfile.findMany({
    include: { user: { select: { id: true, name: true } } },
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const candidates: AllocationSuggestion["suggestedCreators"] = [];

  for (const load of loads) {
    // Skip creators at full capacity
    if (load.utilization >= 1) continue;

    const profile = profileMap.get(load.userId);
    if (!profile) continue;

    let matchScore = 0;
    const reasons: string[] = [];

    // 1. Availability score (0-40 points): lower utilization = higher score
    const availabilityScore = (1 - load.utilization) * 40;
    matchScore += availabilityScore;
    if (load.utilization < 0.5) {
      reasons.push("High availability");
    }

    // 2. Driver specialty match (0-30 points)
    if (mission.driver) {
      const specialties = profile.driverSpecialties as Record<string, unknown> | null;
      if (specialties) {
        const channelMatch = specialties[mission.driver.channel];
        if (channelMatch) {
          matchScore += 30;
          reasons.push(`Specializes in ${mission.driver.channel}`);
        } else {
          matchScore += 5; // Small base for having any specialties
        }
      }
    }

    // 3. Quality score (0-20 points): based on average QC score
    const qualityScore = Math.min(20, (profile.avgScore / 10) * 20);
    matchScore += qualityScore;
    if (profile.avgScore > 7) {
      reasons.push(`High quality score (${profile.avgScore.toFixed(1)})`);
    }

    // 4. Experience score (0-10 points)
    const experienceScore = Math.min(10, profile.totalMissions / 5);
    matchScore += experienceScore;
    if (profile.totalMissions > 20) {
      reasons.push("Experienced creator");
    }

    candidates.push({
      userId: load.userId,
      displayName: load.displayName,
      tier: load.tier,
      currentUtilization: Math.round(load.utilization * 100) / 100,
      matchScore: Math.round(matchScore * 10) / 10,
      reason: reasons.length > 0 ? reasons.join("; ") : "Available",
    });
  }

  // Sort by match score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return {
    missionId,
    suggestedCreators: candidates.slice(0, 5), // Top 5 suggestions
  };
}

/**
 * Overall team capacity report.
 */
export async function getCapacityReport(): Promise<CapacityReport> {
  const loads = await getCreatorLoads();
  const bottlenecks = await detectBottlenecks();

  const byTier: CapacityReport["byTier"] = {};

  for (const load of loads) {
    if (!byTier[load.tier]) {
      byTier[load.tier] = { count: 0, totalCapacity: 0, totalLoad: 0, utilization: 0 };
    }
    byTier[load.tier]!.count++;
    byTier[load.tier]!.totalCapacity += load.capacity;
    byTier[load.tier]!.totalLoad += load.totalLoad;
  }

  // Calculate utilization per tier
  for (const tier of Object.values(byTier)) {
    tier.utilization = tier.totalCapacity > 0
      ? Math.round((tier.totalLoad / tier.totalCapacity) * 100) / 100
      : 0;
  }

  const totalCapacity = loads.reduce((sum, l) => sum + l.capacity, 0);
  const totalLoad = loads.reduce((sum, l) => sum + l.totalLoad, 0);
  const overallUtilization = totalCapacity > 0
    // lafusee:allow-adhoc-completion: team capacity utilization ratio (allocated hours ratio)
    ? Math.round((totalLoad / totalCapacity) * 100) / 100
    : 0;

  const availableSlots = loads.reduce((sum, l) => sum + Math.max(0, l.capacity - l.totalLoad), 0);

  // Generate recommendations
  const recommendations = await getStaffingRecommendations(loads, bottlenecks);

  return {
    totalCreators: loads.length,
    totalCapacity,
    totalLoad: Math.round(totalLoad * 10) / 10,
    overallUtilization,
    byTier,
    availableSlots: Math.round(availableSlots * 10) / 10,
    bottlenecks,
    recommendations,
  };
}

/**
 * Recommend staffing based on current load and bottlenecks.
 */
async function getStaffingRecommendations(
  loads: CreatorLoad[],
  bottlenecks: BottleneckAlert[]
): Promise<string[]> {
  const recommendations: string[] = [];

  const avgUtilization = loads.length > 0
    ? loads.reduce((sum, l) => sum + l.utilization, 0) / loads.length
    : 0;

  if (avgUtilization > 0.7) {
    recommendations.push("Overall capacity above 70% -- consider recruiting new creators");
  }

  const tierCounts: Record<string, number> = {};
  for (const l of loads) {
    tierCounts[l.tier] = (tierCounts[l.tier] ?? 0) + 1;
  }

  if ((tierCounts["APPRENTI"] ?? 0) > (tierCounts["COMPAGNON"] ?? 0) * 2) {
    recommendations.push("APPRENTI/COMPAGNON ratio imbalanced -- accelerate promotions or recruit COMPAGNON");
  }

  for (const b of bottlenecks) {
    if (b.type === "tier_gap") {
      recommendations.push("Recruit or promote a MAITRE to ensure advanced peer reviews");
    }
    if (b.type === "no_reviewer") {
      recommendations.push("Train COMPAGNON members in review processes to reduce QC bottleneck");
    }
    if (b.type === "overloaded" && b.severity === "high") {
      recommendations.push("Critical overload detected -- redistribute missions immediately or bring in additional resources");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Staffing balanced -- no action required");
  }

  return recommendations;
}

/**
 * Public export for staffing recommendations (backward-compatible).
 */
export async function getStaffingRecommendationsPublic(): Promise<string[]> {
  const loads = await getCreatorLoads();
  const bottlenecks = await detectBottlenecks();
  return getStaffingRecommendations(loads, bottlenecks);
}
