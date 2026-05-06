/**
 * Brand Node Router — Phase 18 (ADR-0052) Brand Tree multi-archétype.
 *
 * 6 mutations governées par MESTOR + 4 read queries.
 *
 * Manual-first parity (ADR-0053) : ces routes sont les endpoints standards
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
import { db } from "@/lib/db";

const StringId = z.string().min(1);

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
  }).mutation(async ({ input }) => {
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
  }).mutation(async ({ input }) => {
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
  }).mutation(async ({ input }) => {
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
  }).mutation(async ({ input }) => {
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
  }).mutation(async ({ input }) => {
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
  }).mutation(async ({ input }) => {
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
    .query(async ({ input }) => {
      return getNode(input.nodeId);
    }),

  listChildren: protectedProcedure
    .input(z.object({
      parentNodeId: StringId.nullable(),
      operatorId: StringId,
    }))
    .query(async ({ input }) => {
      return listChildren(input.parentNodeId, input.operatorId);
    }),

  /** Liste les nœuds racines (parentNodeId = null) pour un operator donné. */
  listRoots: protectedProcedure
    .input(z.object({ operatorId: StringId }))
    .query(async ({ input }) => {
      return listChildren(null, input.operatorId);
    }),

  /** Remonte vers la racine et retourne le nœud root. */
  findRoot: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ input }) => {
      return findRoot(input.nodeId);
    }),

  /** Retourne le chemin ancêtres-vers-racine (pour breadcrumbs UI). */
  getAncestorPath: protectedProcedure
    .input(z.object({ nodeId: StringId }))
    .query(async ({ input }) => {
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
    .query(async ({ input }) => {
      return db.brandNode.findUnique({
        where: { operatorId_slug: { operatorId: input.operatorId, slug: input.slug } },
      });
    }),
});
