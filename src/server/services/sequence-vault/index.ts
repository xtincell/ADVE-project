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
import { isUsableGeneration } from "@/domain/generation-result";
import type { Prisma } from "@prisma/client";

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
  return db.$transaction(async tx => {
    // Serialize version numbers and pointer updates for this brand, including the first edition.
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${params.strategyId} FOR UPDATE`;
    // Check for existing current execution to handle versioning
    const existing = await tx.sequenceExecution.findFirst({
      where: {
        strategyId: params.strategyId,
        sequenceKey: params.sequenceKey,
        isCurrent: true,
      },
      orderBy: [{ version: "desc" }, { id: "desc" }],
      select: { id: true, version: true },
    });

    const version = existing ? existing.version + 1 : 1;

    // Mark previous as not current
    if (existing) {
      await tx.sequenceExecution.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });
    }

    const execution = await tx.sequenceExecution.create({
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
      await tx.gloryOutput.updateMany({
        where: { id: { in: params.gloryOutputIds }, strategyId: params.strategyId, executionId: null },
        data: { executionId: execution.id },
      });
    }

    return execution.id;
  });
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
  return db.$transaction(async tx => {
    const scope = await tx.sequenceExecution.findUniqueOrThrow({ where: { id: executionId }, select: { strategyId: true } });
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${scope.strategyId} FOR UPDATE`;
    const execution = await tx.sequenceExecution.findUniqueOrThrow({
      where: { id: executionId }, include: { gloryOutputs: true },
    });
    if (execution.approval === "ACCEPTED") return { promotedAssets: 0 };
    const newerCompleted = !execution.isCurrent && await tx.sequenceExecution.findFirst({
      where: { strategyId: execution.strategyId, sequenceKey: execution.sequenceKey, status: "COMPLETED", version: { gt: execution.version } },
      select: { id: true },
    });
    if (newerCompleted || execution.approval !== "PENDING" || execution.status !== "COMPLETED") {
      throw new Error("Seule la dernière édition complète en attente de relecture peut être acceptée.");
    }
    const steps = Array.isArray(execution.stepResults) ? execution.stepResults : [];
    const invalidStep = steps.some(raw => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
      const step = raw as Record<string, unknown>;
      return step.status === "FAILED" || step.error === "preview-mode" ||
        (step.status === "SUCCESS" && step.type === "GLORY" && !execution.gloryOutputs.some(output =>
          output.toolSlug === step.ref && (!step.gloryOutputId || step.gloryOutputId === output.id)));
    });
    if (!steps.length || invalidStep || execution.gloryOutputs.some(output => !isUsableGeneration(output.output))) {
      throw new Error("Une étape de cette édition ne possède pas de résultat exploitable. Reprenez la production avant la relecture.");
    }
    const frameworks = steps.filter((step): step is Prisma.JsonObject => !!step && typeof step === "object" && !Array.isArray(step))
      .filter(step => step.type === "ARTEMIS" && step.status === "SUCCESS");
    if (frameworks.length) {
      const ids = frameworks.flatMap(step => typeof step.frameworkResultId === "string" ? [step.frameworkResultId] : []);
      const results = await tx.frameworkResult.findMany({ where: { id: { in: ids }, strategyId: execution.strategyId }, select: { id: true, output: true, framework: { select: { slug: true } } } });
      if (frameworks.some(step => !results.some(row => row.id === step.frameworkResultId && row.framework.slug === step.ref && isUsableGeneration(row.output)))) {
        throw new Error("Le résultat exact d’une analyse manque à cette édition. Produisez une édition traçable avant de l’accepter.");
      }
    }
    let promotedAssets = 0;
    for (const output of execution.gloryOutputs) {
      const data = output.output as Record<string, unknown>;
      const name = `${execution.sequenceKey}:${output.toolSlug}`;
      const linked = await tx.brandAsset.findMany({
        where: { strategyId: execution.strategyId, OR: [
          { sourceGloryOutputId: output.id }, { sourceExecutionId: execution.id, name },
        ] }, select: { id: true },
      });
      if (linked.length) {
        // Keep Mestor's existing editions and candidate selections. Attach only the execution receipt.
        await tx.brandAsset.updateMany({ where: { id: { in: linked.map(asset => asset.id) } }, data: { sourceExecutionId: execution.id } });
      } else {
        const fileUrl = data.fileUrl ?? data.imageUrl;
        await tx.brandAsset.create({ data: {
          strategyId: execution.strategyId, name, assetType: inferAssetType(output.toolSlug),
          sourceExecutionId: execution.id, sourceGloryOutputId: output.id,
          content: output.output as Prisma.InputJsonValue,
          fileUrl: typeof fileUrl === "string" ? fileUrl : null,
          pillarTags: (data.pillarTags ?? data.pillar_anchors ?? undefined) as Prisma.InputJsonValue | undefined,
        } });
        promotedAssets++;
      }
    }
    const reviewed = await tx.sequenceExecution.updateMany({ where: { id: executionId, approval: "PENDING", status: "COMPLETED" }, data: {
      approval: "ACCEPTED", reviewedBy, reviewedAt: new Date(), reviewNotes: notes,
    } });
    if (reviewed.count !== 1) throw new Error("La relecture a changé. Rechargez cette édition.");
    return { promotedAssets };
  });
}

