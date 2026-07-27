/**
 * src/server/mcp/_shared/knowledge-projection.ts — rendre une `KnowledgeEntry`
 * SANS son contenu propriétaire.
 *
 * ## Pourquoi
 *
 * `KnowledgeEntry` est une table **transverse aux marques**, et son champ `data`
 * porte des payloads nominatifs : `knowledge-seeder` y écrit `strategyName`,
 * `composite`, les 8 `pillarScores` d'une marque, ou `missionTitle`/`avgQcScore`
 * /`firstPassRate` d'une mission. Deux outils MCP à vocation **sectorielle**
 * (`intelligence.sector_insights`, `seshat.market_context_get`) rendaient ces
 * lignes **entières**.
 *
 * Tant qu'ils étaient refusés aux clés de marque, la fuite dormait. En les
 * marquant `scope: "GLOBAL"` — pour qu'un fondateur puisse enfin lire son
 * marché — je l'ai **ouverte** : une clé Motion19 pouvait lire le nom et le
 * score composite de ses concurrents du même secteur. Trouvé par la relecture
 * adversariale du 2026-07-27, avant tout usage client.
 *
 * ## La règle
 *
 * Un outil sectoriel rend des **agrégats de secteur**, pas des lignes de marque.
 * `data` ne franchit jamais cette frontière : ni en clair, ni filtré « au mieux »
 * — le contenu de `data` n'a aucun schéma garanti, donc aucun filtre par clé ne
 * peut être sûr dans la durée. On projette une liste blanche de métadonnées.
 *
 * Corollaire tenu ailleurs : `sourceHash` non plus (il encode un `strategyId`
 * depuis `knowledge_graph_ingest`).
 */

/**
 * `select` Prisma canonique pour toute lecture de `KnowledgeEntry` depuis un
 * serveur MCP. Passer par cette constante plutôt que d'omettre `select` est
 * vérifié en CI (`mcp-knowledge-projection.test.ts`) : le premier round de
 * remédiation avait corrigé les trois outils que j'avais touchés et laissé
 * **douze autres lectures brutes** dans les mêmes fichiers — la classe n'était
 * pas fermée, seulement les instances.
 */
export const SECTOR_META_SELECT = {
  entryType: true,
  sector: true,
  market: true,
  createdAt: true,
} as const;

/** Métadonnées d'une entrée de connaissance, sans rien de propriétaire. */
export interface SectorKnowledgeMeta {
  entryType: string;
  sector: string | null;
  market: string | null;
  createdAt: string;
}

/** Forme minimale acceptée en entrée (compatible `db.knowledgeEntry.findMany`). */
interface KnowledgeEntryLike {
  entryType: string;
  sector?: string | null;
  market?: string | null;
  createdAt: Date;
}

/**
 * Projette une entrée sur ses seules métadonnées sectorielles.
 *
 * Liste BLANCHE volontaire : ajouter un champ ici est un geste conscient, alors
 * qu'un `omit` laisserait passer tout nouveau champ ajouté au modèle demain.
 */
export function toSectorMeta(entry: KnowledgeEntryLike): SectorKnowledgeMeta {
  return {
    entryType: entry.entryType,
    sector: entry.sector ?? null,
    market: entry.market ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}

/** Compte les entrées par type — l'agrégat qui fait la valeur d'une vue secteur. */
export function countByEntryType(entries: KnowledgeEntryLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.entryType] = (out[e.entryType] ?? 0) + 1;
  return out;
}
