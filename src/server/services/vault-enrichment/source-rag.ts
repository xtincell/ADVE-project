/**
 * Source RAG — indexation + retrieval sémantique des sources de marque.
 *
 * Pourquoi : `enrichFromVault` dumpait tout le `rawContent` des sources dans le
 * prompt (tronqué à 10k) et plafonnait l'analyse aux 10 premiers champs remplis
 * (`slice(0,10)`) faute de pouvoir cibler. Conséquence : tokens gaspillés + des
 * champs jamais challengés contre la source.
 *
 * Correctif (intuition opérateur 2026-06-24) : on EXPLOITE L'EMBEDDING pour
 * absorber la source. Les documents sont chunkés + embeddés une fois ; puis pour
 * CHAQUE champ on récupère par similarité sémantique (top-k) seulement les
 * chunks pertinents. Tokens bornés par le top-k, couverture par champ garantie.
 *
 * **Index unique (2026-07-28).** Ce module écrivait ses propres nœuds
 * `SOURCE_CHUNK` — un second index du MÊME texte, à côté des `BRAND_SOURCE`
 * écrits par `indexBrandSource` (voie gouvernée `INDEX_BRAND_SOURCE`, branchée
 * sur l'ingestion et lue par le conseil de marque via `oracle-augment`). Deux
 * écrivains, deux pools disjoints, coût d'embedding doublé — et un extrait
 * récupéré ici restait invisible du conseil qui devait le vérifier. On délègue
 * désormais à l'indexeur canonique ; les anciens nœuds `SOURCE_CHUNK` restent
 * lisibles en retrieval (aucune migration de données requise) mais plus rien
 * n'en écrit.
 */

import { db } from "@/lib/db";
import type { SourceCertainty } from "@/domain/source-certainty";
import { indexBrandSource } from "@/server/services/seshat/context-store/indexer";
import { topKWithinStrategy } from "@/server/services/seshat/context-store/ranker";

/** Index canonique des documents de marque (écrit par `indexBrandSource`). */
export const BRAND_SOURCE_KIND = "BRAND_SOURCE";

/**
 * Ancien index propre à ce module. Plus aucun écrivain — conservé en LECTURE
 * pour ne pas rendre muets les nœuds déjà produits en base.
 * @deprecated Écrire via `indexBrandSource` (kind `BRAND_SOURCE`).
 */
export const SOURCE_CHUNK_KIND = "SOURCE_CHUNK";

const RETRIEVAL_KINDS = [BRAND_SOURCE_KIND, SOURCE_CHUNK_KIND];

/**
 * S'assure que les sources exploitables d'une stratégie sont indexées, via
 * l'indexeur canonique. Idempotent par contenu : une source inchangée n'est ni
 * réécrite ni ré-embeddée (cf. `indexBrandSource`). Best-effort par source —
 * un document illisible n'empêche pas les autres d'être indexés.
 */
export async function ensureSourcesIndexed(
  strategyId: string,
): Promise<{ indexedChunks: number; embedded: boolean }> {
  const sources = await db.brandDataSource.findMany({
    where: { strategyId, processingStatus: { in: ["EXTRACTED", "PROCESSED"] } },
    select: { id: true, rawContent: true },
  });

  let indexedChunks = 0;
  for (const s of sources) {
    if (!s.rawContent || s.rawContent.trim().length < 40) continue;
    try {
      const r = await indexBrandSource(s.id);
      if (!r.alreadyFresh) indexedChunks += r.chunks;
    } catch (err) {
      console.warn(
        `[source-rag] indexation de ${s.id} ignorée :`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // `indexBrandSource` déclenche lui-même la passe d'embedding (best-effort,
  // no-op gracieux sans provider). On ne re-déclenche rien ici.
  return { indexedChunks, embedded: indexedChunks > 0 };
}

export interface SourceContextHit {
  /**
   * `BrandDataSource.id` du document d'origine. C'est l'ancre de citation :
   * sans elle, un extrait ne peut plus être rattaché — donc plus vérifié.
   */
  sourceId: string | null;
  text: string;
  fileName: string;
  /** Certitude déclarée du document (OFFICIAL > DECLARED > INFERRED > ARBITRARY). */
  certainty: SourceCertainty | null;
  /** Rang du chunk dans le document — situe l'extrait. */
  chunkIndex: number | null;
  /** Position du chunk dans le `rawContent` — rend l'extrait retrouvable. */
  charStart: number | null;
  similarity: number;
}

/** Hydrate la certitude des documents cités (absente du payload des chunks). */
async function loadCertainties(ids: string[]): Promise<Map<string, SourceCertainty>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  const rows = await db.brandDataSource.findMany({
    where: { id: { in: unique } },
    select: { id: true, certainty: true },
  });
  return new Map(rows.map((r) => [r.id, r.certainty as SourceCertainty]));
}

/**
 * Récupère, pour une requête (typiquement « label champ + valeur actuelle »),
 * les `topK` chunks de source les plus pertinents par similarité sémantique.
 * Vide si aucun provider d'embedding — le caller doit alors le DIRE et retomber
 * sur une sélection déterministe, jamais produire comme si de rien n'était.
 */
export async function retrieveSourceChunksForField(
  strategyId: string,
  query: string,
  topK = 3,
): Promise<SourceContextHit[]> {
  const hits = await topKWithinStrategy(strategyId, query, {
    kinds: RETRIEVAL_KINDS,
    topK,
  });

  const mapped = hits
    .map((h) => {
      const p = (h.payload ?? {}) as Record<string, unknown>;
      return {
        sourceId: h.sourceId,
        text: typeof p.text === "string" ? p.text : "",
        fileName: typeof p.fileName === "string" ? p.fileName : "source",
        certainty: null as SourceCertainty | null,
        chunkIndex: typeof p.chunkIndex === "number" ? p.chunkIndex : null,
        charStart: typeof p.charStart === "number" ? p.charStart : null,
        similarity: h.similarity ?? 0,
      };
    })
    .filter((h) => h.text.length > 0);

  const certainties = await loadCertainties(
    mapped.map((h) => h.sourceId).filter((id): id is string => Boolean(id)),
  );
  for (const h of mapped) {
    if (h.sourceId) h.certainty = certainties.get(h.sourceId) ?? null;
  }
  return mapped;
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
