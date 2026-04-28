/**
 * SESHAT — Generic Ranker / Semantic Retrieval
 *
 * The retrieval and ranking primitives that ANY Neter consumes.
 * Not Oracle-specific. Not framework-specific. Pure search over the
 * BrandContextNode store with optional metadata filtering.
 *
 * Consumers (current and planned):
 *   - Notoria.engine          — few-shot examples from accepted recos of similar brands
 *   - Mestor.hyperviseur       — "what plan worked for similar past brand states?"
 *   - Tarsis.weak-signal       — correlate signal patterns to brand contexts
 *   - Jehuty curation          — relevance ranking for the intelligence feed
 *   - Console operator search  — semantic find across the platform
 *   - Brand comparables UI     — "marques voisines" page
 *   - Thot pricing intel       — actual budgets at comparable brands
 *
 * Each consumer composes the ranker output into its own format. This
 * module never builds prompt blocks — that's the consumer's job.
 *
 * Hybrid principle (per V5.2): callers should ALWAYS combine ranker
 * results (lossy semantic match) with direct DB reads (lossless precise
 * fields) for any output that involves citation or calculation.
 */

import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";
import { cosineSimilarity } from "./embedder";

// ── Types ────────────────────────────────────────────────────────────

export interface RankedNode {
  id: string;
  strategyId: string;
  kind: string;
  pillarKey: string | null;
  field: string | null;
  payload: unknown;
  metadata: unknown;
  similarity: number;
  embeddingModel: string | null;
}

export interface RankerFilter {
  /** Restrict to a specific strategy (default: any strategy — global search) */
  strategyId?: string;
  /** Restrict to specific kinds */
  kinds?: string[];
  /** Restrict to a specific pillar */
  pillarKey?: string;
  /** Match metadata.sector, metadata.country, etc. */
  metadata?: Partial<{ sector: string; country: string; businessModel: string; financialCapacityTier: string }>;
  /** Exclude a strategy from results (for "find OTHERS like me" queries) */
  excludeStrategyId?: string;
  /** Maximum candidates to score (cap on DB read) */
  candidateLimit?: number;
  /** Top-K results to return after scoring */
  topK?: number;
  /** Minimum similarity threshold (default 0.0 = no threshold) */
  minSimilarity?: number;
}

// ── Internal: build Prisma where clause from filter ──────────────────

function buildWhere(filter: RankerFilter, mustHaveEmbedding: boolean, dimMatch?: number) {
  const where: Record<string, unknown> = {};
  if (filter.strategyId) where.strategyId = filter.strategyId;
  if (filter.excludeStrategyId) where.strategyId = { not: filter.excludeStrategyId };
  if (filter.kinds && filter.kinds.length > 0) where.kind = { in: filter.kinds };
  if (filter.pillarKey) where.pillarKey = filter.pillarKey;
  if (mustHaveEmbedding) where.NOT = { embeddedAt: null };
  if (dimMatch != null) where.embeddingDim = dimMatch;
  // Metadata filter (Prisma JSON path). Apply as separate ANDs.
  const metaConds: Array<Record<string, unknown>> = [];
  for (const [k, v] of Object.entries(filter.metadata ?? {})) {
    if (v) metaConds.push({ metadata: { path: [k], equals: v } });
  }
  if (metaConds.length > 0) where.AND = metaConds;
  return where;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Semantic search by query string. Embeds the query, ranks candidates by
 * cosine similarity, returns top-K. Filters by metadata before scoring
 * to keep candidate set small.
 *
 * Returns [] when no embedding provider available — never throws on missing
 * keys (graceful degradation: callers fall back to non-vector retrieval).
 */
export async function searchByQuery(
  query: string,
  filter: RankerFilter = {},
): Promise<RankedNode[]> {
  const candidateLimit = filter.candidateLimit ?? 200;
  const topK = filter.topK ?? 10;
  const minSimilarity = filter.minSimilarity ?? 0;

  // Embed the query
  const embedResult = await embed({ input: query, caller: "seshat:ranker" });
  const qVec = embedResult.embeddings[0] ?? [];
  if (qVec.length === 0) return []; // No provider — graceful empty

  const where = buildWhere(filter, /*mustHaveEmbedding*/ true, qVec.length);

  const candidates = await db.brandContextNode.findMany({
    where: where as never,
    take: candidateLimit,
    select: {
      id: true,
      strategyId: true,
      kind: true,
      pillarKey: true,
      field: true,
      payload: true,
      metadata: true,
      embedding: true,
      embeddingModel: true,
    },
  });

  return candidates
    .map((c) => ({
      id: c.id,
      strategyId: c.strategyId,
      kind: c.kind,
      pillarKey: c.pillarKey,
      field: c.field,
      payload: c.payload,
      metadata: c.metadata,
      similarity: cosineSimilarity(qVec, c.embedding ?? []),
      embeddingModel: c.embeddingModel,
    }))
    .filter((r) => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Find context nodes from OTHER strategies that resemble the source strategy.
 * Useful for cohort analysis, comparables, and few-shot example mining.
 *
 * Algorithm: take a representative node from the source (e.g. its BRANDLEVEL
 * justification), use it as the query, exclude the source strategy, return
 * top-K matches. Optionally restrict to nodes of specific kinds.
 */
export async function findSimilarAcrossStrategies(
  strategyId: string,
  options: { kinds?: string[]; topK?: number; metadata?: RankerFilter["metadata"] } = {},
): Promise<RankedNode[]> {
  // Pick a representative node — prefer BRANDLEVEL, fallback to NARRATIVE
  const rep = await db.brandContextNode.findFirst({
    where: {
      strategyId,
      kind: { in: ["BRANDLEVEL", "NARRATIVE"] },
      NOT: { embeddedAt: null },
    },
    orderBy: { createdAt: "desc" },
    select: { payload: true },
  });

  if (!rep) return []; // No embedded context — can't compare

  const p = (rep.payload ?? {}) as Record<string, unknown>;
  const queryText =
    (typeof p.justification === "string" && p.justification) ||
    (typeof p.iconeVision === "string" && p.iconeVision) ||
    (typeof p.full === "string" && p.full) ||
    JSON.stringify(p).slice(0, 500);

  return searchByQuery(queryText, {
    excludeStrategyId: strategyId,
    kinds: options.kinds,
    topK: options.topK ?? 10,
    metadata: options.metadata,
  });
}

/**
 * Same-strategy semantic top-K. Useful when a Neter wants context relevant
 * to a specific question without leaving the brand silo.
 */
export async function topKWithinStrategy(
  strategyId: string,
  query: string,
  options: { kinds?: string[]; pillarKey?: string; topK?: number } = {},
): Promise<RankedNode[]> {
  return searchByQuery(query, {
    strategyId,
    kinds: options.kinds,
    pillarKey: options.pillarKey,
    topK: options.topK ?? 8,
  });
}

/**
 * Metadata-only retrieval (no embedding required). Falls back here when
 * no embedding provider is configured or when the use case doesn't need
 * semantic match (e.g. "fetch all PILLAR_FIELD nodes for strategy X").
 */
export async function listByMetadata(
  filter: RankerFilter,
): Promise<Omit<RankedNode, "similarity" | "embeddingModel">[]> {
  const where = buildWhere(filter, /*mustHaveEmbedding*/ false);
  const rows = await db.brandContextNode.findMany({
    where: where as never,
    take: filter.candidateLimit ?? 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      strategyId: true,
      kind: true,
      pillarKey: true,
      field: true,
      payload: true,
      metadata: true,
    },
  });
  return rows;
}
