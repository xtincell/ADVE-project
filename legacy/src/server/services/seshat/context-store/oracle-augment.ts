/**
 * SESHAT — Oracle Context Augmentation (HYBRID retrieval)
 *
 * CRITICAL DESIGN PRINCIPLE: embeddings are LOSSY. They are a discovery
 * index, never a source of truth for citations or calculations.
 *
 * Every helper in this file returns TWO sections:
 *   1. `narrativeBlock` — semantic context retrieved via embedding similarity
 *      OR metadata filter. Compressed/summarized — DO NOT cite verbatim.
 *      Use it to inform the LLM's reasoning ("the brand is in CULT phase",
 *      "their narrative emphasizes X").
 *   2. `preciseFields` — exact values pulled DIRECTLY from Postgres tables
 *      (Pillar.content, Strategy.financialCapacity, MarketBenchmark, etc.).
 *      Use these for verbatim citations, numbers, calculations.
 *
 * The LLM prompt MUST reference both: "Use NARRATIVE for context, but cite
 * PRECISE FIELDS verbatim and never rephrase numbers."
 *
 * This eliminates the "lossy summary used as ground truth" failure mode
 * that pure-vector RAG suffers from.
 */

import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";
import { cosineSimilarity } from "./embedder";

// ── Types ────────────────────────────────────────────────────────────

export interface PreciseField {
  /** Pillar key (a..s) or "biz" / "thot" / "score" for non-pillar values */
  source: string;
  /** Field name within the source */
  field: string;
  /** EXACT value as stored — string, number, object, never paraphrased */
  value: unknown;
  /** When this exact value was last written (for staleness checks) */
  lastWrittenAt?: Date | null;
}

// Re-exported in context-store/index.ts

export interface SourceReference {
  /** BrandDataSource id */
  sourceId: string;
  /** Originating fileName, sourceType, etc. */
  fileName: string | null;
  sourceType: string | null;
  fileType: string | null;
  /** Chunk index inside the source */
  chunkIndex: number | null;
  /** Verbatim chunk text */
  text: string;
  /** Cosine similarity if vector search was used */
  similarity?: number;
}

export interface OracleContextBlock {
  /** Lossy semantic context — for orientation, NEVER for citation */
  narrativeBlock: string;
  /** Lossless structured fields — cite these verbatim, calculate on these */
  preciseFields: PreciseField[];
  /** Operator-uploaded source citations (BRAND_SOURCE chunks) */
  sourceReferences?: SourceReference[];
  /** Combined ready-to-paste block (narrative + precise listing + sources) */
  text: string;
  /** Number of context nodes that contributed to narrative */
  nodeCount: number;
  /** Whether vector similarity was used (vs. metadata filter only) */
  usedVectorSearch: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function nodeToLine(node: {
  kind: string;
  pillarKey: string | null;
  field: string | null;
  payload: unknown;
}): string {
  const p = (node.payload ?? {}) as Record<string, unknown>;
  const tag = node.pillarKey ? `[${node.pillarKey.toUpperCase()}.${node.field ?? node.kind}]` : `[${node.kind}]`;
  // Pick a readable snippet
  const snippet =
    (typeof p.full === "string" && p.full) ||
    (typeof p.value === "string" && p.value) ||
    (typeof p.justification === "string" && p.justification) ||
    (typeof p.iconeVision === "string" && p.iconeVision) ||
    (typeof p.text === "string" && p.text) ||
    JSON.stringify(p).slice(0, 400);
  return `${tag} ${String(snippet).slice(0, 600)}`;
}

// ── Precise field loaders (DIRECT DB reads, lossless) ────────────────

/**
 * Load EXACT values from authoritative tables for a strategy.
 * These bypass embeddings entirely — for citation and calculation.
 */
async function loadPreciseFields(
  strategyId: string,
  pillarKey?: string,
): Promise<PreciseField[]> {
  const out: PreciseField[] = [];

  // 1. Pillar.content fields — verbatim source for "the brand says X"
  const pillars = await db.pillar.findMany({
    where: {
      strategyId,
      ...(pillarKey ? { key: pillarKey } : {}),
    },
    select: { key: true, content: true, updatedAt: true },
  });
  for (const p of pillars) {
    const content = (p.content as Record<string, unknown> | null) ?? {};
    for (const [field, value] of Object.entries(content)) {
      if (value === null || value === undefined || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      out.push({
        source: p.key,
        field,
        value,
        lastWrittenAt: p.updatedAt,
      });
    }
  }

  // 2. Strategy-level structured fields (financialCapacity, businessContext, score)
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: {
      financialCapacity: true,
      businessContext: true,
      advertis_vector: true,
      brandNature: true,
      primaryChannel: true,
      updatedAt: true,
    },
  });
  if (strategy) {
    if (strategy.financialCapacity) {
      out.push({
        source: "thot",
        field: "financialCapacity",
        value: strategy.financialCapacity,
        lastWrittenAt: strategy.updatedAt,
      });
    }
    if (strategy.businessContext) {
      out.push({
        source: "biz",
        field: "businessContext",
        value: strategy.businessContext,
        lastWrittenAt: strategy.updatedAt,
      });
    }
    if (strategy.advertis_vector) {
      out.push({
        source: "score",
        field: "advertisVector",
        value: strategy.advertis_vector,
        lastWrittenAt: strategy.updatedAt,
      });
    }
    if (strategy.brandNature) {
      out.push({
        source: "biz",
        field: "brandNature",
        value: strategy.brandNature,
      });
    }
    if (strategy.primaryChannel) {
      out.push({
        source: "biz",
        field: "primaryChannel",
        value: strategy.primaryChannel,
      });
    }
  }

