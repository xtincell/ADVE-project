/**
 * Market Intelligence Router — T pillar orchestration
 * Runs targeted market research, manages collection DAEMONs, and exposes weak signals.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { runMarketIntelligence, checkSectorKnowledge } from "@/server/services/market-intelligence";
import {
  registerCollectionDaemon,
  listCollectors,
  stopCollector,
  collectMarketSignals,
  type SignalFrequency,
} from "@/server/services/market-intelligence/signal-collector";
import { analyzeWeakSignals, buildSearchContext } from "@/server/services/market-intelligence/weak-signal-analyzer";
import { getSectorAxisForPolity, upsertPolityAxis } from "@/server/services/sector-intelligence";
import { MarketScaleSchema } from "@/domain";
import { db } from "@/lib/db";
import { governedProcedure } from "@/server/governance/governed-procedure";
/* lafusee:governed-active */

export const marketIntelligenceRouter = createTRPCRouter({
  /**
   * ADR-0127 — seed/refresh d'un axe Overton PAR POLITY (échelle × pays).
   * Voie gouvernée unique d'écriture des axes polity — opérateur uniquement
   * (manual-first : les signaux sont fournis, jamais fabriqués ici).
   */
  upsertPolityAxis: governedProcedure({

    kind: "SESHAT_UPSERT_POLITY_AXIS",

    requireOperator: true,

    inputSchema: z.object({
      slug: z.string().min(1),
      marketScale: MarketScaleSchema,
      countryCode: z.string().length(2).nullable().optional(),
      signals: z.array(z.object({
        tags: z.record(z.string(), z.number()).optional(),
        narrative: z.string().optional(),
        weight: z.number().optional(),
      })).min(1),
    }),

    caller: "market-intelligence:upsertPolityAxis",

  })
    .mutation(async ({ input }) => {
      return upsertPolityAxis({
        slug: input.slug,
        marketScale: input.marketScale,
        countryCode: input.countryCode ?? null,
        signals: input.signals,
      });
    }),

  /** ADR-0127 — lecture de l'axe résolu pour une polity (niveau de résolution honnête). */
  getAxisForPolity: protectedProcedure
    .input(z.object({
      slug: z.string().min(1),
      marketScale: MarketScaleSchema.nullable().optional(),
      countryCode: z.string().max(2).nullable().optional(),
    }))
    .query(async ({ input }) => {
      return getSectorAxisForPolity(input.slug, {
        marketScale: input.marketScale ?? null,
        countryCode: input.countryCode ?? null,
      });
    }),
  /** Run full market intelligence pipeline for T pillar */
  run: governedProcedure({

    kind: "LEGACY_MARKET_INTELLIGENCE_RUN",

    inputSchema: z.object({
      strategyId: z.string(),
      forceRefresh: z.boolean().default(false),
    }),

    caller: "market-intelligence:run",

  })
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
  registerCollector: governedProcedure({

    kind: "LEGACY_MARKET_INTELLIGENCE_REGISTER_COLLECTOR",

    inputSchema: z.object({
      strategyId: z.string(),
      frequency: z.enum(["REALTIME", "MINUTE", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "ANNUAL"]),
    }),

    caller: "market-intelligence:registerCollector",

  })
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
  listCollectors: strategyScopedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ input }) => {
      return listCollectors(input.strategyId);
    }),

  /** Stop a collection DAEMON */
  stopCollector: governedProcedure({

    kind: "LEGACY_MARKET_INTELLIGENCE_STOP_COLLECTOR",

    inputSchema: z.object({ processId: z.string() }),

    caller: "market-intelligence:stopCollector",

  })
    .mutation(async ({ input }) => {
      await stopCollector(input.processId);
      return { success: true };
    }),

  /** Get weak signals for a strategy */
  getWeakSignals: strategyScopedProcedure
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
  ingestSignal: governedProcedure({

    kind: "LEGACY_MARKET_INTELLIGENCE_INGEST_SIGNAL",

    inputSchema: z.object({
      strategyId: z.string(),
      title: z.string(),
      content: z.string(),
      sourceType: z.enum(["NEWS", "REPORT", "SOCIAL", "REGULATORY", "FINANCIAL"]),
      relevance: z.number().min(0).max(1).default(0.7),
    }),

    caller: "market-intelligence:ingestSignal",

  })
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
  collectNow: governedProcedure({

    kind: "LEGACY_MARKET_INTELLIGENCE_COLLECT_NOW",

    inputSchema: z.object({ strategyId: z.string() }),

    caller: "market-intelligence:collectNow",

  })
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

  /**
   * Mesure manuelle des impacts d'assets (cultIndexDeltaObserved) — parité
   * manual-first (ADR-0060) du run opportuniste déclenché par
   * runMarketIntelligence. Les crons Vercel ayant été retirés (plan hobby),
   * c'est l'unique déclencheur explicite opérateur. Idempotent.
   */
  trackAssetImpacts: governedProcedure({

    kind: "SESHAT_TRACK_ASSET_IMPACTS",

    inputSchema: z.object({}),

    caller: "market-intelligence:trackAssetImpacts",

  })
    .mutation(async () => {
      const { trackAssetImpacts } = await import("@/server/services/seshat/asset-impact-tracker");
      return trackAssetImpacts();
    }),
});
