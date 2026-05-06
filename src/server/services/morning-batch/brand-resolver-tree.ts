/**
 * Phase 18-A1-δ — Brand resolver tree-aware.
 *
 * Étend le pattern `src/server/services/brief-ingest/brand-resolver.ts` (existant)
 * pour résoudre vers `BrandNode` au bon niveau dans l'arbre Phase 18 (vs Strategy
 * plat legacy). Le matching utilise des règles déterministes sur les noms de
 * BrandNode + slugs + nodeRole tags + fallback string-similarity.
 *
 * Pour MVP shippé sans LLM obligatoire : matching par occurrence textuelle
 * du nom/slug du BrandNode dans la rawText. Le LLM peut être branché Phase 2
 * pour disambiguation contextuelle.
 */

import type { BrandNode } from "@prisma/client";
import { db } from "@/lib/db";

export interface ResolvedBrandPath {
  nodeId: string | null;
  nodePath: string[]; // names from root → leaf
  campaignId: string | null;
  campaignName: string | null;
  confidence: number; // 0..1
}

/**
 * Résout un blob (rawText d'une IngestedSource) vers un BrandNode opérationnel
 * + Campaign existante optionnelle.
 *
 * Stratégie :
 *  1. Récupère tous les BrandNode actifs de l'operator
 *  2. Score chaque BrandNode par match textuel (nom + slug + nodeRole)
 *  3. Best match score > threshold → resolved
 *  4. Sinon : meilleur ancestor commun via match partiel
 *
 * Retourne `nodeId: null` si aucun match avec confidence ≥ 0.4 — l'opérateur
 * fait le matching manuel via tree-picker UI.
 */
export async function resolveBrandPathFromText(args: {
  operatorId: string;
  rawText: string;
  candidateNamesHint?: string[]; // ex: noms de marques détectés à priori
}): Promise<ResolvedBrandPath> {
  const text = args.rawText.toLowerCase();

  // 1. Charger tous les BrandNode opérables (non-archivés)
  const allNodes = await db.brandNode.findMany({
    where: { operatorId: args.operatorId, archivedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      nodeKind: true,
      nodeNature: true,
      nodeRole: true,
      countryCode: true,
      parentNodeId: true,
    },
  });

  if (allNodes.length === 0) {
    return { nodeId: null, nodePath: [], campaignId: null, campaignName: null, confidence: 0 };
  }

  // 2. Score chaque node : occurrence du name lowercased dans le text
  type Scored = { node: (typeof allNodes)[number]; score: number };
  const scored: Scored[] = allNodes.map((node) => {
    const nameNorm = node.name.toLowerCase();
    const slugNorm = node.slug.toLowerCase();
    let score = 0;

    if (nameNorm.length > 2 && text.includes(nameNorm)) score += 0.6;
    if (slugNorm.length > 2 && text.includes(slugNorm.replace(/-/g, " "))) score += 0.3;

    // Bonus si match country code (FC + TG)
    if (node.countryCode && text.includes(node.countryCode.toLowerCase())) score += 0.15;

    // Bonus si match nodeKind tag (rare mais utile pour CORPORATE)
    if (node.nodeKind === "CORPORATE" && nameNorm.length > 2 && text.includes(nameNorm)) score += 0.1;

    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 0.4) {
    return { nodeId: null, nodePath: [], campaignId: null, campaignName: null, confidence: 0 };
  }

  // 3. Construire le nodePath en remontant vers la racine
  const path = await buildAncestorPath(best.node.id, allNodes);

  // 4. Tenter match Campaign existante par nom partiel
  const campaign = await findMatchingCampaign(args.operatorId, args.rawText, best.node.id);

  return {
    nodeId: best.node.id,
    nodePath: path,
    campaignId: campaign?.id ?? null,
    campaignName: campaign?.name ?? null,
    confidence: Math.min(1, best.score),
  };
}

async function buildAncestorPath(
  nodeId: string,
  allNodes: { id: string; name: string; parentNodeId: string | null }[],
): Promise<string[]> {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const path: string[] = [];
  let currentId: string | null = nodeId;
  let safety = 32;
  while (currentId && safety-- > 0) {
    const n = byId.get(currentId);
    if (!n) break;
    path.unshift(n.name);
    currentId = n.parentNodeId;
  }
  return path;
}

/**
 * Cherche une Campaign existante dont le nom matche partiellement le rawText.
 * Filtré sur l'arbre du nodeMatch (Strategy doit avoir un BrandNode dans la
 * descendance du node résolu).
 */
async function findMatchingCampaign(
  operatorId: string,
  rawText: string,
  scopeNodeId: string,
): Promise<{ id: string; name: string } | null> {
  const text = rawText.toLowerCase();
  const campaigns = await db.campaign.findMany({
    where: {
      strategy: { operatorId },
    },
    select: { id: true, name: true, code: true },
    take: 200,
  });
  for (const c of campaigns) {
    const nameNorm = c.name.toLowerCase();
    if (nameNorm.length > 4 && text.includes(nameNorm)) return { id: c.id, name: c.name };
    if (c.code && text.includes(c.code.toLowerCase())) return { id: c.id, name: c.name };
  }
  return null;
}
