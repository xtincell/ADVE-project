import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { tagAsset } from "@/server/services/asset-tagger";
import { auditedProcedure } from "@/server/governance/governed-procedure";
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
});
