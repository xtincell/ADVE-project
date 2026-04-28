/**
 * SESHAT SEARCH — operator semantic search over the brand context store.
 *
 * Wraps the Seshat ranker for use by the console operator UI:
 *   - searchAcrossStrategies(query, filters) — global semantic search
 *   - findPeers(strategyId)                  — comparable strategies
 *   - searchWithinStrategy(strategyId, query)— scoped search inside a brand
 *
 * Uses the same multi-provider embedding chain (Ollama → OpenAI → no-op).
 * Returns empty arrays gracefully when no embedding provider is configured.
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../init";

export const seshatSearchRouter = createTRPCRouter({
  searchAcrossStrategies: operatorProcedure
    .input(
      z.object({
        query: z.string().min(2).max(500),
        kinds: z.array(z.string()).optional(),
        sector: z.string().optional(),
        country: z.string().optional(),
        businessModel: z.string().optional(),
        excludeStrategyId: z.string().optional(),
        topK: z.number().min(1).max(50).default(15),
      }),
    )
    .query(async ({ input }) => {
      const { searchByQuery } = await import(
        "@/server/services/seshat/context-store"
      );
      const results = await searchByQuery(input.query, {
        kinds: input.kinds,
        excludeStrategyId: input.excludeStrategyId,
        topK: input.topK,
        metadata: {
          ...(input.sector ? { sector: input.sector } : {}),
          ...(input.country ? { country: input.country } : {}),
          ...(input.businessModel ? { businessModel: input.businessModel } : {}),
        },
      });
      return {
        count: results.length,
        results,
      };
    }),

  searchWithinStrategy: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        query: z.string().min(2).max(500),
        kinds: z.array(z.string()).optional(),
        pillarKey: z.string().optional(),
        topK: z.number().min(1).max(30).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { topKWithinStrategy } = await import(
        "@/server/services/seshat/context-store"
      );
      const results = await topKWithinStrategy(input.strategyId, input.query, {
        kinds: input.kinds,
        pillarKey: input.pillarKey,
        topK: input.topK,
      });
      return {
        count: results.length,
        results,
      };
    }),

  findPeers: operatorProcedure
    .input(
      z.object({
        strategyId: z.string(),
        kinds: z.array(z.string()).optional(),
        topK: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { findSimilarAcrossStrategies } = await import(
        "@/server/services/seshat/context-store"
      );
      const peers = await findSimilarAcrossStrategies(input.strategyId, {
        kinds: input.kinds,
        topK: input.topK,
      });

      // Group by strategy and aggregate similarity
      const byStrategy = new Map<
        string,
        { strategyId: string; nodeCount: number; topSimilarity: number; samples: typeof peers }
      >();
      for (const p of peers) {
        const existing = byStrategy.get(p.strategyId);
        if (existing) {
          existing.nodeCount++;
          existing.topSimilarity = Math.max(existing.topSimilarity, p.similarity);
          if (existing.samples.length < 3) existing.samples.push(p);
        } else {
          byStrategy.set(p.strategyId, {
            strategyId: p.strategyId,
            nodeCount: 1,
            topSimilarity: p.similarity,
            samples: [p],
          });
        }
      }

      // Resolve names from DB for UI rendering
      const ids = Array.from(byStrategy.keys());
      if (ids.length === 0) return { peers: [] };

      const { db } = await import("@/lib/db");
      const strategies = await db.strategy.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          businessContext: true,
          financialCapacity: true,
          advertis_vector: true,
        },
      });
      const stratMap = new Map(strategies.map((s) => [s.id, s]));

      return {
        peers: Array.from(byStrategy.values())
          .sort((a, b) => b.topSimilarity - a.topSimilarity)
          .map((p) => {
            const s = stratMap.get(p.strategyId);
            return {
              ...p,
              name: s?.name ?? null,
              businessContext: s?.businessContext ?? null,
              financialCapacity: s?.financialCapacity ?? null,
              composite:
                (s?.advertis_vector as Record<string, number> | null)?.composite ?? null,
            };
          }),
      };
    }),
});
