/**
 * Migration utility — Copy Strategy metadata into pillar A and V for existing brands.
 *
 * The v4 restructuration moved brand metadata (name, sector, country, businessModel)
 * from the Strategy model into the pillar content. New brands get this automatically
 * via strategy.create seed. This script migrates existing brands.
 *
 * Run once: import and call migrateAllStrategies()
 * Safe to run multiple times (idempotent — only fills missing fields).
 */

import { db } from "@/lib/db";
import { writePillar } from "@/server/services/pillar-gateway";
import type { PillarKey } from "@/lib/types/advertis-vector";

export async function migrateAllStrategies(): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const strategies = await db.strategy.findMany({
    select: { id: true, name: true, description: true, businessContext: true },
  });

  // Get all strategy IDs that also exist in the country/sector columns
  // (Strategy model has these at top level in some versions, in businessContext in others)
  const allStrategies = await db.strategy.findMany({
    select: {
      id: true, name: true, description: true,
      businessContext: true,
    },
  });

  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const strategy of allStrategies) {
    try {
      // Load pillar A
      const pillarA = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId: strategy.id, key: "a" } },
      });

      const contentA = (pillarA?.content ?? {}) as Record<string, unknown>;
      const biz = (strategy.businessContext ?? {}) as Record<string, unknown>;

      // Only migrate if nomMarque is missing
      if (contentA.nomMarque) {
        skipped++;
        continue;
      }

      // Build A patch
      const patchA: Record<string, unknown> = {};
      if (!contentA.nomMarque) patchA.nomMarque = strategy.name;
      if (!contentA.description) patchA.description = strategy.description ?? "";
      if (!contentA.secteur && biz.sector) patchA.secteur = biz.sector;
      if (!contentA.pays && biz.country) patchA.pays = biz.country;
      if (!contentA.brandNature && biz.brandNature) patchA.brandNature = biz.brandNature;
      if (!contentA.langue) patchA.langue = "fr";

      if (Object.keys(patchA).length > 0) {
        await writePillar({
          strategyId: strategy.id,
          pillarKey: "a" as PillarKey,
          operation: { type: "MERGE_DEEP", patch: patchA },
          author: { system: "OPERATOR", reason: "v4 migration — Strategy metadata → pillar A" },
        });
      }

      // Build V patch
      const pillarV = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId: strategy.id, key: "v" } },
      });
      const contentV = (pillarV?.content ?? {}) as Record<string, unknown>;
      const patchV: Record<string, unknown> = {};
      if (!contentV.businessModel && biz.businessModel) patchV.businessModel = biz.businessModel;
      if (!contentV.positioningArchetype && biz.positioningArchetype) patchV.positioningArchetype = biz.positioningArchetype;
      if (!contentV.salesChannel && biz.salesChannel) patchV.salesChannel = biz.salesChannel;
      if (!contentV.economicModels && biz.economicModels) patchV.economicModels = biz.economicModels;
      if (!contentV.freeLayer && biz.freeLayer) patchV.freeLayer = biz.freeLayer;

      if (Object.keys(patchV).length > 0) {
        await writePillar({
          strategyId: strategy.id,
          pillarKey: "v" as PillarKey,
          operation: { type: "MERGE_DEEP", patch: patchV },
          author: { system: "OPERATOR", reason: "v4 migration — Strategy metadata → pillar V" },
        });
      }

      migrated++;
    } catch (err) {
      errors.push(`${strategy.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { migrated, skipped, errors };
}
