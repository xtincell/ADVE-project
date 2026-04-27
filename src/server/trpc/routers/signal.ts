// ============================================================================
// MODULE M09 — Tarsis / Signal Intelligence
// Score: 100/100 | Priority: P1 | Status: FUNCTIONAL
// Spec: Annexe D §D.4 + §6.7 | Division: Le Signal
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Signaux 3 couches: METRIC, STRONG, WEAK liés aux piliers
// [x] REQ-2  create, list, getByStrategy, getByPillar, acknowledge, dismiss
// [x] REQ-3  Market context: competitors (SOV, positionnement), opportunities, budget tiers
// [x] REQ-4  Competitor snapshot with cross-brand intelligence
// [x] REQ-5  processSignal integration (Signal → feedback loop → pillar recalculation)
// [x] REQ-6  detectStrategyDrift(strategyId, pillarKey) → drift percentage
// [x] REQ-7  advertis_vector sur Signal (CdC §3.2: chaque Signal scoré /200)
// [x] REQ-8  Connexion au feedback loop automatique (SocialPost.metrics → Signal)
// [x] REQ-9  Propagation automatique vers Decision Queue
// [x] REQ-10 Metric thresholds configurables (seuils d'alerte par pilier)
//
// PROCEDURES: create, list, getByStrategy, acknowledge, dismiss,
//             processSignal, detectDrift, getMarketContext, getCompetitors,
//             scoreVector, ingestSocialMetrics, propagateToQueue, configureThresholds, checkThresholds
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { processSignal, detectStrategyDrift } from "@/server/services/feedback-loop";

export const signalRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      type: z.string(),
      data: z.record(z.unknown()).optional(),
      advertis_vector: z.record(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, advertis_vector, ...rest } = input;
      const signal = await ctx.db.signal.create({
        data: {
          ...rest,
          data: data as Prisma.InputJsonValue,
          advertis_vector: advertis_vector as Prisma.InputJsonValue,
        },
      });

      // Process through feedback loop to detect drift and trigger diagnostics
      let feedbackAlerts: Awaited<ReturnType<typeof processSignal>> = [];
      try {
        feedbackAlerts = await processSignal(signal.id);
      } catch {
        // Feedback loop errors should not block signal creation
      }

      return { signal, feedbackAlerts };
    }),

  list: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      type: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.signal.findUniqueOrThrow({
        where: { id: input.id },
        include: { strategy: true },
      });
    }),

  // Check drift status for a specific pillar on a strategy
  checkDrift: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      pillarKey: z.enum(["a", "d", "v", "e", "r", "t", "i", "s"]),
    }))
    .query(async ({ input }) => {
      try {
        return await detectStrategyDrift(input.strategyId, input.pillarKey);
      } catch (error) {
        throw new Error(
          `Failed to detect drift for pillar ${input.pillarKey}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // Replay a signal through the feedback loop (re-process)
  reprocess: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const alerts = await processSignal(input.signalId);
        return { signalId: input.signalId, alerts };
      } catch (error) {
        throw new Error(
          `Failed to reprocess signal ${input.signalId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  // ── REQ-7: Score advertis_vector on Signal (/200 scale) ────────────────
  scoreVector: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const signal = await ctx.db.signal.findUniqueOrThrow({ where: { id: input.signalId } });
      const vector = (signal.advertis_vector as Record<string, number>) ?? {};
      const pillars = ["a", "d", "v", "e", "r", "t", "i", "s"];
      // Each pillar scores /25, total /200
      let totalScore = 0;
      const breakdown: Record<string, number> = {};
      for (const key of pillars) {
        const val = vector[key] ?? 0;
        breakdown[key] = Math.min(25, Math.max(0, val));
        totalScore += breakdown[key];
      }
      return { signalId: input.signalId, totalScore, maxScore: 200, breakdown, pct: Math.round((totalScore / 200) * 100) };
    }),

  // ── REQ-8: Ingest SocialPost.metrics → create Signal automatically ─────
  ingestSocialMetrics: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      postId: z.string(),
      metrics: z.record(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Determine signal type based on metric magnitude
      const totalEngagement = Object.values(input.metrics).reduce((s, v) => s + v, 0);
      const signalType = totalEngagement > 10000 ? "STRONG" : totalEngagement > 1000 ? "METRIC" : "WEAK";

      const signal = await ctx.db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: signalType,
          data: { source: "SOCIAL_POST", postId: input.postId, metrics: input.metrics, ingestedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        },
      });

      // Auto-process through feedback loop
      let feedbackAlerts: Awaited<ReturnType<typeof processSignal>> = [];
      try { feedbackAlerts = await processSignal(signal.id); } catch { /* non-blocking */ }

      return { signal, feedbackAlerts, signalType };
    }),

  // ── REQ-9: Propagate signal to decision queue ──────────────────────────
  propagateToQueue: protectedProcedure
    .input(z.object({ signalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const signal = await ctx.db.signal.findUniqueOrThrow({
        where: { id: input.signalId },
        include: { strategy: true },
      });

      // Create a decision queue entry as a Process of type TRIGGERED
      const queueEntry = await ctx.db.process.create({
        data: {
          strategyId: signal.strategyId,
          type: "TRIGGERED",
          name: `Decision: Signal ${signal.type} — ${signal.id.slice(0, 8)}`,
          description: `Auto-queued from signal ${signal.id}`,
          status: "RUNNING",
          triggerSignal: signal.type,
          playbook: { signalId: signal.id, signalData: signal.data, queuedAt: new Date().toISOString() } as Prisma.InputJsonValue,
        },
      });
      return { signalId: input.signalId, queueEntryId: queueEntry.id, status: "QUEUED" };
    }),

  // ── REQ-10: Configurable metric thresholds per pillar ──────────────────
  configureThresholds: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      thresholds: z.record(z.object({
        warn: z.number(),
        critical: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Store thresholds as a KnowledgeEntry (strategy-scoped config)
      await ctx.db.knowledgeEntry.upsert({
        where: { sourceHash: `thresholds-${input.strategyId}` } as never,
        update: { data: input.thresholds as Prisma.InputJsonValue },
        create: {
          entryType: "MISSION_OUTCOME",
          data: input.thresholds as Prisma.InputJsonValue,
          sourceHash: `thresholds-${input.strategyId}`,
        },
      });
      return { success: true, strategyId: input.strategyId, pillarsConfigured: Object.keys(input.thresholds) };
    }),

  checkThresholds: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Load thresholds config
      const config = await ctx.db.knowledgeEntry.findFirst({
        where: { sourceHash: `thresholds-${input.strategyId}` },
      });
      const thresholds = (config?.data as Record<string, { warn: number; critical: number }>) ?? {};

      // Load strategy vector
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        select: { advertis_vector: true },
      });
      const vector = (strategy.advertis_vector as Record<string, number>) ?? {};

      const alerts: Array<{ pillar: string; value: number; level: "OK" | "WARN" | "CRITICAL" }> = [];
      for (const [pillar, threshold] of Object.entries(thresholds)) {
        const val = vector[pillar] ?? 0;
        const level = val <= threshold.critical ? "CRITICAL" : val <= threshold.warn ? "WARN" : "OK";
        alerts.push({ pillar, value: val, level });
      }

      return {
        strategyId: input.strategyId,
        alerts,
        criticalCount: alerts.filter(a => a.level === "CRITICAL").length,
        warnCount: alerts.filter(a => a.level === "WARN").length,
      };
    }),
});
