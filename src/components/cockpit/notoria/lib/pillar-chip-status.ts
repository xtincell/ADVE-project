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

export type PillarChipVariant = "incomplet" | "complet" | "full" | "stale";

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
  displayLabel: string;
  validationStatus: string;
  rtisCascadeReady: boolean;
}

/**
 * Mappe la projection backend (sortie de `notoria.getDashboard.byPillar[k]`)
 * vers le statut UI canonique.
 *
 * Ordre de précédence :
 *   1. `stale === true` → variante "stale" (overrides COMPLET/FULL).
 *   2. `completionLevel === "FULL"` → variante "full".
 *   3. `completionLevel === "COMPLET"` → variante "complet".
 *   4. Sinon → variante "incomplet".
 *
 * Cette précédence reflète l'invariant : un pilier périmé n'est pas "complet"
 * du point de vue de l'opérateur, même si son contenu serait techniquement valide.
 */
export function getPillarChipStatus(p: PillarReadinessProjection): PillarChipStatus {
  if (p.stale) {
    return {
      label: "PÉRIMÉ",
      className: "bg-amber-500/15 text-amber-300",
      variant: "stale",
      isReadyForCascade: false,
      shouldRegenerate: true,
    };
  }
  if (p.completionLevel === "FULL") {
    return {
      label: "FULL",
      className: "bg-emerald-500/15 text-emerald-300",
      variant: "full",
      isReadyForCascade: p.rtisCascadeReady,
      shouldRegenerate: false,
    };
  }
  if (p.completionLevel === "COMPLET") {
    return {
      label: "COMPLET",
      className: "bg-blue-500/15 text-blue-300",
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
