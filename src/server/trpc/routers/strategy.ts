import { z } from "zod";
import { classifyTier, MarketScaleSchema, BrandTierSchema, effectiveTier } from "@/domain";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure, operatorProcedure } from "../init";
import { assertStrategyRead } from "./_strategy-read-guard";
import { scoreObject } from "@/server/services/advertis-scorer";
import { propagateFromPillar } from "@/server/services/staleness-propagator";
import * as auditTrail from "@/server/services/audit-trail";
import { canAccessStrategy, scopeStrategies } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
import * as strategyArchive from "@/server/services/strategy-archive";
import { emitIntent, type Intent } from "@/server/services/mestor/intents";
import { PILLAR_STORAGE_KEYS } from "@/domain";
import {
  evaluatePalierTransition,
  tierTransitionKind,
  KIND_TRANSITIONS,
  type TierTransitionDirection,
} from "@/server/services/mestor/gates/palier-promotion-proofs";
import { computeEvidenceBreakdown } from "@/server/services/advertis-scorer/evidence";
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
      // ADR-0126 — échelle de marché DÉCLARÉE (étalonne le plafond d'évidence).
      marketScale: MarketScaleSchema.nullable().optional(),
      addressableAudience: z.number().int().positive().max(8_000_000_000).nullable().optional(),
      brandFoundedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
      // Audit 2026-07-16 (`market-feed-cta-dead-end-sector`) : pays + secteur
      // sont LES clés de la veille marché (external-feeds, intelligence
      // sectorielle, axe Overton) mais aucune surface ne permettait de les
      // poser sur une marque existante — veille définitivement morte.
      countryCode: z.string().length(2).nullable().optional(),
      sector: z.string().max(120).nullable().optional(),
      // ADR-0165 — sujets de veille suivis (édition manuelle, prime sur le
      // dérivé ADVE). [] = revenir au dérivé automatique.
      watchSubjects: z.array(z.string().min(3).max(60)).max(8).optional(),
      // ADR-0175/audit adversarial — `advertis_vector` RETIRÉ de l'input mutable :
      // il est POSSÉDÉ par le scoreur (scoreObject, evidence-capped ADR-0126).
      // L'accepter verbatim laissait un founder poser composite=200 sans évidence
      // (recalculateScore:false) puis empoisonner la preview et forger un palier
      // ICONE ratcheté (ADR-0167). Aucun caller ne le passait — trou pur.
      recalculateScore: z.boolean().optional(),
      // Audit 2026-07-16 `public-page-no-founder-surface` : aucune surface
      // produit n'écrivait publicSlug (seeds/scripts uniquement) — le founder
      // ne pouvait ni activer sa page publique ni en connaître l'URL.
      enablePublicPage: z.boolean().optional(),
    }),


    caller: "strategy:update",


  })
    .mutation(async ({ ctx, input }) => {
      const { id, recalculateScore, sector, enablePublicPage, watchSubjects, ...data } = input;

      // Enforce operator isolation
      const hasAccess = await canAccessStrategy(id, {
        operatorId: (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

      const previous = await ctx.db.strategy.findUniqueOrThrow({ where: { id } });
      // Secteur / sujets de veille : MERGE dans businessContext (jamais un
      // écrasement du JSON). watchSubjects: [] = purge (retour au dérivé ADVE).
      const mergedBusinessContext =
        sector !== undefined || watchSubjects !== undefined
          ? ({
              ...((previous.businessContext as Record<string, unknown> | null) ?? {}),
              ...(sector !== undefined ? { sector } : {}),
              ...(watchSubjects !== undefined ? { watchSubjects } : {}),
            } as Prisma.InputJsonValue)
          : undefined;
      // Page publique : slug canonique dérivé du nom (format LFA-, idempotent).
      // Non-latin-safe (jamais de throw) + désambiguïsation de collision (le slug
      // est @unique GLOBAL ; deux marques homonymes crashaient sinon en P2002 500).
      let publicSlugPatch: { publicSlug: string } | undefined;
      if (enablePublicPage && !previous.publicSlug) {
        const { brandPublicSlugSafe, disambiguateBrandSlug } = await import("@/domain/brand-slug");
        let candidate = brandPublicSlugSafe(previous.name, previous.id);
        const clash = await ctx.db.strategy.findFirst({
          where: { publicSlug: candidate, id: { not: id } },
          select: { id: true },
        });
        if (clash) candidate = disambiguateBrandSlug(candidate, previous.id);
        publicSlugPatch = { publicSlug: candidate };
      }
      const buildUpdateData = (slugPatch?: { publicSlug: string }) => ({
        ...data,
        ...(mergedBusinessContext !== undefined ? { businessContext: mergedBusinessContext } : {}),
        ...(slugPatch ?? {}),
      });
      let updated;
      try {
        updated = await ctx.db.strategy.update({ where: { id }, data: buildUpdateData(publicSlugPatch) });
      } catch (err) {
        // Course entre le findFirst et l'update sur le slug → réessai désambiguïsé.
        // Duck-typing sur `.code` (l'import Prisma est type-only ici).
        const isUniqueViolation =
          !!err && typeof err === "object" && (err as { code?: unknown }).code === "P2002";
        if (publicSlugPatch && isUniqueViolation) {
          const { disambiguateBrandSlug } = await import("@/domain/brand-slug");
          updated = await ctx.db.strategy.update({
            where: { id },
            data: buildUpdateData({ publicSlug: disambiguateBrandSlug(publicSlugPatch.publicSlug, previous.id) }),
          });
        } else throw err;
      }

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
      const nodeSelect = {
        id: true, name: true, slug: true, nodeKind: true, nodeNature: true,
        countryCode: true, parentNodeId: true, strategyId: true, lifecycle: true,
      } as const;

      // Les QUICK_INTAKE ne sont PAS des marques pilotables : ce sont des
      // leads non convertis, résolus côté Console (portfolio → « intakes à
      // convertir »). Ils n'apparaissent jamais dans le picker Cockpit.
      const strategies = await ctx.db.strategy.findMany({
        where: { ...operatorScope, archivedAt: null, status: { not: "QUICK_INTAKE" } },
        select: { id: true, name: true, status: true, advertis_vector: true },
        orderBy: { updatedAt: "desc" },
      });
      const ownStrategyIds = strategies.map((s) => s.id);

      // Scope des BrandNodes — MIROIR du scope stratégie (fix fuite
      // cross-tenant 2026-07-11) :
      //   ADMIN            → tous les nodes.
      //   membre opérateur → les nodes de SON opérateur.
      //   founder USER     → UNIQUEMENT les nodes porteurs d'une de SES
      //     stratégies + leurs ANCÊTRES (nécessaires au regroupement
      //     hiérarchique). Avant ce fix, le filtre restait vide pour un
      //     USER → le picker exposait l'arbre de marque de TOUS les
      //     clients (noms de holdings/marques d'autres tenants).
      let nodes: Array<{
        id: string; name: string; slug: string; nodeKind: string; nodeNature: string | null;
        countryCode: string | null; parentNodeId: string | null; strategyId: string | null; lifecycle: string;
      }>;
      let linkedStrategyIds: Set<string>;

      if (userRole === "ADMIN" || userOperatorId) {
        const operatorIdFilter = userOperatorId ? { operatorId: userOperatorId } : {};
        const [scopedNodes, allLinkedRows] = await Promise.all([
          ctx.db.brandNode.findMany({
            where: { ...operatorIdFilter, archivedAt: null, nodeKind: { in: [...BRAND_LEVEL_KINDS] } },
            select: nodeSelect,
            orderBy: [{ nodeKind: "asc" }, { name: "asc" }],
          }),
          ctx.db.brandNode.findMany({
            where: { ...operatorIdFilter, archivedAt: null, strategyId: { not: null } },
            select: { strategyId: true },
          }),
        ]);
        nodes = scopedNodes;
        linkedStrategyIds = new Set(
          allLinkedRows.map((r) => r.strategyId).filter((id): id is string => typeof id === "string"),
        );
      } else {
        // Founder : nodes porteurs de ses stratégies…
        const ownNodes = ownStrategyIds.length > 0
          ? await ctx.db.brandNode.findMany({
              where: { archivedAt: null, strategyId: { in: ownStrategyIds } },
              select: nodeSelect,
            })
          : [];
        // …+ clôture des ancêtres (profondeur bornée par la cascade FMCG : 7).
        const seen = new Set(ownNodes.map((n) => n.id));
        const collected = [...ownNodes];
        let frontier = [...new Set(
          ownNodes.map((n) => n.parentNodeId).filter((id): id is string => !!id && !seen.has(id)),
        )];
        for (let depth = 0; depth < 7 && frontier.length > 0; depth++) {
          const parents = await ctx.db.brandNode.findMany({
            where: { id: { in: frontier }, archivedAt: null },
            select: nodeSelect,
          });
          frontier = [];
          for (const p of parents) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            collected.push(p);
            if (p.parentNodeId && !seen.has(p.parentNodeId)) frontier.push(p.parentNodeId);
          }
        }
        nodes = collected
          .filter((n) => (BRAND_LEVEL_KINDS as readonly string[]).includes(n.nodeKind))
          .sort((a, b) => a.nodeKind.localeCompare(b.nodeKind) || a.name.localeCompare(b.name));
        linkedStrategyIds = new Set(
          ownNodes.map((n) => n.strategyId).filter((id): id is string => typeof id === "string"),
        );
      }

      const strategyById = new Map(strategies.map((s) => [s.id, s]));

      // Une Strategy attachée à un node (même régional/SKU hors brand-level)
      // n'apparaît PAS en standalone — elle appartient à sa chaîne parent.
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
      // Garde d'ownership (audit requireOperator 2026-07-11, Table E) : sans
      // elle, tout utilisateur authentifié pouvait archiver N'IMPORTE quelle
      // stratégie par id. Même garde que archive/restore/purge.
      const hasAccess = await canAccessStrategy(input.id, {
        operatorId: (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      });
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé" });

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

  /**
   * Suggestion d'audience adressable (amendement ADR-0126) : plancher factuel
   * depuis les DERNIERS relevés réels par réseau (FollowerSnapshot). Lecture
   * pure — la déclaration reste le clic du porteur (jamais d'auto-write).
   */
  getAudienceSuggestion: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { canAccessStrategy, getOperatorContext } = await import("@/server/services/operator-isolation");
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessStrategy(input.strategyId, opCtx))) {
        throw new Error("Cette marque ne vous appartient pas");
      }
      const snapshots = await ctx.db.followerSnapshot.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { capturedAt: "desc" },
        take: 60,
        select: { platform: true, followerCount: true, capturedAt: true },
      });
      const latest = new Map<string, { platform: string; followerCount: number; capturedAt: Date }>();
      for (const snap of snapshots) {
        const key = String(snap.platform);
        if (!latest.has(key)) latest.set(key, { platform: key, followerCount: snap.followerCount, capturedAt: snap.capturedAt });
      }
      const { computeAudienceSuggestion } = await import("@/domain");
      const suggestion = computeAudienceSuggestion([...latest.values()]);
      return suggestion
        ? {
            ...suggestion,
            capturedAt: [...latest.values()]
              .map((v) => v.capturedAt.toISOString())
              .sort()
              .at(-1) ?? null,
          }
        : null;
    }),

  getWithScore: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // IDOR (round-10) : keyé sur `{ id }` (= le strategyId, mais NOMMÉ `id` donc
      // invisible à la garde de tête ADR-0175) → fuite complète des piliers ADVE
      // d'une marque arbitraire. Garde de lecture explicite.
      await assertStrategyRead(ctx.session.user.id, input.id);
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
    requireOperator: true,
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
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
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

  /** Retourne la confiance et le statut du pilier S pour La Forge */
  getSynthesisConfidence: protectedProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const sPillar = await ctx.db.pillar.findFirst({
        where: { strategyId: input.strategyId, key: "s" },
      });

      const allPillars = await ctx.db.pillar.findMany({
        where: { strategyId: input.strategyId },
        select: { key: true, confidence: true, validationStatus: true },
      });

      const pillarScores = Object.fromEntries(
        allPillars.map((p) => [p.key, { confidence: p.confidence, status: p.validationStatus }])
      );

      return {
        confidence: sPillar?.confidence ?? null,
        validationStatus: sPillar?.validationStatus ?? "DRAFT",
        fieldCertainty: sPillar?.fieldCertainty ?? null,
        pillarScores,
        hasLowConfidence: (sPillar?.confidence ?? 0) < 0.30,
        isAiProposed: sPillar?.validationStatus === "AI_PROPOSED",
      };
    }),

  validateSynthesis: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      /** Si true : force la validation même si confiance < 30% et met confidence=1.0 */
      forceConfidence: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      // 1. Lire le pilier S
      const sPillar = await ctx.db.pillar.findFirst({
        where: { strategyId: input.strategyId, key: "s" },
      });

      const confidence = sPillar?.confidence ?? 0;

      // 2. Si confiance < 30% et pas de forceConfidence → retourner un warning
      //    Le client affichera le modal de confirmation.
      if (confidence < 0.30 && !input.forceConfidence) {
        return {
          warning: true as const,
          confidence,
          validationStatus: sPillar?.validationStatus ?? "DRAFT",
          message: "Stratégie majoritairement inférée par l'IA. Confirmation requise.",
          updated: null,
        };
      }

      // 3. Valider la stratégie
      const updated = await ctx.db.strategy.update({
        where: { id: input.strategyId },
        data: { status: "VALIDATED" },
      });

      // 4. Si pilier S existe : mettre confidence=1.0 et status=VALIDATED
      if (sPillar) {
        await ctx.db.pillar.update({
          where: { id: sPillar.id },
          data: {
            confidence: 1.0,
            validationStatus: "VALIDATED",
          },
        });
      }

      // Audit trail (non-blocking)
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Strategy",
        entityId: input.strategyId,
        newValue: {
          status: "VALIDATED",
          sPillarConfidence: 1.0,
          forceConfidence: input.forceConfidence,
          previousConfidence: confidence,
        },
      }).catch((err) => { console.warn("[audit-trail] strategy validate log failed:", err); });

      return { warning: false as const, confidence: 1.0, updated };
    }),

  generateProjectsFromActions: governedProcedure({
    kind: "LEGACY_STRATEGY_GENERATE_PROJECTS_FROM_ACTIONS",
    inputSchema: z.object({
      strategyId: z.string(),
      actionIds: z.array(z.string()),
    }),
    caller: "strategy:generateProjectsFromActions",
  })
    .mutation(async ({ ctx, input }) => {
      if (!(await canAccessStrategy(input.strategyId, {
        operatorId: (ctx.session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
        userId: ctx.session.user.id,
        role: ctx.session.user.role ?? "USER",
      }))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé: cette stratégie appartient à un autre opérateur" });
      }

      const { generateCampaignCode, generateBriefFromBrandAction } = await import("@/server/services/campaign-manager");

      const strategy = await ctx.db.strategy.findUniqueOrThrow({
        where: { id: input.strategyId },
        include: { pillars: true },
      });

      const brandActions = await ctx.db.brandAction.findMany({
        where: {
          id: { in: input.actionIds },
          strategyId: input.strategyId,
        },
      });

      if (brandActions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Aucune action correspondante trouvée",
        });
      }

      const results = [];

      for (const action of brandActions) {
        const budgetPlanned = action.budgetMin ?? 0;

        // ADR-0119 — toute action appartient à une campagne. On NE crée PLUS une
        // campagne par action (flux inversé) : on attache la production à la
        // campagne existante de l'action (canon ou ponctuelle). Action orpheline
        // → on l'unifie dans une « campagne d'une action » (instruction opérateur).
        let campaign = action.campaignId
          ? await ctx.db.campaign.findFirst({ where: { id: action.campaignId, strategyId: input.strategyId } })
          : null;

        if (!campaign) {
          campaign = await ctx.db.campaign.create({
            data: {
              strategyId: input.strategyId,
              name: action.title,
              description: action.description ?? "",
              code: generateCampaignCode(),
              canonType: "PUNCTUAL",
              routeKey: action.source ?? "PUNCTUAL",
              budget: budgetPlanned,
              budgetCurrency: action.budgetCurrency ?? "XAF",
              startDate: action.timingStart,
              endDate: action.timingEnd,
              state: "PLANNING",
              status: "PLANNING",
              objectives: action.description ? { description: action.description } : undefined,
              advertis_vector: strategy.advertis_vector ?? undefined,
            },
          });
        }
        const campaignCode = campaign.code;

        // Pipeline staged (ADR-0119 + suite #367) : on rattache l'action à sa
        // campagne puis on génère son **brief de production en DRAFT** — et on
        // s'arrête là. Plus de brief auto-VALIDATED ni de mission auto : la
        // mission naît de la **validation opérateur** du brief (gate respectée,
        // `createMissionFromValidatedBrief`). Même générateur staged que le détail
        // de campagne ⇒ brief stampé `brandActionId`, détecté par chainHealth /
        // l'onglet Actions.
        await ctx.db.brandAction.update({
          where: { id: action.id },
          data: { status: "ACCEPTED", selected: true, campaignId: campaign.id },
        });
        const briefRes = await generateBriefFromBrandAction(action.id);

        results.push({
          actionId: action.id,
          campaignId: campaign.id,
          campaignCode,
          briefId: briefRes.briefId,
        });
      }

      return { success: true, count: results.length, projects: results };
    }),

  /**
   * ADR-0119 — génère les 3 campagnes canon (30-60-90 / annuelle / always-on) d'une
   * route depuis le Pilier I. Déterministe (zéro LLM), exception à STOP-à-Jehuty.
   * Rattache les actions sélectionnées aux campagnes (invariant : plus d'orpheline).
   */
  generateCanonicalCampaigns: governedProcedure({
    kind: "GENERATE_CANONICAL_CAMPAIGNS",
    inputSchema: z.object({
      strategyId: z.string(),
      routeKey: z.string().max(40).optional(),
      startDate: z.date().optional(),
    }),
    caller: "strategy:generateCanonicalCampaigns",
  }).mutation(async ({ ctx, input }) => {
    const strat = await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { id: true } });
    const { generateCanonicalCampaigns } = await import("@/server/services/campaign-canon");
    return generateCanonicalCampaigns({ strategyId: strat.id, routeKey: input.routeKey, startDate: input.startDate });
  }),

  /**
   * ADR-0119 — campagne ponctuelle (hors canon) déclenchée par un insight externe
   * / Jehuty, avec son action de tête rattachée. Déterministe.
   */
  createPunctualCampaign: governedProcedure({
    kind: "CREATE_PUNCTUAL_CAMPAIGN",
    inputSchema: z.object({
      strategyId: z.string(),
      title: z.string().min(3).max(200),
      description: z.string().max(2000).optional(),
      budget: z.number().nonnegative().optional(),
      aarrrPrimary: z.string().max(40).optional(),
      aarrrSecondary: z.string().max(40).optional(),
      insightSource: z.string().max(40).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }),
    caller: "strategy:createPunctualCampaign",
  }).mutation(async ({ ctx, input }) => {
    await ctx.db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { id: true } });
    const { createPunctualCampaign } = await import("@/server/services/campaign-canon");
    return createPunctualCampaign(input);
  }),

  // ════════════════════════════════════════════════════════════════════
  // ADR-0129 — Accès délégué par marque (StrategyCollaborator)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Collaborateurs délégués d'une marque (lecture). Owner / opérateur / ADMIN.
   * Ne renvoie jamais d'information de credential — uniquement l'équipe.
   */
  listCollaborators: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { getOperatorContext } = await import("@/server/services/operator-isolation");
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (!(await canAccessStrategy(input.strategyId, opCtx))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette marque ne vous appartient pas" });
      }
      return ctx.db.strategyCollaborator.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          scopes: true,
          status: true,
          createdAt: true,
          revokedAt: true,
          note: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }),

  /**
   * ADR-0131 — mini console du membre de Guilde : les marques où j'opère.
   * Trois réalités agrégées : accès cockpit délégués (collaborations ACTIVE),
   * missions où je suis assigné (en cours / retainers), candidatures et leur
   * statut. Aucune donnée de contact de la marque n'est exposée au-delà du
   * nom — le brief complet reste sur la mission.
   */
  myDelegatedBrands: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const { collaboratorWriteZones, COLLABORATOR_ROLE_LABELS } = await import("@/domain/collaborator-access");
    const [collaborations, assignedMissions, applications] = await Promise.all([
      ctx.db.strategyCollaborator.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          createdAt: true,
          strategy: { select: { id: true, name: true, status: true } },
        },
      }),
      ctx.db.mission.findMany({
        where: { assigneeId: userId, status: { in: ["OPEN", "IN_PROGRESS", "REVIEW"] } },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true, title: true, status: true, budget: true,
          strategy: { select: { id: true, name: true } },
        },
      }),
      ctx.db.missionApplication.findMany({
        where: { applicantId: userId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true, status: true, proposedRate: true, currency: true, createdAt: true,
          mission: { select: { id: true, title: true, publicSlug: true, strategy: { select: { name: true } } } },
        },
      }),
    ]);
    return {
      cockpits: collaborations.map((c) => ({
        strategyId: c.strategy.id,
        brandName: c.strategy.name,
        role: String(c.role),
        roleLabel: COLLABORATOR_ROLE_LABELS[String(c.role)] ?? String(c.role),
        writeZones: [...collaboratorWriteZones(String(c.role))],
        since: c.createdAt.toISOString(),
      })),
      missions: assignedMissions.map((m) => ({
        id: m.id, title: m.title, status: m.status, budget: m.budget,
        brandName: m.strategy?.name ?? null,
      })),
      applications: applications.map((a) => ({
        id: a.id, status: a.status, proposedRate: a.proposedRate, currency: a.currency,
        missionTitle: a.mission.title,
        brandName: a.mission.strategy?.name ?? null,
        at: a.createdAt.toISOString(),
      })),
    };
  }),

  /**
   * ADR-0131 — la nature de MON accès à cette marque (pour l'UI : chip
   * « accès délégué », masquage des gestes hors zone). Jamais de credential.
   */
  getMyAccess: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { collaboratorWriteZones, COLLABORATOR_ROLE_LABELS } = await import("@/domain/collaborator-access");
      const userId = ctx.session.user.id;
      if (ctx.session.user.role === "ADMIN") {
        return { access: "admin" as const, role: null, roleLabel: null, writeZones: ["*"] };
      }
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { userId: true, operatorId: true, client: { select: { operatorId: true } } },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Strategy introuvable" });
      if (strategy.userId === userId) {
        return { access: "owner" as const, role: null, roleLabel: null, writeZones: ["*"] };
      }
      const me = await ctx.db.user.findUnique({ where: { id: userId }, select: { operatorId: true } });
      if (me?.operatorId && (me.operatorId === strategy.operatorId || me.operatorId === strategy.client?.operatorId)) {
        return { access: "operator" as const, role: null, roleLabel: null, writeZones: ["*"] };
      }
      const collab = await ctx.db.strategyCollaborator.findUnique({
        where: { strategyId_userId: { strategyId: input.strategyId, userId } },
        select: { status: true, role: true },
      });
      if (collab?.status === "ACTIVE") {
        const role = String(collab.role);
        return {
          access: "collaborator" as const,
          role,
          roleLabel: COLLABORATOR_ROLE_LABELS[role] ?? role,
          writeZones: [...collaboratorWriteZones(role)],
        };
      }
      return { access: "none" as const, role: null, roleLabel: null, writeZones: [] };
    }),

  /**
   * Accorde un accès délégué (rôle d'équipe) sur UNE marque à un user existant
   * (talent Guilde, freelance, agence). Décision opérateur — requireOperator.
   * Upsert (strategyId, userId) : re-granter réactive une ligne révoquée.
   */
  grantCollaborator: governedProcedure({
    kind: "GRANT_STRATEGY_COLLABORATOR",
    inputSchema: z.object({
      strategyId: z.string().min(1),
      userEmail: z.string().email(),
      role: z.enum([
        "ACCOUNT_DIRECTOR", "ACCOUNT_MANAGER", "STRATEGIC_PLANNER", "CREATIVE_DIRECTOR",
        "ART_DIRECTOR", "COPYWRITER", "MEDIA_PLANNER", "MEDIA_BUYER", "SOCIAL_MANAGER",
        "PRODUCTION_MANAGER", "PROJECT_MANAGER", "DATA_ANALYST", "CLIENT", "DIGITAL_DIRECTOR",
      ]),
      scopes: z.array(z.string().max(40)).max(10).optional(),
      note: z.string().max(500).optional(),
    }),
    caller: "strategy:grantCollaborator",
    requireOperator: true,
  }).mutation(async ({ ctx, input }) => {
    const target = await ctx.db.user.findUnique({ where: { email: input.userEmail }, select: { id: true, name: true } });
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Aucun compte avec cet email" });
    const strategy = await ctx.db.strategy.findUnique({ where: { id: input.strategyId }, select: { id: true, name: true } });
    if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Marque introuvable" });
    const row = await ctx.db.strategyCollaborator.upsert({
      where: { strategyId_userId: { strategyId: input.strategyId, userId: target.id } },
      update: {
        role: input.role,
        scopes: (input.scopes ?? []) as Prisma.InputJsonValue,
        status: "ACTIVE",
        revokedAt: null,
        grantedByUserId: ctx.session.user.id,
        ...(input.note ? { note: input.note } : {}),
      },
      create: {
        strategyId: input.strategyId,
        userId: target.id,
        role: input.role,
        scopes: (input.scopes ?? []) as Prisma.InputJsonValue,
        status: "ACTIVE",
        grantedByUserId: ctx.session.user.id,
        note: input.note ?? null,
      },
      select: { id: true, role: true, status: true },
    });
    return { ...row, userName: target.name, strategyName: strategy.name };
  }),

  /** Révoque un accès délégué (ligne conservée pour l'audit — Loi 1). */
  revokeCollaborator: governedProcedure({
    kind: "REVOKE_STRATEGY_COLLABORATOR",
    inputSchema: z.object({ strategyId: z.string().min(1), collaboratorId: z.string().min(1) }),
    caller: "strategy:revokeCollaborator",
    requireOperator: true,
  }).mutation(async ({ ctx, input }) => {
    const row = await ctx.db.strategyCollaborator.findFirst({
      where: { id: input.collaboratorId, strategyId: input.strategyId },
      select: { id: true },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Collaborateur introuvable pour cette marque" });
    await ctx.db.strategyCollaborator.update({
      where: { id: row.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    return { revoked: true };
  }),

  // ══════════════════════════════════════════════════════════════════
  // ADR-0167 — Moteur de trajectoire APOGEE (transitions de palier)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Aperçu dry-run : palier officiel courant, palier impliqué par le score, et
   * pour chaque direction (promouvoir/rétrograder) si elle est permise + la
   * raison chiffrée (pour activer/désactiver le bouton sans émettre). Lecture
   * seule — ne ré-score jamais.
   */
  tierTransitionPreview: operatorProcedure
    .input(z.object({ strategyId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { apogeeTier: true, advertis_vector: true, marketScale: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Marque introuvable" });

      const composite = (strategy.advertis_vector as { composite?: number } | null)?.composite ?? 0;
      const currentTier = effectiveTier({ apogeeTier: strategy.apogeeTier, composite });
      const breakdown = await computeEvidenceBreakdown(input.strategyId);

      const evalDir = (direction: TierTransitionDirection) => {
        const kind = tierTransitionKind(currentTier, direction);
        if (!kind) return null; // apex (promote) ou plancher (demote)
        const meta = KIND_TRANSITIONS[kind]!;
        const verdict = evaluatePalierTransition({
          kind,
          currentEffectiveTier: currentTier,
          composite,
          superfanCount: breakdown.superfanCount,
          evidence: breakdown.evidence,
          superfansTarget: breakdown.superfansTarget,
          marketScaleDeclared: strategy.marketScale != null,
        });
        return { kind, targetTier: meta.toTier, allowed: verdict.verdict === "PASS", reason: verdict.reason ?? "" };
      };

      return {
        currentTier,
        impliedTier: classifyTier(composite),
        composite,
        apogeeTierSet: strategy.apogeeTier != null,
        superfanCount: breakdown.superfanCount,
        superfansTarget: breakdown.superfansTarget,
        marketScaleDeclared: strategy.marketScale != null,
        promote: evalDir("PROMOTE"),
        demote: evalDir("DEMOTE"),
      };
    }),

  /**
   * Historique de trajectoire (Loi 1) : les transitions de palier gouvernées,
   * lues depuis IntentEmission (registre append-only hash-chaîné). Pas de
   * modèle dédié — la hash-chain EST le registre.
   */
  tierTrajectory: operatorProcedure
    .input(z.object({ strategyId: z.string().min(1), limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const rows = await ctx.db.intentEmission.findMany({
        where: { strategyId: input.strategyId, intentKind: { in: Object.keys(KIND_TRANSITIONS) } },
        orderBy: { emittedAt: "desc" },
        take: input.limit,
        select: { id: true, intentKind: true, payload: true, result: true, status: true, emittedAt: true },
      });
      return rows.map((r) => {
        const meta = KIND_TRANSITIONS[r.intentKind];
        const payload = (r.payload ?? {}) as { reason?: string; operatorId?: string };
        // IntentEmission.status column peut rester PENDING ; l'issue réelle vit
        // dans result.status (OK / VETOED). On préfère result quand présent.
        const resultStatus = (r.result as { status?: string } | null)?.status;
        return {
          id: r.id,
          kind: r.intentKind,
          from: meta?.fromTier ?? null,
          to: meta?.toTier ?? null,
          direction: meta?.direction ?? null,
          reason: payload.reason ?? null,
          actor: payload.operatorId ?? null,
          outcome: resultStatus ?? r.status,
          emittedAt: r.emittedAt,
        };
      });
    }),

  /**
   * Décide une transition de palier : résout le kind depuis le palier EFFECTIF
   * courant + la direction, puis émet l'Intent gouverné (spine hash-chaîné,
   * gate PALIER_PROMOTION_PROOFS en pré-flight). Un refus du gate remonte au
   * front avec sa raison chiffrée. Voie bus (kind dynamique parmi les 10) — pas
   * `governedProcedure` (qui lie un kind fixe).
   */
  transitionTier: operatorProcedure
    .input(z.object({
      strategyId: z.string().min(1),
      direction: z.enum(["PROMOTE", "DEMOTE"]),
      reason: z.string().min(10).max(500),
      expectedFromTier: BrandTierSchema.optional(),
      evidenceRef: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertStrategyRead(ctx.session.user.id, input.strategyId);
      const strategy = await ctx.db.strategy.findUnique({
        where: { id: input.strategyId },
        select: { apogeeTier: true, advertis_vector: true },
      });
      if (!strategy) throw new TRPCError({ code: "NOT_FOUND", message: "Marque introuvable" });

      const composite = (strategy.advertis_vector as { composite?: number } | null)?.composite ?? 0;
      const from = effectiveTier({ apogeeTier: strategy.apogeeTier, composite });
      const kind = tierTransitionKind(from, input.direction);
      if (!kind) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: input.direction === "PROMOTE"
            ? `« ${from} » est le palier apex — aucune promotion possible.`
            : `« ${from} » est le palier plancher — aucune rétrogradation possible.`,
        });
      }

      // Kind résolu au runtime (garanti dans KIND_TRANSITIONS) → cast vers l'union.
      const intent = {
        kind,
        strategyId: input.strategyId,
        operatorId: ctx.session.user.id,
        reason: input.reason,
        expectedFromTier: input.expectedFromTier,
        evidenceRef: input.evidenceRef,
      } as unknown as Intent;

      const result = await emitIntent(intent, { caller: "strategy-router:transitionTier" });
      if (result.status !== "OK") {
        // VETOED (gate) / FAILED — remonter la raison chiffrée honnête.
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: result.summary ?? result.reason ?? "Transition de palier refusée.",
        });
      }
      return result.output;
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
