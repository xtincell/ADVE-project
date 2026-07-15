/**
 * ADR-0147 — compilateur : signaux mesurés → épreuves (la « matrice » canon).
 *
 * Ne compile QUE ce qui est réellement mesuré en base (zéro fabrication, P22-2) :
 *  - arène E ← Identity Graph (superfans dédupliqués par personne) vs plancher de
 *    ligue (item Rasch) ;
 *  - arène T ← Overton Graph (transitions favorables = victoires, adverses =
 *    défaites) + duel de vocabulaire.
 * A / D / V arrivent en épreuves persistées (registre, sourcées) — pas inventées ici.
 * Source inaccessible ⇒ épreuve absente ⇒ RD large en aval.
 */

import { db } from "@/lib/db";
import { getOvertonSignalsForBrand } from "../overton-graph";
import type { CompiledEpreuve } from "@/domain/scoreur";
import { PROOF_WEIGHTS } from "@/domain/scoreur";

/** Slugs d'items canon (opponents Rasch à difficulté fixée). */
export const ITEM_OPPONENTS = {
  eMassFloor: "item-e-mass-floor",
  tFrame: "item-t-frame",
} as const;

/** Compte les superfans DÉDUPLIQUÉS par personne (Identity Graph). */
export async function countDistinctSuperfans(strategyId: string): Promise<number> {
  const profiles = await db.superfanProfile.findMany({
    where: { strategyId },
    select: { id: true, personId: true },
  });
  const persons = new Set<string>();
  for (const p of profiles) persons.add(p.personId ?? p.id);
  return persons.size;
}

export interface CompileContext {
  readonly strategyId: string;
  readonly nowIso: string;
  /** Plancher de masse superfan de la ligue (resolveEvidenceTargets). */
  readonly superfanFloor: number;
}

/**
 * Compile les épreuves E + T mesurées. Le sujet est référencé par `strategyId`
 * (le node id du sujet dans l'estimateur).
 */
export async function compileMeasuredEpreuves(ctx: CompileContext): Promise<{
  epreuves: CompiledEpreuve[];
  superfanCount: number;
  favorableOverton: number;
}> {
  const out: CompiledEpreuve[] = [];

  // ── Arène E : masse superfan dédupliquée vs plancher de ligue (item) ────────
  const superfanCount = await countDistinctSuperfans(ctx.strategyId);
  if (superfanCount > 0 || ctx.superfanFloor > 0) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.eMassFloor,
      arena: "E",
      result: superfanCount >= ctx.superfanFloor ? "WIN" : "LOSS",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `identity-graph:superfans=${superfanCount}/floor=${ctx.superfanFloor}`,
      occurredAt: ctx.nowIso,
    });
  }

  // ── Arène T : transitions Overton attribuées (favorables = victoires) ───────
  const overton = await getOvertonSignalsForBrand(db, ctx.strategyId);
  for (const t of overton.favorableTransitions) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.tFrame,
      arena: "T",
      result: "WIN",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `overton:transition+${t.delta}@${t.occurredAt.toISOString()}`,
      occurredAt: t.occurredAt.toISOString(),
    });
  }
  for (const t of overton.adverseTransitions) {
    out.push({
      subjectRef: ctx.strategyId,
      opponentRef: ITEM_OPPONENTS.tFrame,
      arena: "T",
      result: "LOSS",
      proofWeight: PROOF_WEIGHTS.fort,
      source: `overton:transition${t.delta}@${t.occurredAt.toISOString()}`,
      occurredAt: t.occurredAt.toISOString(),
    });
  }

  return {
    epreuves: out,
    superfanCount,
    favorableOverton: overton.favorableTransitions.length,
  };
}
