// ============================================================================
// MODULE M13 — QC Router (Quality Control)
// Score: 55/100 | Priority: P2 | Status: FUNCTIONAL
// Spec: §2.2.4 + §4.1 | Division: L'Arène
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  submit(deliverableId) — submit for review
// [x] REQ-2  list, getByDeliverable — basic queries
// [ ] REQ-3  assignReviewer — qc-router service determines who reviews (by tier)
// [ ] REQ-4  escalate — escalate failed review to higher tier
// [ ] REQ-5  QC routing rules: Apprenti → reviewed by Compagnon+, Compagnon → Maître+
// [ ] REQ-6  Criticality × tier scoring (higher stakes = higher tier reviewer)
// [ ] REQ-7  Structured feedback by ADVE pillar (not just text notes)
// [ ] REQ-8  First pass rate tracking per creator (performance metric)
// [ ] REQ-9  QC compensation for peer reviewers (Maîtres/Associés)
// [ ] REQ-10 Creator Portal: /creator/qc/submitted + /creator/qc/peer
//
// PROCEDURES: submit, list, getByDeliverable, getByReviewer, assignReviewer, escalate
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

export const qualityReviewRouter = createTRPCRouter({
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
      return ctx.db.qualityReview.create({
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
    }),

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

  assignReviewer: adminProcedure
    .input(z.object({ deliverableId: z.string(), reviewerId: z.string(), reviewType: z.enum(["AUTOMATED", "PEER", "FIXER", "CLIENT"]) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.qualityReview.create({
        data: {
          deliverableId: input.deliverableId,
          reviewerId: input.reviewerId,
          reviewType: input.reviewType,
          verdict: "ACCEPTED",
          pillarScores: {},
          overallScore: 0,
          feedback: "",
        },
      });
    }),

  escalate: protectedProcedure
    .input(z.object({ reviewId: z.string(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.qualityReview.update({
        where: { id: input.reviewId },
        data: { verdict: "ESCALATED", feedback: input.reason },
      });
    }),
});
