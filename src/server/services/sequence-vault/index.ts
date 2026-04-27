/**
 * Sequence Vault — Staging → Official asset promotion
 *
 * NETERU Architecture:
 *   Every sequence execution produces a SequenceExecution record (staging).
 *   Operator reviews → ACCEPT or REJECT.
 *   Accepted outputs are promoted to BrandAsset (official vault).
 *   Rejected outputs stay in staging, can be deleted or re-run.
 *
 * Skill Tree:
 *   Sequences declare prerequisites (tier + requires).
 *   Pre-flight checks block execution if prerequisites not met.
 *   Acceptance of a sequence unlocks dependent sequences (next tier).
 */

import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ApprovalStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface SequencePrerequisite {
  type: "SEQUENCE" | "SEQUENCE_ANY" | "PILLAR";
  key?: string;       // For SEQUENCE: sequence key. For PILLAR: pillar key.
  tier?: number;      // For SEQUENCE_ANY: minimum tier
  count?: number;     // For SEQUENCE_ANY: minimum count of accepted sequences
  status?: "ACCEPTED";
  maturity?: string;  // For PILLAR: "ENRICHED" | "COMPLETE"
}

export interface PrerequisiteCheck {
  met: SequencePrerequisite[];
  unmet: SequencePrerequisite[];
  blocked: boolean;
}

// ─── Record a Sequence Execution ─────────────────────────────────────────────

/**
 * Record a new sequence execution in the vault.
 * Called by the sequence executor after completion.
 */
export async function recordExecution(params: {
  strategyId: string;
  sequenceKey: string;
  tier: number;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  stepResults: unknown[];
  finalContext?: unknown;
  totalDurationMs?: number;
  gloryOutputIds?: string[];
  campaignId?: string;
}): Promise<string> {
  // Check for existing current execution to handle versioning
  const existing = await db.sequenceExecution.findFirst({
    where: {
      strategyId: params.strategyId,
      sequenceKey: params.sequenceKey,
      isCurrent: true,
    },
    select: { id: true, version: true },
  });

  const version = existing ? existing.version + 1 : 1;

  // Mark previous as not current
  if (existing) {
    await db.sequenceExecution.update({
      where: { id: existing.id },
      data: { isCurrent: false },
    });
  }

  const execution = await db.sequenceExecution.create({
    data: {
      strategyId: params.strategyId,
      sequenceKey: params.sequenceKey,
      tier: params.tier,
      version,
      status: params.status,
      stepResults: params.stepResults as any,
      finalContext: params.finalContext as any ?? undefined,
      totalDurationMs: params.totalDurationMs,
      approval: "PENDING",
      supersedes: existing?.id,
      isCurrent: true,
      campaignId: params.campaignId,
    },
  });

  // Link GloryOutputs to this execution
  if (params.gloryOutputIds && params.gloryOutputIds.length > 0) {
    await db.gloryOutput.updateMany({
      where: { id: { in: params.gloryOutputIds } },
      data: { executionId: execution.id },
    });
  }

  return execution.id;
}

// ─── Approval ────────────────────────────────────────────────────────────────

/**
 * Accept a sequence execution → promote outputs to BrandAsset.
 */
