import { z } from "zod";
import { classifyTier } from "@/domain";
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
      // Résout vers un User réellement présent en base — la session JWT peut
      // porter un id orphelin après re-seed (sinon FK Strategy_userId_fkey).
      const { resolveSessionUserId } = await import("../resolve-session-user");
      const userId = await resolveSessionUserId(ctx);
      const strategy = await ctx.db.strategy.create({
        data: {
          ...rest,
          userId,
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

      // Initialize structured responses object
      const bizCtx = (biz ?? {}) as Record<string, unknown>;
      const initialResponses = {
        biz: {
          biz_model: bizCtx.businessModel ?? null,
          biz_nature: bizCtx.brandNature ?? null,
          biz_revenue: bizCtx.economicModels ?? [],
          biz_positioning: bizCtx.positioningArchetype ?? null,
          biz_sales_channel: bizCtx.salesChannel ?? null,
          biz_free_element: bizCtx.freeLayer ? (bizCtx.freeLayer as any).whatIsFree : "NONE",
          biz_free_detail: bizCtx.freeLayer ? (bizCtx.freeLayer as any).whatIsPaid : "",
          biz_premium_scope: bizCtx.premiumScope ?? "NONE",
        },
        a: {
          a_vision: "",
          a_mission: "",
          a_noyau: input.name,
          a_values: "",
          a_origin: "",
          a_archetype: "",
          a_citation: "",
        },
        d: {
          d_positioning: "",
          d_promise: "",
          d_persona_principal: "",
          d_persona_secondary: "",
          d_visual: "Inexistante",
          d_voice: "Pas defini",
          d_competitors: "",
        },
        v: {
          v_promise: "",
          v_products: "",
          v_experience: "5",
        },
        e: {
          e_community: "Aucune",
          e_loyalty: "10-30%",
          e_advocates: "Rarement",
          e_rituals: "",
        },
        r: {
          r_threats: "",
          r_crisis: "Non",
          r_reputation: "Pas du tout",
        },
        t: {
          t_kpis: "",
          t_measurement: "Jamais",
          t_nps: "Non",
        },
        i: {
          i_roadmap: "Non",
          i_budget: "< 2%",
          i_team: "Personne de dedie",
        },
        s: {
          s_guidelines: "Non",
          s_coherence: "5",
          s_ambition: "",
        }
      };

      // Auto-create QuickIntake to act as the biz intake for the cockpit-created brand
      const quickIntake = await ctx.db.quickIntake.create({
        data: {
          contactName: ctx.session.user.name ?? "System",
          contactEmail: ctx.session.user.email ?? "system@lafusee.io",
          companyName: input.name,
          sector: sector ?? null,
          country: country ?? null,
          businessModel: bizCtx.businessModel as string ?? null,
          economicModel: Array.isArray(bizCtx.economicModels) ? (bizCtx.economicModels as string[]).join(",") : null,
          positioning: bizCtx.positioningArchetype as string ?? null,
          brandNature: bizCtx.brandNature as string ?? null,
          responses: initialResponses as Prisma.InputJsonValue,
          status: "CONVERTED",
          convertedToId: strategy.id,
        }
      });

      // Auto-create BrandDataSource of type MANUAL_INPUT linked to the QuickIntake
      const rawContent = formatIntakeRawContent(input.name, initialResponses);
      await ctx.db.brandDataSource.create({
        data: {
          strategyId: strategy.id,
          sourceType: "MANUAL_INPUT",
          fileName: `Quick Intake — ${input.name}`,
          rawContent,
          rawData: initialResponses as Prisma.InputJsonValue,
          extractedFields: initialResponses as Prisma.InputJsonValue,
          pillarMapping: { a: true, d: true, v: true, e: true } as Prisma.InputJsonValue,
          processingStatus: "PROCESSED",
          certainty: "DECLARED",
          origin: `intake:${quickIntake.id}`,
        },
      }).catch((err) => { console.warn("[strategy] BrandDataSource creation failed:", err); });

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
          userId,
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

      // BRAND-LEVEL nodes : holdings, filiales, marques-mères, gammes
      // (= plateformes de marque). Cf. ADR-0061 + user correction du
      // 2026-05-07 ("c'est la gamme qui devient la plateforme de marque").
      // PRODUCT_LINE inclus car c'est le niveau où ADVE-RTIS s'attache pour
      // les FMCG (Amigo, Robuste, LaPasta, Bonnet Rouge IMP/EVAP/SCM, …).
      // PRODUCT_VARIANT / SKU restent exclus (granularité format/référence).
      const BRAND_LEVEL_KINDS = [
        "CORPORATE",
        "MASTER_BRAND",
        "STANDALONE_BRAND",
        "PRODUCT_LINE",
      ] as const;

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
  return classifyTier(composite);
}

export function formatIntakeRawContent(name: string, responses: Record<string, any>): string {
  const parts: string[] = [];
  parts.push(`=== Fiche d'Intake : ${name} ===`);
  
  const biz = responses.biz ?? {};
  if (biz.biz_model) parts.push(`Modèle d'affaires: ${biz.biz_model}`);
  if (biz.biz_nature) parts.push(`Nature de marque: ${biz.biz_nature}`);
  if (biz.biz_revenue) parts.push(`Modèle économique: ${Array.isArray(biz.biz_revenue) ? biz.biz_revenue.join(", ") : biz.biz_revenue}`);
  if (biz.biz_positioning) parts.push(`Positionnement prix: ${biz.biz_positioning}`);
  if (biz.biz_sales_channel) parts.push(`Canal de vente: ${biz.biz_sales_channel}`);
  if (biz.biz_free_element) parts.push(`Partie gratuite: ${biz.biz_free_element}`);
  if (biz.biz_free_detail) parts.push(`Détail gratuité: ${biz.biz_free_detail}`);
  if (biz.biz_premium_scope) parts.push(`Gamme premium: ${biz.biz_premium_scope}`);

  const a = responses.a ?? {};
  if (a.a_vision) parts.push(`Vision: ${a.a_vision}`);
  if (a.a_mission) parts.push(`Mission: ${a.a_mission}`);
  if (a.a_noyau) parts.push(`Noyau identitaire: ${a.a_noyau}`);
  if (a.a_values) parts.push(`Valeurs: ${a.a_values}`);
  if (a.a_origin) parts.push(`Origine: ${a.a_origin}`);
  if (a.a_archetype) parts.push(`Archétype: ${a.a_archetype}`);
  if (a.a_citation) parts.push(`Citation: ${a.a_citation}`);

  const d = responses.d ?? {};
  if (d.d_positioning) parts.push(`Positionnement unique: ${d.d_positioning}`);
  if (d.d_promise) parts.push(`Promesse maître: ${d.d_promise}`);
  if (d.d_persona_principal) parts.push(`Persona principal: ${d.d_persona_principal}`);
  if (d.d_persona_secondary) parts.push(`Persona secondaire: ${d.d_persona_secondary}`);
  if (d.d_visual) parts.push(`Identité visuelle: ${d.d_visual}`);
  if (d.d_voice) parts.push(`Ton de voix: ${d.d_voice}`);
  if (d.d_competitors) parts.push(`Concurrents: ${d.d_competitors}`);

  const v = responses.v ?? {};
  if (v.v_promise) parts.push(`Promesse client: ${v.v_promise}`);
  if (v.v_products) parts.push(`Produits/services: ${v.v_products}`);
  if (v.v_experience) parts.push(`Expérience client: ${v.v_experience}/10`);

  const e = responses.e ?? {};
  if (e.e_community) parts.push(`Communauté: ${e.e_community}`);
  if (e.e_loyalty) parts.push(`Fidélité client: ${e.e_loyalty}`);
  if (e.e_advocates) parts.push(`Recommandation: ${e.e_advocates}`);
  if (e.e_rituals) parts.push(`Rituels: ${e.e_rituals}`);

  const r = responses.r ?? {};
  if (r.r_threats) parts.push(`Risques: ${r.r_threats}`);
  if (r.r_crisis) parts.push(`Plan de crise: ${r.r_crisis}`);
  if (r.r_reputation) parts.push(`Suivi réputation: ${r.r_reputation}`);

  const t = responses.t ?? {};
  if (t.t_kpis) parts.push(`KPIs: ${t.t_kpis}`);
  if (t.t_measurement) parts.push(`Fréquence de mesure: ${t.t_measurement}`);
  if (t.t_nps) parts.push(`Connaissance NPS: ${t.t_nps}`);

  const i = responses.i ?? {};
  if (i.i_roadmap) parts.push(`Plan marketing: ${i.i_roadmap}`);
  if (i.i_budget) parts.push(`Budget marketing (% CA): ${i.i_budget}`);
  if (i.i_team) parts.push(`Gestion marketing: ${i.i_team}`);

  const s = responses.s ?? {};
  if (s.s_guidelines) parts.push(`Guidelines de marque: ${s.s_guidelines}`);
  if (s.s_coherence) parts.push(`Cohérence communication: ${s.s_coherence}/10`);
  if (s.s_ambition) parts.push(`Ambition à 3 ans: ${s.s_ambition}`);

  return parts.filter(Boolean).join("\n");
}
