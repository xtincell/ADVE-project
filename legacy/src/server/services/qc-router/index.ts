import { db } from "@/lib/db";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";
type ReviewType = "AUTOMATED" | "PEER" | "FIXER" | "CLIENT";

interface RouteResult {
  reviewerId: string | null;
  reviewType: ReviewType;
  reason: string;
}

const TIER_ORDER: Record<GuildTier, number> = {
  APPRENTI: 0,
  COMPAGNON: 1,
  MAITRE: 2,
  ASSOCIE: 3,
};

/**
 * Determines who should review a deliverable based on the creator's tier.
 *
 * Routing rules:
 * - APPRENTI deliverables -> reviewed by COMPAGNON+
 * - COMPAGNON deliverables -> reviewed by MAITRE+
 * - MAITRE/ASSOCIE deliverables -> reviewed by peers at same tier or ADMIN
 */
export async function routeReview(
  deliverableId: string,
  submitterUserId?: string
): Promise<RouteResult> {
  const deliverable = await db.missionDeliverable.findUniqueOrThrow({
    where: { id: deliverableId },
    include: { mission: true },
  });

  // If submitterUserId not provided, attempt to resolve from mission context
  let resolvedSubmitterId = submitterUserId;
  if (!resolvedSubmitterId) {
    // Use the mission's driver (assignee) as a fallback
    resolvedSubmitterId = deliverable.mission.driverId ?? undefined;
  }

  if (!resolvedSubmitterId) {
    return {
      reviewerId: null,
      reviewType: "FIXER",
      reason: "No submitter identified. Escalating to fixer.",
    };
  }

  const submitterProfile = await db.talentProfile.findUnique({
    where: { userId: resolvedSubmitterId },
  });

  const submitterTier: GuildTier = (submitterProfile?.tier as GuildTier) ?? "APPRENTI";
  const minReviewerTier = getMinReviewerTier(submitterTier);

  // For MAITRE/ASSOCIE, allow peers at the same tier
  const isPeerReview = submitterTier === "MAITRE" || submitterTier === "ASSOCIE";

  const reviewer = await findReviewer(
    isPeerReview ? submitterTier : minReviewerTier,
    resolvedSubmitterId,
    isPeerReview
  );

  if (!reviewer) {
    // Try escalating to ADMIN role users
    const adminReviewer = await db.user.findFirst({
      where: {
        role: "ADMIN",
        id: { not: resolvedSubmitterId },
      },
      select: { id: true },
    });

    if (adminReviewer) {
      return {
        reviewerId: adminReviewer.id,
        reviewType: "FIXER",
        reason: `No ${minReviewerTier}+ peer available. Assigned to ADMIN.`,
      };
    }

    return {
      reviewerId: null,
      reviewType: "FIXER",
      reason: `No ${minReviewerTier}+ reviewer available. Escalating to fixer.`,
    };
  }

  return {
    reviewerId: reviewer.userId,
    reviewType: "PEER",
    reason: isPeerReview
      ? `Peer review by ${submitterTier} colleague (same tier or higher).`
      : `Assigned to ${minReviewerTier}+ reviewer based on submitter tier ${submitterTier}.`,
  };
}

/**
 * Find the best available reviewer matching criteria and assign them.
 * Creates the QualityReview record.
 */
export async function assignReviewer(
  deliverableId: string,
  reviewerId?: string,
  reviewType?: ReviewType
): Promise<{ reviewId: string; reviewerId: string; reviewType: ReviewType }> {
  let finalReviewerId = reviewerId;
  let finalReviewType = reviewType ?? "PEER";

  // If no reviewer specified, auto-route
  if (!finalReviewerId) {
    const route = await routeReview(deliverableId);
    finalReviewerId = route.reviewerId ?? undefined;
    finalReviewType = route.reviewType;

    if (!finalReviewerId) {
      throw new Error(`No reviewer could be found for deliverable ${deliverableId}: ${route.reason}`);
    }
  }

  // Check if a review already exists for this deliverable+reviewer
  const existing = await db.qualityReview.findFirst({
    where: {
      deliverableId,
      reviewerId: finalReviewerId,
    },
  });

  if (existing) {
    return {
      reviewId: existing.id,
      reviewerId: finalReviewerId,
      reviewType: existing.reviewType as ReviewType,
    };
  }

  const review = await db.qualityReview.create({
    data: {
      deliverableId,
      reviewerId: finalReviewerId,
      reviewType: finalReviewType,
      verdict: "ACCEPTED", // Pending actual review
      pillarScores: {},
      overallScore: 0,
      feedback: "",
    },
  });

  // Increment the reviewer's peerReviews count for load balancing
  await db.talentProfile.updateMany({
    where: { userId: finalReviewerId },
    data: { peerReviews: { increment: 1 } },
  });

  return {
    reviewId: review.id,
    reviewerId: finalReviewerId,
    reviewType: finalReviewType,
  };
}

/**
 * Run basic automated quality checks on a deliverable.
 * Checks completeness, format compliance, and basic content validation.
 */
