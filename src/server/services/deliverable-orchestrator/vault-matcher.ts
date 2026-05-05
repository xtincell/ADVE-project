/**
 * Deliverable Orchestrator — Vault matcher (Phase 17, ADR-0050 — anciennement ADR-0037).
 *
 * Étant donné une `strategyId` et la liste des `BrandAsset.kind` upstream
 * requis par le DAG résolu, scanne le vault pour déterminer pour chaque kind
 * son statut :
 *   - ACTIVE_REUSE      : un BrandAsset state=ACTIVE existe et n'est pas stale
 *   - STALE_REFRESH     : un BrandAsset state=ACTIVE existe mais staleAt < now
 *   - MISSING_GENERATE  : aucun BrandAsset state=ACTIVE pour ce kind
 *
 * Pattern Phase 10/13/16 (ADR-0012, ADR-0023) : un seul `state=ACTIVE` par
 * `(strategyId, kind)`. Le scan sélectionne donc le 1er match.
 *
 * Layer 3 — DB read-only (Prisma). Tenant-scoped strict via `strategyId` filter.
 */

import { db } from "@/lib/db";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import type { VaultMatchResult, VaultMatchStatus } from "./types";

/**
 * Scanne le vault d'une strategy pour les kinds donnés.
 *
 * Retourne un VaultMatchResult par kind requis (même si MISSING) — l'ordre
 * du tableau de sortie respecte l'ordre du tableau d'entrée.
 */
export async function matchVault(
  strategyId: string,
  requiredKinds: readonly BrandAssetKind[],
): Promise<VaultMatchResult[]> {
  if (requiredKinds.length === 0) return [];

  // Single round-trip — IN clause sur les kinds requis.
  const rows = await db.brandAsset.findMany({
    where: {
      strategyId,
      state: "ACTIVE",
      kind: { in: [...requiredKinds] },
    },
    select: {
      id: true,
      kind: true,
      state: true,
      staleAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Index par kind — premier ACTIVE wins (orderBy desc).
  const byKind = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byKind.has(row.kind)) byKind.set(row.kind, row);
  }

  const now = new Date();
  return requiredKinds.map((kind) => {
    const found = byKind.get(kind);
    if (!found) {
      return {
        kind,
        status: "MISSING_GENERATE" satisfies VaultMatchStatus,
        assetId: null,
        assetState: null,
        staleAt: null,
      };
    }

    const isStale = found.staleAt !== null && found.staleAt < now;
    return {
      kind,
      status: (isStale ? "STALE_REFRESH" : "ACTIVE_REUSE") satisfies VaultMatchStatus,
      assetId: found.id,
      assetState: found.state,
      staleAt: found.staleAt,
    };
  });
}

/**
 * Helper : extrait les kinds qui doivent être *générés* (MISSING_GENERATE +
 * STALE_REFRESH). Utile pour calculer le coût pre-flight et construire la
 * GlorySequence runtime en amont du dispatch.
 */
export function extractToGenerate(matches: readonly VaultMatchResult[]): BrandAssetKind[] {
  return matches
    .filter((m) => m.status === "MISSING_GENERATE" || m.status === "STALE_REFRESH")
    .map((m) => m.kind);
}

/**
 * Helper : extrait les kinds qui peuvent être *réutilisés* (ACTIVE_REUSE).
 * Utile pour le composer (linking parentBrandAssetId vers ces assets).
 */
export function extractToReuse(
  matches: readonly VaultMatchResult[],
): { kind: BrandAssetKind; assetId: string }[] {
  return matches
    .filter((m): m is VaultMatchResult & { assetId: string } => m.status === "ACTIVE_REUSE" && m.assetId !== null)
    .map((m) => ({ kind: m.kind, assetId: m.assetId }));
}
