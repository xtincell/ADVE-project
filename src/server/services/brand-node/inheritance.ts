/**
 * Phase 18-N1/N2 (ADR-0059) — Helper `resolveEffectivePillars(nodeId)` avec
 * cache mémoire + invalidation cascade.
 *
 * **Flow de résolution** :
 *
 *   1. Charge le BrandNode courant.
 *   2. Pour chaque pilier ADVE/RTIS (a/d/v/e/r/t/i/s) :
 *      a. Si `BrandNode.pillarOverrides[key]` existe → source = `OWN_OVERRIDE`
 *      b. Sinon si `BrandNode.strategyId` non-null → lire `Pillar` lié à cette
 *         Strategy → source = `OWN_VIA_STRATEGY`
 *      c. Sinon : remonter à `parentNodeId` (récursion) → source = `INHERITED_FROM:<ancestorId>`
 *      d. Si racine atteinte sans résolution → source = `DEFAULT_EMPTY`
 *
 * **Cache** : `Map<nodeId, ResolvedPillars>` en mémoire (process-local),
 * invalidé via `invalidateNodeAndDescendants(nodeId)` à chaque mutation
 * pertinente (OPERATOR_AMEND_PILLAR, OPERATOR_UPDATE_BRAND_NODE avec
 * pillarOverrides modifié, OPERATOR_MOVE_BRAND_NODE).
 * **Multi-pod (vague B, résiduel Phase 18)** : l'invalidation est diffusée
 * aux autres pods via Redis pub/sub (`@/lib/redis`, opt-in `REDIS_URL`) — le
 * pod émetteur envoie la liste résolue des nodeIds, les récepteurs purgent
 * localement sans refaire le walk DB. Sans Redis : single-pod historique.
 *
 * **Loi 1 APOGEE** (conservation altitude) : la résolution ne mute jamais l'arbre.
 * C'est uniquement une lecture cumulée. Les overrides explicites passent par
 * `OPERATOR_AMEND_PILLAR` (ADR-0023) ou `OPERATOR_UPDATE_BRAND_NODE` (Phase 18-A0).
 */

import type { BrandNode, Pillar, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publishJson, subscribeJson, isRedisConfigured } from "@/lib/redis";
import { PILLAR_STORAGE_KEYS, type PillarStorageKey } from "@/domain/pillars";

export type PillarResolutionSource =
  | "OWN_OVERRIDE" // BrandNode.pillarOverrides[key] non-null
  | "OWN_VIA_STRATEGY" // BrandNode.strategyId attaché + Pillar non-null pour ce key
  | "INHERITED_FROM" // remonté depuis un ancêtre — provenanceNodeId set
  | "DEFAULT_EMPTY"; // pas trouvé jusqu'à la racine

export interface ResolvedPillarValue {
  /** Contenu du pilier (Json libre — typiquement objet avec champs `archetype`, `tone`, etc.) */
  content: unknown;
  /** Confidence 0..1 si vient d'un Pillar attaché ; null si override JSON brut. */
  confidence: number | null;
  /** D'où vient la résolution (cf. PillarResolutionSource). */
  source: PillarResolutionSource;
  /** Si source = INHERITED_FROM : id du nœud ancêtre fournisseur. */
  provenanceNodeId: string | null;
  /** Nom du nœud ancêtre (pour UI badge "INHERITED FROM <name>"). */
  provenanceNodeName: string | null;
  /** Distance dans l'arbre (0 = OWN, 1 = parent, 2 = grand-parent, etc.). */
  inheritanceDistance: number;
}

export interface ResolvedPillars {
  nodeId: string;
  pillars: Record<PillarStorageKey, ResolvedPillarValue>;
  /** Timestamp de la résolution (sert au cache TTL hypothétique Phase 18 noyau full). */
  resolvedAt: Date;
}

// ──────────────────────────────────────────────────────────────────────
// Cache mémoire process-local
// ──────────────────────────────────────────────────────────────────────

const cache = new Map<string, ResolvedPillars>();

const INVALIDATION_CHANNEL = "cache:brand-node:invalidate";
let bridgeStarted = false;

