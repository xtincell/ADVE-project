/**
 * NOTORIA MCP Server — Recommendation Resources for Jehuty and external consumers
 *
 * Exposes published recommendations as MCP resources (read-only).
 * Jehuty and any MCP-connected system can query Notoria recos.
 */

import { db } from "@/lib/db";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (params: { strategyId?: string }) => Promise<unknown>;
}

export const resources: ResourceDefinition[] = [
  {
    uri: "notoria://recommendations",
    name: "notoria-recos",
    description:
      "Published Notoria recommendations for Jehuty consumption. " +
      "Returns recommendations that have been published (publishedAt is set). " +
      "Filterable by strategyId. Includes editorial content (explain, advantages, disadvantages, urgency).",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      const where: Record<string, unknown> = {
        publishedAt: { not: null },
      };
      if (strategyId) where.strategyId = strategyId;

      const recos = await db.recommendation.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: 100,
        select: {
          id: true,
          strategyId: true,
          targetPillarKey: true,
          targetField: true,
          operation: true,
          proposedValue: true,
          source: true,
          confidence: true,
          explain: true,
          advantages: true,
          disadvantages: true,
          urgency: true,
          impact: true,
          status: true,
          missionType: true,
          publishedAt: true,
          createdAt: true,
        },
      });

      return {
        count: recos.length,
        recommendations: recos,
      };
    },
  },
  {
    uri: "notoria://batches",
    name: "notoria-batches",
    description:
      "Recent Notoria recommendation batches. " +
      "Shows batch-level metadata: mission type, reco counts by status, generation timestamp.",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      const where: Record<string, unknown> = {};
      if (strategyId) where.strategyId = strategyId;

      const batches = await db.recommendationBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          strategyId: true,
          missionType: true,
          sourcePillars: true,
          targetPillars: true,
          totalRecos: true,
          pendingCount: true,
          acceptedCount: true,
          rejectedCount: true,
          appliedCount: true,
          agent: true,
          createdAt: true,
        },
      });

      return { count: batches.length, batches };
    },
  },
  {
    uri: "notoria://pipeline",
    name: "notoria-pipeline",
    description:
      "Current Notoria pipeline status for a strategy. " +
      "Shows ADVE → I → S progression with stage statuses and pending reco counts.",
    mimeType: "application/json",
    handler: async ({ strategyId }) => {
      if (!strategyId) return { error: "strategyId required" };

      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { notoriaPipeline: true, name: true },
      });

      return {
        strategyId,
        strategyName: strategy?.name,
        pipeline: strategy?.notoriaPipeline ?? null,
      };
    },
  },
];
