/**
 * PALIER_PROMOTION_PROOFS — Mestor pre-flight gate (ADR-0167, réalise le gate
 * planifié ADR-0086 §PALIER_PROMOTION_PROOFS).
 *
 * Enforce, AVANT le dispatch d'une transition de palier APOGEE (les 10 kinds
 * PROMOTE et DEMOTE), les preuves canoniques — miroir du précédent
 * `CALIBRATION_SNAPSHOT_REQUIRED` :
 *
 *   - **fromTier** : le palier de départ de la transition == palier EFFECTIF
 *     courant (`apogeeTier` officiel sinon dérivé). `expectedFromTier` (fourni
 *     par l'UI) permet une concurrence optimiste.
 *   - **one-step** : uniquement un cran adjacent (jamais un saut/inversion).
 *   - **PROMOTE** : `composite > borne basse du palier cible`. Comme le
 *     composite est DÉJÀ plafonné par l'évidence (advertis-scorer : cap FORTE
 *     sans preuve, CULTE≥0.20, ICONE≥0.50), ce seul test enforce implicitement
 *     les preuves CULTE/ICONE ; la raison honnête ajoute le détail chiffré.
 *   - **DEMOTE** : structural seul (Loi 1 : une rétrogradation explicite est
 *     toujours légitime — c'est justement l'acte compensateur exigé).
 *
 * Cœur pur (`evaluatePalierTransition`, variance 0, testable sans DB) + wrapper
 * async (`palierPromotionProofsGate`, lecture SEULE — ne jamais ré-scorer,
 * `scoreObject` a des effets de bord). Alphabet `GateResult` PASS/BLOCK.
 */

import { db } from "@/lib/db";
import {
  BRAND_TIERS,
  type BrandTier,
  effectiveTier,
  nextTier,
  prevTier,
  TIER_UPPER_BOUNDS_200,
} from "@/domain";
import { computeEvidenceBreakdown } from "@/server/services/advertis-scorer/evidence";
import type { GateResult } from "./gate-types";

export type TierTransitionDirection = "PROMOTE" | "DEMOTE";

export interface TierTransitionMeta {
  readonly direction: TierTransitionDirection;
  readonly fromTier: BrandTier;
  readonly toTier: BrandTier;
}

/**
 * Les 10 kinds de transition de palier ↔ leur (direction, from, to), dérivés
 * de la cascade canonique `BRAND_TIERS` (une seule source, zéro typo). Pour
 * chaque paire adjacente (low, high) : `PROMOTE_<low>_TO_<high>` et le
 * compensateur `DEMOTE_<high>_TO_<low>`.
 */
export const KIND_TRANSITIONS: Readonly<Record<string, TierTransitionMeta>> = (() => {
  const map: Record<string, TierTransitionMeta> = {};
  for (let i = 0; i < BRAND_TIERS.length - 1; i++) {
    const low = BRAND_TIERS[i]!;
    const high = BRAND_TIERS[i + 1]!;
    map[`PROMOTE_${low}_TO_${high}`] = { direction: "PROMOTE", fromTier: low, toTier: high };
    map[`DEMOTE_${high}_TO_${low}`] = { direction: "DEMOTE", fromTier: high, toTier: low };
  }
  return map;
})();

/** Les 10 kinds gouvernés de transition de palier (Set pour un test d'appartenance O(1)). */
export const PALIER_TRANSITION_KINDS: ReadonlySet<string> = new Set(Object.keys(KIND_TRANSITIONS));

/** Résout le kind d'une transition depuis (palier de départ, direction). null si aucune. */
export function tierTransitionKind(fromTier: BrandTier, direction: TierTransitionDirection): string | null {
  const target = direction === "PROMOTE" ? nextTier(fromTier) : prevTier(fromTier);
  if (!target) return null;
  return direction === "PROMOTE"
    ? `PROMOTE_${fromTier}_TO_${target}`
    : `DEMOTE_${fromTier}_TO_${target}`;
}

export interface PalierEvalInput {
  readonly kind: string;
  readonly currentEffectiveTier: BrandTier;
  readonly composite: number;
  readonly superfanCount: number;
  readonly evidence: number;
  readonly superfansTarget: number;
  /** false = `marketScale` non déclaré → cibles NATION (raison honnête). */
  readonly marketScaleDeclared: boolean;
  readonly expectedFromTier?: BrandTier;
}

/**
 * Cœur pur du gate. Variance 0, aucun I/O. Retourne PASS (transition permise
 * ou kind hors périmètre) ou BLOCK (raison chiffrée honnête).
 */
