/**
 * Anubis — Comms (PRÉ-RÉSERVÉ — sortie partielle Oracle-stub seulement).
 *
 * Phase 13 (B9, ADR-0018) : sortie partielle de la pré-réserve uniquement
 * pour produire la section dormante Oracle `anubis-comms-dormant`.
 * Anubis RESTE pré-réservé dans le panthéon Neteru (cap 7 BRAINS respecté).
 *
 * **HORS scope strict (documenté ADR-0018)** :
 * - Pas de modèle Prisma propre
 * - Pas de page dédiée
 * - Pas de Glory tools propres
 * - Pas de notification center
 * - Pas d'ad-network connector
 * - 1 seul Intent kind (ANUBIS_DRAFT_COMMS_PLAN)
 *
 * APOGEE — Sous-système Comms (Ground #7).
 * ADR-0011 (pré-réserve initiale) + ADR-0018 (sortie partielle Oracle-only).
 */

export interface AnubisDraftCommsPlanPayload {
  strategyId: string;
  /** Optionnel : context audience pour personnaliser le placeholder. */
  audience?: string;
}

export interface AnubisCommsPlanPlaceholder {
  /** Texte d'attente affiché dans la section dormante UI (B5 + B9 wired). */
  placeholder: string;
  /** Statut explicite : DORMANT jusqu'à activation Phase 8+. */
  status: "DORMANT_PRE_RESERVED";
  /** Lien ADRs de la sortie partielle. */
  adrRefs: readonly string[];
  /** Date de scaffolding (Phase 13 commit). */
  scaffoldedAt: string;
}