export async function automatedQc(deliverableId: string): Promise<{
  passed: boolean;
  score: number;
  issues: Array<{
    type: "format" | "brand" | "content" | "pillar";
    severity: "info" | "warning" | "error";
    message: string;
  }>;
}> {
  const deliverable = await db.missionDeliverable.findUniqueOrThrow({
    where: { id: deliverableId },
    include: {
      mission: {
        include: {
          driver: true,
          strategy: { include: { pillars: true } },
        },
      },
    },
  });

  const issues: Array<{
    type: "format" | "brand" | "content" | "pillar";
    severity: "info" | "warning" | "error";
    message: string;
  }> = [];

  let score = 10; // Start at perfect score

  // 1. Completeness checks
  if (!deliverable.title || deliverable.title.trim().length === 0) {
    issues.push({
      type: "content",
      severity: "error",
      message: "Deliverable title is missing",
    });
    score -= 2;
  }

  if (!deliverable.fileUrl) {
    issues.push({
      type: "format",
      severity: "error",
      message: "No file attached to deliverable",
    });
    score -= 3;
  }

  if (deliverable.status === "PENDING") {
    issues.push({
      type: "content",
      severity: "warning",
      message: "Deliverable is still in PENDING status",
    });
    score -= 1;
  }

  // 2. Format compliance checks (if driver has qcCriteria)
  const driver = deliverable.mission.driver;
  if (driver) {
    const qcCriteria = driver.qcCriteria as Record<string, unknown> | null;
    if (qcCriteria) {
      // Check required format
      if (qcCriteria.requiredFormat && deliverable.fileUrl) {
        const requiredFormat = String(qcCriteria.requiredFormat).toLowerCase();
        const fileExtension = deliverable.fileUrl.split(".").pop()?.toLowerCase() ?? "";
        if (requiredFormat && fileExtension && !fileExtension.includes(requiredFormat)) {
          issues.push({
            type: "format",
            severity: "warning",
            message: `File format mismatch: expected ${requiredFormat}, got ${fileExtension}`,
          });
          score -= 1;
        }
      }

      // Check minimum content length if specified
      if (typeof qcCriteria.minTitleLength === "number") {
        if (deliverable.title.length < qcCriteria.minTitleLength) {
          issues.push({
            type: "content",
            severity: "warning",
            message: `Title too short: ${deliverable.title.length} chars, minimum ${qcCriteria.minTitleLength}`,
          });
          score -= 0.5;
        }
      }
    }

    // Check pillar priority alignment
    const pillarPriority = driver.pillarPriority as Record<string, number> | null;
    if (pillarPriority) {
      const strategyVector = deliverable.mission.strategy.advertis_vector as Record<string, number> | null;
      if (strategyVector) {
        const priorityPillars = Object.entries(pillarPriority)
          .filter(([, weight]) => weight > 0.7)
          .map(([key]) => key);

        for (const pillarKey of priorityPillars) {
          const pillarScore = strategyVector[pillarKey] ?? 0;
          if (pillarScore < 10) {
            issues.push({
              type: "pillar",
              severity: "info",
              message: `Priority pillar "${pillarKey}" has low strategy score (${pillarScore.toFixed(1)}/25). Consider strengthening this pillar.`,
            });
            score -= 0.5;
          }
        }
      }
    }
  }

  // 3. Brand alignment check
  const strategyPillars = deliverable.mission.strategy.pillars;
  if (strategyPillars.length === 0) {
    issues.push({
      type: "brand",
      severity: "warning",
      message: "Strategy has no pillar content defined — brand alignment cannot be verified",
    });
    score -= 1;
  }

  // Normalize score
  score = Math.max(0, Math.min(10, score));
  const passed = score >= 6 && !issues.some((i) => i.severity === "error");

  return { passed, score: Math.round(score * 10) / 10, issues };
}

// --- Internal helpers ---

function getMinReviewerTier(submitterTier: GuildTier): GuildTier {
  switch (submitterTier) {
    case "APPRENTI": return "COMPAGNON";
    case "COMPAGNON": return "MAITRE";
    case "MAITRE": return "ASSOCIE";
    case "ASSOCIE": return "ASSOCIE";
  }
}

async function findReviewer(
  minTier: GuildTier,
  excludeUserId: string,
  allowSameTier: boolean = false
): Promise<{ userId: string } | null> {
  const minOrder = TIER_ORDER[minTier];
  const eligibleTiers = Object.entries(TIER_ORDER)
    .filter(([, order]) => allowSameTier ? order >= minOrder : order >= minOrder)
    .map(([tier]) => tier);

  const reviewer = await db.talentProfile.findFirst({
    where: {
      tier: { in: eligibleTiers as GuildTier[] },
      userId: { not: excludeUserId },
    },
    orderBy: [
      { peerReviews: "asc" },  // Load balance: least reviews first
      { avgScore: "desc" },     // Prefer higher-quality reviewers
    ],
    select: { userId: true },
  });

  return reviewer;
}
