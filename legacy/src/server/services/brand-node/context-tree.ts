/**
 * Phase 18-N4 (ADR-0059) — Retriever arborescent pour BrandContextNode.
 *
 * Étend le pattern legacy `BrandContextNode` (scopé `strategyId`) en mode
 * tree-aware : le retriever remonte la chaîne d'ancêtres + collecte les frères
 * pour produire un contexte cumulé enrichi.
 *
 * Stratégie de scoring :
 *   - Distance 0 (node courant) : weight 1.0
 *   - Ancestor distance 1 (parent) : weight 0.7
 *   - Ancestor distance 2 (grand-parent) : weight 0.5
 *   - Ancestor distance 3+ : weight 0.3
 *   - Frère (même parent + même nodeKind) : weight 0.4
 *   - Recency boost : ×1.2 si <30j, ×0.8 si >180j
 *
 * Le `retrievalScope` du BrandContextNode contraint sa visibilité :
 *   - "SELF" : visible uniquement sur son node directement attaché
 *   - "ANCESTORS" : visible aussi en remontant (cas tone-of-voice master qui descend)
 *   - "DESCENDANTS" : visible aussi en descendant (cas signal terrain qui remonte)
 */

import type { BrandContextNode } from "@prisma/client";
import { db } from "@/lib/db";

export type RetrievalScopeMode = "SELF" | "ANCESTORS" | "DESCENDANTS";

export interface ScoredContextNode {
  node: BrandContextNode;
  score: number;
  /** Distance dans l'arbre (0 = node lui-même, 1 = parent, 2 = grand-parent, etc.). */
  distance: number;
  /** "OWN" | "ANCESTOR" | "SIBLING" — pour debug et UI badge. */
  origin: "OWN" | "ANCESTOR" | "SIBLING";
}

export interface SearchContextOpts {
  /** Filtre par kind (PILLAR_FIELD | NARRATIVE | BRANDLEVEL | RECO | ASSET | SEQUENCE_OUTPUT). */
  kinds?: string[];
  /** Filtre par pillarKey (a/d/v/e/r/t/i/s). */
  pillarKeys?: string[];
  /** Inclut les frères (mêmes parent + même nodeKind). Default false. */
  includeSiblings?: boolean;
  /** Profondeur max pour ancêtres. Default 8 (cap soft). */
  maxAncestorDepth?: number;
  /** Limit de retour. Default 50. */
  limit?: number;
}

/**
 * Recherche le contexte arborescent pertinent pour un BrandNode donné.
 *
 * Retourne les BrandContextNode visibles depuis ce nœud :
 *   1. Ceux directement attachés (origin=OWN)
 *   2. Ceux des ancêtres avec retrievalScope contenant "DESCENDANTS" (origin=ANCESTOR)
 *   3. Optionnellement ceux des frères (origin=SIBLING)
 *
 * Scoré par distance + recency. Trié par score desc.
 */
