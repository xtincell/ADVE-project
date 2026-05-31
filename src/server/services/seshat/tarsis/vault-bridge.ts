/**
 * Vault Bridge — Ingests BrandAsset market intelligence into Seshat KnowledgeEntry.
 *
 * Phase: refactor-t-pillar-vault-seshat-pipeline
 * Owner: Seshat (Tarsis sub-module)
 *
 * Purpose: operator-curated market assets (TREND_RADAR, SEO_REPORT, OVERTON_WINDOW,
 * consulting frameworks) are authoritative. This module surfaces them as KnowledgeEntry
 * so executeProtocoleTrack reads them before any LLM-simulated signal collection.
 * Manual-first parity (ADR-0060).
 */

import { db } from "@/lib/db";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import type { SearchContext } from "./weak-signal-analyzer";

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * BrandAsset kinds that contain operator-curated market intelligence.
 * These are the source of truth before LLM-simulated signal collection.
 */
export const MARKET_INTELLIGENCE_KINDS: BrandAssetKind[] = [
  "TREND_RADAR",
  "SEO_REPORT",
  "OVERTON_WINDOW",
  "MCK_7S",
  "BCG_PORTFOLIO",
  "BAIN_NPS",
  "MCK_3H",
  "BCG_STRATEGY_PALETTE",
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface VaultMarketAsset {
  id: string;
  kind: string;
  content: Record<string, unknown> | null;
  name: string | null;
  summary: string | null;
}

export interface VaultMarketSnapshot {
  assets: VaultMarketAsset[];
  hasData: boolean;
  vaultAssetCount: number;
}

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Query the brand vault for market-relevant BrandAssets.
 * Returns assets with state ACTIVE or CANDIDATE that belong to the strategy.
 */
export async function scanVaultForMarketIntelligence(
  strategyId: string,
): Promise<VaultMarketSnapshot> {
  const assets = await db.brandAsset.findMany({
    where: {
      strategyId,
      kind: { in: MARKET_INTELLIGENCE_KINDS as string[] },
      state: { in: ["ACTIVE", "CANDIDATE"] },
    },
    select: { id: true, kind: true, content: true, name: true, summary: true },
  });

  const mapped: VaultMarketAsset[] = assets.map((a) => ({
    id: a.id,
    kind: a.kind,
    content: (a.content ?? null) as Record<string, unknown> | null,
    name: a.name ?? null,
    summary: a.summary ?? null,
  }));

  return {
    assets: mapped,
    hasData: mapped.length > 0,
    vaultAssetCount: mapped.length,
  };
}

/**
 * Write vault assets into Seshat KnowledgeEntry so executeProtocoleTrack
 * reads authoritative operator data before any LLM-simulated collection.
 *
 * Idempotent: skips assets already ingested within the last 7 days
 * (identified by `_vaultAssetId` sentinel in the data JSON).
 */
export async function ingestVaultToKnowledgeEntry(
  strategyId: string,
  searchCtx: Pick<SearchContext, "sector" | "market" | "countryCode">,
  assets: VaultMarketAsset[],
): Promise<{ created: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let created = 0;

  for (const asset of assets) {
    // Idempotency: skip if a fresh entry from this vault asset already exists
    const existing = await db.knowledgeEntry.findFirst({
      where: {
        sector: { contains: searchCtx.sector, mode: "insensitive" },
        countryCode: searchCtx.countryCode,
        data: { path: ["_vaultAssetId"], equals: asset.id },
        createdAt: { gte: sevenDaysAgo },
      },
    });
    if (existing) continue;

    const sector = searchCtx.sector;
    const market = searchCtx.market ?? "vault-bridge";
    const countryCode = searchCtx.countryCode ?? "XX";

    if (
      asset.kind === "TREND_RADAR" ||
      asset.kind === "SEO_REPORT" ||
      asset.kind === "OVERTON_WINDOW"
    ) {
      // Trend / SEO / Overton → EXTERNAL_FEED_DIGEST with macroSignals
      await db.knowledgeEntry.create({
        data: {
          entryType: "EXTERNAL_FEED_DIGEST",
          sector,
          market,
          countryCode,
          data: {
            macroSignals: [
              {
                trend: asset.name ?? asset.kind,
                evidence: asset.summary ?? "vault-import",
              },
            ],
            weakSignals: [],
            trendTracker: null,
            _source: "vault-bridge",
            _vaultAssetId: asset.id,
          },
        },
      });
    } else {
      // Consulting frameworks (MCK_7S, BCG_PORTFOLIO, BCG_STRATEGY_PALETTE,
      // BAIN_NPS, MCK_3H) → SECTOR_BENCHMARK — broad type picked up by
      // loadSeshatKnowledge without entryType filter.
      await db.knowledgeEntry.create({
        data: {
          entryType: "SECTOR_BENCHMARK",
          sector,
          market: "vault-bridge",
          countryCode,
          // Round-trip JSON to satisfy Prisma's InputJsonValue — same pattern as signal-collector.ts
          data: JSON.parse(JSON.stringify({
            type: "vault_framework_import",
            frameworkKind: asset.kind,
            content: asset.content,
            generatedFor: strategyId,
            _source: "vault-bridge",
            _vaultAssetId: asset.id,
          })),
        },
      });
    }

    created++;
  }

  return { created };
}
