/**
 * Imhotep — Crew Programs (PRÉ-RÉSERVÉ — sortie partielle Oracle-stub seulement).
 *
 * Phase 13 (B9, ADR-0017) : sortie partielle de la pré-réserve uniquement
 * pour produire la section dormante Oracle `imhotep-crew-program-dormant`.
 * Imhotep RESTE pré-réservé dans le panthéon Neteru (cap 7 BRAINS respecté).
 *
 * **HORS scope strict (documenté ADR-0017)** :
 * - Pas de modèle Prisma propre
 * - Pas de page dédiée
 * - Pas de Glory tools propres
 * - Pas de notification center
 * - Pas de crew DB
 * - 1 seul Intent kind (IMHOTEP_DRAFT_CREW_PROGRAM)
 *
 * APOGEE — Sous-système Crew Programs (Ground #6).
 * ADR-0010 (pré-réserve initiale) + ADR-0017 (sortie partielle Oracle-only).
 */

export interface ImhotepDraftCrewProgramPayload {
  strategyId: string;
  /** Optionnel : context business pour personnaliser le placeholder. */
  sector?: string;
}

export interface ImhotepCrewProgramPlaceholder {
  /** Texte d'attente affiché dans la section dormante UI (B5 + B9 wired). */
  placeholder: string;
  /** Statut explicite : DORMANT jusqu'à activation Phase 7+. */
  status: "DORMANT_PRE_RESERVED";
  /** Lien ADRs de la sortie partielle. */
  adrRefs: readonly string[];
  /** Date de scaffolding (Phase 13 commit). */
  scaffoldedAt: string;
}
