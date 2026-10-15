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
 *      Stored values keep their editing authority, identity and edition.
 *      Verbatim storage is not proof of a measured or validated outcome.
 *
 * The LLM prompt MUST reference both: "Use NARRATIVE for context, but cite
 * PRECISE FIELDS with their origin and edition; never rephrase numbers or
 * promote objectives/derived assertions into measured outcomes."
 *
 * This eliminates the "lossy summary used as ground truth" failure mode
 * that pure-vector RAG suffers from.
 */

import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";
import { cosineSimilarity } from "./embedder";
import { currentDocumentNodes } from "./ranker";
import type { SourceCertainty } from "@/domain/source-certainty";
import { coerceProvenance, fieldStatusFor, type FieldProvenance } from "@/domain/field-provenance";

// ── Types ────────────────────────────────────────────────────────────

export interface PreciseField {
  /** Pillar key (a..s) or "biz" / "thot" / "score" for non-pillar values */
  source: string;
  /** Field name within the source */
  field: string;
  /** EXACT value as stored — string, number, object, never paraphrased */
  value: unknown;
  /** Stored Pillar/Strategy identity, not a generated citation identifier. */
  sourceId: string | null;
  /** Pillar edition; null for unversioned Strategy fields or legacy records. */
  sourceVersion: number | null;
  /** Editing authority, never proof that the stored claim is measured/true. */
  provenance: FieldProvenance;
  /** Source record edit time, not a field-specific change or measurement time. */
  lastWrittenAt?: Date | null;
}

// Re-exported in context-store/index.ts

export interface SourceReference {
  /** BrandDataSource id */
  sourceId: string;
  /** Current document fingerprint, verified against its authorized source. */
  contentHash: string;
  /** Declared source status; neither human approval nor deployed capability. */
  certainty: SourceCertainty | null;
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

/** Shared projection for Oracle and framework consumers; no IO or inference. */
export function pillarPreciseFields(pillar: {
  id?: string; key: string; currentVersion?: number; content: unknown;
  fieldCertainty?: unknown; updatedAt?: Date;
}): PreciseField[] {
  const content = pillar.content && typeof pillar.content === "object" && !Array.isArray(pillar.content)
    ? pillar.content as Record<string, unknown> : {};
  const certainty = pillar.fieldCertainty && typeof pillar.fieldCertainty === "object" && !Array.isArray(pillar.fieldCertainty)
    ? Object.fromEntries(Object.entries(pillar.fieldCertainty).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : null;
  const status = fieldStatusFor(certainty, pillar.key, content._fieldProvenance);
  return Object.entries(content)
    .filter(([field, value]) => !field.startsWith("_") && value !== null && value !== undefined && value !== ""
      && !(Array.isArray(value) && value.length === 0))
    .map(([field, value]) => ({
      source: pillar.key, field, value, sourceId: pillar.id ?? null,
      sourceVersion: pillar.currentVersion ?? null,
      provenance: coerceProvenance(status(field)), lastWrittenAt: pillar.updatedAt,
    }));
}

/** Strategy has no per-field author/edition contract: do not invent either. */
export function strategyPreciseField(strategyId: string, source: string, field: string,
  value: unknown, updatedAt?: Date): PreciseField {
  return { source, field, value, sourceId: strategyId, sourceVersion: null,
    provenance: "UNKNOWN", lastWrittenAt: updatedAt };
}

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
    select: { id: true, key: true, currentVersion: true, content: true, fieldCertainty: true, updatedAt: true },
  });
  for (const p of pillars) {
    out.push(...pillarPreciseFields(p));
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
      out.push(strategyPreciseField(strategyId, "thot", "financialCapacity", strategy.financialCapacity, strategy.updatedAt));
    }
    if (strategy.businessContext) {
      out.push(strategyPreciseField(strategyId, "biz", "businessContext", strategy.businessContext, strategy.updatedAt));
    }
    if (strategy.advertis_vector) {
      out.push(strategyPreciseField(strategyId, "score", "advertisVector", strategy.advertis_vector, strategy.updatedAt));
    }
    if (strategy.brandNature) {
      out.push(strategyPreciseField(strategyId, "biz", "brandNature", strategy.brandNature, strategy.updatedAt));
    }
    if (strategy.primaryChannel) {
      out.push(strategyPreciseField(strategyId, "biz", "primaryChannel", strategy.primaryChannel, strategy.updatedAt));
    }
  }

  return out;
}

