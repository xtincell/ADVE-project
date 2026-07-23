import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { strategyScopedProcedure } from "../middleware/strategy-scope";
import { tagAsset } from "@/server/services/asset-tagger";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { governedProcedure } from "@/server/governance/governed-procedure";
import type { Context } from "@/server/trpc/context";
import {
  selectFromBatch as engineSelectFromBatch,
  promoteToActive as enginePromoteToActive,
  supersede as engineSupersede,
  archive as engineArchive,
  type CreateBrandAssetInput,
} from "@/server/services/brand-vault/engine";
import { isBrandAssetKind } from "@/domain/brand-asset-kinds";
import { PILLAR_KEYS } from "@/domain";
/* lafusee:governed-active */

// BrandVault 3 levels: system / operator / production
type AssetLevel = "system" | "operator" | "production";

/**
 * ADR-0175 — garde d'ownership pour les procédures indexées par ID D'ACTIF
 * (invisibles à la garde middleware `governedProcedure`, qui ne lit que le
 * `strategyId` de tête). On résout la marque de l'actif puis on applique le
 * chokepoint `canAccessStrategy`. Fuite IDOR CRITIQUE sinon : lecture/suppression
 * (dont `purge` = hard delete) des actifs de n'importe quel tenant par son id.
 */
async function assertBrandAssetAccess(ctx: Context, assetId: string): Promise<string> {
  const asset = await ctx.db.brandAsset.findUnique({
    where: { id: assetId },
    select: { strategyId: true },
  });
  if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Actif introuvable." });
  await assertStrategyAccessForAsset(ctx, asset.strategyId);
  return asset.strategyId;
}

async function assertStrategyAccessForAsset(ctx: Context, strategyId: string): Promise<void> {
  const userId = ctx.session?.user?.id;
  const allowed = userId
    ? await canAccessStrategy(strategyId, {
        operatorId:
          ((ctx.session?.user as unknown as Record<string, unknown> | undefined)?.operatorId as
            | string
            | null
            | undefined) ?? null,
        userId,
        role: ctx.session?.user?.role ?? "USER",
      })
    : false;
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé à cet actif." });
}

