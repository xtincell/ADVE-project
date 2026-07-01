/**
 * Oracle — BrandAsset writeback canonique des sections.
 *
 * Extrait de `enrich-oracle.ts` (audit galileo 2026-06-13) pour casser le cycle
 * d'import `index → deterministic-composers → enrich-oracle → index` : ce module
 * ne dépend QUE de Prisma (`db`), jamais de `index.ts`. Ainsi le read-path
 * (`assemblePresentation`) et le compose-path déterministe peuvent tous deux
 * écrire/réutiliser un BrandAsset sans réintroduire la dépendance circulaire.
 *
 * Chemin d'écriture UNIQUE pour les sections Oracle promues en BrandAsset
 * (Loi 1 — un ACTIVE n'est jamais écrasé ; discrimination par metadata.sectionId).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const MAX_BRANDASSET_CONTENT_BYTES = 200_000; // 200 KB

/**
 * Cap défensif de la taille du content avant persistance — évite qu'un payload
 * LLM aberrant gonfle la row BrandAsset. Drop les marqueurs internes `_*`.
 */
export function capContentSize(content: Record<string, unknown>, sectionId: string): Record<string, unknown> {
  const json = JSON.stringify(content);
  if (json.length <= MAX_BRANDASSET_CONTENT_BYTES) return content;

  console.warn(
    `[promoteSectionToBrandAsset] section=${sectionId} content size=${json.length} > ${MAX_BRANDASSET_CONTENT_BYTES} — capping (silent)`,
  );

  const truncated: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (k.startsWith("_")) continue; // Drop pre-existing internal markers
    const vJson = JSON.stringify(v);
    if (vJson.length < 5000) {
      truncated[k] = v;
    } else if (Array.isArray(v)) {
      truncated[k] = v.slice(0, 5);
    } else if (typeof v === "object" && v !== null) {
      const cleaned = Object.entries(v as Record<string, unknown>).filter(([key]) => !key.startsWith("_"));
      truncated[k] = Object.fromEntries(cleaned.slice(0, 5));
    } else {
      truncated[k] = String(v).slice(0, 1000);
    }
  }
  return truncated;
}

/**
 * Promeut le content d'une section Oracle en BrandAsset `state="DRAFT"`.
 *
 * Loi 1 (altitude) — un BrandAsset ACTIVE pour le même (strategyId, kind,
 * metadata.sectionId) n'est JAMAIS écrasé. Le vrai promote DRAFT → ACTIVE est
 * `brand-vault/engine.ts:promoteToActive` (quality gate). Le filtre
 * `metadata.sectionId` est critique : sans lui, plusieurs sections partageant
 * un même kind (ex : `GENERIC` pour Imhotep+Anubis) s'écrasaient mutuellement.
 */
export async function promoteSectionToBrandAsset(args: {
  strategyId: string;
  sectionId: string;
  kind: string;
  content: Record<string, unknown>;
}): Promise<{ created: boolean; updated: boolean; skipped: boolean; assetId?: string }> {
  const { strategyId, sectionId, kind } = args;
  const content = capContentSize(args.content, sectionId);

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { operatorId: true },
  });
  if (!strategy?.operatorId) {
    return { created: false, updated: false, skipped: true };
  }

  const existingActive = await db.brandAsset.findFirst({
    where: {
      strategyId,
      kind,
      state: "ACTIVE",
      metadata: { path: ["sectionId"], equals: sectionId },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (existingActive) {
    console.log(
      `[promoteSectionToBrandAsset] section=${sectionId} kind=${kind} ACTIVE existant → SKIP (Loi 1 altitude)`,
    );
    return { created: false, updated: false, skipped: true, assetId: existingActive.id };
  }

  const existingDraft = await db.brandAsset.findFirst({
    where: {
      strategyId,
      kind,
      state: "DRAFT",
      metadata: { path: ["sectionId"], equals: sectionId },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (existingDraft) {
    const updated = await db.brandAsset.update({
      where: { id: existingDraft.id },
      data: { content: content as Prisma.InputJsonValue, updatedAt: new Date() },
    });
    return { created: false, updated: true, skipped: false, assetId: updated.id };
  }

  const created = await db.brandAsset.create({
    data: {
      strategyId,
      operatorId: strategy.operatorId,
      name: `Oracle section: ${sectionId}`,
      kind,
      family: "INTELLECTUAL",
      content: content as Prisma.InputJsonValue,
      state: "DRAFT",
      summary: `Oracle 35-section ${sectionId} (Phase 13)`,
      metadata: { source: "oracle-enrich", sectionId, phase: 13 } as Prisma.InputJsonValue,
    },
  });
  return { created: true, updated: false, skipped: false, assetId: created.id };
}
