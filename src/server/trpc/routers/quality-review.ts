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
