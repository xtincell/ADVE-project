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
}

/**
 * Snapshot the current pillar state before applying changes.
 * Called before each update to preserve the previous version.
 */
export async function createVersion(entry: VersionEntry): Promise<string> {
  const pillar = await db.pillar.findUnique({ where: { id: entry.pillarId } });
  if (!pillar) throw new Error(`Pillar ${entry.pillarId} not found`);

  const previousContent = (pillar.content as Record<string, unknown>) ?? {};
  const diff = computeDiff(previousContent, entry.content);

  const version = await db.pillarVersion.create({
    data: {
      pillarId: entry.pillarId,
      version: pillar.currentVersion ?? 1,
      content: previousContent as Prisma.InputJsonValue,
      diff: diff as Prisma.InputJsonValue,
      author: entry.author,
      reason: entry.reason,
    },
  });

  // Bump version counter
  await db.pillar.update({
    where: { id: entry.pillarId },
    data: { currentVersion: (pillar.currentVersion ?? 1) + 1 },
  });

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

/**
 * Rollback to a specific version
 */
export async function rollback(pillarId: string, versionId: string, author?: string): Promise<void> {
  const version = await db.pillarVersion.findUniqueOrThrow({ where: { id: versionId } });
  if (version.pillarId !== pillarId) throw new Error("Version does not belong to this pillar");

  // Save current state before rolling back
  await createVersion({
    pillarId,
    content: version.content as Record<string, unknown>,
    author,
    reason: `rollback_to_v${version.version}`,
  });

  // Apply the old content
  await db.pillar.update({
    where: { id: pillarId },
    data: { content: version.content as Prisma.InputJsonValue },
  });
}

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