export function evaluatePalierTransition(input: PalierEvalInput): GateResult {
  const meta = KIND_TRANSITIONS[input.kind];
  if (!meta) return { verdict: "PASS" }; // hors périmètre — ne bloque rien.

  const { direction, fromTier, toTier } = meta;

  // Concurrence optimiste : l'UI a affiché expectedFromTier ; s'il a changé
  // depuis, l'opérateur agirait sur un état périmé.
  if (input.expectedFromTier && input.expectedFromTier !== input.currentEffectiveTier) {
    return {
      verdict: "BLOCK",
      reason: `Le palier a changé depuis l'affichage (${input.expectedFromTier} → ${input.currentEffectiveTier}) — rechargez avant de décider.`,
    };
  }

  // fromTier guard : la transition doit partir du palier EFFECTIF courant.
  if (fromTier !== input.currentEffectiveTier) {
    return {
      verdict: "BLOCK",
      reason: `Transition ${direction} invalide : palier courant « ${input.currentEffectiveTier} », cette transition part de « ${fromTier} ».`,
    };
  }

  // one-step (ceinture + bretelles — KIND_TRANSITIONS ne produit que de l'adjacent).
  const step = direction === "PROMOTE" ? nextTier(fromTier) : prevTier(fromTier);
  if (step !== toTier) {
    return { verdict: "BLOCK", reason: `Transition non adjacente refusée (${fromTier} → ${toTier}).` };
  }

  // DEMOTE : Loi 1 — rétrogradation explicite toujours légitime (structural seul).
  if (direction === "DEMOTE") {
    return { verdict: "PASS", reason: `Rétrogradation explicite ${fromTier} → ${toTier} (Loi 1 : altitude détrônée, jamais en silence).` };
  }

  // PROMOTE : le composite doit dépasser la borne basse du palier cible
  // (= borne HAUTE du palier de départ). fromTier n'est jamais ICONE pour un
  // PROMOTE (nextTier(ICONE)=null → aucun kind), donc l'index est toujours sûr.
  const bound = TIER_UPPER_BOUNDS_200[fromTier as keyof typeof TIER_UPPER_BOUNDS_200];
  if (input.composite <= bound) {
    const apex = toTier === "CULTE" || toTier === "ICONE";
    // Le composite est déjà evidence-capped : s'il stagne sous la borne d'un
    // palier apex, c'est faute de preuve. La raison honnête expose le détail.
    const evPart = apex
      ? ` — preuves observées ${Math.round(input.evidence * 100)}% (superfans ${input.superfanCount}/${input.superfansTarget})${input.marketScaleDeclared ? "" : " ; échelle de marché non déclarée → cibles nationales, déclarez l'échelle d'abord"}`
      : "";
    return {
      verdict: "BLOCK",
      reason: `Promotion « ${toTier} » refusée : score ${Math.round(input.composite)} ≤ seuil ${bound}${evPart}.`,
      evidence: {
        composite: input.composite,
        bound,
        evidence: input.evidence,
        superfanCount: input.superfanCount,
        superfansTarget: input.superfansTarget,
      },
    };
  }

  return {
    verdict: "PASS",
    reason: `Promotion ${fromTier} → ${toTier} méritée (score ${Math.round(input.composite)} > seuil ${bound}).`,
  };
}

/**
 * Wrapper async : charge l'état RÉEL (composite persisté, palier officiel,
 * échelle, évidence) et appelle le cœur pur. Lecture seule — ne ré-score
 * JAMAIS (le composite lu est celui du badge opérateur).
 */
export async function palierPromotionProofsGate(input: {
  kind: string;
  strategyId: string;
  expectedFromTier?: BrandTier;
}): Promise<GateResult> {
  if (!PALIER_TRANSITION_KINDS.has(input.kind)) return { verdict: "PASS" };

  const strategy = await db.strategy.findUnique({
    where: { id: input.strategyId },
    select: { apogeeTier: true, advertis_vector: true, marketScale: true },
  });
  if (!strategy) return { verdict: "BLOCK", reason: "Stratégie introuvable." };

  const composite = (strategy.advertis_vector as { composite?: number } | null)?.composite ?? 0;
  const currentEffectiveTier = effectiveTier({ apogeeTier: strategy.apogeeTier, composite });
  const breakdown = await computeEvidenceBreakdown(input.strategyId);

  return evaluatePalierTransition({
    kind: input.kind,
    currentEffectiveTier,
    composite,
    superfanCount: breakdown.superfanCount,
    evidence: breakdown.evidence,
    superfansTarget: breakdown.superfansTarget,
    marketScaleDeclared: strategy.marketScale != null,
    expectedFromTier: input.expectedFromTier,
  });
}
