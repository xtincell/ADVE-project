import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { scoreObject } from "@/server/services/advertis-scorer";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import * as auditTrail from "@/server/services/audit-trail";
import { canAccessStrategy, scopeStrategies } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
import * as strategyArchive from "@/server/services/strategy-archive";
import { emitIntent } from "@/server/services/mestor/intents";
import { PILLAR_STORAGE_KEYS } from "@/domain";
/* lafusee:governed-active */

export const strategyRouter = createTRPCRouter({
  create: governedProcedure({

    kind: "LEGACY_STRATEGY_CREATE",

    inputSchema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      operatorId: z.string().optional(),
      clientId: z.string().optional(),
      sector: z.string().optional(),
      country: z.string().optional(),
      businessContext: z.record(z.string(), z.unknown()).optional(),
    }),

    caller: "strategy:create",

  })
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
      for (const key of [...PILLAR_STORAGE_KEYS]) {
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

  update: governedProcedure({


    kind: "LEGACY_STRATEGY_UPDATE",


    inputSchema: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      advertis_vector: z.record(z.string(), z.number()).optional(),
      recalculateScore: z.boolean().optional(),
    }),


    caller: "strategy:update",


  })
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

  /**
   * Phase 18 (ADR-0059) — Brand-only listing for the cockpit selector.
   *
   * Round 4 (2026-05-07) — strict filter aux niveaux **MARQUES**
   * uniquement : CORPORATE + MASTER_BRAND + STANDALONE_BRAND. Les niveaux
   * REGIONAL_CLUSTER, REGIONAL_BRAND, PRODUCT_LINE, PRODUCT_VARIANT, SKU
   * sont **exclus du sélecteur** — ils représentent des *vues marché*
   * d'une marque, pas des marques distinctes. Ils sont accessibles via le
   * `<BrandMarketCommutator>` à l'intérieur de la page brand sélectionnée.
   *
   *   Sélecteur header (cockpit) :       Page de la marque (cockpit/brand) :
   *   ─────────────────────              ────────────────────────────────
   *   🏢 FrieslandCampina      Corporate │ [Vue globale] [CI] [CM] [SN] [TG]
   *   🏢 Bonnet Rouge          Master    │
   *   🏢 Belle Hollandaise     Master    │ ↑ tabs marché — chaque tab applique
   *   🏢 BLISS by Wakanda      Solo      │   l'héritage `resolveEffectivePillars`
   *   ⚙ Peak                   Master    │   du regional brand correspondant
   *   ⚙ Coast                  Master    │
   *   ...                                │
   *
   * Modèle conceptuel :
   *   - 1 Strategy / 1 BrandNode = 1 *marque* (l'ADN, l'identity, l'ADVE)
   *   - 1 marque = N marchés (vues filtrées par regional brand enfant)
   *   - L'héritage est géré par `brandNode.resolveEffectivePillars` :
   *     vue marché = pillars du regional + overrides locaux
   *     (langue spécifique, Overton ajusté, maturité différente)
   */
  brandTreeForSelector: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const userRole = ctx.session.user.role ?? "USER";
      const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
      const operatorScope = scopeStrategies({ operatorId: userOperatorId, userId: ctx.session.user.id, role: userRole });
      const operatorIdFilter: { operatorId?: string } = {};
      if ((operatorScope as { operatorId?: string }).operatorId) {
        operatorIdFilter.operatorId = (operatorScope as { operatorId: string }).operatorId;
      }

      // BRAND-LEVEL nodes only (no markets, no SKUs).
      const BRAND_LEVEL_KINDS = ["CORPORATE", "MASTER_BRAND", "STANDALONE_BRAND"] as const;

      const [nodes, strategies] = await Promise.all([
        ctx.db.brandNode.findMany({
          where: {
            ...operatorIdFilter,
            archivedAt: null,
            nodeKind: { in: [...BRAND_LEVEL_KINDS] },
          },
          select: {
            id: true, name: true, slug: true, nodeKind: true, nodeNature: true,
            countryCode: true, parentNodeId: true, strategyId: true, lifecycle: true,
          },
          orderBy: [{ nodeKind: "asc" }, { name: "asc" }],
        }),
        ctx.db.strategy.findMany({
          where: { ...operatorScope, archivedAt: null },
          select: { id: true, name: true, status: true, advertis_vector: true },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      const strategyById = new Map(strategies.map((s) => [s.id, s]));

      // Identify which Strategies are attached to *any* BrandNode (incl.
      // regional/SKU non-brand-level). A Strategy attached to a regional
      // brand should NOT appear as standalone in the selector — it belongs
      // to its master via the parent chain. Query separately to avoid
      // pulling all non-brand-level nodes.
      const allLinkedRows = await ctx.db.brandNode.findMany({
        where: { ...operatorIdFilter, archivedAt: null, strategyId: { not: null } },
        select: { strategyId: true },
      });
      const linkedStrategyIds = new Set(
        allLinkedRows.map((r) => r.strategyId).filter((id): id is string => typeof id === "string"),
      );

      const standaloneStrategies = strategies.filter((s) => !linkedStrategyIds.has(s.id));

      return {
        nodes: nodes.map((n) => ({
          ...n,
          strategy: n.strategyId ? strategyById.get(n.strategyId) ?? null : null,
        })),
        standaloneStrategies,
      };
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

      const strategies = await ctx.db.strategy.findMany({
        where: {
          ...operatorScope,
          ...(input.operatorId && userRole === "ADMIN" ? { operatorId: input.operatorId } : {}),
          ...(input.clientId ? { clientId: input.clientId } : {}),
          ...(input.status ? { status: input.status } : {}),
          archivedAt: null,
        },
        include: {
          pillars: true,
          client: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Phase 18 (ADR-0059) — enrich each strategy with its BrandNode parent
      // so the cockpit StrategySelector can group sibling strategies under
      // their CORPORATE umbrella. Previously the dropdown rendered
      // "FrieslandCampina – RDC", "– Sénégal", "– Togo" as flat peers of the
      // corporate "FrieslandCampina" Strategy, hiding the brand-tree
      // hierarchy that already exists in BrandNode (the portfolio page used
      // the tree, the dropdown didn't).
      if (strategies.length === 0) return strategies as Array<typeof strategies[number] & { brandNode: null }>;

      const brandNodes = await ctx.db.brandNode.findMany({
        where: { strategyId: { in: strategies.map((s) => s.id) } },
        select: {
          strategyId: true,
          parentNodeId: true,
          nodeKind: true,
          countryCode: true,
        },
      });
      const nodeByStrategy = new Map(brandNodes.map((n) => [n.strategyId!, n]));
      const parentIds = brandNodes
        .map((n) => n.parentNodeId)
        .filter((id): id is string => typeof id === "string");
      const parents = parentIds.length > 0
        ? await ctx.db.brandNode.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, name: true, nodeKind: true, slug: true },
          })
        : [];
      const parentById = new Map(parents.map((p) => [p.id, p]));

      return strategies.map((s) => {
        const node = nodeByStrategy.get(s.id);
        const parent = node?.parentNodeId ? parentById.get(node.parentNodeId) : null;
        return {
          ...s,
          brandNode: node
            ? {
                nodeKind: node.nodeKind,
                countryCode: node.countryCode,
                parent: parent
                  ? { id: parent.id, name: parent.name, nodeKind: parent.nodeKind, slug: parent.slug }
                  : null,
              }
            : null,
        };
      });
    }),

  // ── Archive system 2-phase (archive → purge) — ADR-0028 ─────────────
  // Toutes les mutations transitent par mestor.emitIntent() (NEFER §3
  // interdit absolu : bypass governance interdit). Le handler en aval
  // (strategy-archive.archiveStrategyHandler/restore/purge) retourne un
  // HandlerResult uniforme (status OK | VETOED + reason).

  archive: governedProcedure({


    kind: "LEGACY_STRATEGY_ARCHIVE",


    inputSchema: z.object({ id: z.string(), reason: z.string().optional() }),


    caller: "strategy:archive",


  })
    .mutation(async ({ ctx, input }) => {
      const opCtx = {
        userId: ctx.session.user.id,
        role: (ctx.session.user.role ?? "USER") as "USER" | "OPERATOR" | "ADMIN",
        operatorId: ((ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null) ?? null,
      };
      const ok = await canAccessStrategy(input.id, opCtx);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });
      const result = await emitIntent(
        {
          kind: "OPERATOR_ARCHIVE_STRATEGY",
          strategyId: input.id,
          operatorId: opCtx.operatorId ?? opCtx.userId,
          reason: input.reason,
        },
        { caller: "trpc:strategy.archive" },
      );
      if (result.status !== "OK") {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.summary ?? result.reason ?? "Archive vetoed" });
      }
      return result.output as { id: string; archivedAt: Date };
    }),

  restore: governedProcedure({


    kind: "LEGACY_STRATEGY_RESTORE",


    inputSchema: z.object({ id: z.string() }),


    caller: "strategy:restore",


  })
    .mutation(async ({ ctx, input }) => {
      const opCtx = {
        userId: ctx.session.user.id,
        role: (ctx.session.user.role ?? "USER") as "USER" | "OPERATOR" | "ADMIN",
        operatorId: ((ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null) ?? null,
      };
      const ok = await canAccessStrategy(input.id, opCtx);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });
      const result = await emitIntent(
        {
          kind: "OPERATOR_RESTORE_STRATEGY",
          strategyId: input.id,
          operatorId: opCtx.operatorId ?? opCtx.userId,
        },
        { caller: "trpc:strategy.restore" },
      );
      if (result.status !== "OK") {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.summary ?? result.reason ?? "Restore vetoed" });
      }
      return result.output as { id: string };
    }),

  purge: governedProcedure({


    kind: "LEGACY_STRATEGY_PURGE",


    inputSchema: z.object({ id: z.string(), confirmName: z.string().min(1) }),


    caller: "strategy:purge",


  })
    .mutation(async ({ ctx, input }) => {
      const opCtx = {
        userId: ctx.session.user.id,
        role: (ctx.session.user.role ?? "USER") as "USER" | "OPERATOR" | "ADMIN",
        operatorId: ((ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null) ?? null,
      };
      const ok = await canAccessStrategy(input.id, opCtx);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });
      // Anti-foot-gun pre-check on tRPC side — confirmName must equal Strategy.name UPPER.
      const target = await ctx.db.strategy.findUnique({
        where: { id: input.id },
        select: { name: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.confirmName.trim().toUpperCase() !== target.name.toUpperCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "confirmName must match Strategy.name (uppercase)" });
      }
      const result = await emitIntent(
        {
          kind: "OPERATOR_PURGE_ARCHIVED_STRATEGY",
          strategyId: input.id,
          operatorId: opCtx.operatorId ?? opCtx.userId,
          confirmName: input.confirmName,
        },
        { caller: "trpc:strategy.purge" },
      );
      if (result.status !== "OK") {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.summary ?? result.reason ?? "Purge vetoed" });
      }
      return result.output as { strategyId: string; totalRowsDeleted: number; tablesAffected: { table: string; rows: number }[] };
    }),

  listArchived: protectedProcedure.query(async ({ ctx }) => {
    const userRole = ctx.session.user.role ?? "USER";
    const userOperatorId = (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null;
    const operatorScope = userRole === "ADMIN" ? undefined : userOperatorId;
    return strategyArchive.listArchivedStrategies(operatorScope);
  }),

  delete: governedProcedure({


    kind: "LEGACY_STRATEGY_DELETE",


    inputSchema: z.object({ id: z.string() }),


    caller: "strategy:delete",


  })
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
        ? [...PILLAR_STORAGE_KEYS].reduce((sum, k) => sum + (vector[k] ?? 0), 0)
        : 0;
      return { ...strategy, composite, classification: classifyScore(composite) };
    }),

  // Admin: migrate existing strategies to v4 pillar structure
  migrateToV4: governedProcedure({
    kind: "LEGACY_STRATEGY_MIGRATE_TO_V4",
    inputSchema: z.object({}),
    caller: "strategy:migrateToV4",
  }).mutation(async () => {
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
