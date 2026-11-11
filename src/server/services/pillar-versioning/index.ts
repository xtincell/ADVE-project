/**
 * Pillar Versioning — Tracks all content changes with diff and rollback
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface VersionEntry {
  pillarId: string;
  content: Record<string, unknown>;
  author?: string;
  reason?: string;
  /** G (ADR-0176) — IntentEmission qui produit cette écriture (rollback précis). */
  intentId?: string;
  checkpoint?: Prisma.InputJsonValue;
  compensatedFrom?: string;
}

/**
 * Snapshot the current pillar state before applying changes.
 * Called before each update to preserve the previous version.
 */
export async function createVersion(entry: VersionEntry, client: Prisma.TransactionClient = db): Promise<string> {
  const pillar = await client.pillar.findUnique({ where: { id: entry.pillarId } });
  if (!pillar) throw new Error(`Pillar ${entry.pillarId} not found`);

  const previousContent = (pillar.content as Record<string, unknown>) ?? {};
  const diff = computeDiff(previousContent, entry.content);

  const version = await client.pillarVersion.create({
    data: {
      pillarId: entry.pillarId,
      version: pillar.currentVersion ?? 1,
      content: previousContent as Prisma.InputJsonValue,
      diff: diff as Prisma.InputJsonValue,
      author: entry.author,
      reason: entry.reason,
      intentId: entry.intentId ?? null,
      ...(entry.checkpoint ? { checkpoint: entry.checkpoint } : {}),
      compensatedFrom: entry.compensatedFrom ?? null,
    },
  });

  // round-13a (CRITICAL) — createVersion ne bumpe PLUS `Pillar.currentVersion`.
  // Historiquement exécuté sur le client global, il faisait alors N→N+1 sur une connexion
  // SÉPARÉE, AVANT le persist conditionnel du gateway (`updateMany where
  // currentVersion = N` — verrou optimiste posé round-12). Sous READ COMMITTED, ce
  // persist re-snapshottait la ligne à N+1 (déjà committée par ce bump), matchait
  // 0 ligne → `count !== 1` → throw PILLAR_VERSION_CONFLICT → TOUTE écriture pilier
  // gouvernée échouait sur un vrai Postgres (invisible en CI : DB stub + tx mockée).
  // Le bump du compteur appartient désormais au SEUL persist atomique du gateway,
  // qui devient un verrou optimiste réel. La restauration utilise aussi ce gateway. Invariant verrouillé par create-version-no-bump.test.ts.
  // ADR-0198 : le gateway passe maintenant sa transaction ; snapshot et contenu
  // sont annulés ensemble si un pilier du lot est refusé.
  return version.id;
}

/**
 * Get version history for a pillar
 */
export async function getHistory(pillarId: string, limit = 20) {
  return db.pillarVersion.findMany({
    where: { pillarId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Restoration is not a versioning concern: the history action, the journal
// compensation and the Notoria withdrawal all enter `pillar-gateway/rollback.ts`
// (ADR-0207, amendement 562). This module only archives and reads history.

/**
 * Compute a simple diff summary between two content objects
 */
function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, { action: "added" | "removed" | "changed" }> {
  const diff: Record<string, { action: "added" | "removed" | "changed" }> = {};

  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    const hadBefore = key in previous && previous[key] != null;
    const hasNow = key in current && current[key] != null;

    if (!hadBefore && hasNow) {
      diff[key] = { action: "added" };
    } else if (hadBefore && !hasNow) {
      diff[key] = { action: "removed" };
    } else if (hadBefore && hasNow && JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      diff[key] = { action: "changed" };
    }
  }

  return diff;
}
