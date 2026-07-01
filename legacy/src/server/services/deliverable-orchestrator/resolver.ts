/**
 * Deliverable Orchestrator — DAG resolver (Phase 17, ADR-0037).
 *
 * Étant donné un `BrandAsset.kind` matériel cible :
 *   1. Récupère le Glory tool producteur via `getProducerSlug` (target-mapping).
 *   2. BFS topologique sur `forgeOutput.requires` (ajouté Phase 17 commit 1).
 *      Pour chaque kind upstream, lookup le tool producteur via
 *      `getProducerSlug` ; si absent du mapping, le kind est traité comme
 *      feuille vault-only (`producerSlug = null`).
 *   3. Détection cycle via Set des kinds en cours de visit (DFS classique
 *      coloring blanc/gris/noir). Cycle = throw `ResolverCycleDetectedError`.
 *   4. Tri topologique (Kahn-like via depth assignment) — depth 0 = target,
 *      depth croissant vers feuilles upstream.
 *
 * Layer 2 — pas de Prisma direct, pas de mestor. Lit `EXTENDED_GLORY_TOOLS`
 * statique du registry.
 */

import { EXTENDED_GLORY_TOOLS, getGloryTool } from "@/server/services/artemis/tools/registry";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import { getProducerSlug } from "./target-mapping";
import {
  ResolverCycleDetectedError,
  TargetNotForgeableError,
  type BriefRequirement,
} from "./types";

/**
 * Résout le DAG des briefs requis pour matérialiser `targetKind`.
 *
 * Retourne :
 *   - `targetSlug` : Glory tool slug du producteur target (depth 0)
 *   - `briefDag`   : nœuds tri-topo, depth 0 → N (feuilles)
 *
 * Throws :
 *   - `TargetNotForgeableError` si `targetKind` n'a pas de producer mapping
 *   - `ResolverCycleDetectedError` si la chaîne `requires` boucle
 */
export function resolveRequirements(targetKind: BrandAssetKind): {
  targetSlug: string;
  briefDag: BriefRequirement[];
} {
  const targetSlug = getProducerSlug(targetKind);
  if (!targetSlug) {
    throw new TargetNotForgeableError(targetKind);
  }

  // BFS avec coloring DFS pour cycle detection.
  // visited: kinds dont l'expansion est complète.
  // visiting: kinds dont l'expansion est en cours (chemin actif). Cycle si on
  //           retombe sur un kind dans visiting.
  const visited = new Set<BrandAssetKind>();
  const visiting = new Set<BrandAssetKind>();
  const nodes = new Map<BrandAssetKind, BriefRequirement>();

  function visit(kind: BrandAssetKind, depth: number, path: BrandAssetKind[]): void {
    if (visiting.has(kind)) {
      throw new ResolverCycleDetectedError([...path, kind]);
    }
    if (visited.has(kind)) {
      // Déjà résolu — on garde la profondeur max pour le tri topo.
      const existing = nodes.get(kind);
      if (existing && depth > existing.depth) {
        nodes.set(kind, { ...existing, depth });
      }
      return;
    }

    visiting.add(kind);

    // Lookup producer Glory tool. Pour le target (depth 0) on a déjà targetSlug.
    // Pour les nœuds upstream, on map kind → slug via target-mapping ; absent =
    // feuille vault-only.
    const producerSlug = depth === 0 ? targetSlug : getProducerSlug(kind);
    const requires = getRequiresFromTool(producerSlug);

    nodes.set(kind, {
      kind,
      producerSlug,
      depth,
      requires,
    });

    for (const upstream of requires) {
      visit(upstream, depth + 1, [...path, kind]);
    }

    visiting.delete(kind);
    visited.add(kind);
  }

  visit(targetKind, 0, []);

  // Tri topologique : depth croissant. Stable via insertion order de la Map.
  const briefDag = [...nodes.values()].sort((a, b) => a.depth - b.depth);

  return { targetSlug, briefDag };
}

/**
 * Lookup le `forgeOutput.requires` d'un Glory tool par slug.
 * Renvoie `[]` si tool absent ou `forgeOutput` non déclaré ou `requires` undefined.
 */
function getRequiresFromTool(slug: string | null): readonly BrandAssetKind[] {
  if (!slug) return [];
  const tool = getGloryTool(slug);
  if (!tool || !tool.forgeOutput) return [];
  return tool.forgeOutput.requires ?? [];
}

/**
 * Liste tous les kinds upstream uniques requis (hors target) — utile pour le
 * vault-matcher qui doit scanner ces kinds sur la strategy active.
 */
export function extractUpstreamKinds(briefDag: readonly BriefRequirement[]): BrandAssetKind[] {
  return briefDag.filter((node) => node.depth > 0).map((node) => node.kind);
}

/** Audit helper — log textuel du DAG (debug). */
export function describeDag(briefDag: readonly BriefRequirement[]): string {
  return briefDag
    .map((n) => `  [d${n.depth}] ${n.kind}${n.producerSlug ? ` ← ${n.producerSlug}` : " (vault-only)"}`)
    .join("\n");
}

/** Sanity export pour tests + future inspection. */
export const _internals = { EXTENDED_GLORY_TOOLS };
