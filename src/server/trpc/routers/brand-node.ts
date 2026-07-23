/**
 * Brand Node Router — Phase 18 (ADR-0059) Brand Tree multi-archétype.
 *
 * 6 mutations governées par MESTOR + 4 read queries.
 *
 * Manual-first parity (ADR-0060) : ces routes sont les endpoints standards
 * consommables depuis `<BrandNodeForm />` UI. Les Glory tools LLM (wizard
 * portfolio-bulk-import, brief-resolver) appellent les **mêmes endpoints**
 * via mestor.emitIntent → commandant dispatch → handler service. Les deux
 * voies convergent au niveau service business (createBrandNode, etc.).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import {
  createBrandNode,
  updateBrandNode,
  archiveBrandNode,
  moveBrandNode,
  attachStrategyToNode,
  tagNodeRole,
  getNode,
  listChildren,
  findRoot,
  getAncestorIds,
} from "@/server/services/brand-node";
import {
  resolveEffectivePillars,
  invalidateNodeAndDescendants,
  getInheritanceCacheStats,
} from "@/server/services/brand-node/inheritance";
import { searchContextForNode } from "@/server/services/brand-node/context-tree";
import {
  filterToolsByNature,
  isToolApplicableForNature,
} from "@/server/services/brand-node/glory-tools-filter";
import { classifyBibleVar, filterBibleKeysByNature } from "@/server/services/brand-node/bible-classifier";
import { applyNarrativeCoherenceGate } from "@/server/services/mestor/gates/narrative-coherence";
import { db } from "@/lib/db";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { accessibleStrategyIds } from "../middleware/strategy-scope";
import { assertStrategyRead } from "./_strategy-read-guard";

/* lafusee:governed-active — Phase 18/19 router. Toutes les mutations utilisent governedProcedure (ADR-0004 strict cible atteinte) ; tag corrigé 2026-05-06 strangler→governed (faux positif initial — le router a toujours utilisé governedProcedure depuis sa création). */

const StringId = z.string().min(1);

/**
 * Garde d'accès nœud d'arbre (ADR-0166) — l'arbre porte noms, structure et
 * piliers effectifs des marques. Accès si : ADMIN · membre du même opérateur ·
 * marque attachée accessible (chokepoint ADR-0129) · le caller possède une
 * marque sur la CHAÎNE (ancêtre du nœud, ou nœud ancêtre de sa marque —
 * cas founder : commutator + breadcrumbs). Avant : lecture libre par nodeId.
 */
async function assertNodeAccess(userId: string, nodeId: string): Promise<void> {
  const node = await db.brandNode.findUnique({
    where: { id: nodeId },
    select: { id: true, operatorId: true, strategyId: true },
  });
  if (!node) throw new TRPCError({ code: "NOT_FOUND", message: "Nœud introuvable" });

  const opCtx = await getOperatorContext(userId);
  if (opCtx.role === "ADMIN") return;
  if (opCtx.operatorId && opCtx.operatorId === node.operatorId) return;
  if (node.strategyId && (await canAccessStrategy(node.strategyId, opCtx))) return;

  const ids = await accessibleStrategyIds(userId);
  if (ids?.length) {
    // Le caller possède le nœud même ou un ancêtre du nœud.
    const chain = [node.id, ...(await getAncestorIds(node.id))];
    const owned = await db.brandNode.findFirst({
      where: { id: { in: chain }, strategyId: { in: ids } },
      select: { id: true },
    });
    if (owned) return;
    // Le nœud est un ancêtre d'une marque du caller (breadcrumb remontant).
    const userNodes = await db.brandNode.findMany({
      where: { strategyId: { in: ids }, operatorId: node.operatorId },
      select: { id: true },
    });
    for (const un of userNodes) {
      if ((await getAncestorIds(un.id)).includes(node.id)) return;
    }
  }

  throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à ce nœud de marque" });
}