/**
 * Reject a sequence execution.
 */
export async function rejectExecution(
  executionId: string,
  reviewedBy: string,
  reason: string,
): Promise<void> {
  const reviewed = await db.sequenceExecution.updateMany({
    where: { id: executionId, approval: "PENDING" },
    data: {
      approval: "REJECTED",
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: reason,
    },
  });
  if (reviewed.count !== 1) throw new Error("Cette édition a déjà été relue. Sa décision est conservée.");
}

/**
 * Delete a rejected/pending execution and its unlinked outputs.
 */
export async function deleteExecution(executionId: string): Promise<void> {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "SequenceExecution" WHERE id = ${executionId} FOR UPDATE`;
    const execution = await tx.sequenceExecution.findUniqueOrThrow({ where: { id: executionId }, select: { approval: true } });
    if (execution.approval === "ACCEPTED") throw new Error("Cette édition acceptée doit rester dans l’historique.");
    await tx.gloryOutput.updateMany({ where: { executionId }, data: { executionId: null } });
    await tx.sequenceExecution.delete({ where: { id: executionId } });
  });
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
      status: "COMPLETED",
    },
    orderBy: [{ version: "desc" }, { id: "desc" }],
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
      status: "COMPLETED",
    },
    distinct: ["sequenceKey"],
    orderBy: [{ sequenceKey: "asc" }, { version: "desc" }, { id: "desc" }],
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
        // Check maturity via confidence threshold.
        // lafusee:allow-adhoc-completion -- pré-flight gate de séquence sur un pilier déjà chargé, distinct de l'affichage de complétude UI (notoria consomme la readiness canonique)
        const isComplete = (pillar.confidence ?? 0) >= 0.6 || pillar.validationStatus === "VALIDATED";
        const isEnriched = (pillar.confidence ?? 0) >= 0.3 || isComplete;

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
    where: { strategyId, approval: "ACCEPTED", status: "COMPLETED" },
    distinct: ["sequenceKey"],
    orderBy: [{ sequenceKey: "asc" }, { version: "desc" }, { id: "desc" }],
    select: { sequenceKey: true, tier: true, version: true, qualityScore: true },
  });

  const pendingExecutions = await db.sequenceExecution.findMany({
    where: { strategyId, approval: "PENDING", isCurrent: true },
    distinct: ["sequenceKey"],
    orderBy: [{ sequenceKey: "asc" }, { version: "desc" }, { id: "desc" }],
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
