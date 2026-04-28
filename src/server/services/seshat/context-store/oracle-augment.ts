/**
 * SESHAT — Oracle Context Augmentation
 *
 * Helper for Oracle (Artemis) to enrich its prompts with brand-specific
 * context retrieved from the BrandContextStore. Lives next to the other
 * context-store APIs so Oracle's gouvernance stays Artemis-side: Oracle
 * CALLS this helper, doesn't own the data.
 *
 * Behavior:
 *   - When BrandContextNodes exist for the strategy: returns a ready-to-paste
 *     "context block" with the most relevant nodes for a target pillar.
 *   - When no nodes (pre-Phase 4 strategies): returns null — caller falls
 *     back to its existing direct-DB path.
 *
 * Two retrieval paths:
 *   1. Metadata + pillar filter (always available)
 *   2. Vector similarity vs. a query string (only when embeddings populated)
 */

import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";
import { cosineSimilarity } from "./embedder";

// ── Types ────────────────────────────────────────────────────────────

export interface OracleContextBlock {
  /** Ready-to-paste markdown block for an LLM prompt */
  text: string;
  /** Number of nodes that contributed */
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

// ── Public API ───────────────────────────────────────────────────────

/**
 * Build a context block for a given pillar without LLM/embed calls.
 * Pure metadata filter — fast and always available.
 */
export async function getOracleBrandContext(
  strategyId: string,
  pillarKey: string,
  options: { limit?: number } = {},
): Promise<OracleContextBlock | null> {
  const limit = options.limit ?? 12;
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

  if (rows.length === 0) return null;

  const lines = rows.map(nodeToLine);
  return {
    text: `--- CONTEXTE MARQUE (Seshat) ---\n${lines.join("\n")}\n--- FIN CONTEXTE ---`,
    nodeCount: rows.length,
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
  options: { pillarKey?: string; limit?: number } = {},
): Promise<OracleContextBlock | null> {
  const limit = options.limit ?? 8;

  // Embed the query
  const embedResult = await embed({ input: query, caller: "oracle:context-augment" });
  const qVec = embedResult.embeddings[0] ?? [];
  if (qVec.length === 0) {
    // No embedding available — fall back to metadata filter
    return options.pillarKey
      ? getOracleBrandContext(strategyId, options.pillarKey, { limit })
      : null;
  }

  // Pull all embedded nodes for this strategy + optional pillar filter
  const where: Record<string, unknown> = { strategyId, NOT: { embeddedAt: null } };
  if (options.pillarKey) {
    where.OR = [{ pillarKey: options.pillarKey }, { kind: "BRANDLEVEL" }];
  }
  const candidates = await db.brandContextNode.findMany({
    where,
    take: 200,
    select: { kind: true, pillarKey: true, field: true, payload: true, embedding: true },
  });

  if (candidates.length === 0) return null;

  // Score each candidate by cosine similarity
  const scored = candidates
    .map((c) => ({
      ...c,
      similarity: cosineSimilarity(qVec, c.embedding ?? []),
    }))
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  if (scored.length === 0) return null;

  const lines = scored.map((s) => `${nodeToLine(s)} (sim=${s.similarity.toFixed(3)})`);
  return {
    text: `--- CONTEXTE MARQUE pertinent pour: "${query.slice(0, 80)}" ---\n${lines.join("\n")}\n--- FIN CONTEXTE ---`,
    nodeCount: scored.length,
    usedVectorSearch: true,
  };
}