export const brandVaultRouter = createTRPCRouter({
  // Upload/create an asset
  create: governedProcedure({

    kind: "LEGACY_BRAND_VAULT_CREATE",

    inputSchema: z.object({
      strategyId: z.string(),
      name: z.string(),
      fileUrl: z.string().optional(),
      /** Type UI (Mes actifs) → kind canonique — sans lui, tout upload
       *  tombait en kind GENERIC et le dashboard (LOGO_FINAL/LOGO_IDEA)
       *  ne voyait JAMAIS un logo uploadé par le founder (bug 12/07). */
      type: z.enum(["LOGO", "FONT", "COLOR", "IMAGE", "DOCUMENT"]).optional(),
      level: z.enum(["system", "operator", "production"]).default("production"),
      pillarTags: z.record(z.string(), z.number()).optional(),
      expiresAt: z.string().optional(),
    }),

    caller: "brand-vault:create",

  })
    .mutation(async ({ ctx, input }) => {
      const { level, expiresAt, pillarTags, type, ...rest } = input;
      // Type UI → kind canonique (source de vérité domain/brand-asset-kinds).
      const KIND_FOR_TYPE: Record<string, string> = {
        LOGO: "LOGO_FINAL",
        FONT: "TYPOGRAPHY_SYSTEM",
        COLOR: "CHROMATIC_STRATEGY",
        IMAGE: "KV_VISUAL",
        DOCUMENT: "GENERIC",
      };
      const kind = type ? KIND_FOR_TYPE[type] ?? "GENERIC" : "GENERIC";
      // Premier logo actif de la marque → ACTIVE (le dashboard l'affiche
      // immédiatement) ; sinon SELECTED (variante, le porteur arbitre).
      let state: "ACTIVE" | "SELECTED" | undefined;
      if (kind === "LOGO_FINAL") {
        const activeLogo = await ctx.db.brandAsset.findFirst({
          where: { strategyId: input.strategyId, kind: "LOGO_FINAL", state: "ACTIVE" },
          select: { id: true },
        });
        state = activeLogo ? "SELECTED" : "ACTIVE";
      }
      const mimeType = input.fileUrl?.startsWith("data:")
        ? input.fileUrl.slice(5, input.fileUrl.indexOf(";")) || undefined
        : undefined;
      const asset = await ctx.db.brandAsset.create({
        data: {
          ...rest,
          kind,
          ...(state ? { state } : {}),
          ...(mimeType ? { mimeType } : {}),
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
  list: strategyScopedProcedure
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
      await assertBrandAssetAccess(ctx, input.id);
      return ctx.db.brandAsset.findUniqueOrThrow({ where: { id: input.id } });
    }),

  // Update asset tags
  updateTags: governedProcedure({

    kind: "LEGACY_BRAND_VAULT_UPDATE_TAGS",

    inputSchema: z.object({
      id: z.string(),
      pillarTags: z.record(z.string(), z.number()),
    }),

    caller: "brand-vault:updateTags",

  })
    .mutation(async ({ ctx, input }) => {
      await assertBrandAssetAccess(ctx, input.id);
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
  delete: governedProcedure({

    kind: "LEGACY_BRAND_VAULT_DELETE",

    inputSchema: z.object({ id: z.string() }),

    caller: "brand-vault:delete",

  })
    .mutation(async ({ ctx, input }) => {
      await assertBrandAssetAccess(ctx, input.id);
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
  purge: governedProcedure({

    kind: "LEGACY_BRAND_VAULT_PURGE",

    inputSchema: z.object({ assetIds: z.array(z.string()) }),

    caller: "brand-vault:purge",

  })
    .mutation(async ({ ctx, input }) => {
      // Chaque actif doit appartenir à une marque accessible au caller — sinon
      // un founder pouvait hard-delete le vault d'un autre tenant (IDOR CRITIQUE).
      const owned = await ctx.db.brandAsset.findMany({
        where: { id: { in: input.assetIds } },
        select: { id: true, strategyId: true },
      });
      const accessibleStrategies = new Set<string>();
      for (const a of owned) {
        if (!accessibleStrategies.has(a.strategyId)) {
          await assertStrategyAccessForAsset(ctx, a.strategyId);
          accessibleStrategies.add(a.strategyId);
        }
      }
      const purgeableIds = owned.map((a) => a.id);
      if (purgeableIds.length === 0) return { deleted: 0 };
      const result = await ctx.db.brandAsset.deleteMany({
        where: { id: { in: purgeableIds } },
      });
      return { deleted: result.count };
    }),

  // ── State machine (Phase 10 / ADR-0012) ──────────────────────────
  // Wraps brand-vault/engine.ts so the UI can drive the canonical
  // DRAFT → CANDIDATE → SELECTED → ACTIVE → SUPERSEDED → ARCHIVED
  // transitions instead of touching raw fields directly.

  selectFromBatch: governedProcedure({


    kind: "LEGACY_BRAND_VAULT_SELECT_FROM_BATCH",


    inputSchema: z.object({
      batchId: z.string(),
      selectedAssetId: z.string(),
      selectedReason: z.string().optional(),
      promoteToActive: z.boolean().optional(),
    }),


    caller: "brand-vault:selectFromBatch",


  })
    .mutation(async ({ ctx, input }) => {
      await assertBrandAssetAccess(ctx, input.selectedAssetId);
      return engineSelectFromBatch({
        batchId: input.batchId,
        selectedAssetId: input.selectedAssetId,
        selectedById: ctx.session.user.id,
        selectedReason: input.selectedReason,
        promoteToActive: input.promoteToActive,
      });
    }),

  promoteToActive: governedProcedure({


    kind: "LEGACY_BRAND_VAULT_PROMOTE_TO_ACTIVE",


    inputSchema: z.object({
      brandAssetId: z.string(),
      /**
       * Phase 18 (ADR-0044) — Bypass quality gate. Réservé aux cas légitimes :
       * sections dormantes par design ou BrandAssets opérateur-saisis avec
       * payload minimal contractualisé. Audit trail conservé.
       */
      force: z.boolean().optional(),
    }),


    caller: "brand-vault:promoteToActive",


  })
    .mutation(async ({ ctx, input }) => {
      await assertBrandAssetAccess(ctx, input.brandAssetId);
      return enginePromoteToActive({
        brandAssetId: input.brandAssetId,
        promotedById: ctx.session.user.id,
        force: input.force,
      });
    }),

  supersede: governedProcedure({


    kind: "LEGACY_BRAND_VAULT_SUPERSEDE",


    inputSchema: z.object({
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
        pillarSource: z.enum([...PILLAR_KEYS]).optional(),
        manipulationMode: z.enum(["peddler", "dealer", "facilitator", "entertainer"]).optional(),
        campaignId: z.string().optional(),
        briefId: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    }),


    caller: "brand-vault:supersede",


  })
    .mutation(async ({ ctx, input }) => {
      // Ownership sur l'actif superséédé ET sur la marque du nouvel actif.
      await assertBrandAssetAccess(ctx, input.oldAssetId);
      await assertStrategyAccessForAsset(ctx, input.newAsset.strategyId);
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

  archive: governedProcedure({


    kind: "LEGACY_BRAND_VAULT_ARCHIVE",


    inputSchema: z.object({
      brandAssetId: z.string(),
      reason: z.string().optional(),
    }),


    caller: "brand-vault:archive",


  })
    .mutation(async ({ ctx, input }) => {
      await assertBrandAssetAccess(ctx, input.brandAssetId);
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

  listByKind: strategyScopedProcedure
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
  listDraftsFromSource: strategyScopedProcedure
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
