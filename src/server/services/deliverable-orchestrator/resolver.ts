/**
 * Deliverable Orchestrator — DAG resolver (Phase 17b, ADR-0050 — anciennement ADR-0037).
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
import { FORMAT_TO_KIND } from "@/domain/brand-asset-formats";
import { BRAND_ASSET_KINDS, type BrandAssetKind } from "@/domain/brand-asset-kinds";
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

  const nodes = new Map<BrandAssetKind, BriefRequirement>();
  const visiting = new Set<BrandAssetKind>();
  // A shared prerequisite can appear at different depths. Propagate the longest path
  // to its own dependencies so the published order is also executable in reverse.
  function visit(kind: BrandAssetKind, depth: number, path: BrandAssetKind[]) {
    if (visiting.has(kind)) throw new ResolverCycleDetectedError([...path, kind]);
    const known = nodes.get(kind);
    if (known && known.depth >= depth) return;
    const producerSlug = depth === 0 ? targetSlug : getBriefProducer(kind);
    const requires = getRequiresFromTool(producerSlug);
    nodes.set(kind, {kind, depth, producerSlug, requires});
    visiting.add(kind);
    for (const dependency of requires) visit(dependency, depth + 1, [...path, kind]);
    visiting.delete(kind);
  }
  visit(targetKind, 0, []);
  const briefDag = [...nodes.values()].sort((a,b)=>a.depth-b.depth);
  return { targetSlug, briefDag };
}

/**
 * Lookup le `forgeOutput.requires` d'un Glory tool par slug.
 * Renvoie `[]` si tool absent ou `forgeOutput` non déclaré ou `requires` undefined.
 */
function getBriefProducer(kind: BrandAssetKind): string | null {
  const candidates = EXTENDED_GLORY_TOOLS.filter(tool => tool.status === "ACTIVE" && FORMAT_TO_KIND[tool.outputFormat] === kind);
  // An ambiguous output needs an explicit producer decision or a real active document.
  return candidates.length === 1 ? candidates[0]!.slug : null;
}

function getRequiresFromTool(slug: string | null): BrandAssetKind[] {
  const tool = slug ? getGloryTool(slug) : undefined;
  if (!tool) return [];
  const required = new Set<BrandAssetKind>(tool.forgeOutput?.requires ?? []);
  for (const prerequisite of tool.dependencies ?? []) {
    const dependency = getGloryTool(prerequisite);
    const kind = dependency && FORMAT_TO_KIND[dependency.outputFormat];
    if (kind && BRAND_ASSET_KINDS.includes(kind as BrandAssetKind)) required.add(kind as BrandAssetKind);
  }
  return [...required];
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
