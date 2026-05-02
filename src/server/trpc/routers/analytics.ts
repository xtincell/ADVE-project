/**
 * Analytics Router — Attribution, cohorts, insights, score snapshots
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { auditedProcedure } from "@/server/governance/governed-procedure";

const auditedProtected = auditedProcedure(protectedProcedure, "analytics");
const auditedAdmin = auditedProcedure(adminProcedure, "analytics");
/* lafusee:strangler-active */

export const analyticsRouter = createTRPCRouter({
  // === ATTRIBUTION ===
  recordEvent: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      eventType: z.string(),
      source: z.string(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      value: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => ctx.db.attributionEvent.create({ data: input })),

  getAttribution: protectedProcedure
    .input(z.object({ strategyId: z.string(), period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attributionEvent.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  // === COHORTS ===
  recordCohort: auditedAdmin
    .input(z.object({
      strategyId: z.string(),
      cohortKey: z.string(),
      period: z.string(),
      size: z.number(),
      retentionRate: z.number().optional(),
      revenuePerUser: z.number().optional(),
      churnRate: z.number().optional(),
      metrics: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cohortSnapshot.create({ data: { ...input, metrics: input.metrics as Prisma.InputJsonValue } });
    }),

  getCohorts: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cohortSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
    }),

  // === INSIGHT REPORTS ===
  generateInsight: auditedAdmin
    .input(z.object({ strategyId: z.string(), reportType: z.string(), title: z.string(), data: z.record(z.string(), z.unknown()), summary: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insightReport.create({ data: { ...input, data: input.data as Prisma.InputJsonValue } });
    }),

  getInsights: protectedProcedure
    .input(z.object({ strategyId: z.string(), reportType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.insightReport.findMany({
        where: { strategyId: input.strategyId, ...(input.reportType ? { reportType: input.reportType } : {}) },
        orderBy: { generatedAt: "desc" },
      });
    }),

  // === SCORE HISTORY ===
  getScoreHistory: protectedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scoreSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.limit ?? 50,
      });
    }),

  // === COMPETITORS ===
  recordCompetitor: auditedAdmin
    .input(z.object({
      sector: z.string(), market: z.string(), name: z.string(),
      strengths: z.record(z.string(), z.unknown()).optional(), weaknesses: z.record(z.string(), z.unknown()).optional(),
      positioning: z.string().optional(), estimatedScore: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.competitorSnapshot.create({ data: { ...input, strengths: input.strengths as Prisma.InputJsonValue, weaknesses: input.weaknesses as Prisma.InputJsonValue } });
    }),

  getCompetitors: protectedProcedure
    .input(z.object({ sector: z.string().optional(), market: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.competitorSnapshot.findMany({
        where: { ...(input.sector ? { sector: input.sector } : {}), ...(input.market ? { market: input.market } : {}) },
        orderBy: { measuredAt: "desc" },
      });
    }),
});
