import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { scoreObject } from "@/server/services/advertis-scorer";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import * as auditTrail from "@/server/services/audit-trail";
import { canAccessStrategy, scopeStrategies } from "@/server/services/operator-isolation";
import { auditedProcedure } from "@/server/governance/governed-procedure";
const auditedProtected = auditedProcedure(protectedProcedure, "strategy");
const auditedAdmin = auditedProcedure(adminProcedure, "strategy");
/* lafusee:strangler-active */

export const strategyRouter = createTRPCRouter({
  create: auditedProtected
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      operatorId: z.string().optional(),
      clientId: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      businessContext: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sector, country, businessContext, clientId, ...rest } = input;
      const strategy = await ctx.db.strategy.create({
        data: {
          ...rest,
          userId: ctx.session.user.id,
          operatorId: input.operatorId ?? (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | undefined,
          clientId: clientId ?? undefined,
          businessContext: businessContext as Prisma.InputJsonValue,
        },
      });

      // Auto-create 8 pillars — seed A and V with Strategy metadata (Chantier -1)
      const biz = businessContext as Record<string, unknown> | undefined;
      const pillarSeeds: Record<string, Record<string, unknown>> = {
        a: {
          nomMarque: input.name,
          description: input.description ?? "",
          secteur: sector ?? "",
          pays: country ?? "",
          brandNature: biz?.brandNature ?? undefined,
          langue: (biz as Record<string, unknown> | undefined)?.language ?? "fr",
        },
        d: {},
        v: {
          businessModel: biz?.businessModel ?? undefined,
          economicModels: biz?.economicModels ?? undefined,
          positioningArchetype: biz?.positioningArchetype ?? undefined,
          salesChannel: biz?.salesChannel ?? undefined,
          freeLayer: biz?.freeLayer ?? undefined,
        },
        e: {},
        r: {},
        t: {},
        i: {},
        s: {},
      };
      // Clean undefined values to avoid Prisma issues
      for (const obj of Object.values(pillarSeeds)) {
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined) delete obj[k];
        }
      }
      for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
        await ctx.db.pillar.create({
          data: {
            strategyId: strategy.id,
            key,
            content: pillarSeeds[key] as Prisma.InputJsonValue,
            confidence: key === "a" || key === "v" ? 0.1 : 0,
          },
        });
      }

      // Chantier 7 — Seed SESHAT with sector benchmarks
      if (sector) {
        await ctx.db.knowledgeEntry.create({
          data: {
            entryType: "SECTOR_BENCHMARK",
            sector: sector,
            market: country ?? "",
            data: { source: "initial_seed", benchmarkType: "sector_defaults" },
            successScore: 50,
            sampleSize: 0,
            sourceHash: `seed-${strategy.id}`,
          },
        }).catch(() => {}); // Non-fatal
      }

      // Auto-create VariableStoreConfig
      await ctx.db.variableStoreConfig.create({
        data: { strategyId: strategy.id, stalenessThresholdDays: 30, autoRecalculate: true },
      }).catch((err) => { console.warn("[strategy] variable-store config creation failed:", err instanceof Error ? err.message : err); });

      // Auto-create BrandOSConfig
      await ctx.db.brandOSConfig.create({
        data: { strategyId: strategy.id, config: { currency: "XAF", language: "fr" } },
      }).catch((err) => { console.warn("[strategy] brandOS config creation failed:", err instanceof Error ? err.message : err); });

      // Auto-create Deal in CRM
      await ctx.db.deal.create({
        data: {
          strategyId: strategy.id,
          userId: ctx.session.user.id,
          contactName: ctx.session.user.name ?? "",
          contactEmail: ctx.session.user.email ?? "",
          companyName: input.name,
          stage: "WON",
          source: "COCKPIT_CREATE",
          wonAt: new Date(),
        },
      }).catch((err) => { console.warn("[strategy] CRM deal creation failed:", err instanceof Error ? err.message : err); });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "CREATE",
        entityType: "Strategy",
        entityId: strategy.id,
        newValue: { name: input.name, sector, country },
      }).catch((err) => { console.warn("[audit-trail] strategy create log failed:", err instanceof Error ? err.message : err); });

      return strategy;
    }),

  update: auditedProtected
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      advertis_vector: z.record(z.number()).optional(),
      recalculateScore: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, advertis_vector, recalculateScore, ...data } = input;

      // Enforce operator isolation
      const hasAccess = await canAccessStrategy(id, {
        operatorId: (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const previous = await ctx.db.strategy.findUniqueOrThrow({ where: { id } });
      const updated = await ctx.db.strategy.update({
        where: { id },
        data: {
          ...data,
          ...(advertis_vector ? { advertis_vector: advertis_vector as Prisma.InputJsonValue } : {}),
        },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Strategy",
        entityId: id,
        oldValue: { name: previous.name, status: previous.status },
        newValue: { ...data },
      }).catch((err) => { console.warn("[audit-trail] strategy update log failed:", err instanceof Error ? err.message : err); });

      // Auto-recalculate score via the unified scorer (Chantier 2 — LOI 2)
      if (recalculateScore !== false) {
        try {
          // scoreObject persists the vector + creates snapshot internally
          await scoreObject("strategy", id);
        } catch (err) {
          console.warn("[strategy] score recalculation failed:", err instanceof Error ? err.message : err);
        }
      }

      return updated;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await canAccessStrategy(input.id, {
        operatorId: (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });
      return ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          pillars: true,
          drivers: { where: { deletedAt: null } },
          campaigns: true,
          devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 1 },
          brandAssets: { take: 10 },
          client: { select: { id: true, name: true, sector: true, country: true } },
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({
      operatorId: z.string().optional(),
      clientId: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Enforce operator isolation: non-ADMIN users can only see their operator's strategies
      const userRole = ctx.session.user.role ?? "USER";
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const operatorScope = scopeStrategies({ operatorId: userOperatorId, userId: ctx.session.user.id, role: userRole });

      return ctx.db.strategy.findMany({
        where: {
          ...operatorScope,
          ...(input.operatorId && userRole === "ADMIN" ? { operatorId: input.operatorId } : {}),
          ...(input.clientId ? { clientId: input.clientId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          pillars: true,
          client: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  delete: auditedAdmin
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.strategy.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "DELETE",
        entityType: "Strategy",
        entityId: input.id,
        newValue: { status: "ARCHIVED" },
      }).catch((err) => { console.warn("[audit-trail] strategy delete log failed:", err instanceof Error ? err.message : err); });

      return result;
    }),

  getWithScore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: { pillars: true, client: { select: { id: true, name: true } } },
      });
      const vector = strategy.advertis_vector as Record<string, number> | null;
      const composite = vector
        ? ["a","d","v","e","r","t","i","s"].reduce((sum, k) => sum + (vector[k] ?? 0), 0)
        : 0;
      return { ...strategy, composite, classification: classifyScore(composite) };
    }),

  // Admin: migrate existing strategies to v4 pillar structure
  migrateToV4: auditedAdmin
    .mutation(async () => {
      const { migrateAllStrategies } = await import("@/server/services/utils/migrate-strategy-to-pillars");
      return migrateAllStrategies();
    }),

  /**
   * comparables — list peer strategies semantically similar to this one.
   * Powered by the Seshat ranker. Graceful empty when no embeddings exist.
   */
  comparables: protectedProcedure
    .input(z.object({ strategyId: z.string(), topK: z.number().min(1).max(20).default(8) }))
    .query(async ({ input, ctx }) => {
      const { findSimilarAcrossStrategies } = await import(
        "@/server/services/seshat/context-store"
      );
      const peers = await findSimilarAcrossStrategies(input.strategyId, {
        kinds: ["BRANDLEVEL", "NARRATIVE"],
        topK: input.topK * 3, // over-fetch then dedupe by strategy
      });
      // Aggregate by strategy
      const byStrategy = new Map<
        string,
        { strategyId: string; nodeCount: number; topSimilarity: number }
      >();
      for (const p of peers) {
        const existing = byStrategy.get(p.strategyId);
        if (existing) {
          existing.nodeCount++;
          existing.topSimilarity = Math.max(existing.topSimilarity, p.similarity);
        } else {
          byStrategy.set(p.strategyId, {
            strategyId: p.strategyId,
            nodeCount: 1,
            topSimilarity: p.similarity,
          });
        }
      }
      const ids = Array.from(byStrategy.keys()).slice(0, input.topK);
      if (ids.length === 0) return [];

      const strategies = await ctx.db.strategy.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          businessContext: true,
          financialCapacity: true,
          advertis_vector: true,
          brandNature: true,
        },
      });
      const stratMap = new Map(strategies.map((s) => [s.id, s]));

      return ids
        .map((id) => {
          const s = stratMap.get(id);
          const stats = byStrategy.get(id)!;
          return {
            strategyId: id,
            name: s?.name ?? null,
            brandNature: s?.brandNature ?? null,
            businessContext: s?.businessContext ?? null,
            financialCapacity: s?.financialCapacity ?? null,
            composite:
              (s?.advertis_vector as Record<string, number> | null)?.composite ?? null,
            topSimilarity: stats.topSimilarity,
            nodeMatches: stats.nodeCount,
          };
        })
        .sort((a, b) => b.topSimilarity - a.topSimilarity);
    }),
});

function classifyScore(composite: number): string {
  if (composite <= 80) return "ZOMBIE";
  if (composite <= 120) return "ORDINAIRE";
  if (composite <= 160) return "FORTE";
  if (composite <= 180) return "CULTE";
  return "ICONE";
}