export async function acceptExecution(
  executionId: string,
  reviewedBy: string,
  notes?: string,
): Promise<{ promotedAssets: number }> {
  const execution = await db.sequenceExecution.update({
    where: { id: executionId },
    data: {
      approval: "ACCEPTED",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
    include: {
      gloryOutputs: true,
    },
  });

  // Promote GloryOutputs with file/visual content to BrandAsset
  let promotedCount = 0;
  for (const output of execution.gloryOutputs) {
    const outputData = output.output as Record<string, unknown> | null;
    if (!outputData) continue;

    // Determine asset type from tool slug patterns
    const assetType = inferAssetType(output.toolSlug);
    const name = `${execution.sequenceKey}:${output.toolSlug}`;

    // Check if an asset already exists for this execution (re-run case)
    const existingAsset = await db.brandAsset.findFirst({
      where: {
        strategyId: execution.strategyId,
        sourceExecutionId: executionId,
        name,
      },
    });

    if (!existingAsset) {
      await db.brandAsset.create({
        data: {
          strategyId: execution.strategyId,
          name,
          assetType,
          sourceExecutionId: executionId,
          fileUrl: (outputData.fileUrl ?? outputData.imageUrl ?? null) as string | null,
          pillarTags: (outputData.pillarTags ?? outputData.pillar_anchors ?? null) as any,
        },
      });
      promotedCount++;
    }
  }

  // Replace assets from superseded execution
  if (execution.supersedes) {
    await db.brandAsset.deleteMany({
      where: { sourceExecutionId: execution.supersedes },
    });
  }

  return { promotedAssets: promotedCount };
}

/**
 * Reject a sequence execution.
 */
export async function rejectExecution(
  executionId: string,
  reviewedBy: string,
  reason: string,
): Promise<void> {
  await db.sequenceExecution.update({
    where: { id: executionId },
    data: {
      approval: "REJECTED",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: reason,
    },
  });
}

/**
 * Delete a rejected/pending execution and its unlinked outputs.
 */
export async function deleteExecution(executionId: string): Promise<void> {
  // Only allow deleting non-accepted executions
  const execution = await db.sequenceExecution.findUnique({
    where: { id: executionId },
    select: { approval: true },
  });
  if (execution?.approval === "ACCEPTED") {
    throw new Error("Cannot delete accepted execution — reject first");
  }

  // Unlink GloryOutputs (don't delete them — they may be referenced elsewhere)
  await db.gloryOutput.updateMany({
    where: { executionId },
    data: { executionId: null },
  });

  await db.sequenceExecution.delete({ where: { id: executionId } });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all executions for a strategy, optionally filtered.
 */
export async function listExecutions(
  strategyId: string,
  options?: { approval?: ApprovalStatus; sequenceKey?: string; currentOnly?: boolean },
) {
  return db.sequenceExecution.findMany({
    where: {
      strategyId,
      ...(options?.approval ? { approval: options.approval } : {}),
      ...(options?.sequenceKey ? { sequenceKey: options.sequenceKey } : {}),
      ...(options?.currentOnly ? { isCurrent: true } : {}),
    },
    include: {
      gloryOutputs: { select: { id: true, toolSlug: true, output: true, createdAt: true } },
      promotedAssets: { select: { id: true, name: true, assetType: true, fileUrl: true } },
    },
    orderBy: [{ tier: "asc" }, { sequenceKey: "asc" }, { version: "desc" }],
  });
}

/**
 * Get the accepted execution for a specific sequence (if any).
 */
export async function getAcceptedExecution(strategyId: string, sequenceKey: string) {
  return db.sequenceExecution.findFirst({
    where: {
      strategyId,
      sequenceKey,
      approval: "ACCEPTED",
      isCurrent: true,
    },
    include: {
      gloryOutputs: true,
      promotedAssets: true,
    },
  });
}

// ─── Skill Tree: Prerequisite Checks ─────────────────────────────────────────

/**
 * Check if all prerequisites for a sequence are met.
 * Returns which prerequisites are met/unmet and whether execution is blocked.
 */
export async function checkPrerequisites(
  strategyId: string,
  requires: SequencePrerequisite[],
): Promise<PrerequisiteCheck> {
  if (requires.length === 0) {
    return { met: [], unmet: [], blocked: false };
  }

  // Load all accepted current executions for this strategy
  const acceptedExecutions = await db.sequenceExecution.findMany({
    where: {
      strategyId,
      approval: "ACCEPTED",
      isCurrent: true,
    },
    select: { sequenceKey: true, tier: true },
  });

  const acceptedKeys = new Set(acceptedExecutions.map(e => e.sequenceKey));
  const acceptedByTier = new Map<number, number>();
  for (const e of acceptedExecutions) {
    acceptedByTier.set(e.tier, (acceptedByTier.get(e.tier) ?? 0) + 1);
  }

  // Load pillar maturity for PILLAR prerequisites
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, validationStatus: true, confidence: true },
  });
  const pillarMap = new Map(pillars.map(p => [p.key, p]));

  const met: SequencePrerequisite[] = [];
  const unmet: SequencePrerequisite[] = [];

  for (const req of requires) {
    switch (req.type) {
      case "SEQUENCE": {
        if (req.key && acceptedKeys.has(req.key)) {
          met.push(req);
        } else {
          unmet.push(req);
        }
        break;
      }
      case "SEQUENCE_ANY": {
        const count = acceptedByTier.get(req.tier ?? 0) ?? 0;
        if (count >= (req.count ?? 1)) {
          met.push(req);
        } else {
          unmet.push(req);
        }
        break;
      }
      case "PILLAR": {
        const pillar = pillarMap.get(req.key ?? "");
        if (!pillar) {
          unmet.push(req);
          break;
        }
        // Check maturity via confidence threshold
        const isEnriched = (pillar.confidence ?? 0) >= 0.3;
        const isComplete = (pillar.confidence ?? 0) >= 0.6 || pillar.validationStatus === "VALIDATED";

        if (req.maturity === "COMPLETE" && isComplete) met.push(req);
        else if (req.maturity === "ENRICHED" && isEnriched) met.push(req);
        else if (!req.maturity && isEnriched) met.push(req);
        else unmet.push(req);
        break;
      }
    }
  }

  return {
    met,
    unmet,
    blocked: unmet.length > 0,
  };
}

