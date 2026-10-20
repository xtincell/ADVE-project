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

import { sourceIsUsable, documentContext, documentIdentity } from "@/domain/source-document";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { embed } from "@/server/services/llm-gateway";
import { cosineSimilarity } from "./embedder";
import { sourceScope, sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { isSourceCertainty, type SourceCertainty } from "@/domain/source-certainty";
import { normalizeSourceQuery, sourceQueryTerms, sourceQueryPhrases, sourcePhraseScore, excerptForQuery } from "./chunker";

/** Pure selection over already authorized candidates, shared by all readers.
 * Lexical relevance never changes text, authority, edition or citation identity.
 */
export function rankDocumentNodes<T extends { sourceId: string | null; payload: unknown; id?: string; similarity?: number }>(
  nodes: T[], query: string, limit: number, options: { keepSemanticMatches?: boolean } = {},
): T[] {
  if (limit <= 0) return [];
  const payload = (n: T) => (n.payload && typeof n.payload === "object" ? n.payload : {}) as Record<string, unknown>;
  const key = (n: T) => n.sourceId ?? n.id ?? "unknown";
  const unique = [...new Map(nodes.map(n => [typeof payload(n).chunkIndex === "number"
    ? `${key(n)}:${payload(n).sourceContentHash}:${payload(n).chunkIndex}` : n.id ?? key(n), n])).values()];
  const terms = sourceQueryTerms(query);
  const phrases = sourceQueryPhrases(query);
  const words = (text: string) => new Set(normalizeSourceQuery(text).match(/[\p{L}\p{N}]+/gu) ?? []);
  const rows = unique.map(node => {
    const p = payload(node);
    const fileName = typeof p.fileName === "string" ? p.fileName : "";
    const title = typeof p.documentTitle === "string" && p.documentTitle ? p.documentTitle : fileName;
    // A classified edition has an explicit identity. Keep its original filename
    // searchable at body weight, without giving a verbose export heading priority.
    const alias = title !== fileName ? fileName : "";
    const fullText = typeof p.text === "string" ? p.text : JSON.stringify(p).replace(/([a-z])([A-Z])/g, "$1 $2");
    const notice = typeof p.documentNotice === "string" ? p.documentNotice : "";
    const text = notice && fullText.startsWith(notice) ? fullText.slice(notice.length) : fullText;
    // Rank the same local passage that can actually reach the reader. Remote
    // keywords in a long summary must not outrank the requested field's vicinity.
    const passage = excerptForQuery(text, query, 800);
    return { node, title: words(title), alias: words(alias), body: words(passage), notice: words(notice), passage,
      phraseScore: 3 * sourcePhraseScore(title, phrases) + sourcePhraseScore(passage, phrases) };
  });
  const documents = new Set(rows.map(r => key(r.node)));
  const frequency = new Map(terms.map(term => [term, new Set(rows.filter(r => r.title.has(term) || r.alias.has(term) || r.body.has(term)).map(r => key(r.node))).size]));
  const scored = rows.map(row => ({ ...row, score: terms.reduce((sum, term) =>
    sum + (row.title.has(term) ? 6 : row.body.has(term) || row.alias.has(term) ? 1 : row.notice.has(term) ? 0.5 : 0)
      * (1 + Math.log((documents.size + 1) / ((frequency.get(term) ?? 0) + 1))),
    row.phraseScore + (options.keepSemanticMatches ? row.node.similarity ?? 0 : 0)) }))
    .filter(row => (!terms.length && !phrases.length) || row.score > 0).sort((a, b) => b.score - a.score);
  const selected: T[] = []; const seen = new Set<string>();
  for (const row of scored) if (!seen.has(key(row.node))) {
    selected.push(row.node); seen.add(key(row.node));
    if (selected.length >= limit) return selected.slice(0, limit);
  }
  // Extra passages should add requested information, rather than repeat the
  // same field. Title/authority matches cannot masquerade as factual coverage.
  const covered = new Set<string>(); const coveredPhrases = new Set<string>();
  const cover = (row: (typeof scored)[number]) => {
    for (const term of terms) if (row.body.has(term)) covered.add(term);
    for (const phrase of phrases) if (sourcePhraseScore(row.passage, [phrase])) coveredPhrases.add(phrase);
  };
  scored.filter(row => selected.includes(row.node)).forEach(cover);
  while (selected.length < limit) {
    const next = scored.filter(row => !selected.includes(row.node)).map(row => ({ row,
      novelty: terms.reduce((sum, term) => sum + (!covered.has(term) && row.body.has(term)
        ? 1 + Math.log((documents.size + 1) / ((frequency.get(term) ?? 0) + 1)) : 0), 0)
        + sourcePhraseScore(row.passage, phrases.filter(phrase => !coveredPhrases.has(phrase))),
    })).sort((a, b) => b.novelty - a.novelty || b.row.score - a.row.score)[0];
    if (!next) break;
    selected.push(next.row.node); cover(next.row);
  }
  return selected;
}

/** A saved fragment is a cache, never an access grant or current proof. */
export async function currentDocumentNodes<T extends { kind: string; sourceId: string | null; payload: unknown }>(nodes: T[], filter: RankerFilter): Promise<(T & { sourceCertainty: SourceCertainty | null })[]> {
  const isDocument = (n: T) => n.kind === "BRAND_SOURCE" || n.kind === "SOURCE_CHUNK";
  const withoutDocument = (n: T): T & { sourceCertainty: SourceCertainty | null } => ({ ...n, sourceCertainty: null });
  const documentIds = nodes.filter(isDocument).flatMap((n) => n.sourceId ? [n.sourceId] : []);
  // An orphan document is not a non-document node. It cannot prove an origin.
  if (!documentIds.length) return nodes.filter((n) => !isDocument(n)).map(withoutDocument);
  // Comparables cannot turn a private document into global training context.
  if (!filter.strategyId || filter.excludeStrategyId) return nodes.filter((n) => !isDocument(n)).map(withoutDocument);
  const sources = await db.brandDataSource.findMany({ where: {
    AND: [await sourceScope(filter.strategyId)], id: { in: documentIds },
    processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
  } });
  const current = new Map(sources.filter(s => sourceIsUsable(s.rawData)).map((s) => [s.id, {
    documentNotice: documentContext(s.rawData), documentTitle: documentIdentity(s.rawData),
    hash: sourceFingerprint(s), certainty: isSourceCertainty(s.certainty) ? s.certainty : null,
  }]));
  return nodes.flatMap((n) => {
    if (!isDocument(n)) return [withoutDocument(n)];
    const source = n.sourceId ? current.get(n.sourceId) : undefined;
    if (!source || (n.payload as Record<string, unknown> | null)?.sourceContentHash !== source.hash) return [];
    // Resolve trust from the same authorized, current source as the fingerprint.
    // Never promote a cache label or infer validation from a retrieved fragment.
    return [{ ...n, payload: n.payload && typeof n.payload === "object" ? { ...n.payload, documentTitle: source.documentTitle, documentNotice: source.documentNotice, text: source.documentNotice + String((n.payload as Record<string, unknown>).text ?? "") } : n.payload, sourceCertainty: source.certainty }];
  });
}

// ── Types ────────────────────────────────────────────────────────────

export interface RankedNode {
  id: string;
  strategyId: string;
  kind: string;
  pillarKey: string | null;
  field: string | null;
  /**
   * Entité d'origine du nœud (`BrandDataSource.id` pour un chunk `BRAND_SOURCE`,
   * `recoId`, `assetId`…). Sans lui, un extrait récupéré n'est plus rattachable à
   * son document : aucune citation, donc aucune vérification possible en aval.
   */
  sourceId: string | null;
  /** Canonical document certainty; null for context without a document. */
  sourceCertainty: SourceCertainty | null;
  payload: unknown;
  metadata: unknown;
  similarity: number;
  embeddingModel: string | null;
}

export interface RankerFilter {
  /** Restrict to a specific strategy (default: any strategy — global search) */
  strategyId?: string;
  /** Drill into one canonical source without widening the strategy scope. */
  sourceId?: string;
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

function buildWhere(
  filter: RankerFilter,
  mustHaveEmbedding: boolean,
  dimMatch?: number,
  modelMatch?: string | null,
) {
  const where: Record<string, unknown> = {};
  if (filter.strategyId) where.strategyId = filter.strategyId;
  if (filter.sourceId) where.sourceId = filter.sourceId;
  if (filter.excludeStrategyId) where.strategyId = { not: filter.excludeStrategyId };
  if (filter.kinds && filter.kinds.length > 0) where.kind = { in: filter.kinds };
  if (filter.pillarKey) where.pillarKey = filter.pillarKey;
  if (mustHaveEmbedding) where.NOT = { embeddedAt: null };
  if (dimMatch != null) where.embeddingDim = dimMatch;
  // Same dimension is necessary but NOT sufficient: two different models can
  // both emit 768-dim vectors whose geometries are incompatible. Filtering on
  // dim alone silently mixes them and degrades ranking. Pin the model too.
  if (modelMatch) where.embeddingModel = modelMatch;
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
 * Recherche sémantique par requête. Embedde la requête, classe les candidats
 * par similarité cosinus, rend le top-K. Filtre sur les métadonnées avant de
 * scorer pour garder l'ensemble candidat petit.
 *
 * **Rend `[]` — jamais une exception — quand aucun embedding n'est obtenable.**
 *
 * Ce contrat était écrit ici depuis toujours, mais ne couvrait qu'un seul cas :
 * « pas de clé configurée » (`provider === "none"`, seul chemin gracieux du
 * Gateway). Un fournisseur **configuré mais qui refuse** — Ollama injoignable,
 * OpenAI `429 billing_not_active`, OpenRouter absent — remontait l'exception à
 * travers tous les appelants. Or ces appelants sont des surfaces de LECTURE
 * (livre de marque, conseil, `rag_search` MCP, contexte source de la Notoria) :
 * ils sont tous écrits contre la promesse ci-dessus et retombent sur une
 * sélection déterministe. Résultat observé : le livre de marque rendait 500
 * parce qu'un fournisseur d'embedding était à sec — une panne de confort
 * transformée en panne de page.
 *
 * « Aucun fournisseur disponible » veut donc dire *aucun embedding obtenable*,
 * pas *aucune clé posée*. La dégradation n'est pas silencieuse pour autant :
 * elle est journalisée ici, et les appelants ANNONCENT le mode de récupération
 * (`SEMANTIC` / `DETERMINISTIC` / `NONE`) jusqu'à l'écran.
 */
export async function searchByQuery(
  query: string,
  filter: RankerFilter = {},
): Promise<RankedNode[]> {
  const candidateLimit = filter.candidateLimit ?? 200;
  const topK = filter.topK ?? 10;
  const minSimilarity = filter.minSimilarity ?? 0;

  // Embed the query
  let embedResult: Awaited<ReturnType<typeof embed>>;
  try {
    embedResult = await embed({ input: query, caller: "seshat:ranker" });
  } catch (err) {
    console.warn(
      "[seshat:ranker] cascade d'embedding épuisée — recherche sémantique abandonnée, " +
        "l'appelant retombe sur sa voie déterministe :",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
  const qVec = embedResult.embeddings[0] ?? [];
  if (qVec.length === 0) return []; // Aucun embedding obtenable — vide gracieux

  const where = buildWhere(filter, /*mustHaveEmbedding*/ true, qVec.length, embedResult.model);

  const candidates = await db.brandContextNode.findMany({
    where: where as Prisma.BrandContextNodeWhereInput,
    take: candidateLimit,
    select: {
      id: true,
      strategyId: true,
      kind: true,
      pillarKey: true,
      field: true,
      sourceId: true,
      payload: true,
      metadata: true,
      embedding: true,
      embeddingModel: true,
    },
  });

  return (await currentDocumentNodes(candidates, filter))
    .map((c) => ({
      id: c.id,
      strategyId: c.strategyId,
      kind: c.kind,
      pillarKey: c.pillarKey,
      field: c.field,
      sourceId: c.sourceId,
      sourceCertainty: c.sourceCertainty,
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
  options: { incompatibleEmbedding?: { dimension: number; model?: string | null } } = {},
): Promise<Omit<RankedNode, "similarity" | "embeddingModel">[]> {
  const baseWhere = buildWhere(filter, /*mustHaveEmbedding*/ false);
  const geometry = options.incompatibleEmbedding;
  // A document can be current and readable without a vector in this space.
  // Keep scope and the canonical source/fingerprint guard on this read too.
  const where = geometry ? { AND: [baseWhere, { OR: [
    { embeddedAt: null },
    { embeddingDim: null },
    { embeddingDim: { not: geometry.dimension } },
    ...(geometry.model ? [{ embeddingModel: null }, { embeddingModel: { not: geometry.model } }] : []),
  ] }] } : baseWhere;
  const rows = await db.brandContextNode.findMany({
    where: where as Prisma.BrandContextNodeWhereInput,
    take: filter.candidateLimit ?? 100,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      strategyId: true,
      kind: true,
      pillarKey: true,
      field: true,
      sourceId: true,
      payload: true,
      metadata: true,
    },
  });
  return currentDocumentNodes(rows, filter);
}

/** Bound candidates per document; a large table cannot evict all older files.
 * The canonical metadata reader still checks scope, edition and fingerprint.
 */
export async function listDocumentCandidates(strategyId: string,
  options: Parameters<typeof listByMetadata>[1] = {},
): Promise<Awaited<ReturnType<typeof listByMetadata>>> {
  const kinds = ["BRAND_SOURCE", "SOURCE_CHUNK"];
  const pointers = await db.brandContextNode.findMany({
    where: { strategyId, kind: { in: kinds }, sourceId: { not: null } },
    distinct: ["sourceId"], select: { sourceId: true },
  });
  const ids = [...new Set(pointers.flatMap(p => p.sourceId ? [p.sourceId] : []))];
  const rows: Awaited<ReturnType<typeof listByMetadata>> = [];
  for (let offset = 0; offset < ids.length; offset += 8) {
    const batch = await Promise.all(ids.slice(offset, offset + 8).map(sourceId =>
      listByMetadata({ strategyId, sourceId, kinds, candidateLimit: 32 }, options)));
    rows.push(...batch.flat());
  }
  return rows;
}
