import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { tagAsset } from "@/server/services/asset-tagger";
import { auditedProcedure } from "@/server/governance/governed-procedure";
import {
  selectFromBatch as engineSelectFromBatch,
  promoteToActive as enginePromoteToActive,
  supersede as engineSupersede,
  archive as engineArchive,
  type CreateBrandAssetInput,
} from "@/server/services/brand-vault/engine";
import { isBrandAssetKind } from "@/domain/brand-asset-kinds";
const auditedProtected = auditedProcedure(protectedProcedure, "brand-vault");
const auditedAdmin = auditedProcedure(adminProcedure, "brand-vault");
/* lafusee:strangler-active */

// BrandVault 3 levels: system / operator / production
type AssetLevel = "system" | "operator" | "production";

export const brandVaultRouter = createTRPCRouter({
  // Upload/create an asset
  create: auditedProtected
    .input(z.object({
      strategyId: z.string(),
      name: z.string(),
      fileUrl: z.string().optional(),
      level: z.enum(["system", "operator", "production"]).default("production"),
      pillarTags: z.record(z.string(), z.number()).optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { level, expiresAt, pillarTags, ...rest } = input;
      const asset = await ctx.db.brandAsset.create({
        data: {
          ...rest,
          pillarTags: {
            ...((pillarTags ?? {}) as Record<string, unknown>),
            level,
            expiresAt: expiresAt ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      // Auto-tag asset with AI-detected pillar relevance (non-blocking)
      tagAsset(asset.id).catch((err) => { console.warn("[asset-tagger] tag failed:", err instanceof Error ? err.message : err); });

      return asset;
    }),

  // List assets filtered by pillar and level
  list: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      pillar: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const assets = await ctx.db.brandAsset.findMany({
        where: { strategyId: input.strategyId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Client-side filter by pillar if specified
      if (input.pillar) {
        return assets.filter((a) => {
          const tags = a.pillarTags as Record<string, unknown> | null;
          return tags && (tags[input.pillar!] as number) > 0.5;
        });
      }

      return assets;
    }),

  // Get single asset
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.brandAsset.findUniqueOrThrow({ where: { id: input.id } });
    }),

  // Update asset tags
  updateTags: auditedProtected
    .input(z.object({
      id: z.string(),
      pillarTags: z.record(z.string(), z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({ where: { id: input.id } });
      const existing = (asset.pillarTags as Record<string, unknown>) ?? {};
      return ctx.db.brandAsset.update({
        where: { id: input.id },
        data: {
          pillarTags: { ...existing, ...input.pillarTags } as Prisma.InputJsonValue,
        },
      });
    }),

  // Delete asset (soft — mark as expired)
  delete: auditedProtected
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.brandAsset.findUniqueOrThrow({ where: { id: input.id } });
      const tags = (asset.pillarTags as Record<string, unknown>) ?? {};
      return ctx.db.brandAsset.update({
        where: { id: input.id },
        data: {
          pillarTags: { ...tags, expired: true, expiredAt: new Date().toISOString() } as Prisma.InputJsonValue,
        },
      });
    }),

  // Garbage collection — find expired assets
  getExpired: adminProcedure
    .input(z.object({ strategyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const assets = await ctx.db.brandAsset.findMany({
        where: input.strategyId ? { strategyId: input.strategyId } : undefined,
        orderBy: { createdAt: "asc" },
      });

      return assets.filter((a) => {
        const tags = a.pillarTags as Record<string, unknown> | null;
        if (!tags) return false;
        if (tags.expired) return true;
        if (tags.expiresAt && new Date(tags.expiresAt as string) < new Date()) return true;
        return false;
      });
    }),

  // Purge expired assets
  purge: auditedAdmin
    .input(z.object({ assetIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.brandAsset.deleteMany({
        where: { id: { in: input.assetIds } },
      });
      return { deleted: result.count };
    }),

  // ── State machine (Phase 10 / ADR-0012) ──────────────────────────
  // Wraps brand-vault/engine.ts so the UI can drive the canonical
  // DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED
  // transitions instead of touching raw fields directly.

  selectFromBatch: auditedProtected
    .input(z.object({
      batchId: z.string(),
      selectedAssetId: z.string(),
      selectedReason: z.string().optional(),
      promoteToActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return engineSelectFromBatch({
        batchId: input.batchId,
        selectedAssetId: input.selectedAssetId,
        selectedById: ctx.session.user.id,
        selectedReason: input.selectedReason,
        promoteToActive: input.promoteToActive,
      });
    }),

  promoteToActive: auditedProtected
    .input(z.object({
      brandAssetId: z.string(),
      /**
       * Phase 18 (ADR-0044) — Bypass quality gate. Réservé aux cas légitimes :
       * sections dormantes par design ou BrandAssets opérateur-saisis avec
       * payload minimal contractualisé. Audit trail conservé.
       */
      force: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return enginePromoteToActive({
        brandAssetId: input.brandAssetId,
        promotedById: ctx.session.user.id,
        force: input.force,
      });
    }),

  supersede: auditedProtected
    .input(z.object({
      oldAssetId: z.string(),
      reason: z.string().optional(),
      newAsset: z.object({
        strategyId: z.string(),
        name: z.string(),
        kind: z.string().refine((k) => isBrandAssetKind(k), {
          message: "Unknown BrandAssetKind — must be in BRAND_ASSET_KINDS",
        }),
        format: z.string().optional(),
        family: z.enum(["INTELLECTUAL", "MATERIAL", "HYBRID"]).optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        fileUrl: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().int().nonnegative().optional(),
        summary: z.string().optional(),
        pillarSource: z.enum(["A", "D", "V", "E", "R", "T", "I", "S"]).optional(),
        manipulationMode: z.enum(["peddler", "dealer", "facilitator", "entertainer"]).optional(),
        campaignId: z.string().optional(),
        briefId: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const newAssetInput: CreateBrandAssetInput = {
        ...input.newAsset,
        operatorId: ctx.session.user.id,
      };
      return engineSupersede({
        oldAssetId: input.oldAssetId,
        newAssetInput,
        reason: input.reason,
        supersededById: ctx.session.user.id,
      });
    }),

  archive: auditedProtected
    .input(z.object({
      brandAssetId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return engineArchive({
        brandAssetId: input.brandAssetId,
        archivedById: ctx.session.user.id,
        reason: input.reason,
      });
    }),

  // ── Phase 10 listing — kind-aware retrieval ─────────────────────
  // Replaces the legacy /list (which filters by legacy pillarTags) when
  // callers need to find canonical assets by kind+state. Used by the
  // Source Classifier proposals UI and by Artemis to find ACTIVE logos.

  listByKind: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      kind: z.string().optional(),
      state: z.enum(["DRAFT", "CANDIDATE", "SELECTED", "ACTIVE", "SUPERSEDED", "ARCHIVED", "REJECTED"]).optional(),
      limit: z.number().int().positive().max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.brandAsset.findMany({
        where: {
          strategyId: input.strategyId,
          ...(input.kind ? { kind: input.kind } : {}),
          ...(input.state ? { state: input.state } : {}),
        },
        orderBy: [{ state: "asc" }, { createdAt: "desc" }],
        take: input.limit,
      });
    }),

  // List BrandAsset DRAFT proposals tied to a specific BrandDataSource.
  // Powers the "Propositions vault" UI section on the sources page.
  listDraftsFromSource: protectedProcedure
    .input(z.object({
      strategyId: z.string(),
      sourceDataSourceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const drafts = await ctx.db.brandAsset.findMany({
        where: {
          strategyId: input.strategyId,
          state: "DRAFT",
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return drafts.filter((a: { metadata: unknown }) => {
        const meta = (a.metadata as Record<string, unknown> | null) ?? null;
        return meta?.sourceDataSourceId === input.sourceDataSourceId;
      });
    }),
});
