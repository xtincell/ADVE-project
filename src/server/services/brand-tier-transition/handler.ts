/**
 * brand-tier-transition/handler.ts — exécute une transition de palier APOGEE
 * (ADR-0167). Dispatché par `commandant.execute` pour les 10 kinds
 * PROMOTE/DEMOTE, APRÈS que le gate pré-flight `PALIER_PROMOTION_PROOFS` a
 * validé les preuves.
 *
 * Contrairement au STUB `PROMOTE_SEQUENCE_LIFECYCLE` (qui ne logge que dans
 * IntentEmission — diagnostiqué malhonnête ADR-0139), ce handler PERSISTE :
 * il pose `Strategy.apogeeTier` (le ratchet officiel). C'est ce qui donne des
 * dents à la Loi 1 « conservation d'altitude ». La démotion (DEMOTE) est
 * l'acte compensateur explicite — jamais une régression silencieuse.
 *
 * Defense-in-depth (parité `PROMOTE_PIVOT_SUBCLUSTER` qui re-vérifie sa
 * state-machine) : re-check du palier de départ avant l'écriture. Le gate
 * lourd (évidence) reste en pré-flight ; ici on ne relit pas les superfans.
 */

import { db } from "@/lib/db";
import { effectiveTier, type BrandTier } from "@/domain";
import { KIND_TRANSITIONS } from "@/server/services/mestor/gates/palier-promotion-proofs";
import type { IntentResult } from "@/server/services/mestor/intents";

type HandlerResult = Pick<IntentResult, "status" | "summary" | "tool" | "output" | "reason">;

interface TierTransitionIntent {
  kind: string;
  strategyId: string;
  operatorId: string;
  reason: string;
  expectedFromTier?: BrandTier;
}

export async function applyBrandTierTransition(intent: TierTransitionIntent): Promise<HandlerResult> {
  const meta = KIND_TRANSITIONS[intent.kind];
  if (!meta) {
    return {
      status: "FAILED",
      tool: "brand-tier-transition",
      summary: `Kind de transition de palier inconnu : ${intent.kind}.`,
      reason: "UNKNOWN_TIER_KIND",
    };
  }

  const { direction, fromTier, toTier } = meta;

  const strategy = await db.strategy.findUnique({
    where: { id: intent.strategyId },
    select: { apogeeTier: true, advertis_vector: true },
  });
  if (!strategy) {
    return { status: "FAILED", tool: "brand-tier-transition", summary: "Stratégie introuvable.", reason: "STRATEGY_NOT_FOUND" };
  }

  const composite = (strategy.advertis_vector as { composite?: number } | null)?.composite ?? 0;
  const current = effectiveTier({ apogeeTier: strategy.apogeeTier, composite });

  // Re-check structural (le palier a pu bouger entre le gate et l'écriture).
  if (current !== fromTier) {
    return {
      status: "VETOED",
      tool: "brand-tier-transition",
      summary: `Palier courant « ${current} » ≠ départ « ${fromTier} » — état changé depuis la validation.`,
      reason: "FROM_TIER_MISMATCH",
    };
  }

  const setAt = new Date();
  await db.strategy.update({
    where: { id: intent.strategyId },
    data: {
      apogeeTier: toTier,
      apogeeTierSetAt: setAt,
      apogeeTierReason: intent.reason,
      apogeeTierBy: intent.operatorId,
    },
  });

  return {
    status: "OK",
    tool: "brand-tier-transition",
    summary: `Palier ${fromTier} → ${toTier} — ${intent.reason}`,
    output: {
      from: fromTier,
      to: toTier,
      direction,
      actor: intent.operatorId,
      reason: intent.reason,
      setAt: setAt.toISOString(),
    },
  };
}
