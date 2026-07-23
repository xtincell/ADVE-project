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
  // Round-12 (Loi 1) : écriture ATOMIQUE conditionnée à la valeur EXACTE lue.
  // Le re-check `current !== fromTier` ci-dessus est une lecture SÉPARÉE → il
  // n'exclut pas un writer concurrent. Sans ce updateMany conditionnel, deux
  // transitions simultanées (une promotion + une démotion partant du même palier)
  // s'écrasaient (last-writer-wins) tout en enregistrant DEUX émissions « OK » →
  // la hash-chain attestait une promotion silencieusement écrasée (régression
  // d'altitude — exactement ce que ADR-0167 doit empêcher).
  const claim = await db.strategy.updateMany({
    where: { id: intent.strategyId, apogeeTier: strategy.apogeeTier },
    data: {
      apogeeTier: toTier,
      apogeeTierSetAt: setAt,
      apogeeTierReason: intent.reason,
      apogeeTierBy: intent.operatorId,
    },
  });
  if (claim.count !== 1) {
    return {
      status: "VETOED",
      tool: "brand-tier-transition",
      summary: `Palier modifié en parallèle depuis la lecture (course concurrente) — transition « ${fromTier} → ${toTier} » abandonnée.`,
      reason: "FROM_TIER_MISMATCH",
    };
  }

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