  return out;
}

function formatPreciseFields(fields: PreciseField[]): string {
  if (fields.length === 0) return "(aucune valeur structurée disponible)";
  const lines = fields.map((f) => {
    const valStr =
      typeof f.value === "string"
        ? f.value
        : JSON.stringify(f.value);
    // No truncation here — verbatim is the whole point
    return `  ${f.source}.${f.field} = ${valStr}`;
  });
  return lines.join("\n");
}

function formatSourceReferences(refs: SourceReference[]): string {
  if (refs.length === 0) return "";
  const blocks = refs.map((r) => {
    const head = `[${r.sourceType ?? "SRC"}: ${r.fileName ?? r.sourceId}#${r.chunkIndex ?? 0}${
      typeof r.similarity === "number" ? ` sim=${r.similarity.toFixed(3)}` : ""
    }]`;
    return `${head}\n${r.text}`;
  });
  return blocks.join("\n\n");
}

function nodeToSourceReference(node: {
  sourceId: string | null;
  payload: unknown;
  similarity?: number;
}): SourceReference {
  const p = (node.payload ?? {}) as Record<string, unknown>;
  return {
    sourceId: node.sourceId ?? "",
    fileName: typeof p.fileName === "string" ? p.fileName : null,
    sourceType: typeof p.sourceType === "string" ? p.sourceType : null,
    fileType: typeof p.fileType === "string" ? p.fileType : null,
    chunkIndex: typeof p.chunkIndex === "number" ? p.chunkIndex : null,
    text: typeof p.text === "string" ? p.text : JSON.stringify(p).slice(0, 800),
    ...(typeof node.similarity === "number" ? { similarity: node.similarity } : {}),
  };
}

// ── Public API ───────────────────────────────────────────────────────

const HYBRID_HEADER = `--- CONTEXTE MARQUE (Seshat — RAG hybride) ---
RÈGLE D'USAGE :
  • NARRATIF = orientation sémantique uniquement (compressé). Ne le cite jamais verbatim.
  • PRÉCIS  = sources de vérité directes. Cite verbatim. Calcule sur ces nombres.`;

/**
 * Build a HYBRID context block for a given pillar:
 *   - narrative section from BrandContextNode (lossy)
 *   - precise section from direct DB (lossless)
 *
 * No LLM/embed calls — pure metadata filter + direct reads. Fast.
 */