/** Écoute (une fois) les invalidations émises par les autres pods. */
function ensureInvalidationBridge(): void {
  if (bridgeStarted || !isRedisConfigured()) return;
  bridgeStarted = true;
  subscribeJson(INVALIDATION_CHANNEL, (payload) => {
    if (payload.all === true) {
      cache.clear();
      return;
    }
    const nodeIds = Array.isArray(payload.nodeIds) ? payload.nodeIds : [];
    for (const id of nodeIds) {
      if (typeof id === "string") cache.delete(id);
    }
  });
}

/** Pour les tests anti-drift / hot-reload — clear total du cache. */
export function clearAllInheritanceCache(): void {
  cache.clear();
}

/** Stats cache pour observability. */
export function getInheritanceCacheStats(): { size: number; nodeIds: string[] } {
  return { size: cache.size, nodeIds: [...cache.keys()] };
}

// ──────────────────────────────────────────────────────────────────────
// Resolution principale
// ──────────────────────────────────────────────────────────────────────

interface ChainNode {
  id: string;
  name: string;
  parentNodeId: string | null;
  strategyId: string | null;
  pillarOverrides: Prisma.JsonValue | null;
}

/**
 * Résout les piliers effectifs d'un BrandNode en remontant l'arbre.
 *
 * @param nodeId BrandNode cible
 * @param opts.bypassCache force re-résolution (utile post-mutation)
 */
export async function resolveEffectivePillars(
  nodeId: string,
  opts: { bypassCache?: boolean } = {},
): Promise<ResolvedPillars> {
  ensureInvalidationBridge();
  if (!opts.bypassCache) {
    const cached = cache.get(nodeId);
    if (cached) return cached;
  }

  // 1. Charger la chaîne complète node → parents → racine en 1 query
  // (anti-N+1 : on remonte via récursion controlée mais batchable).
  const chain = await loadAncestorChain(nodeId);
  if (chain.length === 0) {
    throw new Error(`BrandNode ${nodeId} not found`);
  }

  // 2. Charger tous les Pillar des Strategy attachées à la chaîne (1 query batchée)
  const strategyIds = chain.map((n) => n.strategyId).filter((id): id is string => id !== null);
  const allPillars =
    strategyIds.length > 0
      ? await db.pillar.findMany({ where: { strategyId: { in: strategyIds } } })
      : [];
  const pillarsByStrategyKey = new Map<string, Pillar>();
  for (const p of allPillars) {
    pillarsByStrategyKey.set(`${p.strategyId}::${p.key}`, p);
  }

  // 3. Résoudre chaque pilier indépendamment en remontant la chaîne
  const pillars: Record<PillarStorageKey, ResolvedPillarValue> = {} as Record<
    PillarStorageKey,
    ResolvedPillarValue
  >;
  for (const key of PILLAR_STORAGE_KEYS) {
    pillars[key] = resolveOne(key, chain, pillarsByStrategyKey);
  }

  const resolved: ResolvedPillars = {
    nodeId,
    pillars,
    resolvedAt: new Date(),
  };
  cache.set(nodeId, resolved);
  return resolved;
}

function resolveOne(
  key: PillarStorageKey,
  chain: ChainNode[],
  pillarsByStrategyKey: Map<string, Pillar>,
): ResolvedPillarValue {
  for (let distance = 0; distance < chain.length; distance++) {
    const node = chain[distance]!;

    // a. Override sur ce nœud
    const overrides =
      node.pillarOverrides && typeof node.pillarOverrides === "object" && !Array.isArray(node.pillarOverrides)
        ? (node.pillarOverrides as Record<string, unknown>)
        : null;
    if (overrides && overrides[key] !== undefined && overrides[key] !== null) {
      return {
        content: overrides[key],
        confidence: null,
        source: distance === 0 ? "OWN_OVERRIDE" : "INHERITED_FROM",
        provenanceNodeId: distance === 0 ? null : node.id,
        provenanceNodeName: distance === 0 ? null : node.name,
        inheritanceDistance: distance,
      };
    }

    // b. Pillar via Strategy attachée
    if (node.strategyId) {
      const pillar = pillarsByStrategyKey.get(`${node.strategyId}::${key}`);
      if (pillar?.content !== undefined && pillar?.content !== null) {
        return {
          content: pillar.content,
          confidence: pillar.confidence,
          source: distance === 0 ? "OWN_VIA_STRATEGY" : "INHERITED_FROM",
          provenanceNodeId: distance === 0 ? null : node.id,
          provenanceNodeName: distance === 0 ? null : node.name,
          inheritanceDistance: distance,
        };
      }
    }
    // sinon continue de remonter
  }

  // d. Pas trouvé jusqu'à la racine
  return {
    content: null,
    confidence: null,
    source: "DEFAULT_EMPTY",
    provenanceNodeId: null,
    provenanceNodeName: null,
    inheritanceDistance: chain.length - 1,
  };
}

