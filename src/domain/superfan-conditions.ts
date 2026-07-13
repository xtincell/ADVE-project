/**
 * Domain — Superfan à conditions strictes (ADR-0141).
 *
 * Un superfan n'est PAS un score flou : c'est une personne qui a franchi des
 * CONDITIONS trackables, chacune reliée à un rung canon du Devotion Ladder
 * (`devotion-ladder.ts`). Le rung d'une personne = la condition la plus haute
 * qu'elle a franchie (gate-gated), jamais une moyenne.
 *
 * Les 5 conditions (vocabulaire opérateur → rung canon) :
 *
 * | Condition (opérateur)  | Gate           | Rung canon    |
 * |------------------------|----------------|---------------|
 * | a vu                   | `VIEWED`       | SPECTATEUR    |
 * | a interagi             | `INTERACTED`   | PARTICIPANT   |
 * | a payé (= client)      | `PAID`         | ENGAGE        |
 * | a recommandé           | `RECOMMENDED`  | AMBASSADEUR   |
 * | a partagé              | `SHARED`       | EVANGELISTE   |
 *
 * Doctrine (ADR-0126 préservé) :
 *   - `PAID` (conversion réelle) est le signal le plus fort mais s'arrête à
 *     ENGAGE (0.45) < seuil superfan actif (0.65) : payer ≠ être un porte-parole.
 *     Il ne gonfle donc jamais le bras d'évidence CULTE/ICONE.
 *   - `RECOMMENDED`/`SHARED` franchissent le seuil actif : ils exigent une preuve
 *     d'advocacy VÉRIFIÉE (déclaration opérateur ou instrument dédié), JAMAIS du
 *     simple footprint public — sinon on ré-ouvre le vecteur d'inflation.
 *   - Absence de mesure d'une condition = condition non franchie, jamais fabriquée.
 *
 * 100 % déterministe, zéro LLM (LOI 9).
 */

import { DEVOTION_LADDER_TIERS, type DevotionLadderTier } from "./devotion-ladder";

/** Les 5 conditions strictes et trackables d'un superfan. */
export const SUPERFAN_CONDITIONS = [
  "VIEWED",
  "INTERACTED",
  "PAID",
  "RECOMMENDED",
  "SHARED",
] as const;

export type SuperfanCondition = (typeof SUPERFAN_CONDITIONS)[number];

/** Condition → rung canon minimal qu'elle prouve. */
export const CONDITION_TO_TIER: Record<SuperfanCondition, DevotionLadderTier> = {
  VIEWED: "SPECTATEUR",
  INTERACTED: "PARTICIPANT",
  PAID: "ENGAGE",
  RECOMMENDED: "AMBASSADEUR",
  SHARED: "EVANGELISTE",
};

/**
 * Rung → `engagementDepth` plancher (miroir des seuils `DEPTH_TO_TIER` de
 * `superfan-ingest.ts` : le ladder mesuré reste indexé sur une seule échelle).
 * Une condition franchie plancher AUSSI la profondeur — ainsi toutes les
 * requêtes northstar existantes (count/segments/top, indexées sur depth)
 * reflètent correctement un client qui a payé.
 */
export const TIER_MIN_DEPTH: Record<DevotionLadderTier, number> = {
  SPECTATEUR: 0,
  INTERESSE: 0.1,
  PARTICIPANT: 0.25,
  ENGAGE: 0.45,
  AMBASSADEUR: 0.65,
  EVANGELISTE: 0.85,
};

/** True ssi `c` est une condition superfan canonique. */
export function isSuperfanCondition(c: unknown): c is SuperfanCondition {
  return typeof c === "string" && (SUPERFAN_CONDITIONS as readonly string[]).includes(c);
}

/**
 * Rung dérivé des conditions franchies = la condition la plus haute (gate-gated).
 * Aucune condition → SPECTATEUR.
 */
export function deriveTierFromConditions(met: Iterable<SuperfanCondition>): DevotionLadderTier {
  let best: DevotionLadderTier = "SPECTATEUR";
  let bestPos = -1;
  for (const c of met) {
    const tier = CONDITION_TO_TIER[c];
    const pos = DEVOTION_LADDER_TIERS.indexOf(tier);
    if (pos > bestPos) {
      bestPos = pos;
      best = tier;
    }
  }
  return best;
}

/** `engagementDepth` plancher imposé par les conditions franchies. */
export function conditionFloorDepth(met: Iterable<SuperfanCondition>): number {
  return TIER_MIN_DEPTH[deriveTierFromConditions(met)];
}

/** Preuve datée d'une condition franchie (provenance, jamais fabriquée). */
export interface ConditionEvidence {
  /** MANUAL | CRM | CAMPAIGN | SOCIAL | SUBSCRIPTION — origine déclarée, audit. */
  source: string;
  /** ISO — quand la condition a été franchie (défaut : moment de l'écriture). */
  at?: string;
  /** Note opérateur (ex : « abonnement Spawter Gold, mobile money, 07/2026 »). */
  note?: string;
}

/** Carte des conditions franchies par une personne + leur preuve. */
export type SuperfanConditionMap = Partial<Record<SuperfanCondition, ConditionEvidence>>;

/** Conditions franchies (clés valides uniquement) d'une carte arbitraire. */
export function metConditions(map: SuperfanConditionMap | null | undefined): SuperfanCondition[] {
  if (!map || typeof map !== "object") return [];
  return (Object.keys(map) as string[]).filter(isSuperfanCondition);
}
