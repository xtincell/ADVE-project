/**
 * JEHUTY tRPC Router — Strategic Intelligence Feed
 *
 * Aggregates signals + published recos + diagnostics into a unified,
 * priority-sorted feed with curation actions (pin, dismiss, trigger Notoria).
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, operatorProcedure } from "../init";
import { db } from "@/lib/db";
import { mapSignalToFeedItem, mapRecoToFeedItem, mapDiagnosticToFeedItem } from "@/server/services/jehuty/mappers";
import type { JehutyFeedItem } from "@/lib/types/jehuty";
import { auditedProcedure } from "@/server/governance/governed-procedure";

// @governed-procedure-applied
const _auditedProtected = auditedProcedure(protectedProcedure, "jehuty");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

const SIGNAL_TYPES_FOR_FEED = [
  "MARKET_SIGNAL", "WEAK_SIGNAL_ALERT", "SCORE_IMPROVEMENT", "SCORE_DECLINE",
  "NOTORIA_BATCH_READY", "STRONG", "WEAK", "METRIC",
];

const categoryEnum = z.enum([
  "RECOMMENDATION", "MARKET_SIGNAL", "WEAK_SIGNAL", "SCORE_DRIFT", "DIAGNOSTIC", "EXTERNAL_SIGNAL",
]);

export const jehutyRouter = createTRPCRouter({

  // ══════════════════════════════════════════════════════════════════
  // FEED — Merged, priority-sorted intelligence stream
  // ══════════════════════════════════════════════════════════════════

  feed: protectedProcedure
    .input(z.object({
      strategyId: z.string().optional(),     // omit for agency-level (all brands)
      category: categoryEnum.optional(),
      pillarKey: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      hideDismissed: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const { strategyId, category, limit, hideDismissed } = input;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // ── Parallel source queries ──
      // When strategyId is provided we also pull signals from OTHER strategies
      // whose Tarsis-tagged affectedStrategyIds includes us — cross-brand spread
      // computed by the ranker in seshat/tarsis/weak-signal-analyzer.ts.
      const crossBrandSignalsPromise = strategyId
        ? db.signal.findMany({
            where: {
              type: "WEAK_SIGNAL_ALERT",
              createdAt: { gte: thirtyDaysAgo },
              strategyId: { not: strategyId },
              data: {
                path: ["affectedStrategyIds"],
                array_contains: [strategyId],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof db.signal.findMany>>);

      const [signals, crossBrandSignals, recos, diagnostics, curations, strategies] = await Promise.all([
        // 1. Signals (own strategy or all when no strategyId)
        db.signal.findMany({
          where: {
            ...(strategyId ? { strategyId } : {}),
            type: { in: SIGNAL_TYPES_FOR_FEED },
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),

        crossBrandSignalsPromise,

        // 2. Published recommendations
        db.recommendation.findMany({
          where: {
            ...(strategyId ? { strategyId } : {}),
            publishedAt: { not: null },
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),

        // 3. Diagnostics (KnowledgeEntry)
        db.knowledgeEntry.findMany({
          where: {
            entryType: "DIAGNOSTIC_RESULT",
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),

        // 4. Curations (for join)
        db.jehutyCuration.findMany({
          where: {
            ...(strategyId ? { strategyId } : {}),
          },
        }),

        // 5. Strategy names (for agency mode)
        !strategyId ? db.strategy.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
        }) : Promise.resolve([]),
      ]);

      // Build curation lookup
      const curationMap = new Map<string, { action: string; note?: string | null }>();
      for (const c of curations) {
        curationMap.set(`${c.itemType}:${c.itemId}`, { action: c.action, note: c.note });
      }

      // Build strategy name lookup
      const strategyNames = new Map<string, string>();
      for (const s of strategies) {
        strategyNames.set(s.id, s.name);
      }

      // ── Map sources to feed items ──
      const items: JehutyFeedItem[] = [];

      for (const signal of signals) {
        const curation = curationMap.get(`SIGNAL:${signal.id}`);
        items.push(mapSignalToFeedItem(signal, curation, strategyNames.get(signal.strategyId)));
      }

      // Cross-brand signals (Tarsis ranker-tagged): mark them so the UI can
      // distinguish "from another brand but flagged relevant for you".
      for (const signal of crossBrandSignals) {
        const curation = curationMap.get(`SIGNAL:${signal.id}`);
        const item = mapSignalToFeedItem(signal, curation, strategyNames.get(signal.strategyId) ?? undefined);
        // Tag for downstream rendering — UI surfaces "PARTAGÉ" badge when present
        (item as { sharedFromStrategyId?: string }).sharedFromStrategyId = signal.strategyId;
        items.push(item);
      }

      for (const reco of recos) {
        const curation = curationMap.get(`RECOMMENDATION:${reco.id}`);
        items.push(mapRecoToFeedItem(reco, curation, strategyNames.get(reco.strategyId)));
      }

      for (const diag of diagnostics) {
        const data = (diag.data ?? {}) as Record<string, unknown>;
        const diagStrategyId = (data.strategyId as string) ?? strategyId;
        if (!diagStrategyId) continue;
        if (strategyId && diagStrategyId !== strategyId) continue;
        const curation = curationMap.get(`DIAGNOSTIC:${diag.id}`);
        items.push(mapDiagnosticToFeedItem(diag, curation, diagStrategyId, strategyNames.get(diagStrategyId)));
      }

      // ── Filter ──
      let filtered = items;
      if (category) {
        filtered = filtered.filter((i) => i.category === category);
      }
      if (input.pillarKey) {
        filtered = filtered.filter((i) => i.pillarKey === input.pillarKey?.toLowerCase());
      }
      if (hideDismissed) {
        filtered = filtered.filter((i) => i.curation?.action !== "DISMISSED");
      }

      // ── Sort: pinned first, then by priority desc ──
      filtered.sort((a, b) => {
        const aPinned = a.curation?.action === "PINNED" ? 1 : 0;
        const bPinned = b.curation?.action === "PINNED" ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return b.priority - a.priority;
      });

      return filtered.slice(0, limit);
    }),

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD — 4 aggregate metrics
  // ══════════════════════════════════════════════════════════════════

  dashboard: protectedProcedure
    .input(z.object({ strategyId: z.string().optional() }))
    .query(async ({ input }) => {
      const { strategyId } = input;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const where = strategyId ? { strategyId } : {};

      const [signalCount, criticalSignals, recoStats, marketPillar] = await Promise.all([
        db.signal.count({
          where: { ...where, type: { in: SIGNAL_TYPES_FOR_FEED }, createdAt: { gte: thirtyDaysAgo } },
        }),
        db.signal.count({
          where: { ...where, type: "WEAK_SIGNAL_ALERT", createdAt: { gte: thirtyDaysAgo } },
        }),
        strategyId ? db.recommendation.groupBy({
          by: ["status"],
          where: { strategyId },
          _count: true,
        }) : Promise.resolve([]),
        strategyId ? db.pillar.findUnique({
          where: { strategyId_key: { strategyId, key: "t" } },
          select: { confidence: true },
        }) : Promise.resolve(null),
      ]);

      const recoStatusMap = Object.fromEntries(
        (recoStats as Array<{ status: string; _count: number }>).map((s) => [s.status, s._count]),
      );
      const accepted = (recoStatusMap.ACCEPTED ?? 0) + (recoStatusMap.APPLIED ?? 0);
      const rejected = recoStatusMap.REJECTED ?? 0;
      const acceptanceRate = accepted + rejected > 0 ? accepted / (accepted + rejected) : 0;

      const publishedRecos = await db.recommendation.count({
        where: { ...(strategyId ? { strategyId } : {}), publishedAt: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      });

      return {
        totalItems: signalCount + publishedRecos,
        criticalCount: criticalSignals,
        acceptanceRate,
        marketHealthScore: (marketPillar?.confidence ?? 0) * 100,
      };
    }),

  // ══════════════════════════════════════════════════════════════════
  // CURATION — Pin, dismiss, or trigger Notoria
  // ══════════════════════════════════════════════════════════════════

  curate: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      itemType: z.enum(["SIGNAL", "RECOMMENDATION", "DIAGNOSTIC"]),
      itemId: z.string(),
      action: z.enum(["PINNED", "DISMISSED", "NOTORIA_TRIGGERED"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return db.jehutyCuration.upsert({
        where: {
          strategyId_itemType_itemId: {
            strategyId: input.strategyId,
            itemType: input.itemType,
            itemId: input.itemId,
          },
        },
        create: {
          strategyId: input.strategyId,
          itemType: input.itemType,
          itemId: input.itemId,
          action: input.action,
          userId: ctx.session.user.id,
          note: input.note,
        },
        update: {
          action: input.action,
          userId: ctx.session.user.id,
          note: input.note,
        },
      });
    }),

  removeCuration: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      itemType: z.enum(["SIGNAL", "RECOMMENDATION", "DIAGNOSTIC"]),
      itemId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db.jehutyCuration.deleteMany({
        where: {
          strategyId: input.strategyId,
          itemType: input.itemType,
          itemId: input.itemId,
        },
      });
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════
  // TRIGGER NOTORIA — Convert a signal into recommendations
  // ══════════════════════════════════════════════════════════════════

  triggerNotoria: operatorProcedure
    .input(z.object({
      strategyId: z.string(),
      signalId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Load signal
      const signal = await db.signal.findUnique({ where: { id: input.signalId } });
      if (!signal) throw new Error("Signal introuvable.");

      // Extract observation text
      const data = (signal.data ?? {}) as Record<string, unknown>;
      const observationText = [
        data.title,
        data.content,
        data.thesis,
        data.brandImpact,
        data.recommendedAction,
      ].filter(Boolean).join("\n\n");

      if (!observationText) throw new Error("Signal vide — pas de contenu a analyser.");

      // Generate Notoria recos from this observation
      const { generateBatch } = await import("@/server/services/notoria/engine");
      const result = await generateBatch({
        strategyId: input.strategyId,
        missionType: "SESHAT_OBSERVATION",
        seshatObservation: observationText,
      });

      // Mark curation
      await db.jehutyCuration.upsert({
        where: {
          strategyId_itemType_itemId: {
            strategyId: input.strategyId,
            itemType: "SIGNAL",
            itemId: input.signalId,
          },
        },
        create: {
          strategyId: input.strategyId,
          itemType: "SIGNAL",
          itemId: input.signalId,
          action: "NOTORIA_TRIGGERED",
          userId: ctx.session.user.id,
          note: `Notoria batch: ${result.batchId} (${result.totalRecos} recos)`,
        },
        update: {
          action: "NOTORIA_TRIGGERED",
          note: `Notoria batch: ${result.batchId} (${result.totalRecos} recos)`,
        },
      });

      return { batchId: result.batchId, totalRecos: result.totalRecos };
    }),
});
