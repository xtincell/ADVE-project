/**
 * Source RAG — indexation + retrieval sémantique des sources pour le moteur de reco.
 *
 * Pourquoi : `enrichFromVault` dumpait tout le `rawContent` des sources dans le
 * prompt (tronqué à 10k) et plafonnait l'analyse aux 10 premiers champs remplis
 * (`slice(0,10)`) faute de pouvoir cibler. Conséquence : tokens gaspillés + des
 * champs jamais challengés contre la source.
 *
 * Correctif (intuition opérateur 2026-06-24) : on EXPLOITE L'EMBEDDING pour
 * absorber la source. Les documents sont chunkés + embeddés une fois dans
 * `BrandContextNode kind="SOURCE_CHUNK"` ; puis pour CHAQUE champ on récupère par
 * similarité sémantique (top-k) seulement les chunks pertinents. Tokens bornés
 * par le top-k, couverture par champ garantie.
 *
 * Réutilise l'infra RAG existante (seshat/context-store) : chunkText, le worker
 * d'embedding `embedBrandContext` (Ollama → OpenAI → OpenRouter, déjà câblé),
 * `topKWithinStrategy` (cosinus). Dégrade gracieusement si aucun provider
 * d'embedding : retrieval vide → le moteur de reco retombe sur le dump legacy.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { chunkText } from "@/server/services/seshat/context-store/chunker";
import { embedBrandContext } from "@/server/services/seshat/context-store/embedder";
import { topKWithinStrategy } from "@/server/services/seshat/context-store/ranker";

export const SOURCE_CHUNK_KIND = "SOURCE_CHUNK";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

/**
 * Indexe (chunk + embed) le `rawContent` des BrandDataSource d'une stratégie en
 * nœuds `SOURCE_CHUNK`. Idempotent par (sourceId, contentHash) : une source
 * inchangée n'est pas ré-indexée ; une source modifiée voit ses chunks purgés
 * puis recréés. Best-effort sur l'embedding (no-op gracieux sans provider).
 */
export async function ensureSourcesIndexed(
  strategyId: string,
): Promise<{ indexedChunks: number; embedded: boolean }> {
  const sources = await db.brandDataSource.findMany({
    where: { strategyId, processingStatus: { in: ["EXTRACTED", "PROCESSED"] } },
    select: { id: true, fileName: true, rawContent: true, certainty: true },
  });

  let indexedChunks = 0;
  for (const s of sources) {
    if (!s.rawContent || s.rawContent.trim().length < 40) continue;
    const hash = sha256(s.rawContent);

    // Déjà indexé à l'identique → skip.
    const existing = await db.brandContextNode.findFirst({
      where: { strategyId, kind: SOURCE_CHUNK_KIND, sourceId: s.id, contentHash: hash },
      select: { id: true },
    });
    if (existing) continue;

    // Contenu changé (ou première indexation) → purge les anciens chunks de cette source.
    await db.brandContextNode.deleteMany({
      where: { strategyId, kind: SOURCE_CHUNK_KIND, sourceId: s.id },
    });

    const chunks = chunkText(s.rawContent);
    for (const c of chunks) {
      await db.brandContextNode.create({
        data: {
          strategyId,
          kind: SOURCE_CHUNK_KIND,
          sourceId: s.id,
          payload: {
            text: c.text,
            fileName: s.fileName ?? "source",
            certainty: s.certainty,
            chunkIndex: c.index,
          },
          contentHash: hash,
          embedding: [],
        },
      });
      indexedChunks++;
    }
  }

  // Embed les nouveaux nœuds (worker draine tous les embeddedAt=null de la stratégie).
  let embedded = false;
  if (indexedChunks > 0) {
    try {
      const r = await embedBrandContext(strategyId);
      embedded = r.embedded > 0;
    } catch {
      // Pas de provider d'embedding → no-op gracieux, retrieval retombera vide.
    }
  }

  return { indexedChunks, embedded };
}

export interface SourceContextHit {
  text: string;
  fileName: string;
  similarity: number;
}

/**
 * Récupère, pour une requête (typiquement « label champ + valeur actuelle »),
 * les `topK` chunks de source les plus pertinents par similarité sémantique.
 * Vide si aucun provider d'embedding (le caller retombe sur le dump legacy).
 */
export async function retrieveSourceChunksForField(
  strategyId: string,
  query: string,
  topK = 3,
): Promise<SourceContextHit[]> {
  const hits = await topKWithinStrategy(strategyId, query, {
    kinds: [SOURCE_CHUNK_KIND],
    topK,
  });
  return hits
    .map((h) => {
      const p = (h.payload ?? {}) as Record<string, unknown>;
      return {
        text: typeof p.text === "string" ? p.text : "",
        fileName: typeof p.fileName === "string" ? p.fileName : "source",
        similarity: h.similarity ?? 0,
      };
    })
    .filter((h) => h.text.length > 0);
}

/**
 * Construit un brief de source CIBLÉ pour un ensemble de champs : pour chaque
 * champ on retrieve ses chunks pertinents, on déduplique, et on renvoie un bloc
 * texte borné. Renvoie "" si le retrieval est vide (pas d'embeddings) → le
 * caller retombe sur le dump intégral legacy.
 */
export async function buildRetrievedSourceBrief(
  strategyId: string,
  fieldQueries: Array<{ field: string; query: string }>,
  opts: { perFieldTopK?: number; maxChars?: number } = {},
): Promise<string> {
  const perFieldTopK = opts.perFieldTopK ?? 3;
  const maxChars = opts.maxChars ?? 9000;

  const seen = new Set<string>();
  const blocks: string[] = [];
  let totalChars = 0;

  for (const { field, query } of fieldQueries) {
    const hits = await retrieveSourceChunksForField(strategyId, query, perFieldTopK);
    for (const h of hits) {
      const key = `${h.fileName}::${h.text.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const block = `[${field} ← ${h.fileName}] ${h.text}`;
      if (totalChars + block.length > maxChars) continue;
      blocks.push(block);
      totalChars += block.length;
    }
  }

  return blocks.join("\n\n---\n\n");
}