/**
 * Garde d'accès à l'arbre d'un opérateur (round-9) — pour `create` (le nœud
 * n'existe pas encore). ADMIN · l'opérateur lui-même · un fondateur possédant une
 * marque sous cet opérateur. Ferme l'injection d'un nœud dans l'arbre d'autrui
 * (le service ne vérifiait que `parent.operatorId === args.operatorId`, tous deux
 * fournis par l'attaquant).
 */
async function assertOperatorAccess(userId: string, operatorId: string): Promise<void> {
  const opCtx = await getOperatorContext(userId);
  if (opCtx.role === "ADMIN") return;
  if (opCtx.operatorId && opCtx.operatorId === operatorId) return;
  const ids = await accessibleStrategyIds(userId);
  if (ids?.length) {
    const strat = await db.strategy.findFirst({
      where: { id: { in: ids }, operatorId },
      select: { id: true },
    });
    if (strat) return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cet opérateur" });
}

const BrandNatureEnum = z.enum([
  "PRODUCT", "SERVICE", "CHARACTER_IP", "FESTIVAL_IP", "MEDIA_IP",
  "RETAIL_SPACE", "PLATFORM", "INSTITUTION", "PERSONAL",
]);

export const brandNodeRouter = createTRPCRouter({
  // ── Mutations governées ──────────────────────────────────────────────
  create: governedProcedure({
    kind: "OPERATOR_CREATE_BRAND_NODE",
    inputSchema: z.object({
      strategyId: StringId, // audit pivot — caller fournit le strategyId d'un descendant ou de la cible
      operatorId: StringId,
      clientId: StringId.nullable().optional(),
      parentNodeId: StringId.nullable().optional(),
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      nodeKind: z.string().min(1).max(40),
      nodeNature: BrandNatureEnum,
      nodeRole: z.array(z.string()).default([]),
      countryCode: z.string().length(2).nullable().optional(),
      clusterTag: z.string().nullable().optional(),
      attachStrategyId: StringId.nullable().optional(),
    }),
  }).mutation(async ({ ctx, input }) => {
    // Anti-IDOR (round-9) : le caller ne peut créer un nœud QUE dans un arbre
    // qu'il contrôle (parent accessible + opérateur accessible + marque attachée
    // possédée). Le `strategyId` de tête (pivot d'audit) ne prouvait RIEN.
    if (input.parentNodeId) await assertNodeAccess(ctx.session.user.id, input.parentNodeId);
    await assertOperatorAccess(ctx.session.user.id, input.operatorId);
    if (input.attachStrategyId) await assertStrategyRead(ctx.session.user.id, input.attachStrategyId);
    try {
      const node = await createBrandNode({
        operatorId: input.operatorId,
        clientId: input.clientId ?? null,
        parentNodeId: input.parentNodeId ?? null,
        name: input.name,
        slug: input.slug,
        nodeKind: input.nodeKind,
        nodeNature: input.nodeNature,
        nodeRole: input.nodeRole,
        countryCode: input.countryCode ?? null,
        clusterTag: input.clusterTag ?? null,
        attachStrategyId: input.attachStrategyId ?? null,
      });
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "createBrandNode failed",
      });
    }
  }),

  update: governedProcedure({
    kind: "OPERATOR_UPDATE_BRAND_NODE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      nodeId: StringId,
      patches: z.object({
        name: z.string().min(1).max(200).optional(),
        slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
        clusterTag: z.string().nullable().optional(),
        countryCode: z.string().length(2).nullable().optional(),
        nodeRole: z.array(z.string()).optional(),
        lifecycle: z.string().optional(),
        inheritanceLocked: z.boolean().optional(),
      }).passthrough(),
    }),
  }).mutation(async ({ ctx, input }) => {
    await assertNodeAccess(ctx.session.user.id, input.nodeId);
    try {
      const node = await updateBrandNode(input.nodeId, input.patches);
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "updateBrandNode failed",
      });
    }
  }),

  delete: governedProcedure({
    kind: "OPERATOR_DELETE_BRAND_NODE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      nodeId: StringId,
      reason: z.string().optional(),
    }),
  }).mutation(async ({ ctx, input }) => {
    await assertNodeAccess(ctx.session.user.id, input.nodeId);
    try {
      const node = await archiveBrandNode(input.nodeId);
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "deleteBrandNode failed",
      });
    }
  }),

  move: governedProcedure({
    kind: "OPERATOR_MOVE_BRAND_NODE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      nodeId: StringId,
      newParentNodeId: StringId.nullable(),
      reason: z.string().optional(),
    }),
  }).mutation(async ({ ctx, input }) => {
    await assertNodeAccess(ctx.session.user.id, input.nodeId);
    // Déplacer DANS un arbre exige aussi l'accès au nouveau parent.
    if (input.newParentNodeId) await assertNodeAccess(ctx.session.user.id, input.newParentNodeId);
    try {
      const node = await moveBrandNode(input.nodeId, input.newParentNodeId);
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "moveBrandNode failed",
      });
    }
  }),

  attachStrategy: governedProcedure({
    kind: "OPERATOR_ATTACH_STRATEGY_TO_NODE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      nodeId: StringId,
    }),
  }).mutation(async ({ ctx, input }) => {
    await assertNodeAccess(ctx.session.user.id, input.nodeId);
    await assertStrategyRead(ctx.session.user.id, input.strategyId);
    try {
      const node = await attachStrategyToNode(input.nodeId, input.strategyId);
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "attachStrategyToNode failed",
      });
    }
  }),

  tagRole: governedProcedure({
    kind: "OPERATOR_TAG_NODE_ROLE",
    inputSchema: z.object({
      strategyId: StringId,
      operatorId: StringId,
      nodeId: StringId,
      action: z.enum(["ADD", "REMOVE"]),
      role: z.string().min(1).max(60),
    }),
  }).mutation(async ({ ctx, input }) => {
    await assertNodeAccess(ctx.session.user.id, input.nodeId);
    try {
      const node = await tagNodeRole(input.nodeId, input.action, input.role);
      return { ok: true as const, node };
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "tagNodeRole failed",
      });
    }
  }),

  // ── Read queries ─────────────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      return getNode(input.nodeId);
    }),

  listChildren: protectedProcedure
    .input(z.object({
      parentNodeId: StringId.nullable(),
      operatorId: StringId,
    }))
    .query(async ({ ctx, input }) => {
      if (input.parentNodeId) {
        await assertNodeAccess(ctx.session.user.id, input.parentNodeId);
      } else {
        const opCtx = await getOperatorContext(ctx.session.user.id);
        if (opCtx.role !== "ADMIN" && opCtx.operatorId !== input.operatorId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cet opérateur" });
        }
      }
      return listChildren(input.parentNodeId, input.operatorId);
    }),

  /** Liste les nœuds racines (parentNodeId = null) pour un operator donné. */
  listRoots: protectedProcedure
    .input(z.object({ operatorId: StringId }))
    .query(async ({ ctx, input }) => {
      // ADR-0166 — l'arbre de marque d'un opérateur n'est lisible que par ses
      // membres (ou ADMIN) : l'operatorId arbitraire exposait noms/structure.
      const opCtx = await getOperatorContext(ctx.session.user.id);
      if (opCtx.role !== "ADMIN" && opCtx.operatorId !== input.operatorId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cet opérateur" });
      }
      return listChildren(null, input.operatorId);
    }),

  /**
   * Phase 18 (ADR-0059) — markets descendants d'un brand node.
   *
   * Pour le `<BrandMarketCommutator>` du cockpit : retourne les enfants
   * REGIONAL_BRAND (+ REGIONAL_CLUSTER si présent) du brand donné, qui
   * deviennent les tabs marché de la page brand.
   *
   *   FrieslandCampina (CORPORATE) → tabs : RDC / Sénégal / Togo
   *   Bonnet Rouge (MASTER_BRAND) → tabs des regional brands enfants
   *
   * Retourne aussi le brand parent (pour le breadcrumb) + le strategyId du
   * brand global (la "vue globale" de la page).
   */
  listMarketsForBrand: protectedProcedure
    .input(z.object({ brandNodeId: StringId }))
    .query(async ({ input, ctx }) => {
      await assertNodeAccess(ctx.session.user.id, input.brandNodeId);
      const brand = await ctx.db.brandNode.findUnique({
        where: { id: input.brandNodeId },
        select: {
          id: true, name: true, slug: true, nodeKind: true,
          strategyId: true, parentNodeId: true,
        },
      });
      if (!brand) return { brand: null, markets: [] };

      const markets = await ctx.db.brandNode.findMany({
        where: {
          parentNodeId: brand.id,
          archivedAt: null,
          nodeKind: { in: ["REGIONAL_BRAND", "REGIONAL_CLUSTER"] },
        },
        select: {
          id: true, name: true, slug: true, nodeKind: true,
          countryCode: true, strategyId: true,
          strategy: { select: { id: true, name: true, status: true } },
        },
        orderBy: [{ countryCode: "asc" }, { name: "asc" }],
      });

      return { brand, markets };
    }),

  /** Remonte vers la racine et retourne le nœud root. */
  findRoot: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      return findRoot(input.nodeId);
    }),

  /** Retourne le chemin ancêtres-vers-racine (pour breadcrumbs UI). */
  getAncestorPath: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      const ancestorIds = await getAncestorIds(input.nodeId);
      if (ancestorIds.length === 0) return [];
      return db.brandNode.findMany({
        where: { id: { in: ancestorIds } },
        select: { id: true, name: true, slug: true, nodeKind: true, parentNodeId: true },
      });
    }),

  /**
   * Récupère un nœud par son slug (utile pour les routes URL-driven
   * `/cockpit/portfolio/[corporateSlug]`).
   */
  getBySlug: protectedProcedure
    .input(z.object({ operatorId: StringId, slug: StringId }))
    .query(async ({ ctx, input }) => {
      const node = await db.brandNode.findUnique({
        where: { operatorId_slug: { operatorId: input.operatorId, slug: input.slug } },
      });
      if (!node) return null;
      await assertNodeAccess(ctx.session.user.id, node.id);
      return node;
    }),

  // ── Phase 18-N1/N2 — Inheritance résolution + invalidation cache ─────
  /**
   * Résout les piliers ADVE/RTIS effectifs d'un BrandNode en remontant l'arbre.
   * Pour chaque pilier (a/d/v/e/r/t/i/s) : retourne le content + source
   * (OWN_OVERRIDE / OWN_VIA_STRATEGY / INHERITED_FROM:<ancestor> / DEFAULT_EMPTY).
   *
   * Le UI cockpit peut afficher un badge "INHERITED FROM <Bonnet Rouge Global>"
   * ou "OVERRIDE LOCAL" pour chaque champ ADVE.
   */
  resolveEffectivePillars: protectedProcedure
    .input(z.object({ nodeId: StringId, bypassCache: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      return resolveEffectivePillars(input.nodeId, { bypassCache: input.bypassCache });
    }),

  /**
   * Invalide manuellement le cache d'un node + descendants. Utile en debug
   * ou en replay post-mutation cross-process. Auto-appelée par les handlers
   * (updateBrandNode pillarOverrides / moveBrandNode / attachStrategyToNode /
   * OPERATOR_AMEND_PILLAR via Strategy).
   */
  invalidateInheritanceCache: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .mutation(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      const count = await invalidateNodeAndDescendants(input.nodeId);
      return { ok: true, invalidatedNodes: count };
    }),

  /** Stats cache inheritance pour observability admin. */
  inheritanceCacheStats: protectedProcedure.query(() => getInheritanceCacheStats()),

  // ── Phase 18-N4 — Retriever arborescent BrandContextNode ─────────────
  /**
   * Cherche les BrandContextNode visibles depuis ce nœud (own + ancêtres
   * + frères optionnels). Scoré par distance + recency. Cf. ADR-0059 §RAG.
   */
  searchContext: protectedProcedure
    .input(
      z.object({
        nodeId: StringId,
        kinds: z.array(z.string()).optional(),
        pillarKeys: z.array(z.string()).optional(),
        includeSiblings: z.boolean().optional(),
        maxAncestorDepth: z.number().int().min(1).max(32).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      return searchContextForNode(input.nodeId, {
        kinds: input.kinds,
        pillarKeys: input.pillarKeys,
        includeSiblings: input.includeSiblings,
        maxAncestorDepth: input.maxAncestorDepth,
        limit: input.limit,
      });
    }),

  // ── Phase 18-N6 — Glory tools brand-aware filter ─────────────────────
  /**
   * Retourne `applicable: boolean` pour un tool slug + node nature donné.
   */
  isGloryToolApplicable: protectedProcedure
    .input(z.object({ toolSlug: z.string(), nodeId: StringId }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      const node = await db.brandNode.findUnique({
        where: { id: input.nodeId },
        select: { nodeNature: true },
      });
      if (!node) return { applicable: false, reason: "NODE_NOT_FOUND" };
      const { ALL_GLORY_TOOLS: GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
      const tool = GLORY_TOOLS.find((t) => t.slug === input.toolSlug);
      if (!tool) return { applicable: false, reason: "TOOL_NOT_FOUND" };
      return {
        applicable: isToolApplicableForNature(tool, node.nodeNature),
        reason: tool.applicableNatures
          ? `Tool restricted to ${tool.applicableNatures.join(", ")} ; node is ${node.nodeNature}`
          : "Tool universel",
      };
    }),

  /**
   * Liste les Glory tools applicables à un BrandNode (filtrés par sa nature).
   */
  listApplicableGloryTools: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      const node = await db.brandNode.findUnique({
        where: { id: input.nodeId },
        select: { nodeNature: true, nodeKind: true, name: true },
      });
      if (!node) return { tools: [], total: 0, nodeNature: null };
      const { ALL_GLORY_TOOLS: GLORY_TOOLS } = await import("@/server/services/artemis/tools/registry");
      const filtered = filterToolsByNature([...GLORY_TOOLS], node.nodeNature);
      return {
        tools: filtered.map((t) => ({
          slug: t.slug,
          name: t.name,
          layer: t.layer,
          executionType: t.executionType,
          applicableNatures: t.applicableNatures ?? null,
        })),
        total: filtered.length,
        nodeNature: node.nodeNature,
      };
    }),

  // ── Phase 18-N5 — Variable Bible classification heuristique ──────────
  classifyBibleVar: protectedProcedure
    .input(z.object({ bibleKey: z.string() }))
    .query(({ input }) => classifyBibleVar(input.bibleKey)),

  filterBibleKeysForNode: protectedProcedure
    .input(z.object({ nodeId: StringId, bibleKeys: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      const node = await db.brandNode.findUnique({
        where: { id: input.nodeId },
        select: { nodeNature: true },
      });
      if (!node) return { applicable: [], inapplicable: input.bibleKeys };
      const applicable = filterBibleKeysByNature(input.bibleKeys, node.nodeNature);
      const inapplicable = input.bibleKeys.filter((k) => !applicable.includes(k));
      return { applicable, inapplicable };
    }),

  // ── Phase 18-N7 — Sentinel NARRATIVE_COHERENCE_GATE ──────────────────
  checkNarrativeCoherence: protectedProcedure
    .input(
      z.object({
        nodeId: StringId,
        outputText: z.string().min(1).max(20000),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertNodeAccess(ctx.session.user.id, input.nodeId);
      return applyNarrativeCoherenceGate({
        brandNodeId: input.nodeId,
        outputText: input.outputText,
      });
    }),
});
