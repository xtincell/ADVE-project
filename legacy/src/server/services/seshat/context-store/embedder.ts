/**
 * SESHAT — Embedding Worker
 *
 * Reads BrandContextNode rows where embedding is empty, generates embeddings
 * via the LLM gateway, persists them. Designed to run async (post-intake)
 * or as a periodic cron — idempotent and resumable.
 *
 * When OPENAI_API_KEY is missing, embed() returns empty vectors and the
 * worker logs a no-op (graceful degradation — Tier 3 nodes still exist
 * with their structured payload, only the vector path is unavailable).
 *
 * When pgvector is enabled in production, the `embedding Float[]` column
 * can be migrated to `vector(1536)` via a single raw SQL ALTER. The worker
 * code is unchanged.
 */

import { db } from "@/lib/db";
import { embed } from "@/server/services/llm-gateway";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Flatten a node payload into a short text representation suitable for
 * embedding. Preserves field names and key values; truncates long bodies.
 */
function payloadToText(payload: unknown, kind: string, pillarKey?: string | null, field?: string | null): string {
  if (typeof payload === "string") return payload.slice(0, 2000);
  if (!payload || typeof payload !== "object") return "";

  const p = payload as Record<string, unknown>;
  const parts: string[] = [];
  if (pillarKey) parts.push(`[Pillar ${pillarKey.toUpperCase()}]`);
  if (field) parts.push(`[Field ${field}]`);
  parts.push(`[${kind}]`);

  // Heuristic: prefer common semantic keys
  const semanticKeys = [
    "value",
    "text",
    "full",
    "preview",
    "justification",
    "iconeVision",
    "explain",
    "title",
    "description",
    "name",
  ];
  for (const k of semanticKeys) {
    if (p[k] != null) {
      const s = typeof p[k] === "string" ? (p[k] as string) : JSON.stringify(p[k]);
      parts.push(`${k}: ${s.slice(0, 600)}`);
    }
  }

  // Fallback: dump whatever else (capped)
  const dumped = JSON.stringify(p).slice(0, 1500);
  if (parts.length <= 3) parts.push(dumped);

  return parts.join("\n").slice(0, 2500);
}

// ── Main entry point ─────────────────────────────────────────────────

export interface EmbedWorkerResult {
  scanned: number;
  embedded: number;
  skipped: number;
  failed: number;
  durationMs: number;
}

/**
 * Embed all BrandContextNodes with empty embedding for the given strategy.
 * Set strategyId=null to process the global queue (cron mode).
 *
 * Auto-drains the full queue by default (chunk through pending nodes
 * until none remain), with `safetyLimit` capping total work in one call
 * to prevent runaway costs.
 *
 * Returns aggregate counts for telemetry.
 */
export async function embedBrandContext(
  strategyId: string | null,
  options: { safetyLimit?: number; chunk?: number; batch?: number } = {},
): Promise<EmbedWorkerResult> {
  const t0 = Date.now();
  const safetyLimit = options.safetyLimit ?? 5000;
  const chunk = options.chunk ?? 200;
  const batch = options.batch ?? 32;

  let totalScanned = 0;
  let totalEmbedded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Drain loop: keep processing chunks until none left or safety reached
  while (totalScanned < safetyLimit) {
    const candidates = await db.brandContextNode.findMany({
      where: {
        ...(strategyId ? { strategyId } : {}),
        embeddedAt: null,
      },
      take: Math.min(chunk, safetyLimit - totalScanned),
      select: {
        id: true,
        kind: true,
        pillarKey: true,
        field: true,
        payload: true,
      },
    });

    if (candidates.length === 0) break;
    totalScanned += candidates.length;

    const { embedded, skipped, failed } = await processChunk(candidates, batch);
    totalEmbedded += embedded;
    totalSkipped += skipped;
    totalFailed += failed;

    // Stop if every node in this chunk was skipped (provider unavailable)
    if (embedded === 0 && skipped === candidates.length) break;
  }

  return {
    scanned: totalScanned,
    embedded: totalEmbedded,
    skipped: totalSkipped,
    failed: totalFailed,
    durationMs: Date.now() - t0,
  };
}

interface ChunkResult {
  embedded: number;
  skipped: number;
  failed: number;
}

async function processChunk(
  candidates: Array<{
    id: string;
    kind: string;
    pillarKey: string | null;
    field: string | null;
    payload: unknown;
  }>,
  batch: number,
): Promise<ChunkResult> {
  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += batch) {
    const slice = candidates.slice(i, i + batch);
    const texts = slice.map((n) => payloadToText(n.payload, n.kind, n.pillarKey, n.field));

    try {
      const result = await embed({
        input: texts,
        caller: "seshat:embed-brand-context",
      });

      // If gateway returned empty arrays (missing API key), skip — don't mark embedded.
      if (result.embeddings.length === 0 || result.embeddings[0]?.length === 0) {
        skipped += slice.length;
        continue;
      }

      for (let j = 0; j < slice.length; j++) {
        const node = slice[j]!;
        const vec = result.embeddings[j];
        if (!vec || vec.length === 0) {
          skipped++;
          continue;
        }
        try {
          await db.brandContextNode.update({
            where: { id: node.id },
            data: {
              embedding: vec,
              embeddingProvider: result.provider,
              embeddingModel: result.model,
              embeddingDim: vec.length,
              embeddedAt: new Date(),
            },
          });
          embedded++;
        } catch (err) {
          failed++;
          console.warn(`[seshat:embedder] update failed for node ${node.id}:`, err instanceof Error ? err.message : err);
        }
      }
    } catch (err) {
      failed += slice.length;
      console.warn(`[seshat:embedder] batch failed:`, err instanceof Error ? err.message : err);
    }
  }

  return { embedded, skipped, failed };
}

/**
 * Cosine similarity between two vectors. Used by similarity search until
 * pgvector is enabled (then we'll switch to the native operator).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