export async function searchContextForNode(
  nodeId: string,
  opts: SearchContextOpts = {},
): Promise<ScoredContextNode[]> {
  const maxDepth = opts.maxAncestorDepth ?? 8;
  const limit = opts.limit ?? 50;

  // 1. Charger la chaîne d'ancêtres
  const chain = await loadAncestorChain(nodeId, maxDepth);
  if (chain.length === 0) return [];

  const ancestorIds = chain.map((n) => n.id);

  // 2. Charger les BrandContextNode des ancêtres via nodeId direct
  const ownContextNodes = await db.brandContextNode.findMany({
    where: {
      nodeId: { in: ancestorIds },
      ...(opts.kinds ? { kind: { in: opts.kinds } } : {}),
      ...(opts.pillarKeys ? { pillarKey: { in: opts.pillarKeys } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit * 2, // headroom pour scoring
  });

  // 3. Charger via legacy strategyId (backward compat) si la chaîne a des Strategy attachées
  const strategyIds = chain.map((n) => n.strategyId).filter((id): id is string => id !== null);
  const strategyContextNodes =
    strategyIds.length > 0
      ? await db.brandContextNode.findMany({
          where: {
            strategyId: { in: strategyIds },
            // Filter out nodes already loaded via direct nodeId attachment
            nodeId: null,
            ...(opts.kinds ? { kind: { in: opts.kinds } } : {}),
            ...(opts.pillarKeys ? { pillarKey: { in: opts.pillarKeys } } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : [];

  // 4. Optionnellement : frères (même parent + même nodeKind que le node courant)
  let siblingContextNodes: BrandContextNode[] = [];
  if (opts.includeSiblings && chain[0]?.parentNodeId) {
    const siblings = await db.brandNode.findMany({
      where: {
        parentNodeId: chain[0].parentNodeId,
        nodeKind: chain[0].nodeKind,
        id: { not: nodeId },
      },
      select: { id: true },
    });
    if (siblings.length > 0) {
      siblingContextNodes = await db.brandContextNode.findMany({
        where: {
          nodeId: { in: siblings.map((s) => s.id) },
          ...(opts.kinds ? { kind: { in: opts.kinds } } : {}),
          ...(opts.pillarKeys ? { pillarKey: { in: opts.pillarKeys } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
    }
  }

  // 5. Scoring
  const nowMs = Date.now();
  const ancestorIndexById = new Map(chain.map((n, i) => [n.id, i]));

  const scored: ScoredContextNode[] = [];

  // 5a. Own + Ancestors (via nodeId direct)
  for (const cn of ownContextNodes) {
    const distance = cn.nodeId ? (ancestorIndexById.get(cn.nodeId) ?? 0) : 0;
    const origin: "OWN" | "ANCESTOR" = distance === 0 ? "OWN" : "ANCESTOR";

    // Filter par retrievalScope si distance > 0 (ancestor)
    if (distance > 0 && !cn.retrievalScope.includes("DESCENDANTS")) {
      continue; // ancestor avec scope SELF only — pas visible ici
    }

    scored.push({ node: cn, score: scoreFor(distance, origin, cn, nowMs), distance, origin });
  }

  // 5b. Ancestors via legacy strategyId
  for (const cn of strategyContextNodes) {
    const ancestorIdx = chain.findIndex((n) => n.strategyId === cn.strategyId);
    const distance = ancestorIdx === -1 ? 0 : ancestorIdx;
    const origin: "OWN" | "ANCESTOR" = distance === 0 ? "OWN" : "ANCESTOR";
    if (distance > 0 && !cn.retrievalScope.includes("DESCENDANTS")) continue;
    scored.push({ node: cn, score: scoreFor(distance, origin, cn, nowMs), distance, origin });
  }

  // 5c. Siblings
  for (const cn of siblingContextNodes) {
    if (!cn.retrievalScope.includes("ANCESTORS") && !cn.retrievalScope.includes("DESCENDANTS")) {
      // Frère avec retrievalScope SELF only → pas visible
      continue;
    }
    scored.push({ node: cn, score: scoreFor(0, "SIBLING", cn, nowMs), distance: 0, origin: "SIBLING" });
  }

  // 6. Tri par score desc + cap limit
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function scoreFor(
  distance: number,
  origin: "OWN" | "ANCESTOR" | "SIBLING",
  cn: BrandContextNode,
  nowMs: number,
): number {
  // Base weight
  let base = 0;
  if (origin === "OWN") base = 1.0;
  else if (origin === "SIBLING") base = 0.4;
  else if (distance === 1) base = 0.7;
  else if (distance === 2) base = 0.5;
  else base = 0.3;

  // Recency boost
  const ageDays = (nowMs - cn.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  let recencyMult = 1.0;
  if (ageDays < 30) recencyMult = 1.2;
  else if (ageDays > 180) recencyMult = 0.8;

  return base * recencyMult;
}

interface ChainNode {
  id: string;
  parentNodeId: string | null;
  strategyId: string | null;
  nodeKind: string;
}

async function loadAncestorChain(nodeId: string, maxDepth: number): Promise<ChainNode[]> {
  const chain: ChainNode[] = [];
  let currentId: string | null = nodeId;
  let depth = 0;
  while (currentId && depth < maxDepth) {
    const node: ChainNode | null = await db.brandNode.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        parentNodeId: true,
        strategyId: true,
        nodeKind: true,
      },
    });
    if (!node) break;
    chain.push(node);
    currentId = node.parentNodeId;
    depth++;
  }
  return chain;
}