export function formatPreciseFields(fields: PreciseField[]): string {
  if (fields.length === 0) return "(aucune valeur structurée disponible)";
  const lines = fields.map((f) => {
    const valStr =
      typeof f.value === "string"
        ? f.value
        : JSON.stringify(f.value);
    // No truncation here — verbatim is the whole point
    const reference = f.sourceId ?? "inconnue";
    const version = f.sourceVersion ?? "inconnue";
    const date = f.lastWrittenAt?.toISOString() ?? "inconnue";
    return `  ${f.source}.${f.field} [référence: ${reference} ; version d’édition: ${version} ; origine: ${f.provenance} ; édité le: ${date} (pas une date de mesure)] = ${valStr}`;
  });
  return lines.join("\n");
}

export function formatSourceReferences(refs: SourceReference[]): string {
  if (refs.length === 0) return "";
  const blocks = refs.map((r) => {
    const head = `[${r.sourceType ?? "SRC"}: ${r.fileName ?? r.sourceId}#${r.chunkIndex ?? 0}, source:${r.sourceId}, certitude:${r.certainty ?? "non renseignée"}, empreinte:${r.contentHash}${
      typeof r.similarity === "number" ? ` sim=${r.similarity.toFixed(3)}` : ""
    }]`;
    return `${head}\n${r.text}`;
  });
  return blocks.join("\n\n");
}

