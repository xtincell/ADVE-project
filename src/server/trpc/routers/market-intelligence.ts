/**
 * Market Intelligence Router — T pillar orchestration
 * Runs targeted market research, manages collection DAEMONs, and exposes weak signals.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { runMarketIntelligence, checkSectorKnowledge } from "@/server/services/market-intelligence";
import {
  registerCollectionDaemon,
  listCollectors,
  stopCollector,
  collectMarketSignals,
  type SignalFrequency,
} from "@/server/services/market-intelligence/signal-collector";
import { analyzeWeakSignals, buildSearchContext } from "@/server/services/market-intelligence/weak-signal-analyzer";
import { db } from "@/lib/db";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "market-intelligence");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

export const marketIntelligenceRouter = createTRPCRouter({
  /** Run full market intelligence pipeline for T pillar */
  run: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      forceRefresh: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      return runMarketIntelligence(input.strategyId, {
        forceRefresh: input.forceRefresh,
      });
    }),

  /** Check if sector knowledge already exists */
  checkSectorKnowledge: protectedProcedure
    .input(z.object({
      sector: z.string(),
      market: z.string().optional(),
      maxAgeDays: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return checkSectorKnowledge(input.sector, input.market, input.maxAgeDays);
    }),

  /** Register a market signal collection DAEMON */
  registerCollector: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      frequency: z.enum(["REALTIME", "MINUTE", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "ANNUAL"]),
    }))
    .mutation(async ({ input }) => {
      const searchContext = await buildSearchContext(input.strategyId);
      const processId = await registerCollectionDaemon({
        strategyId: input.strategyId,
        sector: searchContext.sector,
        market: searchContext.market,
        keywords: searchContext.keywords,
        competitors: searchContext.competitors,
        frequency: input.frequency as SignalFrequency,
      });
      return { processId };
    }),

  /** List active collection DAEMONs for a strategy */
  listCollectors: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return listCollectors(input.strategyId);
    }),

  /** Stop a collection DAEMON */
  stopCollector: protectedProcedure
    .input(z.object({ processId: z.string() }))
    .mutation(async ({ input }) => {
      await stopCollector(input.processId);
      return { success: true };
    }),

  /** Get weak signals for a strategy */
  getWeakSignals: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      minUrgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    }))
    .query(async ({ input }) => {
      const urgencyOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      const minIndex = input.minUrgency ? urgencyOrder.indexOf(input.minUrgency) : 0;

      const signals = await db.signal.findMany({
        where: {
          strategyId: input.strategyId,
          type: "WEAK_SIGNAL_ALERT",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return signals.filter(s => {
        const data = s.data as Record<string, unknown> | null;
        const urgency = String(data?.urgency ?? "LOW");
        return urgencyOrder.indexOf(urgency) >= minIndex;
      });
    }),

  /** Manual signal ingestion by operator */
  ingestSignal: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      title: z.string(),
      content: z.string(),
      sourceType: z.enum(["NEWS", "REPORT", "SOCIAL", "REGULATORY", "FINANCIAL"]),
      relevance: z.number().min(0).max(1).default(0.7),
    }))
    .mutation(async ({ input }) => {
      const signal = await db.signal.create({
        data: {
          strategyId: input.strategyId,
          type: "MARKET_SIGNAL",
          data: {
            title: input.title,
            content: input.content,
            sourceType: input.sourceType,
            relevance: input.relevance,
            frequency: "MANUAL",
            ingestedByOperator: true,
          },
        },
      });

      // Optionally trigger weak signal analysis on the new signal
      const searchContext = await buildSearchContext(input.strategyId);
      const weakSignals = await analyzeWeakSignals(
        [{
          title: input.title,
          content: input.content,
          sourceType: input.sourceType,
          relevance: input.relevance,
          collectedAt: new Date().toISOString(),
        }],
        searchContext,
        input.strategyId,
      );

      return { signalId: signal.id, weakSignalsGenerated: weakSignals.length };
    }),

  /** Force a collection cycle now (without waiting for DAEMON schedule) */
  collectNow: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .mutation(async ({ input }) => {
      const searchContext = await buildSearchContext(input.strategyId);
      const signals = await collectMarketSignals({
        strategyId: input.strategyId,
        sector: searchContext.sector,
        market: searchContext.market,
        keywords: searchContext.keywords,
        competitors: searchContext.competitors,
        frequency: "DAILY",
      });
      return { signalsCollected: signals.length };
    }),
});