/**
 * Build the full skill tree for a strategy — all sequences with their lock status.
 */
export async function buildSkillTree(strategyId: string) {
  const { ALL_SEQUENCES } = await import("@/server/services/artemis/tools/sequences");

  const acceptedExecutions = await db.sequenceExecution.findMany({
    where: { strategyId, approval: "ACCEPTED", isCurrent: true },
    select: { sequenceKey: true, tier: true, version: true, qualityScore: true },
  });

  const pendingExecutions = await db.sequenceExecution.findMany({
    where: { strategyId, approval: "PENDING", isCurrent: true },
    select: { sequenceKey: true, tier: true },
  });

  const acceptedKeys = new Set(acceptedExecutions.map(e => e.sequenceKey));
  const pendingKeys = new Set(pendingExecutions.map(e => e.sequenceKey));

  const tree = [];

  for (const seq of ALL_SEQUENCES) {
    const requires = (seq as any).requires ?? [];
    const tier = (seq as any).tier ?? 0;

    // Check prerequisites
    const prereqCheck = requires.length > 0
      ? await checkPrerequisites(strategyId, requires)
      : { met: [], unmet: [], blocked: false };

    const accepted = acceptedKeys.has(seq.key);
    const pending = pendingKeys.has(seq.key);
    const acceptedExec = acceptedExecutions.find(e => e.sequenceKey === seq.key);

    tree.push({
      key: seq.key,
      name: seq.name,
      family: seq.family,
      tier,
      status: accepted ? "ACCEPTED" as const
        : pending ? "PENDING" as const
        : prereqCheck.blocked ? "LOCKED" as const
        : "AVAILABLE" as const,
      locked: prereqCheck.blocked,
      prerequisites: {
        total: requires.length,
        met: prereqCheck.met.length,
        unmet: prereqCheck.unmet.map((r: SequencePrerequisite) =>
          r.type === "SEQUENCE" ? `${r.key} accepted`
          : r.type === "SEQUENCE_ANY" ? `${r.count}× tier ${r.tier} accepted`
          : `pillar ${r.key} ${r.maturity}`
        ),
      },
      version: acceptedExec?.version,
      qualityScore: acceptedExec?.qualityScore,
    });
  }

  // Sort by tier, then by status (AVAILABLE first, LOCKED last)
  const statusOrder = { ACCEPTED: 0, PENDING: 1, AVAILABLE: 2, LOCKED: 3 };
  tree.sort((a, b) => a.tier - b.tier || statusOrder[a.status] - statusOrder[b.status]);

  return tree;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferAssetType(toolSlug: string): string {
  if (/logo|chromat|typograph|moodboard|semiot|visual|token|motion|guideline/i.test(toolSlug)) return "visual";
  if (/concept|script|copy|claim|story|naming/i.test(toolSlug)) return "copy";
  if (/template|calendar|workflow|brief/i.test(toolSlug)) return "template";
  return "data";
}