function nodeToSourceReference(node: {
  sourceId: string | null;
  sourceCertainty: SourceCertainty | null;
  payload: unknown;
  similarity?: number;
}): SourceReference {
  const p = (node.payload ?? {}) as Record<string, unknown>;
  return {
    sourceId: node.sourceId ?? "",
    contentHash: typeof p.sourceContentHash === "string" ? p.sourceContentHash : "",
    certainty: node.sourceCertainty,
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
  • PRÉCIS  = valeur stockée exacte ≠ résultat validé. Cite avec référence, version, champ et origine ; une édition n'est pas une mesure.
  • UNKNOWN = origine inconnue ; INFERRED = déduction ; HUMAN/SOURCE = autorité d'édition, pas une validation de résultat.`;

/**
 * Build a HYBRID context block for a given pillar:
 *   - narrative section from BrandContextNode (lossy)
 *   - precise section from direct DB (lossless)
 *
 * No LLM/embed calls — pure metadata filter + direct reads. Fast.
 */
export async function getOracleBrandContext(
  strategyId: string,
  pillarKey?: string,
  options: { limit?: number; includeSources?: boolean; sourcesLimit?: number } = {},
): Promise<OracleContextBlock | null> {
  const limit = options.limit ?? 12;
  const sourcesLimit = options.sourcesLimit ?? 6;

  // Narrative (lossy)
  const rows = await db.brandContextNode.findMany({
    where: {
      strategyId,
      ...(pillarKey ? { OR: [
        { pillarKey },
        { kind: "BRANDLEVEL" },
        { kind: "NARRATIVE", pillarKey },
      ] } : {}),
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: { kind: true, pillarKey: true, field: true, sourceId: true, payload: true },
  });
  // Documentary chunks belong in the cited section, never in lossy narrative.
  const narrativeRows = rows.filter((r) => r.kind !== "BRAND_SOURCE" && r.kind !== "SOURCE_CHUNK");

  // Precise (lossless) — always loaded
  const precise = await loadPreciseFields(strategyId, pillarKey);

  // Source references (operator uploads) — only when explicitly requested
  let sourceReferences: SourceReference[] = [];
  if (options.includeSources) {
    const sourceRows = await db.brandContextNode.findMany({
      where: { strategyId, kind: { in: ["BRAND_SOURCE", "SOURCE_CHUNK"] } },
      take: sourcesLimit,
      orderBy: { createdAt: "desc" },
      select: { kind: true, sourceId: true, payload: true },
    });
    const currentSources = await currentDocumentNodes(sourceRows, { strategyId });
    sourceReferences = currentSources.map((r) =>
      nodeToSourceReference(r),
    );
  }

  if (narrativeRows.length === 0 && precise.length === 0 && sourceReferences.length === 0) return null;

  const narrativeBlock =
    narrativeRows.length > 0
      ? narrativeRows.map(nodeToLine).join("\n")
      : "(aucun nœud narratif indexé)";

  const sourceBlock =
    sourceReferences.length > 0
      ? `

SOURCES OPÉRATEUR (uploads bruts — citer textuellement avec [fileName#chunk]) :
${formatSourceReferences(sourceReferences)}`
      : "";

  // Consumers cap this combined block. Keep cited evidence before large exact
  // field listings; the complete lossless values remain in preciseFields.
  const text = `${HYBRID_HEADER}${sourceBlock}

NARRATIF (sémantique, compressé) :
${narrativeBlock}

PRÉCIS (valeurs stockées avec leur origine — distinguer objectifs et mesures) :
${formatPreciseFields(precise)}

--- FIN CONTEXTE ---`;

  return {
    narrativeBlock,
    preciseFields: precise,
    sourceReferences: sourceReferences.length > 0 ? sourceReferences : undefined,
    text,
    nodeCount: narrativeRows.length + sourceReferences.length,
    usedVectorSearch: false,
  };
}

/**
 * Build a context block by vector similarity to a query string.
 * Falls back to getOracleBrandContext() when embeddings are not populated yet
 * or when NO embedding provider is configured (prod = self-hosted
 * `EMBED_SERVICE_URL` ; OpenAI/OpenRouter en repli).
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
  const metadataContext = () => getOracleBrandContext(strategyId, options.pillarKey, {
    limit, includeSources: options.includeSources, sourcesLimit,
  });
  let embedResult: Awaited<ReturnType<typeof embed>>;
  try {
    embedResult = await embed({ input: query, caller: "oracle:context-augment" });
  } catch {
    console.warn("[seshat:oracle] embedding unavailable — reading metadata and precise fields");
    return metadataContext();
  }
  const qVec = embedResult.embeddings[0] ?? [];
  if (qVec.length === 0) {
    // No embedding available — fall back to metadata filter
    return metadataContext();
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
  // Same dim is necessary but not sufficient — two models can both emit 768-dim
  // vectors with incompatible geometries. Pin the model too so a mixed store
  // never silently blends geometries into one cosine ranking (matches the
  // "enforce same model" intent stated above, which dim alone did not honor).
  if (embedResult.model) where.embeddingModel = embedResult.model;
  if (options.pillarKey) {
    // BRAND_SOURCE chunks are pillar-neutral — keep them in the candidate
    // pool when sources are requested so a pillar query can still surface
    // a relevant brandbook section.
    where.OR = options.includeSources
      ? [{ pillarKey: options.pillarKey }, { kind: "BRANDLEVEL" }, { kind: { in: ["BRAND_SOURCE", "SOURCE_CHUNK"] } }]
      : [{ pillarKey: options.pillarKey }, { kind: "BRANDLEVEL" }];
  }
  const candidates = await db.brandContextNode.findMany({
    where,
    take: 200,
    select: { kind: true, pillarKey: true, field: true, sourceId: true, payload: true, embedding: true },
  });

  const currentCandidates = await currentDocumentNodes(candidates, { strategyId });
  if (currentCandidates.length === 0) return metadataContext();

  type Candidate = (typeof currentCandidates)[number];
  type ScoredCandidate = Candidate & { similarity: number };

  // Score each candidate by cosine similarity
  const scored: ScoredCandidate[] = currentCandidates
    .map((c: Candidate): ScoredCandidate => ({
      ...c,
      similarity: cosineSimilarity(qVec, c.embedding ?? []),
    }))
    .filter((c: ScoredCandidate) => c.similarity > 0)
    .sort((a: ScoredCandidate, b: ScoredCandidate) => b.similarity - a.similarity);

  // Split between narrative nodes and BRAND_SOURCE references
  const narrativeScored = scored
    .filter((s: ScoredCandidate) => s.kind !== "BRAND_SOURCE" && s.kind !== "SOURCE_CHUNK")
    .slice(0, limit);
  const sourceReferences: SourceReference[] = options.includeSources
    ? scored
        .filter((s: ScoredCandidate) => s.kind === "BRAND_SOURCE" || s.kind === "SOURCE_CHUNK")
        .slice(0, sourcesLimit)
        .map((s: ScoredCandidate) => nodeToSourceReference(s))
    : [];

  if (narrativeScored.length === 0 && sourceReferences.length === 0) return metadataContext();

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

  const text = `${HYBRID_HEADER}${sourceBlock}

NARRATIF pertinent pour "${query.slice(0, 80)}" (sémantique, compressé) :
${narrativeBlock}

PRÉCIS (valeurs stockées avec leur origine — distinguer objectifs et mesures) :
${formatPreciseFields(precise)}

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
