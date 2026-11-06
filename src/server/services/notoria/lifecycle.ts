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
import type { FieldProvenance } from "@/domain/field-provenance";
import type { ResolvedRecoOperation, CompletionLevel } from "./types";
import { parseRecommendationPayload } from "@/lib/types/recommendation-payload";
import { dispatchTypedRecos } from "./apply-payload";
import { reportRefusedWrite } from "../pillar-gateway/refusal";
import { assertCurrentSourceReceipts, readSourceReceipts } from "@/server/services/ingestion-pipeline/source-usage";

// ── Accept ────────────────────────────────────────────────────────

export async function acceptRecos(
  strategyId: string,
  recoIds: string[],
  reviewerId: string, mode: "REVIEW" | "SHORTLIST" = "REVIEW",
): Promise<{ accepted: number; warnings: string[] }> {
  const result = await db.$transaction(async (tx) => {
    const pending = await tx.recommendation.findMany({ where: { id: { in: recoIds }, strategyId, status: "PENDING" } });
    const {reviewedIds}=await import("./compare-proposal");
    const eligible=await reviewedIds(strategyId,pending,mode==="REVIEW" && recoIds.length===1 && reviewerId!=="MESTOR");
    const selected=pending.filter(row=>eligible.has(row.id));
    await assertCurrentSourceReceipts(tx, strategyId, selected.flatMap((r) => readSourceReceipts(r.sourceReceipts)), selected.flatMap((r) => r.groundedSourceIds));
    return tx.recommendation.updateMany({
    where: {
      id: { in: selected.map(row=>row.id) },
      strategyId,
      status: "PENDING", // optimistic lock
    },
    data: {
      status: "ACCEPTED",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    });
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

  return { accepted: result.count, warnings: result.count < new Set(recoIds).size ? ["Une ou plusieurs propositions ne sont plus en attente ou demandent une comparaison avant acceptation."] : [] };
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
  recoIds: string[], mode: "REVIEW" | "SHORTLIST" = "REVIEW",
): Promise<{ applied: number; warnings: string[] }> {
  // Load all ACCEPTED recos
  const accepted = await db.recommendation.findMany({
    where: {
      id: { in: recoIds },
      strategyId,
      status: "ACCEPTED",
    },
  });

  if (accepted.length === 0) {
    return { applied: 0, warnings: ["Aucune recommandation ACCEPTED trouvee."] };
  }

  let totalApplied = 0;
  const allWarnings: string[] = [];

  const { readArticleComparison } = await import("@/domain/recommendation-comparison");
  const {reviewedIds}=await import("./compare-proposal");
  const singleDecision=mode==="REVIEW" && recoIds.length===1;
  const eligible=await reviewedIds(strategyId,accepted,singleDecision);
  const recos = accepted.filter(row => {
    const comparison = readArticleComparison(row);
    if (!comparison) {
      if (eligible.has(row.id)) return true;
      if (singleDecision && ["SET","MODIFY","EXTEND"].includes(row.operation) && (!parseRecommendationPayload(row.proposedValue) || parseRecommendationPayload(row.proposedValue)?.kind==="UPDATE_ADVE_FIELD")) return true; // existing hard replacement gate returns its specific reason
      allWarnings.push(`COMPARISON_REQUIRED: ${row.id} demande une comparaison applicable à son objectif.`);
      return false;
    }
    if (eligible.has(row.id) && parseRecommendationPayload(row.proposedValue)?.kind === "ADD_INITIATIVE") return true;
    allWarnings.push(`ARTICLE_COMPARISON_REQUIRED: ${row.id} doit être instruite avant application.`);
    return false;
  });
  if (!recos.length) return { applied: 0, warnings: allWarnings };

  // ── ADR-0090 — GATE DE REMPLACEMENT PONDÉRÉ (hard) ──────────────────────
  // Une reco ne REMPLACE un contenu existant que si son score pondéré bat
  // l'existant (ruler déterministe + impact + confidence, marge d'hystérésis).
  // Les recos inférieures sont REJECTED avec raison tracée — le chemin manuel
  // OPERATOR_AMEND_PILLAR reste souverain (l'humain dispose, ADR-0060).
  const { blockedIds, gateWarnings } = await applyReplacementGate(strategyId, recos);
  if (blockedIds.size > 0) {
    await db.recommendation.updateMany({
      where: { id: { in: [...blockedIds] } },
      data: { status: "REJECTED", reviewedAt: new Date(), revertReason: "RULER_REPLACEMENT_BLOCKED" },
    });
    allWarnings.push(...gateWarnings);
  }
  const gatedRecos = recos.filter((r) => !blockedIds.has(r.id));
  if (gatedRecos.length === 0) {
    const batchIdsBlocked = [...new Set(recos.map((r) => r.batchId).filter(Boolean))] as string[];
    for (const batchId of batchIdsBlocked) await updateBatchCounts(batchId);
    return { applied: 0, warnings: allWarnings };
  }

  // ── Function-calling path (ADR-0088) ──────────────────────────────────
  // Recommendations whose proposedValue is a typed RecommendationPayload are
  // applied by id (targeted mutation), not text-replaces-text. Legacy recos
  // (untyped proposedValue) keep the SET/ADD/MODIFY/REMOVE/EXTEND path below.
  const typedRecos = gatedRecos.filter((r) => parseRecommendationPayload(r.proposedValue) !== null);
  const legacyRecos = gatedRecos.filter((r) => parseRecommendationPayload(r.proposedValue) === null);

  if (typedRecos.length > 0) {
    const { appliedRecoIds, warnings } = await dispatchTypedRecos(
      strategyId,
      typedRecos.map((r) => ({ id: r.id, proposedValue: r.proposedValue,
        sourceReceipts: readSourceReceipts(r.sourceReceipts), requiredSourceIds: r.groundedSourceIds })),
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

    // ── ADR-0184 — provenance par champ selon l'ancrage MESURÉ ──────────
    // `author.system = "MESTOR"` mappe sur `INFERRED` : toute reco, même
    // littéralement tirée d'un document de la marque, était tamponnée
    // « inféré » — d'où des champs fondateurs marqués comme devinés alors
    // qu'ils étaient documentés. On promeut en `SOURCE` les seuls champs dont
    // le recouvrement avec un document a été mesuré (pas ceux dont le modèle
    // AFFIRME qu'ils le sont : la revendication ne vaut pas preuve).
    const fieldProvenance: Record<string, FieldProvenance> = {};
    for (const r of pillarRecos) {
      if (r.groundingBand === "GROUNDED" && r.groundedSourceIds.length > 0) {
        fieldProvenance[r.targetField] = "SOURCE";
      }
    }

    // Apply via Gateway
    const result = await writePillarAndScore({
      strategyId,
      pillarKey: pillarKey as PillarKey,
      operation: { type: "APPLY_RECOS_RESOLVED", operations },
      author: {
        system: "MESTOR",
        reason: `Notoria: apply ${operations.length} recommendation(s)`,
      },
      options: {
        targetStatus: "AI_PROPOSED",
        confidenceDelta: 0.05,
        sourceReceipts: pillarRecos.flatMap((r) => readSourceReceipts(r.sourceReceipts)),
        requiredSourceIds: pillarRecos.flatMap((r) => r.groundedSourceIds),
        ...(Object.keys(fieldProvenance).length > 0 ? { fieldProvenance } : {}),
      },
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

  // ── ADR-0090 — lineage : chaque reco APPLIED pointe la précédente APPLIED
  // sur le même champ (predecessorId), pour un historique de remplacement
  // auditable champ par champ.
  await recordPredecessorLineage(strategyId, gatedRecos.map((r) => r.id)).catch(() => {
    /* best-effort — le lineage n'empêche jamais l'application */
  });

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

// ── ADR-0090 helpers ──────────────────────────────────────────────

type RecoRow = {
  id: string;
  targetPillarKey: string;
  targetField: string;
  operation: string;
  proposedValue: unknown;
  confidence: number;
  scoreImpactEstimate: number | null;
};

/**
 * Évalue le gate de remplacement pondéré pour un lot de recos ACCEPTED.
 * Retourne les ids bloqués + les raisons (warnings opérateur).
 *
 * Ne s'applique qu'aux mutations qui REMPLACENT du contenu :
 *   - legacy SET / MODIFY sur un champ non-vide
 *   - payload typé UPDATE_ADVE_FIELD sur un champ non-vide
 * Les mutations id-ciblées (SET_RISK_STATUS, SELECT_INITIATIVE, ADD_*,
 * SELECT_ROADMAP_ROUTE…) et les ADD/EXTEND passent sans comparaison.
 */
async function applyReplacementGate(
  strategyId: string,
  recos: Array<RecoRow & Record<string, unknown>>,
): Promise<{ blockedIds: Set<string>; gateWarnings: string[] }> {
  const { fieldComparator } = await import("./compare-proposal");
  const { loadContentsAndWeights } = await import("./preview-impact");
  const { RULER_REPLACEMENT_MARGIN } = await import("./rulers");
  const { contents, weights } = await loadContentsAndWeights(strategyId);
  const compare = fieldComparator(contents, weights);
  const blockedIds = new Set<string>();
  const gateWarnings: string[] = [];
  for (const reco of recos) {
    const typed = parseRecommendationPayload(reco.proposedValue);
    if (typed ? typed.kind !== "UPDATE_ADVE_FIELD" : !["SET","MODIFY","EXTEND"].includes(reco.operation)) continue;
    const cmp = compare(reco);
    if (!cmp.shortlisted || (cmp.incumbent && (cmp.delta ?? 0) < RULER_REPLACEMENT_MARGIN)) {
      blockedIds.add(reco.id);
      const margin = cmp.shortlisted ? " Le remplacement exige un gain de " + RULER_REPLACEMENT_MARGIN + " points." : "";
      gateWarnings.push("Reco " + reco.id + " (" + reco.targetField + ") : " + cmp.reason + margin);
    }
  }

  return { blockedIds, gateWarnings };
}

/**
 * Pose `predecessorId` sur chaque reco fraîchement APPLIED : la reco APPLIED
 * la plus récente sur le même (pilier, champ) avant celle-ci.
 */
async function recordPredecessorLineage(
  strategyId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) return;
  const applied = await db.recommendation.findMany({
    where: { id: { in: candidateIds }, status: "APPLIED" },
    select: { id: true, targetPillarKey: true, targetField: true, appliedAt: true },
  });
  for (const reco of applied) {
    const predecessor = await db.recommendation.findFirst({
      where: {
        strategyId,
        targetPillarKey: reco.targetPillarKey,
        targetField: reco.targetField,
        status: { in: ["APPLIED", "REVERTED"] },
        id: { not: reco.id },
        appliedAt: { lt: reco.appliedAt ?? new Date() },
      },
      orderBy: { appliedAt: "desc" },
      select: { id: true },
    });
    if (predecessor) {
      await db.recommendation.update({
        where: { id: reco.id },
        data: { predecessorId: predecessor.id },
      });
    }
  }
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
  const _w0 = await writePillarAndScore({
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
  reportRefusedWrite(_w0, "notoria:lifecycle");

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
