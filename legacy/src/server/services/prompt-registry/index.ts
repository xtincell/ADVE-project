/**
 * Prompt Versioning Registry — v4
 *
 * Manages versioned prompt templates for all 91 Glory Tools.
 * Each prompt has a monotonic version number. Only one version
 * is active per tool at any time. GloryOutputs record which
 * prompt version produced them for full auditability.
 *
 * Schema: PromptVersion { toolSlug, version, template, isActive, createdBy }
 */

import { db } from "@/lib/db";

// ── Get active prompt for a tool ──────────────────────────────────────

export async function getActivePrompt(
  toolSlug: string,
): Promise<{ version: number; template: string } | null> {
  const record = await db.promptVersion.findFirst({
    where: { toolSlug, isActive: true },
    orderBy: { version: "desc" },
    select: { version: true, template: true },
  });
  return record;
}

// ── Create new prompt version ─────────────────────────────────────────

export async function createPromptVersion(
  toolSlug: string,
  template: string,
  createdBy?: string,
): Promise<{ version: number }> {
  // Find the current max version for this tool
  const maxVersion = await db.promptVersion.findFirst({
    where: { toolSlug },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const newVersion = (maxVersion?.version ?? 0) + 1;

  // Deactivate previous active version
  await db.promptVersion.updateMany({
    where: { toolSlug, isActive: true },
    data: { isActive: false },
  });

  // Extract template variables ({{var}} pattern)
  const variables = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);

  // Create new active version
  await db.promptVersion.create({
    data: {
      toolSlug,
      version: newVersion,
      template,
      variables: [...new Set(variables)] as string[],
      isActive: true,
      createdBy,
    },
  });

  return { version: newVersion };
}

// ── List all versions for a tool ──────────────────────────────────────

export async function listVersions(
  toolSlug: string,
): Promise<Array<{ version: number; isActive: boolean; createdAt: Date; createdBy: string | null }>> {
  return db.promptVersion.findMany({
    where: { toolSlug },
    orderBy: { version: "desc" },
    select: { version: true, isActive: true, createdAt: true, createdBy: true },
  });
}

// ── Rollback to a specific version ────────────────────────────────────

export async function rollbackToVersion(
  toolSlug: string,
  version: number,
): Promise<{ success: boolean; error?: string }> {
  const target = await db.promptVersion.findFirst({
    where: { toolSlug, version },
  });

  if (!target) {
    return { success: false, error: `Version ${version} not found for ${toolSlug}` };
  }

  // Deactivate current active
  await db.promptVersion.updateMany({
    where: { toolSlug, isActive: true },
    data: { isActive: false },
  });

  // Activate target
  await db.promptVersion.update({
    where: { id: target.id },
    data: { isActive: true },
  });

  return { success: true };
}

// ── Get version stats ─────────────────────────────────────────────────

export async function getRegistryStats(): Promise<{
  totalTools: number;
  totalVersions: number;
  toolsWithMultipleVersions: number;
}> {
  const [totalVersions, toolGroups] = await Promise.all([
    db.promptVersion.count(),
    db.promptVersion.groupBy({
      by: ["toolSlug"],
      _count: { version: true },
    }),
  ]);

  return {
    totalTools: toolGroups.length,
    totalVersions,
    toolsWithMultipleVersions: toolGroups.filter((g) => g._count.version > 1).length,
  };
}
