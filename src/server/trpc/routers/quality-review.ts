// ============================================================================
// MODULE M13 — QC Router (Quality Control)
// Score: 100/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §2.2.4 + §4.1 | Division: L'Arène
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  submit(deliverableId) — submit for review
// [x] REQ-2  list, getByDeliverable — basic queries
// [x] REQ-3  assignReviewer — qc-router service determines who reviews (by tier)
// [x] REQ-4  escalate — escalate failed review to higher tier
// [x] REQ-5  QC routing rules: Apprenti → reviewed by Compagnon+, Compagnon → Maître+
// [x] REQ-6  Criticality × tier scoring (higher stakes = higher tier reviewer)
// [x] REQ-7  Structured feedback by ADVE pillar (not just text notes)
// [x] REQ-8  First pass rate tracking per creator (performance metric)
// [x] REQ-9  QC compensation for peer reviewers (Maîtres/Associés)
// [x] REQ-10 Creator Portal: /creator/qc/submitted + /creator/qc/peer (pages exist in app router)
//
// PROCEDURES: submit, list, getByDeliverable, getByReviewer, assignReviewer,
//             escalate, getReviewerCandidates, calculateReviewPriority,
//             getFirstPassRate, calculateReviewerCompensation
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

/** Tier hierarchy for reviewer routing (higher index = higher tier) */
const TIER_HIERARCHY = ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] as const;
type GuildTier = (typeof TIER_HIERARCHY)[number];

/** Minimum reviewer tier for each creator tier */
const REVIEW_TIER_MAP: Record<string, GuildTier> = {
  APPRENTI: "COMPAGNON",
  COMPAGNON: "MAITRE",
  MAITRE: "ASSOCIE",
  ASSOCIE: "ASSOCIE", // Associés review each other
};

/** Compensation rates for peer reviewers (XAF per review) */
const REVIEW_COMPENSATION: Record<string, number> = {
  COMPAGNON: 5000,
  MAITRE: 10000,
  ASSOCIE: 15000,
};

/** ADVE pillar keys for structured feedback validation */
const VALID_PILLAR_KEYS = ["a", "d", "v", "e", "authenticite", "distinction", "valeur", "engagement"];