export async function getOracleBrandContext(
  strategyId: string,
  pillarKey: string,
  options: { limit?: number; includeSources?: boolean; sourcesLimit?: number } = {},
): Promise<OracleContextBlock | null> {
  const limit = options.limit ?? 12;
  const sourcesLimit = options.sourcesLimit ?? 6;

  // Narrative (lossy)
  const rows = await db.brandContextNode.findMany({
    where: {
      strategyId,
      OR: [
        { pillarKey },
        { kind: "BRANDLEVEL" },
        { kind: "NARRATIVE", pillarKey },
      ],
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: { kind: true, pillarKey: true, field: true, payload: true },
  });

  // Precise (lossless) — always loaded
  const precise = await loadPreciseFields(strategyId, pillarKey);

  // Source references (operator uploads) — only when explicitly requested
  let sourceReferences: SourceReference[] = [];
  if (options.includeSources) {
    const sourceRows = await db.brandContextNode.findMany({
      where: { strategyId, kind: "BRAND_SOURCE" },
      take: sourcesLimit,
      orderBy: { createdAt: "desc" },
      select: { sourceId: true, payload: true },
    });
    sourceReferences = sourceRows.map((r: { sourceId: string | null; payload: unknown }) =>
      nodeToSourceReference(r),
    );
  }

  if (rows.length === 0 && precise.length === 0 && sourceReferences.length === 0) return null;

  const narrativeBlock =
    rows.length > 0
      ? rows.map(nodeToLine).join("\n")
      : "(aucun nœud narratif indexé)";

  const sourceBlock =
    sourceReferences.length > 0
      ? `

SOURCES OPÉRATEUR (uploads bruts — citer textuellement avec [fileName#chunk]) :
${formatSourceReferences(sourceReferences)}`
      : "";

  const text = `${HYBRID_HEADER}

NARRATIF (sémantique, compressé) :
${narrativeBlock}

PRÉCIS (verbatim, source de vérité — citer/calculer dessus) :
${formatPreciseFields(precise)}${sourceBlock}

--- FIN CONTEXTE ---`;

  return {
    narrativeBlock,
    preciseFields: precise,
    sourceReferences: sourceReferences.length > 0 ? sourceReferences : undefined,
    text,
    nodeCount: rows.length + sourceReferences.length,
    usedVectorSearch: false,
  };
}

/**
 * Build a context block by vector similarity to a query string.
 * Falls back to getOracleBrandContext() when embeddings are not populated yet
 * or when OPENAI_API_KEY is missing.
 */
export async function getOracleBrandContextByQuery(
  strategyId: string,
  query: string,
  options: {
    pillarKey?: string;
    limit?: number;
    includeSources?: boolean;
    sourcesLimit?: number;
  } = {},
): Promise<OracleContextBlock | null> {
  const limit = options.limit ?? 8;
  const sourcesLimit = options.sourcesLimit ?? 6;

  // Embed the query
  const embedResult = await embed({ input: query, caller: "oracle:context-augment" });
  const qVec = embedResult.embeddings[0] ?? [];
  if (qVec.length === 0) {
    // No embedding available — fall back to metadata filter
    return options.pillarKey
      ? getOracleBrandContext(strategyId, options.pillarKey, {
          limit,
          includeSources: options.includeSources,
          sourcesLimit,
        })
      : null;
  }

  // Pull all embedded nodes for this strategy + optional pillar filter.
  // Filter by embeddingDim to avoid comparing vectors of different sizes
  // (e.g. Ollama nomic-embed-text=768 vs OpenAI 3-small=1536). Cosine
  // similarity across mismatched dims is undefined → enforce same model.
  const queryDim = qVec.length;
  const where: Record<string, unknown> = {
    strategyId,
    NOT: { embeddedAt: null },
    embeddingDim: queryDim,
  };
  if (options.pillarKey) {
    // BRAND_SOURCE chunks are pillar-neutral — keep them in the candidate
    // pool when sources are requested so a pillar query can still surface
    // a relevant brandbook section.
    where.OR = options.includeSources
      ? [{ pillarKey: options.pillarKey }, { kind: "BRANDLEVEL" }, { kind: "BRAND_SOURCE" }]
      : [{ pillarKey: options.pillarKey }, { kind: "BRANDLEVEL" }];
  }
  const candidates = await db.brandContextNode.findMany({
    where,
    take: 200,
    select: { kind: true, pillarKey: true, field: true, sourceId: true, payload: true, embedding: true },
  });

  if (candidates.length === 0) return null;

  type Candidate = (typeof candidates)[number];
  type ScoredCandidate = Candidate & { similarity: number };

  // Score each candidate by cosine similarity
  const scored: ScoredCandidate[] = candidates
    .map((c: Candidate): ScoredCandidate => ({
      ...c,
      similarity: cosineSimilarity(qVec, c.embedding ?? []),
    }))
    .filter((c: ScoredCandidate) => c.similarity > 0)
    .sort((a: ScoredCandidate, b: ScoredCandidate) => b.similarity - a.similarity);

  // Split between narrative nodes and BRAND_SOURCE references
  const narrativeScored = scored
    .filter((s: ScoredCandidate) => s.kind !== "BRAND_SOURCE")
    .slice(0, limit);
  const sourceReferences: SourceReference[] = options.includeSources
    ? scored
        .filter((s: ScoredCandidate) => s.kind === "BRAND_SOURCE")
        .slice(0, sourcesLimit)
        .map((s: ScoredCandidate) => nodeToSourceReference(s))
    : [];

  if (narrativeScored.length === 0 && sourceReferences.length === 0) return null;

  // Same hybrid rule: narrative from vector, precise from direct DB
  const precise = await loadPreciseFields(strategyId, options.pillarKey);
  const narrativeBlock =
    narrativeScored.length > 0
      ? narrativeScored
          .map((s: ScoredCandidate) => `${nodeToLine(s)} (sim=${s.similarity.toFixed(3)})`)
          .join("\n")
      : "(aucun nœud narratif pertinent)";

  const sourceBlock =
    sourceReferences.length > 0
      ? `

SOURCES OPÉRATEUR pertinentes pour "${query.slice(0, 80)}" (citer textuellement avec [fileName#chunk]) :
${formatSourceReferences(sourceReferences)}`
      : "";

  const text = `${HYBRID_HEADER}

NARRATIF pertinent pour "${query.slice(0, 80)}" (sémantique, compressé) :
${narrativeBlock}

PRÉCIS (verbatim, source de vérité — citer/calculer dessus) :
${formatPreciseFields(precise)}${sourceBlock}

--- FIN CONTEXTE ---`;

  return {
    narrativeBlock,
    preciseFields: precise,
    sourceReferences: sourceReferences.length > 0 ? sourceReferences : undefined,
    text,
    nodeCount: narrativeScored.length + sourceReferences.length,
    usedVectorSearch: true,
  };
}
