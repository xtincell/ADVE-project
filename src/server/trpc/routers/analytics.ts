/**
 * Analytics Router — Attribution, cohorts, insights, score snapshots
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { strategyScopedProcedure, assertRawStrategyScope } from "../middleware/strategy-scope";
import { competitorScope } from "@/server/services/seshat/creative-intelligence/competition";
import { assertActiveMarket } from "@/server/services/seshat/creative-intelligence";
import { TRPCError } from "@trpc/server";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const analyticsRouter = createTRPCRouter({
  // === ATTRIBUTION ===
  recordEvent: governedProcedure({

    kind: "LEGACY_ANALYTICS_RECORD_EVENT",

    inputSchema: z.object({
      strategyId: z.string(),
      eventType: z.string(),
      source: z.string(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      value: z.number().optional(),
    }),

    caller: "analytics:recordEvent",

  })
    .mutation(async ({ ctx, input }) => ctx.db.attributionEvent.create({ data: input })),

  getAttribution: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attributionEvent.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  // === COHORTS ===
  recordCohort: governedProcedure({

    kind: "LEGACY_ANALYTICS_RECORD_COHORT",

    inputSchema: z.object({
      strategyId: z.string(),
      cohortKey: z.string(),
      period: z.string(),
      size: z.number(),
      retentionRate: z.number().optional(),
      revenuePerUser: z.number().optional(),
      churnRate: z.number().optional(),
      metrics: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "analytics:recordCohort",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cohortSnapshot.create({ data: { ...input, metrics: input.metrics as Prisma.InputJsonValue } });
    }),

  getCohorts: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cohortSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
      });
    }),

  // === INSIGHT REPORTS ===
  generateInsight: governedProcedure({

    kind: "LEGACY_ANALYTICS_GENERATE_INSIGHT",

    inputSchema: z.object({ strategyId: z.string(), reportType: z.string(), title: z.string(), data: z.record(z.string(), z.unknown()), summary: z.string().optional() }),

    caller: "analytics:generateInsight",

  })
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insightReport.create({ data: { ...input, data: input.data as Prisma.InputJsonValue } });
    }),

  getInsights: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), reportType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.insightReport.findMany({
        where: { strategyId: input.strategyId, ...(input.reportType ? { reportType: input.reportType } : {}) },
        orderBy: { generatedAt: "desc" },
      });
    }),

  // === SCORE HISTORY ===
  getScoreHistory: strategyScopedProcedure
    .input(z.object({ strategyId: z.string(), limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.scoreSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { measuredAt: "desc" },
        take: input.limit ?? 50,
      });
    }),

  // === COMPETITORS ===
  recordCompetitor: governedProcedure({

    kind: "LEGACY_ANALYTICS_RECORD_COMPETITOR",
    requireOperator: true,

    inputSchema: z.object({
      sector: z.string(), market: z.string(), name: z.string(), brandRefId: z.string().min(1).optional(),
      strengths: z.record(z.string(), z.unknown()).optional(), weaknesses: z.record(z.string(), z.unknown()).optional(),
      positioning: z.string().optional(), estimatedScore: z.number().optional(),
      strategyId: z.string().min(1).optional(), studyId: z.string().min(1).optional(),
      visibility: z.enum(["PUBLIC", "BRAND"]), countryCode: z.string().regex(/^[A-Z]{2}$/),
      source: z.url().refine(v => new URL(v).protocol === "https:"),
    }),

    caller: "analytics:recordCompetitor",

  })
    .mutation(async ({ ctx, input }) => {
      if (input.visibility === "PUBLIC" ? !!input.strategyId || !!input.studyId : !input.strategyId) throw new TRPCError({ code: "BAD_REQUEST", message: "Provenance concurrentielle incohérente." });
      await assertActiveMarket(ctx.db, input.countryCode);
      if (input.brandRefId && !await ctx.db.brandRef.findUnique({ where: { id: input.brandRefId }, select: { id: true } })) throw new TRPCError({ code: "NOT_FOUND", message: "Référence concurrentielle inconnue." });
      if (input.studyId && !await ctx.db.marketStudy.findFirst({ where: { id: input.studyId, strategyId: input.strategyId }, select: { id: true } })) throw new TRPCError({ code: "NOT_FOUND", message: "Étude indisponible pour cette marque." });
      return ctx.db.competitorSnapshot.create({ data: { ...input, strengths: input.strengths as Prisma.InputJsonValue, weaknesses: input.weaknesses as Prisma.InputJsonValue } });
    }),

  getCompetitors: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1).optional(), sector: z.string().min(1), countryCode: z.string().regex(/^[A-Z]{2}$/), market: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      await assertRawStrategyScope(ctx.session.user.id, input, { optional: true });
      return ctx.db.competitorSnapshot.findMany({
        where: { ...competitorScope(input.strategyId, input.sector, input.countryCode), ...(input.market ? { market: input.market } : {}) },
        orderBy: { measuredAt: "desc" },
        take: 100,
      });
    }),
});
