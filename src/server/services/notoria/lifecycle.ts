/**
 * NOTORIA Lifecycle — State machine for recommendations.
 *
 * PENDING → ACCEPTED → APPLIED (or REJECTED / REVERTED / EXPIRED)
 * All pillar writes go through the Pillar Gateway (LOI 1).
 */

import { db } from "@/lib/db";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { scoreObject } from "@/server/services/advertis-scorer";
import type { PillarKey } from "@/lib/types/advertis-vector";
import type { ResolvedRecoOperation, CompletionLevel } from "./types";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { dispatchTypedRecos } from "./apply-payload";

// ── Accept ────────────────────────────────────────────────────────

export async function acceptRecos(
  strategyId: string,
  recoIds: string[],
  reviewerId: string,
): Promise<{ accepted: number }> {
  const result = await db.recommendation.updateMany({
    where: {
      id: { in: recoIds },
      strategyId,
      status: "PENDING", // optimistic lock
    },
    data: {
      status: "ACCEPTED",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });

  // Update batch counts
  if (result.count > 0) {
    const recos = await db.recommendation.findMany({
      where: { id: { in: recoIds }, status: "ACCEPTED" },
      select: { batchId: true },
    });
    const batchIds = [...new Set(recos.map((r) => r.batchId).filter(Boolean))] as string[];
    for (const batchId of batchIds) {
      await updateBatchCounts(batchId);
    }
  }

  return { accepted: result.count };
}

// ── Reject ────────────────────────────────────────────────────────

export async function rejectRecos(
  strategyId: string,
  recoIds: string[],
  reviewerId: string,
  reason?: string,
): Promise<{ rejected: number }> {
  const result = await db.recommendation.updateMany({
    where: {
      id: { in: recoIds },
      strategyId,
      status: "PENDING",
    },
    data: {
      status: "REJECTED",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      revertReason: reason ?? null,
    },
  });

  if (result.count > 0) {
    const recos = await db.recommendation.findMany({
      where: { id: { in: recoIds }, status: "REJECTED" },
      select: { batchId: true },
    });
    const batchIds = [...new Set(recos.map((r) => r.batchId).filter(Boolean))] as string[];
    for (const batchId of batchIds) {
      await updateBatchCounts(batchId);
    }
  }

  return { rejected: result.count };
}

// ── Apply ─────────────────────────────────────────────────────────

export async function applyRecos(
  strategyId: string,
  recoIds: string[],
): Promise<{ applied: number; warnings: string[] }> {
  // Load all ACCEPTED recos
  const recos = await db.recommendation.findMany({
    where: {
      id: { in: recoIds },
      strategyId,
      status: "ACCEPTED",
    },
  });

  if (recos.length === 0) {
    return { applied: 0, warnings: ["Aucune recommandation ACCEPTED trouvee."] };
  }

  let totalApplied = 0;
  const allWarnings: string[] = [];

  // ── Function-calling path (ADR-0088) ──────────────────────────────────
  // Recommendations whose proposedValue is a typed RecommendationPayload are
  // applied by id (targeted mutation), not text-replaces-text. Legacy recos
  // (untyped proposedValue) keep the SET/ADD/MODIFY/REMOVE/EXTEND path below.
  const typedRecos = recos.filter((r) => parseRecommendationPayload(r.proposedValue) !== null);
  const legacyRecos = recos.filter((r) => parseRecommendationPayload(r.proposedValue) === null);

  if (typedRecos.length > 0) {
    const { appliedRecoIds, warnings } = await dispatchTypedRecos(
      strategyId,
      typedRecos.map((r) => ({ id: r.id, proposedValue: r.proposedValue })),
    );
    if (appliedRecoIds.length > 0) {
      await db.recommendation.updateMany({
        where: { id: { in: appliedRecoIds } },
        data: { status: "APPLIED", appliedAt: new Date() },
      });
      totalApplied += appliedRecoIds.length;
    }
    allWarnings.push(...warnings);
  }

  // Group remaining (legacy) recos by target pillar
  const byPillar = new Map<string, typeof recos>();
  for (const reco of legacyRecos) {
    const key = reco.targetPillarKey;
    if (!byPillar.has(key)) byPillar.set(key, []);
    byPillar.get(key)!.push(reco);
  }

  for (const [pillarKey, pillarRecos] of byPillar) {
    // Resolve operations
    const operations: ResolvedRecoOperation[] = pillarRecos.map((r) => ({
      field: r.targetField,
      operation: r.operation as ResolvedRecoOperation["operation"],
      proposedValue: r.proposedValue,
      targetMatch: r.targetMatch as { key: string; value: string } | undefined,
      recoId: r.id,
    }));

    // Apply via Gateway
    const result = await writePillarAndScore({
      strategyId,
      pillarKey: pillarKey as PillarKey,
      operation: { type: "APPLY_RECOS_RESOLVED", operations },
      author: {
        system: "MESTOR",
        reason: `Notoria: apply ${operations.length} recommendation(s)`,
      },
      options: { targetStatus: "AI_PROPOSED", confidenceDelta: 0.05 },
    });

    if (result.success) {
      // Mark all recos as APPLIED
      const appliedIds = pillarRecos.map((r) => r.id);
      await db.recommendation.updateMany({
        where: { id: { in: appliedIds } },
        data: { status: "APPLIED", appliedAt: new Date() },
      });
      totalApplied += appliedIds.length;

      // Update completion level cache
      await updateCompletionLevel(strategyId, pillarKey as PillarKey);
    } else {
      console.error(
        `[Notoria.applyRecos] gateway failure — pillar=${pillarKey} strategyId=${strategyId} error=${result.error} ops=${operations.length}`,
      );
      allWarnings.push(
        `Pilier ${pillarKey}: ${result.error ?? "erreur inconnue"}`,
      );
    }

    if (result.warnings.length > 0) {
      console.warn(
        `[Notoria.applyRecos] gateway warnings — pillar=${pillarKey}:`,
        result.warnings,
      );
      allWarnings.push(...result.warnings.map((w) => `${pillarKey}: ${w}`));
    }
  }

  // Update batch counts
  const batchIds = [
    ...new Set(recos.map((r) => r.batchId).filter(Boolean)),
  ] as string[];
  for (const batchId of batchIds) {
    await updateBatchCounts(batchId);
  }

  // Recalc scores
  await scoreObject("strategy", strategyId);

  return { applied: totalApplied, warnings: allWarnings };
}

// ── Revert ────────────────────────────────────────────────────────

export async function revertReco(
  strategyId: string,
  recoId: string,
  reason: string,
): Promise<{ reverted: boolean }> {
  const reco = await db.recommendation.findUnique({ where: { id: recoId } });
  if (!reco || reco.status !== "APPLIED" || reco.strategyId !== strategyId) {
    return { reverted: false };
  }

  // Find the PillarVersion created just before appliedAt
  const pillar = await db.pillar.findUnique({
    where: {
      strategyId_key: { strategyId, key: reco.targetPillarKey },
    },
    select: { id: true },
  });

  if (!pillar) return { reverted: false };

  const previousVersion = await db.pillarVersion.findFirst({
    where: {
      pillarId: pillar.id,
      createdAt: { lt: reco.appliedAt ?? new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!previousVersion) {
    return { reverted: false };
  }

  // Restore content via Gateway
  await writePillarAndScore({
    strategyId,
    pillarKey: reco.targetPillarKey as PillarKey,
    operation: {
      type: "REPLACE_FULL",
      content: previousVersion.content as Record<string, unknown>,
    },
    author: {
      system: "OPERATOR",
      reason: `Notoria revert: ${reason}`,
    },
  });

  // Mark reco as REVERTED
  await db.recommendation.update({
    where: { id: recoId },
    data: {
      status: "REVERTED",
      revertedAt: new Date(),
      revertReason: reason,
    },
  });

  // Update batch counts
  if (reco.batchId) await updateBatchCounts(reco.batchId);

  // Update completion level
  await updateCompletionLevel(
    strategyId,
    reco.targetPillarKey as PillarKey,
  );

  // Recalc scores
  await scoreObject("strategy", strategyId);

  return { reverted: true };
}

// ── Expire ────────────────────────────────────────────────────────

export async function expireOldRecos(
  strategyId: string,
  maxAgeDays = 30,
): Promise<{ expired: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const result = await db.recommendation.updateMany({
    where: {
      strategyId,
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    data: { status: "EXPIRED" },
  });

  return { expired: result.count };
}

// ── Helpers ───────────────────────────────────────────────────────

async function updateBatchCounts(batchId: string) {
  const counts = await db.recommendation.groupBy({
    by: ["status"],
    where: { batchId },
    _count: true,
  });

  const pending = counts.find((c) => c.status === "PENDING")?._count ?? 0;
  const accepted = counts.find((c) => c.status === "ACCEPTED")?._count ?? 0;
  const rejected = counts.find((c) => c.status === "REJECTED")?._count ?? 0;
  const applied = counts.find((c) => c.status === "APPLIED")?._count ?? 0;

  await db.recommendationBatch.update({
    where: { id: batchId },
    data: { pendingCount: pending, acceptedCount: accepted, rejectedCount: rejected, appliedCount: applied },
  });
}

/**
 * D-2 — `Pillar.completionLevel` is now derived canonically by
 * `pillar-gateway.reconcileCompletionLevelCache` on every write. The
 * legacy ad-hoc heuristic that lived here (fillRate ≥ 0.9 + applied
 * R+T recos) was the source of cache divergence — different writers
 * would compute it differently. Notoria delegates to the gateway.
 */
async function updateCompletionLevel(
  strategyId: string,
  pillarKey: PillarKey,
) {
  const { reconcileCompletionLevelCache } = await import(
    "@/server/services/pillar-gateway"
  );
  await reconcileCompletionLevelCache(strategyId, pillarKey);
}
