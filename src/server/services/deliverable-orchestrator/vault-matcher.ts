/**
 * Deliverable Orchestrator — Vault matcher (Phase 17b, ADR-0050 — anciennement ADR-0037).
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

import type { BrandAsset } from "@prisma/client";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { db } from "@/lib/db";
import type { BrandAssetKind } from "@/domain/brand-asset-kinds";
import type { VaultMatchResult, VaultMatchStatus } from "./types";

/** Receipt of the exact current brief, including the retained document/original if present. */
export function briefAssetFingerprint(asset: Pick<BrandAsset, "id" | "version" | "content" | "metadata" | "campaignId" | "sourceGloryOutputId" | "sourceIntentId">): string {
  return sourceFingerprint({rawData: {id:asset.id, version:asset.version, content:asset.content, metadata:asset.metadata,
    campaignId:asset.campaignId, sourceGloryOutputId:asset.sourceGloryOutputId, sourceIntentId:asset.sourceIntentId}});
}

/**
 * Scanne le vault d'une strategy pour les kinds donnés.
 *
 * Retourne un VaultMatchResult par kind requis (même si MISSING) — l'ordre
 * du tableau de sortie respecte l'ordre du tableau d'entrée.
 */
export async function matchVault(
  strategyId: string,
  requiredKinds: readonly BrandAssetKind[],
  campaignId?: string,
): Promise<VaultMatchResult[]> {
  if (requiredKinds.length === 0) return [];

  // Single round-trip — IN clause sur les kinds requis.
  const rows = await db.brandAsset.findMany({
    where: {
      strategyId,
      state: "ACTIVE",
      ...(campaignId ? { OR: [{campaignId}, {campaignId: null}] } : { campaignId: null }),
      kind: { in: [...requiredKinds] },
    },
    select: {
      id: true,
      kind: true,
      state: true,
      staleAt: true,
      campaignId: true,
      version: true, content: true, metadata: true, sourceGloryOutputId: true, sourceIntentId: true,
      name:true, mimeType:true, fileUrl:true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Index par kind — premier ACTIVE wins (orderBy desc).
  const byKind = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const incumbent = byKind.get(row.kind);
    if (!incumbent || (campaignId && row.campaignId === campaignId && incumbent.campaignId !== campaignId)) byKind.set(row.kind, row);
  }

  const now = new Date();
  return Promise.all(requiredKinds.map(async (kind) => {
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

    let isStale = found.staleAt !== null && found.staleAt <= now;
    if (!isStale && found.version !== undefined) {
      const { readPinSourceText, assertUsablePin } = await import("./production-sources");
      try {
        assertUsablePin(found,{assetId:found.id,version:found.version,role:"REFERENCE"},campaignId);
        const data = await readPinSourceText(strategyId, found, "REFERENCE");
        isStale = !data.fullText.trim();
      } catch (error) {
        // A retired or corrected document cannot be reused. Infrastructure failures still abort the preview.
        if (!(error instanceof Error) || !/retiré|corrigé|Original non reçu|diffère de|a changé|inaccessible|SOURCE_UNAVAILABLE/.test(error.message)) throw error;
        isStale = true;
      }
    }
    return {
      kind,
      status: (isStale ? "STALE_REFRESH" : "ACTIVE_REUSE") satisfies VaultMatchStatus,
      assetId: found.id,
      assetState: found.state,
      ...(found.version !== undefined ? { assetVersion: found.version, assetFingerprint: briefAssetFingerprint(found) } : {}),
      staleAt: found.staleAt,
    };
  }));
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
