/**
 * SESHAT — Brand Context Query API (Tier 3, RAG-ready)
 *
 * Read-only query surface over BrandContextNode rows.
 * Phase 4 ships this with metadata-filtered retrieval (no embedding similarity yet).
 * When the embedding worker is added, the same API gains a vector ANN path
 * automatically — callers don't change.
 */

import { db } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────

export interface BrandQueryFilter {
  /** Restrict to specific kind(s): PILLAR_FIELD | NARRATIVE | BRANDLEVEL | RECO | ASSET */
  kinds?: string[];
  /** Restrict to a specific pillar */
  pillarKey?: string;
  /** Optional: restrict to a specific field (only useful with kind=PILLAR_FIELD) */
  field?: string;
  /** Maximum number of nodes to return */
  limit?: number;
}

export interface BrandQueryNode {
  id: string;
  kind: string;
  pillarKey: string | null;
  field: string | null;
  payload: unknown;
  metadata: unknown;
  embeddedAt: Date | null;
  createdAt: Date;
}

// ── queryBrand ───────────────────────────────────────────────────────

/**
 * Fetch BrandContextNodes for a strategy.
 * Phase 4: metadata-filtered retrieval.
 * Phase 4 P2 (when embeddings ship): adds optional `query: string` arg
 *  → embeds + vector similarity search.
 */
export async function queryBrand(
  strategyId: string,
  filter: BrandQueryFilter = {},
): Promise<BrandQueryNode[]> {
  const where: Record<string, unknown> = { strategyId };
  if (filter.kinds && filter.kinds.length > 0) where.kind = { in: filter.kinds };
  if (filter.pillarKey) where.pillarKey = filter.pillarKey;
  if (filter.field) where.field = filter.field;

  const rows = await db.brandContextNode.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: filter.limit ?? 50,
    select: {
      id: true,
      kind: true,
      pillarKey: true,
      field: true,
      payload: true,
      metadata: true,
      embeddedAt: true,
      createdAt: true,
    },
  });

  return rows;
}

/**
 * Find brand context nodes useful as context for a given pillar.
 * Returns nodes from THIS strategy that touch the pillar, plus its narrative
 * and any cross-pillar accepted recos.
 */
export async function getContextForPillar(
  strategyId: string,
  pillarKey: string,
  limit = 30,
): Promise<BrandQueryNode[]> {
  // Pull both the pillar's own fields and narrative paragraphs about it,
  // plus any accepted recommendations targeting it.
  const rows = await db.brandContextNode.findMany({
    where: {
      strategyId,
      OR: [
        { pillarKey },
        { kind: "NARRATIVE", pillarKey },
        { kind: "BRANDLEVEL" },
      ],
    },
    orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      kind: true,
      pillarKey: true,
      field: true,
      payload: true,
      metadata: true,
      embeddedAt: true,
      createdAt: true,
    },
  });

  return rows;
}

/**
 * Find comparable brands by metadata filtering.
 * Phase 4 P2 will switch to vector similarity once embeddings are populated.
 */
export async function findComparableBrands(
  strategyId: string,
  k = 10,
): Promise<Array<{ strategyId: string; matchScore: number; sharedTraits: string[] }>> {
  // Read the source strategy's metadata
  const sample = await db.brandContextNode.findFirst({
    where: { strategyId },
    select: { metadata: true },
  });
  const meta = (sample?.metadata as Record<string, unknown> | null) ?? null;
  if (!meta) return [];

  const sector = meta.sector as string | undefined;
  const country = meta.country as string | undefined;
  const businessModel = meta.businessModel as string | undefined;

  if (!sector && !country) return [];

  // Find nodes from OTHER strategies sharing sector + country
  const candidates = await db.brandContextNode.findMany({
    where: {
      strategyId: { not: strategyId },
      kind: "BRANDLEVEL",
      ...(sector || country
        ? {
            metadata: {
              path: sector ? ["sector"] : ["country"],
              equals: sector ?? country,
            },
          }
        : {}),
    },
    distinct: ["strategyId"],
    take: k * 2,
    select: { strategyId: true, metadata: true },
  });

  return candidates.slice(0, k).map((c) => {
    const cMeta = (c.metadata as Record<string, unknown> | null) ?? {};
    const sharedTraits: string[] = [];
    if (cMeta.sector === sector) sharedTraits.push(`sector=${sector}`);
    if (cMeta.country === country) sharedTraits.push(`country=${country}`);
    if (cMeta.businessModel === businessModel) sharedTraits.push(`businessModel=${businessModel}`);
    const score = sharedTraits.length / 3;
    return { strategyId: c.strategyId, matchScore: score, sharedTraits };
  });
}
