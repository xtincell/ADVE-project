/**
 * Pillar Chip Status — Phase 21 F-A.5 (ADR-0069)
 *
 * Helper UI canonique pour rendre les chips de pilier ADVE/RTIS dans Notoria
 * + tous les surfaces qui exposent un statut pillaire.
 *
 * **Source unique de vérité** : la procédure tRPC `notoria.getDashboard`
 * retourne `byPillar[k]` qui dérive lui-même de `getStrategyReadiness()`
 * (governance layer). Toute UI doit consommer ce shape — interdiction de
 * recalculer un statut depuis `pillar.completionLevel` ou `validationStatus`
 * directs (drift narratif).
 *
 * Test anti-drift : `tests/unit/governance/pillar-chip-status-parity.test.ts`
 * grep refuse `cl[k] === "COMPLET"` dans les composants UI hors de ce helper.
 */

export type PillarChipVariant =
  | "incomplet"
  | "complet"
  | "full"
  /** Phase 21 F-A.5 — stale + content insuffisant (rouge, blocking). */
  | "stale"
  /**
   * Phase 21 F-AB (ADR-0076) — stale + content COMPLET. Mise à jour
   * recommandée mais le contenu reste utilisable. Les gates rafraîchissants
   * (RTIS_CASCADE, ORACLE_ENRICH) acceptent ce statut → cascade peut tourner.
   */
  | "stale-advisory";

export interface PillarChipStatus {
  /** Texte rendu dans la chip (UI). */
  label: string;
  /** Classe Tailwind/CVA pour le fond + texte. */
  className: string;
  /** Variante sémantique (testable, machine-readable). */
  variant: PillarChipVariant;
  /** Vrai si le pilier est dans un état considéré "ready" pour la cascade
   *  RTIS. Inclut le check stale (un pilier stale = pas ready). */
  isReadyForCascade: boolean;
  /** Vrai si l'opérateur devrait régénérer ce pilier (stale ou périmé). */
  shouldRegenerate: boolean;
}

export interface PillarReadinessProjection {
  completionLevel: "INCOMPLET" | "COMPLET" | "FULL";
  stage: string;
  stale: boolean;
  /**
   * Phase 21 F-AB (ADR-0076) — optionnel pour rétrocompat. Calculé côté
   * serveur dans notoria.getDashboard. Si absent, dérive depuis
   * `stale && completionLevel !== "INCOMPLET"`.
   */
  staleAdvisory?: boolean;
  displayLabel: string;
  validationStatus: string;
  rtisCascadeReady: boolean;
}

/**
 * Mappe la projection backend (sortie de `notoria.getDashboard.byPillar[k]`)
 * vers le statut UI canonique.
 *
 * Ordre de précédence (Phase 21 F-AB ADR-0076 — stale 2-niveaux) :
 *   1. `stale === true` ET `completionLevel === "INCOMPLET"` → variante
 *      "stale" (rouge, blocking). Le pilier est vraiment cassé.
 *   2. `stale === true` ET content COMPLET/FULL → variante "stale-advisory"
 *      (amber, **isReadyForCascade=true**). Refresh recommandé mais cascade
 *      peut tourner. C'est exactement le rôle de la cascade R+T : rafraîchir
 *      ADVE après mutation amont.
 *   3. `completionLevel === "FULL"` → variante "full".
 *   4. `completionLevel === "COMPLET"` → variante "complet".
 *   5. Sinon → variante "incomplet".
 */
export function getPillarChipStatus(p: PillarReadinessProjection): PillarChipStatus {
  if (p.stale && p.completionLevel === "INCOMPLET") {
    return {
      label: "PÉRIMÉ",
      className: "bg-error/15 text-error",
      variant: "stale",
      isReadyForCascade: false,
      shouldRegenerate: true,
    };
  }
  if (p.stale) {
    // Content COMPLET/FULL + stale → advisory non-bloquant
    return {
      label: "MAJ RECOMMANDÉE",
      className: "bg-warning/15 text-warning",
      variant: "stale-advisory",
      // Note: rtisCascadeReady côté serveur reflète déjà la nouvelle règle
      // (ADR-0076) — il est `true` pour stale-advisory. On le respecte tel quel.
      isReadyForCascade: p.rtisCascadeReady,
      shouldRegenerate: true,
    };
  }
  if (p.completionLevel === "FULL") {
    return {
      // Libellé client FR (lot 14, audit 2026-07-11 T7) — l'enum interne
      // reste "FULL", seul l'affichage change.
      label: "OPTIMAL",
      className: "bg-success/15 text-success",
      variant: "full",
      isReadyForCascade: p.rtisCascadeReady,
      shouldRegenerate: false,
    };
  }
  if (p.completionLevel === "COMPLET") {
    return {
      label: "COMPLET",
      className: "bg-info/15 text-info",
      variant: "complet",
      isReadyForCascade: p.rtisCascadeReady,
      shouldRegenerate: false,
    };
  }
  return {
    label: "INCOMPLET",
    className: "bg-error/15 text-error",
    variant: "incomplet",
    isReadyForCascade: false,
    shouldRegenerate: false,
  };
}

/**
 * Variant `isReady` autonome — utilisé par les surfaces qui ont besoin
 * juste du booléen (ex: stepper logic). Délègue à `getPillarChipStatus`
 * pour conserver la précédence stale > complete.
 */
export function isPillarReadyForCascade(p: PillarReadinessProjection): boolean {
  return getPillarChipStatus(p).isReadyForCascade;
}