/**
 * Charge la chaîne BrandNode → parent → ... → racine. Anti-cycle 32 niveaux.
 */
async function loadAncestorChain(nodeId: string): Promise<ChainNode[]> {
  const chain: ChainNode[] = [];
  let currentId: string | null = nodeId;
  let depth = 0;
  while (currentId && depth < 32) {
    const node: ChainNode | null = await db.brandNode.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        name: true,
        parentNodeId: true,
        strategyId: true,
        pillarOverrides: true,
      },
    });
    if (!node) break;
    chain.push(node);
    currentId = node.parentNodeId;
    depth++;
  }
  return chain;
}

// ──────────────────────────────────────────────────────────────────────
// Invalidation cascade (Phase 18-N2)
// ──────────────────────────────────────────────────────────────────────

/**
 * Invalide le cache du node + tous ses descendants. À appeler après chaque
 * mutation qui change la résolution effective :
 *   - OPERATOR_AMEND_PILLAR (Strategy.Pillar update)
 *   - OPERATOR_UPDATE_BRAND_NODE avec pillarOverrides modifié
 *   - OPERATOR_MOVE_BRAND_NODE (re-parent change la chaîne)
 *   - OPERATOR_ATTACH_STRATEGY_TO_NODE (changement de Strategy attachée)
 *
 * @returns Nombre de nodes invalidés.
 */
export async function invalidateNodeAndDescendants(nodeId: string): Promise<number> {
  const descendants = await loadDescendantIds(nodeId);
  const ids = [nodeId, ...descendants];
  let invalidated = 0;
  for (const id of ids) {
    if (cache.delete(id)) invalidated++;
  }
  // Multi-pod : diffuse la liste RÉSOLUE — les autres pods purgent localement
  // sans refaire le walk DB. No-op sans REDIS_URL.
  publishJson(INVALIDATION_CHANNEL, { nodeIds: ids });
  return invalidated;
}

/**
 * Invalide le cache pour tous les BrandNode liés à une Strategy donnée +
 * leurs descendants. À appeler après OPERATOR_AMEND_PILLAR (qui mute la
 * Strategy.Pillar).
 */
export async function invalidateByStrategy(strategyId: string): Promise<number> {
  const directNodes = await db.brandNode.findMany({
    where: { strategyId },
    select: { id: true },
  });
  let total = 0;
  for (const n of directNodes) {
    total += await invalidateNodeAndDescendants(n.id);
  }
  return total;
}

/**
 * Charge récursivement les IDs des descendants d'un node. BFS, anti-cycle via
 * Set des visités.
 */
async function loadDescendantIds(rootNodeId: string): Promise<string[]> {
  const visited = new Set<string>([rootNodeId]);
  const result: string[] = [];
  const queue: string[] = [rootNodeId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await db.brandNode.findMany({
      where: { parentNodeId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers UI
// ──────────────────────────────────────────────────────────────────────

/**
 * Retourne pour chaque pilier le label affichable dans le badge UI.
 *
 * - "OWN_OVERRIDE" → "OVERRIDE LOCAL"
 * - "OWN_VIA_STRATEGY" → "OWN"
 * - "INHERITED_FROM" → "INHERITED FROM <provenanceNodeName>"
 * - "DEFAULT_EMPTY" → "DEFAULT (empty)"
 */
export function badgeLabelForPillar(value: ResolvedPillarValue): string {
  switch (value.source) {
    case "OWN_OVERRIDE":
      return "OVERRIDE LOCAL";
    case "OWN_VIA_STRATEGY":
      return "OWN";
    case "INHERITED_FROM":
      return `INHERITED FROM ${value.provenanceNodeName ?? "?"}`;
    case "DEFAULT_EMPTY":
      return "DEFAULT (empty)";
  }
}