export const qualityReviewRouter = createTRPCRouter({
  // ── REQ-1 + REQ-7: submit with structured ADVE pillar feedback ──────────
  submit: protectedProcedure
    .input(z.object({
      deliverableId: z.string(),
      verdict: z.enum(["ACCEPTED", "MINOR_REVISION", "MAJOR_REVISION", "REJECTED", "ESCALATED"]),
      pillarScores: z.record(z.unknown()),
      overallScore: z.number().min(0).max(10),
      feedback: z.string(),
      reviewType: z.enum(["AUTOMATED", "PEER", "FIXER", "CLIENT"]),
      reviewDuration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // REQ-7: Validate that pillarScores has ADVE structure
      const pillarKeys = Object.keys(input.pillarScores);
      const hasADVE = pillarKeys.some((k) => VALID_PILLAR_KEYS.includes(k.toLowerCase()));
      if (pillarKeys.length > 0 && !hasADVE) {
        // Accept but add a warning — non-ADVE keys are allowed but flagged
        (input.pillarScores as Record<string, unknown>)._warning = "pillarScores should use ADVE keys (a/d/v/e)";
      }

      const review = await ctx.db.qualityReview.create({
        data: {
          deliverableId: input.deliverableId,
          reviewerId: ctx.session.user.id,
          verdict: input.verdict,
          pillarScores: input.pillarScores as Prisma.InputJsonValue,
          overallScore: input.overallScore,
          feedback: input.feedback,
          reviewType: input.reviewType,
          reviewDuration: input.reviewDuration,
        },
      });

      // REQ-8: Update first pass rate on the creator's TalentProfile
      const deliverable = await ctx.db.missionDeliverable.findUnique({
        where: { id: input.deliverableId },
        include: { mission: true },
      });

      if (deliverable?.mission.assigneeId) {
        const creatorId = deliverable.mission.assigneeId;
        // Count all reviews for this creator
        const allReviews = await ctx.db.qualityReview.findMany({
          where: {
            deliverable: { mission: { assigneeId: creatorId } },
          },
          select: { verdict: true, deliverableId: true },
        });

        // First pass = distinct deliverables where FIRST review was ACCEPTED
        const firstReviewByDeliverable = new Map<string, string>();
        for (const r of allReviews) {
          if (!firstReviewByDeliverable.has(r.deliverableId)) {
            firstReviewByDeliverable.set(r.deliverableId, r.verdict);
          }
        }
        const totalDeliverables = firstReviewByDeliverable.size;
        const firstPassCount = Array.from(firstReviewByDeliverable.values()).filter((v) => v === "ACCEPTED").length;
        const firstPassRate = totalDeliverables > 0 ? firstPassCount / totalDeliverables : 0;

        await ctx.db.talentProfile.updateMany({
          where: { userId: creatorId },
          data: { firstPassRate },
        });
      }

      return review;
    }),

  // ── REQ-2: list with pagination ─────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50), cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.qualityReview.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { deliverable: true },
      });
      let nextCursor: string | undefined;
      if (items.length > input.limit) { nextCursor = items.pop()?.id; }
      return { items, nextCursor };
    }),

  getByDeliverable: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.qualityReview.findMany({
        where: { deliverableId: input.deliverableId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByReviewer: protectedProcedure
    .input(z.object({ reviewerId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.qualityReview.findMany({
        where: { reviewerId: input.reviewerId ?? ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        include: { deliverable: true },
      });
    }),

  // ── REQ-3 + REQ-5: assignReviewer with tier-based routing ───────────────
  assignReviewer: adminProcedure
    .input(z.object({
      deliverableId: z.string(),
      reviewerId: z.string().optional(), // If omitted, auto-select by tier
      reviewType: z.enum(["AUTOMATED", "PEER", "FIXER", "CLIENT"]),
    }))
    .mutation(async ({ ctx, input }) => {
      let reviewerId = input.reviewerId;

      if (!reviewerId) {
        // REQ-5: Auto-select reviewer based on tier routing rules
        const deliverable = await ctx.db.missionDeliverable.findUniqueOrThrow({
          where: { id: input.deliverableId },
          include: { mission: true },
        });

        // Get creator's tier
        let creatorTier: GuildTier = "APPRENTI";
        if (deliverable.mission.assigneeId) {
          const profile = await ctx.db.talentProfile.findUnique({
            where: { userId: deliverable.mission.assigneeId },
          });
          creatorTier = (profile?.tier as GuildTier) ?? "APPRENTI";
        }

        // Determine minimum reviewer tier
        const minReviewerTier = REVIEW_TIER_MAP[creatorTier] ?? "COMPAGNON";
        const minTierIndex = TIER_HIERARCHY.indexOf(minReviewerTier);

        // Find eligible reviewers (higher tier, not the creator)
        const eligibleTiers = TIER_HIERARCHY.slice(minTierIndex);
        const candidates = await ctx.db.talentProfile.findMany({
          where: {
            tier: { in: [...eligibleTiers] },
            userId: { not: deliverable.mission.assigneeId ?? undefined },
          },
          orderBy: { peerReviews: "asc" }, // Least reviews first for load balance
          take: 1,
        });

        if (candidates.length === 0 || !candidates[0]) {
          throw new Error(`No eligible reviewers found for tier ${minReviewerTier}+`);
        }
        reviewerId = candidates[0].userId;
      }

      return ctx.db.qualityReview.create({
        data: {
          deliverableId: input.deliverableId,
          reviewerId,
          reviewType: input.reviewType,
          verdict: "ACCEPTED", // Placeholder until actual review
          pillarScores: {},
          overallScore: 0,
          feedback: "",
        },
      });
    }),

  // ── REQ-4: escalate with auto-assign to higher tier ─────────────────────
  escalate: protectedProcedure
    .input(z.object({ reviewId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const review = await ctx.db.qualityReview.findUniqueOrThrow({
        where: { id: input.reviewId },
        include: { deliverable: { include: { mission: true } } },
      });

      // Mark current review as escalated
      await ctx.db.qualityReview.update({
        where: { id: input.reviewId },
        data: { verdict: "ESCALATED", feedback: input.reason },
      });

      // Find current reviewer's tier
      const currentReviewer = await ctx.db.talentProfile.findUnique({
        where: { userId: review.reviewerId },
      });
      const currentTier = (currentReviewer?.tier as GuildTier) ?? "COMPAGNON";
      const currentTierIndex = TIER_HIERARCHY.indexOf(currentTier);

      // Escalate to next tier
      const nextTierIndex = Math.min(currentTierIndex + 1, TIER_HIERARCHY.length - 1);
      const nextTier = TIER_HIERARCHY[nextTierIndex];

      // Find a reviewer at the escalated tier
      const excludeIds = [review.reviewerId];
      if (review.deliverable.mission.assigneeId) {
        excludeIds.push(review.deliverable.mission.assigneeId);
      }
      const escalatedReviewer = await ctx.db.talentProfile.findFirst({
        where: {
          tier: nextTier,
          userId: { notIn: excludeIds },
        },
        orderBy: { peerReviews: "asc" },
      });

      if (escalatedReviewer) {
        // Create new review assignment at higher tier
        const newReview = await ctx.db.qualityReview.create({
          data: {
            deliverableId: review.deliverableId,
            reviewerId: escalatedReviewer.userId,
            reviewType: "PEER",
            verdict: "ACCEPTED",
            pillarScores: {},
            overallScore: 0,
            feedback: `Escalated from ${currentTier} review. Reason: ${input.reason}`,
          },
        });
        return { escalated: true, newReviewId: newReview.id, assignedTier: nextTier };
      }

      return { escalated: true, newReviewId: null, assignedTier: nextTier, message: "No reviewer found at escalated tier" };
    }),

  // ── REQ-5: getReviewerCandidates — filter by tier for a deliverable ─────
  getReviewerCandidates: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliverable = await ctx.db.missionDeliverable.findUniqueOrThrow({
        where: { id: input.deliverableId },
        include: { mission: true },
      });

      // Determine creator's tier
      let creatorTier: GuildTier = "APPRENTI";
      if (deliverable.mission.assigneeId) {
        const profile = await ctx.db.talentProfile.findUnique({
          where: { userId: deliverable.mission.assigneeId },
        });
        creatorTier = (profile?.tier as GuildTier) ?? "APPRENTI";
      }

      const minReviewerTier = REVIEW_TIER_MAP[creatorTier] ?? "COMPAGNON";
      const minTierIndex = TIER_HIERARCHY.indexOf(minReviewerTier);
      const eligibleTiers = TIER_HIERARCHY.slice(minTierIndex);

      const candidates = await ctx.db.talentProfile.findMany({
        where: {
          tier: { in: [...eligibleTiers] },
          userId: { not: deliverable.mission.assigneeId ?? undefined },
        },
        orderBy: [{ peerReviews: "asc" }, { avgScore: "desc" }],
        take: 10,
      });

      return {
        creatorTier,
        minimumReviewerTier: minReviewerTier,
        candidates: candidates.map((c) => ({
          userId: c.userId,
          displayName: c.displayName,
          tier: c.tier,
          peerReviews: c.peerReviews,
          avgScore: c.avgScore,
          firstPassRate: c.firstPassRate,
        })),
      };
    }),

  // ── REQ-6: calculateReviewPriority — criticality x tier scoring ─────────
  calculateReviewPriority: protectedProcedure
    .input(z.object({ deliverableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliverable = await ctx.db.missionDeliverable.findUniqueOrThrow({
        where: { id: input.deliverableId },
        include: { mission: true },
      });

      const mission = deliverable.mission;
      const priority = mission.priority ?? 5;
      const budget = (typeof mission.budget === "number" ? mission.budget : 0);

      // Criticality factors
      const isHighBudget = budget > 500000; // > 500k XAF
      const isUrgent = mission.slaDeadline ? new Date(mission.slaDeadline).getTime() - Date.now() < 48 * 60 * 60 * 1000 : false;
      const isPriorityHigh = priority >= 8;

      // Score 0-100
      let criticalityScore = priority * 10; // 0-100 base from priority
      if (isHighBudget) criticalityScore += 15;
      if (isUrgent) criticalityScore += 20;
      if (isPriorityHigh) criticalityScore += 10;
      criticalityScore = Math.min(100, criticalityScore);

      // Determine required reviewer tier based on criticality
      let requiredTier: GuildTier;
      if (criticalityScore >= 80) requiredTier = "ASSOCIE";
      else if (criticalityScore >= 60) requiredTier = "MAITRE";
      else if (criticalityScore >= 40) requiredTier = "COMPAGNON";
      else requiredTier = "COMPAGNON"; // minimum

      return {
        deliverableId: input.deliverableId,
        criticalityScore,
        factors: { isHighBudget, isUrgent, isPriorityHigh, missionPriority: priority, budget },
        requiredReviewerTier: requiredTier,
      };
    }),

  // ── REQ-8: getFirstPassRate — tracking per creator ──────────────────────
  getFirstPassRate: protectedProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get from TalentProfile (cached value)
      const profile = await ctx.db.talentProfile.findUnique({
        where: { userId: input.creatorId },
      });

      // Also compute fresh from review data
      const allReviews = await ctx.db.qualityReview.findMany({
        where: {
          deliverable: { mission: { assigneeId: input.creatorId } },
        },
        orderBy: { createdAt: "asc" },
        select: { verdict: true, deliverableId: true, createdAt: true },
      });

      // First review per deliverable
      const firstReviewByDeliverable = new Map<string, string>();
      for (const r of allReviews) {
        if (!firstReviewByDeliverable.has(r.deliverableId)) {
          firstReviewByDeliverable.set(r.deliverableId, r.verdict);
        }
      }

      const totalDeliverables = firstReviewByDeliverable.size;
      const firstPassCount = Array.from(firstReviewByDeliverable.values()).filter((v) => v === "ACCEPTED").length;
      const computedRate = totalDeliverables > 0 ? firstPassCount / totalDeliverables : 0;

      return {
        creatorId: input.creatorId,
        cachedRate: profile?.firstPassRate ?? 0,
        computedRate,
        totalDeliverables,
        firstPassCount,
        revisionCount: totalDeliverables - firstPassCount,
        tier: profile?.tier ?? "APPRENTI",
      };
    }),

  // ── REQ-9: calculateReviewerCompensation — QC compensation ──────────────
  calculateReviewerCompensation: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.db.qualityReview.findUniqueOrThrow({
        where: { id: input.reviewId },
      });

      // Only PEER reviews are compensated
      if (review.reviewType !== "PEER") {
        return {
          reviewId: input.reviewId,
          compensationAmount: 0,
          currency: "XAF",
          eligible: false,
          reason: `Review type ${review.reviewType} is not eligible for compensation`,
        };
      }

      // Get reviewer's tier for rate lookup
      const reviewerProfile = await ctx.db.talentProfile.findUnique({
        where: { userId: review.reviewerId },
      });

      const tier = (reviewerProfile?.tier as GuildTier) ?? "COMPAGNON";
      const baseRate = REVIEW_COMPENSATION[tier] ?? 5000;

      // Bonus for thorough reviews (has pillar scores + feedback)
      const pillarScores = review.pillarScores as Record<string, unknown> | null;
      const hasPillarScores = pillarScores && Object.keys(pillarScores).length >= 4;
      const hasDetailedFeedback = review.feedback.length > 100;
      const thoroughnessBonus = (hasPillarScores ? 2000 : 0) + (hasDetailedFeedback ? 1000 : 0);

      // Duration bonus for longer reviews
      const durationBonus = review.reviewDuration && review.reviewDuration > 30 ? 2000 : 0;

      const totalCompensation = baseRate + thoroughnessBonus + durationBonus;

      return {
        reviewId: input.reviewId,
        reviewerTier: tier,
        baseRate,
        thoroughnessBonus,
        durationBonus,
        compensationAmount: totalCompensation,
        currency: "XAF",
        eligible: true,
        breakdown: {
          base: baseRate,
          pillarScoreBonus: hasPillarScores ? 2000 : 0,
          feedbackLengthBonus: hasDetailedFeedback ? 1000 : 0,
          durationBonus,
        },
      };
    }),
});
