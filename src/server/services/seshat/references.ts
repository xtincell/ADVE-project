import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * SESHAT Bridge — Cultural references and knowledge enrichment.
 *
 * Mode local: queries the internal Knowledge Graph (KnowledgeEntry).
 * Mode externe: if SESHAT_API_URL is configured, queries an external API.
 * Fallback: always returns local results, enriched by external if available.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
// `Prisma` en import de VALEUR : `Prisma.DbNull` est utilisé à l'exécution
// dans le prédicat de portée transverse ci-dessous.
import { Prisma } from "@prisma/client";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

const SESHAT_API_URL = process.env.SESHAT_API_URL;

export interface SeshatReference {
  id: string;
  title: string;
  type: "article" | "case_study" | "framework" | "benchmark" | "cultural_ref";
  relevance: number;
  excerpt: string;
  source: string;
  tags: string[];
}

export interface SeshatQuery {
  topic: string;
  sector?: string;
  market?: string;
  pillarFocus?: string;
  limit?: number;
}

/**
 * Query SESHAT for relevant references — local Knowledge Graph first,
 * enriched by external API if available.
 */
export async function queryReferences(query: SeshatQuery): Promise<SeshatReference[]> {
  const limit = query.limit ?? 5;

  // Always query local Knowledge Graph
  const localResults = await queryLocalKnowledgeGraph(query, limit);

  // If external SESHAT is configured, merge results
  if (SESHAT_API_URL) {
    const externalResults = await queryExternalApi(query, limit);
    // Merge local + external, deduplicate by id, sort by relevance
    const merged = [...localResults];
    for (const ext of externalResults) {
      if (!merged.some((r) => r.id === ext.id)) {
        merged.push(ext);
      }
    }
    return merged.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  return localResults;
}

/**
 * Enrich a brief with SESHAT references.
 */
export async function enrichBrief(
  briefContext: { channel: string; sector?: string; market?: string; pillarFocus?: string }
): Promise<SeshatReference[]> {
  // Get channel-specific brief patterns
  const briefPatterns = await db.knowledgeEntry.findMany({
    where: {
      ...CROSS_BRAND_WHERE,
      entryType: "BRIEF_PATTERN",
      ...(briefContext.channel ? { channel: briefContext.channel } : {}),
    },
    take: 3,
  });

  // Get sector benchmarks
  const benchmarks = await db.knowledgeEntry.findMany({
    where: {
      ...CROSS_BRAND_WHERE,
      entryType: "SECTOR_BENCHMARK",
      ...(briefContext.sector ? { sector: briefContext.sector } : {}),
      ...(briefContext.market ? { market: briefContext.market } : {}),
    },
    take: 3,
  });

  // Get framework recommendations based on pillar focus
  const frameworks = briefContext.pillarFocus
    ? await getFrameworksForPillar(briefContext.pillarFocus)
    : [];

  const results: SeshatReference[] = [];

  for (const bp of briefPatterns) {
    const data = bp.data as Record<string, unknown>;
    results.push({
      id: `kg-${hashRef(bp.id)}`,
      title: `Brief Pattern: ${bp.channel ?? "Général"}`,
      type: "benchmark",
      relevance: bp.successScore ?? 0.5,
      excerpt: `Taux de succès: ${((data.successRate as number) ?? 0) * 100}%. Révisions moyennes: ${data.avgRevisions ?? "N/A"}`,
      source: "Knowledge Graph (local)",
      tags: [bp.channel ?? "", "brief_pattern"].filter(Boolean),
    });
  }

  for (const bm of benchmarks) {
    const data = bm.data as Record<string, unknown>;
    results.push({
      id: `kg-${hashRef(bm.id)}`,
      title: `Benchmark ${bm.sector ?? ""} ${bm.market ?? ""}`,
      type: "benchmark",
      relevance: bm.successScore ?? 0.5,
      excerpt: `Score moyen: ${data.avgComposite ?? "N/A"}/200. Top quartile: ${data.topQuartile ?? "N/A"}/200`,
      source: "Knowledge Graph (local)",
      tags: [bm.sector ?? "", bm.market ?? ""].filter(Boolean),
    });
  }

  for (const fw of frameworks) {
    results.push(fw);
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

/**
 * Submit relevance feedback — stored locally as KnowledgeEntry update.
 */
export async function feedbackRelevance(
  referenceId: string,
  score: number
): Promise<boolean> {
  // ATTENTION — attend l'identifiant BRUT d'une `KnowledgeEntry`, pas le `id`
  // porté par une `SeshatReference`. Depuis que les références exposent un id
  // haché (`kg-<hash>` — certains ids réels encodent le `strategyId` d'une autre
  // marque, cf. `knowledgeEntryToReference`), les deux espaces sont disjoints
  // par construction. Un id haché ne résout pas : la fonction rend `false`, pas
  // un succès silencieux.
  if (referenceId.startsWith("kg-")) {
    console.warn(
      "[seshat-bridge] feedbackRelevance appelé avec un id de référence exposé (haché) — non résolvable.",
    );
    return false;
  }
  try {
    // Update local knowledge entry with relevance feedback
    const entry = await db.knowledgeEntry.findUnique({ where: { id: referenceId } });
    if (!entry) {
      // L'entrée introuvable tombait jusqu'au `return true` du bas : succès
      // rapporté, zéro écriture. C'est le cas courant des ids `fw-03`/`fw-07…`
      // (références de framework, sans ligne en base) — l'autre famille d'ids
      // exposée par ce service.
      console.warn(
        `[seshat-bridge] feedbackRelevance : aucune entrée « ${referenceId} » — rien à noter.`,
      );
      return false;
    }
    const currentScore = entry.successScore ?? 0.5;
    const newScore = (currentScore * entry.sampleSize + score) / (entry.sampleSize + 1);
    await db.knowledgeEntry.update({
      where: { id: referenceId },
      data: {
        successScore: newScore,
        sampleSize: entry.sampleSize + 1,
      },
    });

    // Also forward to external API if available
    if (SESHAT_API_URL) {
      await fetch(`${SESHAT_API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId, relevanceScore: score }),
        signal: AbortSignal.timeout(3000),
      }).catch((err) => { console.warn("[seshat-bridge] external feedback failed:", err instanceof Error ? err.message : err); }); // Non-blocking
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if SESHAT is available (always true now — local mode always works).
 */
export function isAvailable(): boolean {
  return true;
}

/**
 * Check if external SESHAT API is configured.
 */
export function isExternalAvailable(): boolean {
  return !!SESHAT_API_URL;
}

// ---------------------------------------------------------------------------
// searchReferences — Search creative references by query string and channel.
// Returns local Knowledge Graph results, empty array if none found.
// ---------------------------------------------------------------------------

export async function searchReferences(
  query: string,
  channel?: string
): Promise<SeshatReference[]> {
  // First try local Knowledge Graph
  const localResults = await queryLocalKnowledgeGraph(
    { topic: query, ...(channel ? {} : {}) },
    10
  );

  // Also search by channel if provided
  if (channel) {
    // `MISSION_OUTCOME` a été retiré de cette liste : c'est un type PAR MARQUE
    // (`knowledge-seeder` en écrit un par mission, avec le titre de la mission
    // et ses notes QC dans `data`). Il n'avait rien à faire dans une recherche
    // transverse par canal.
    const channelEntries = await db.knowledgeEntry.findMany({
      where: { ...CROSS_BRAND_WHERE, channel },
      orderBy: { successScore: "desc" },
      take: 5,
    });

    for (const e of channelEntries) {
      if (!localResults.some((r) => r.id === `kg-${hashRef(e.id)}`)) {
        localResults.push(knowledgeEntryToReference(e));
      }
    }
  }

  return localResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// enrichBriefById — Enrich a brief (mission) by its ID with SESHAT references.
// Reads the mission and its driver to construct context, then fetches refs.
// ---------------------------------------------------------------------------

export async function enrichBriefById(
  briefId: string,
  references?: SeshatReference[]
): Promise<{ briefId: string; references: SeshatReference[]; enrichedAt: string }> {
  const mission = await db.mission.findUniqueOrThrow({
    where: { id: briefId },
    include: {
      driver: true,
      strategy: {
        include: { pillars: true },
        },
    },
  });

  let refs: SeshatReference[];

  if (references && references.length > 0) {
    // Use provided references directly
    refs = references;
  } else {
    // Derive context from the mission and fetch references
    const channel = mission.driver?.channel ?? undefined;
    const vector = mission.strategy.advertis_vector as Record<string, number> | null;

    // Find weakest pillar to focus on
    let pillarFocus: string | undefined;
    if (vector) {
      const pillarScores = (PILLAR_STORAGE_KEYS).map(
        (k) => ({ key: k, score: vector[k] ?? 0 })
      );
      const weakest = pillarScores.reduce((min, p) =>
        p.score < min.score ? p : min
      );
      pillarFocus = weakest.key;
    }

    // Get sector from QuickIntake
    const intake = await db.quickIntake.findFirst({
      where: { convertedToId: mission.strategyId },
      select: { sector: true, country: true },
    });

    refs = await enrichBrief({
      channel: channel ?? "CUSTOM",
      sector: intake?.sector ?? undefined,
      market: intake?.country ?? undefined,
      pillarFocus,
    });
  }

  // Store the enrichment as a GloryOutput linked to the strategy
  await db.gloryOutput.create({
    data: {
      strategyId: mission.strategyId,
      toolSlug: "seshat-enrichment",
      output: {
        briefId,
        referenceCount: refs.length,
        references: refs.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          relevance: r.relevance,
        })),
        enrichedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    briefId,
    references: refs,
    enrichedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// submitFeedback — Track which references were useful (wrapper around
// feedbackRelevance for a cleaner public API).
// ---------------------------------------------------------------------------

export async function submitFeedback(
  referenceId: string,
  relevance: number
): Promise<{ success: boolean; referenceId: string; newScore: number | null }> {
  // Clamp relevance to [0, 1]
  const clampedRelevance = Math.max(0, Math.min(1, relevance));

  // Même garde que `feedbackRelevance` — elle manquait à son jumeau. Les
  // références exposées portent un id HACHÉ (`kg-<hash>`) qui ne résout nulle
  // part : la fonction tombait alors dans la branche « source externe », POSTait
  // le hash inutilisable à un tiers, et rendait `success: true` pour une
  // opération qui n'avait rien écrit.
  if (referenceId.startsWith("kg-")) {
    console.warn(
      "[seshat-bridge] submitFeedback appelé avec un id de référence exposé (haché) — non résolvable.",
    );
    return { success: false, referenceId, newScore: null };
  }

  const entry = await db.knowledgeEntry.findUnique({
    where: { id: referenceId },
  });

  if (entry) {
    const currentScore = entry.successScore ?? 0.5;
    const newScore =
      (currentScore * entry.sampleSize + clampedRelevance) /
      (entry.sampleSize + 1);

    await db.knowledgeEntry.update({
      where: { id: referenceId },
      data: {
        successScore: Math.round(newScore * 1000) / 1000,
        sampleSize: entry.sampleSize + 1,
      },
    });

    // Also forward to external API if available
    if (SESHAT_API_URL) {
      fetch(`${SESHAT_API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId,
          relevanceScore: clampedRelevance,
        }),
        signal: AbortSignal.timeout(3000),
      }).catch((err) => { console.warn("[seshat-bridge] external feedback forward failed:", err instanceof Error ? err.message : err); }); // Non-blocking
    }

    return { success: true, referenceId, newScore };
  }

  // Reference is from external/mock source — just forward feedback
  if (SESHAT_API_URL) {
    try {
      await fetch(`${SESHAT_API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId,
          relevanceScore: clampedRelevance,
        }),
        signal: AbortSignal.timeout(3000),
      });
      return { success: true, referenceId, newScore: null };
    } catch {
      return { success: false, referenceId, newScore: null };
    }
  }

  return { success: false, referenceId, newScore: null };
}

// --- Internal functions ---

/**
 * Types d'entrée AGRÉGÉS — les seuls qui peuvent traverser la frontière de marque.
 *
 * `KnowledgeEntry` est une table TRANSVERSE aux marques, mais elle mélange trois
 * natures que rien ne distinguait à la lecture :
 *
 *  1. des **agrégats** de secteur (`SECTOR_BENCHMARK`, `BRIEF_PATTERN`,
 *     `CAMPAIGN_TEMPLATE`) — partageables, c'est leur raison d'être ;
 *  2. des lignes **par marque** : `knowledge-seeder` écrit un `DIAGNOSTIC_RESULT`
 *     par stratégie avec `successScore = vector.composite / 200`, et un
 *     `MISSION_OUTCOME` / `CREATOR_PATTERN` par mission et par créateur ;
 *  3. des lignes **ingérées par un appelant** (`knowledge_graph_ingest`), dont
 *     `entryType`, `sector` et tout le `data` sont contrôlés par cet appelant.
 *
 * Servies uniformément par les outils MCP curés `benchmark_search` et
 * `market_context_get` (portée GLOBAL), ça faisait deux fuites croisées :
 *
 *  - le `successScore` d'un `DIAGNOSTIC_RESULT` EST le composite d'une autre
 *    marque ; exposé en `relevance` et trié décroissant, il rendait le
 *    classement des scores du secteur à n'importe quelle clé de marque ;
 *  - une marque pouvait ingérer un `SECTOR_BENCHMARK` avec le secteur d'une
 *    autre et un `insight` arbitraire, rendu VERBATIM à celle-ci comme un
 *    benchmark externe faisant autorité.
 *
 * La correction précédente avait projeté le NOM hors des résultats et bouché le
 * dump `default` ; elle avait traité deux instances d'une classe qui en comptait
 * quatre (relecture adversariale 2026-07-27).
 */
const CROSS_BRAND_ENTRY_TYPES = ["SECTOR_BENCHMARK", "BRIEF_PATTERN", "CAMPAIGN_TEMPLATE"] as const;

/**
 * Taille d'échantillon minimale d'un agrégat servi hors de sa marque.
 *
 * Défense SECONDAIRE, et il faut savoir pourquoi : `sampleSize` ne veut pas
 * dire la même chose selon l'écrivain. `knowledge-seeder` y met un nombre de
 * MARQUES agrégées (le sens attendu) ; les écrivains Tarsis y mettent un
 * nombre de SIGNAUX, qui dépasse 3 trivialement pour une seule marque. Ce
 * seuil ne peut donc pas porter la garde à lui seul — c'est l'ATTRIBUTION
 * (`data.strategyId`) qui la porte (relecture adversariale 2026-07-27).
 *
 * On le garde quand même : sur les écrivains dont le compte est bien un compte
 * de marques, il empêche de ré-identifier par différence.
 */
const MIN_AGGREGATE_SAMPLE = 3;

/**
 * Fragment `where` commun à toutes les lectures transverses.
 *
 * `data.strategyId` est l'attribution canonique du repo (la table n'a pas de
 * colonne `strategyId`) : toute ligne qui en porte un appartient à une marque —
 * qu'elle vienne du seeder ou d'une ingestion — et ne sort donc jamais. C'est
 * ce même prédicat qui écarte les lignes plantées par un appelant, puisque
 * `knowledge_graph_ingest` force `strategyId` dans `data`.
 */
const CROSS_BRAND_WHERE = {
  entryType: { in: [...CROSS_BRAND_ENTRY_TYPES] },
  sampleSize: { gte: MIN_AGGREGATE_SAMPLE },
  NOT: { data: { path: ["strategyId"], not: Prisma.DbNull } },
} satisfies Prisma.KnowledgeEntryWhereInput;

async function queryLocalKnowledgeGraph(query: SeshatQuery, limit: number): Promise<SeshatReference[]> {
  const results: SeshatReference[] = [];

  // Search by sector
  if (query.sector) {
    const entries = await db.knowledgeEntry.findMany({
      where: { ...CROSS_BRAND_WHERE, sector: query.sector },
      orderBy: { successScore: "desc" },
      take: limit,
    });
    for (const e of entries) {
      results.push(knowledgeEntryToReference(e));
    }
  }

  // Search by market
  if (query.market && results.length < limit) {
    const entries = await db.knowledgeEntry.findMany({
      where: { ...CROSS_BRAND_WHERE, market: query.market },
      orderBy: { successScore: "desc" },
      take: limit - results.length,
    });
    for (const e of entries) {
      if (!results.some((r) => r.id === `kg-${hashRef(e.id)}`)) {
        results.push(knowledgeEntryToReference(e));
      }
    }
  }

  // Search by pillar
  if (query.pillarFocus && results.length < limit) {
    const entries = await db.knowledgeEntry.findMany({
      where: { ...CROSS_BRAND_WHERE, pillarFocus: query.pillarFocus },
      orderBy: { successScore: "desc" },
      take: limit - results.length,
    });
    for (const e of entries) {
      if (!results.some((r) => r.id === `kg-${hashRef(e.id)}`)) {
        results.push(knowledgeEntryToReference(e));
      }
    }
  }

  // PAS de repli « meilleures entrées toutes marques confondues ».
  //
  // Il existait : un `findMany({ orderBy: { successScore: "desc" } })` SANS
  // aucun `where`, qui complétait n'importe quelle requête avec les entrées les
  // mieux notées de toute la base. Un `market_context_get` sur « Cameroun »
  // ramenait ainsi des références d'autres marques dès que le filtre légitime
  // rendait peu de lignes. Rendre moins de références est honnête ; en fabriquer
  // avec la donnée d'autrui ne l'est pas.
  return results.slice(0, limit);
}

async function queryExternalApi(query: SeshatQuery, limit: number): Promise<SeshatReference[]> {
  if (!SESHAT_API_URL) return [];

  try {
    const params = new URLSearchParams({
      topic: query.topic,
      ...(query.sector && { sector: query.sector }),
      ...(query.market && { market: query.market }),
      ...(query.pillarFocus && { pillar: query.pillarFocus }),
      limit: String(limit),
    });

    const response = await fetch(`${SESHAT_API_URL}/api/references?${params}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];
    return (await response.json()) as SeshatReference[];
  } catch {
    return [];
  }
}

function knowledgeEntryToReference(entry: {
  id: string;
  entryType: string;
  sector: string | null;
  market: string | null;
  channel: string | null;
  data: unknown;
  successScore: number | null;
}): SeshatReference {
  const data = entry.data as Record<string, unknown>;

  const typeMap: Record<string, SeshatReference["type"]> = {
    SECTOR_BENCHMARK: "benchmark",
    BRIEF_PATTERN: "case_study",
    CREATOR_PATTERN: "article",
    DIAGNOSTIC_RESULT: "framework",
    MISSION_OUTCOME: "case_study",
    CAMPAIGN_TEMPLATE: "case_study",
  };

  return {
    // `id` n'est PAS l'identifiant technique de l'entrée : `knowledge-aggregator`
    // en fabrique certains sous la forme `study-<strategyId>-<hash>`, qui
    // encodent donc l'id d'une autre marque. On le hache — la déduplication
    // (seul usage réel de ce champ) fonctionne à l'identique.
    id: `kg-${hashRef(entry.id)}`,
    title: generateTitle(entry),
    type: typeMap[entry.entryType] ?? "article",
    relevance: entry.successScore ?? 0.5,
    excerpt: generateExcerpt(entry.entryType, data),
    source: "Knowledge Graph (local)",
    tags: [entry.sector, entry.market, entry.channel].filter(Boolean) as string[],
  };
}

/** Hash court et stable d'un id d'entrée — la déduplication garde son sens sans exposer un id qui peut encoder un strategyId. */
function hashRef(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 16);
}

function generateTitle(entry: { entryType: string; sector: string | null; market: string | null; channel: string | null }): string {
  switch (entry.entryType) {
    case "SECTOR_BENCHMARK": return `Benchmark ${entry.sector ?? "secteur"} — ${entry.market ?? "marché"}`;
    case "BRIEF_PATTERN": return `Pattern brief ${entry.channel ?? "canal"}`;
    case "CREATOR_PATTERN": return "Profil créateur performant";
    case "DIAGNOSTIC_RESULT": return "Résultat diagnostic ARTEMIS";
    case "MISSION_OUTCOME": return "Résultat mission";
    case "CAMPAIGN_TEMPLATE": return `Template campagne ${entry.channel ?? ""}`;
    default: return `Référence ${entry.entryType}`;
  }
}

/**
 * Extrait lisible d'une entrée de connaissance — **liste blanche par type**.
 *
 * La branche `default` faisait `JSON.stringify(data).slice(0, 200)` : un dump
 * BRUT du payload. Or `KnowledgeEntry` est transverse aux marques et son `data`
 * est nominatif — `knowledge-seeder` y écrit `missionTitle`, `avgQcScore`,
 * `firstPassRate` pour `MISSION_OUTCOME`, précisément l'un des deux types que
 * cette branche attrapait. Cette fonction alimente `queryReferences`, appelé par
 * des outils MCP **curés et transverses** : le dump repartait donc à une clé de
 * marque, en contournant la projection posée côté serveurs MCP (le verrou CI ne
 * scanne que `src/server/mcp/**` — relecture adversariale 2026-07-27).
 *
 * Les types non couverts rendent désormais un libellé générique. Perdre un
 * extrait vaut mieux que fuiter un payload dont le schéma n'est pas garanti.
 */
function generateExcerpt(entryType: string, data: Record<string, unknown>): string {
  switch (entryType) {
    case "SECTOR_BENCHMARK":
      return `Score moyen: ${data.avgComposite ?? "N/A"}/200. ${data.insight ?? ""}`;
    case "BRIEF_PATTERN":
      return `Taux succès: ${((data.successRate as number) ?? 0) * 100}%. Révisions: ${data.avgRevisions ?? "N/A"}`;
    case "CREATOR_PATTERN":
      return String(data.insight ?? "Patterns de performance créateurs");
    case "DIAGNOSTIC_RESULT":
      return `Type: ${data.type ?? "diagnostic"}`;
    default:
      return `Entrée ${entryType} du graphe de connaissances.`;
  }
}

async function getFrameworksForPillar(pillarFocus: string): Promise<SeshatReference[]> {
  const pillarKey = pillarFocus.toLowerCase() as PillarKey;
  const pillarName = PILLAR_NAMES[pillarKey] ?? pillarFocus;

  const frameworkMap: Record<string, { id: string; title: string; effectiveness: number }[]> = {
    a: [{ id: "fw-03", title: "FW-03 Brand Prism", effectiveness: 0.82 }, { id: "fw-01", title: "FW-01 Brand Audit", effectiveness: 0.85 }],
    d: [{ id: "fw-05", title: "FW-05 Positioning Map", effectiveness: 0.80 }, { id: "fw-02", title: "FW-02 Competitor Map", effectiveness: 0.78 }],
    v: [{ id: "fw-06", title: "FW-06 Value Proposition Canvas", effectiveness: 0.77 }],
    e: [{ id: "fw-07", title: "FW-07 Community Audit", effectiveness: 0.75 }],
    r: [{ id: "fw-04", title: "FW-04 SWOT+", effectiveness: 0.75 }],
    t: [{ id: "fw-08", title: "FW-08 KPI Framework", effectiveness: 0.73 }],
    i: [{ id: "fw-09", title: "FW-09 Roadmap Builder", effectiveness: 0.70 }],
    s: [{ id: "fw-01", title: "FW-01 Brand Audit", effectiveness: 0.85 }],
  };

  const frameworks = frameworkMap[pillarKey] ?? [];
  return frameworks.map((fw) => ({
    id: fw.id,
    title: `${fw.title} — recommandé pour ${pillarName}`,
    type: "framework" as const,
    relevance: fw.effectiveness,
    excerpt: `Effectiveness: ${(fw.effectiveness * 100).toFixed(0)}%. Recommandé quand le pilier ${pillarName} est faible.`,
    source: "ARTEMIS Framework Library",
    tags: [pillarKey, "framework"],
  }));
}
