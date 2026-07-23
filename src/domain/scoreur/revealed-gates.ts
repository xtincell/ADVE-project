/**
 * ADR-0149/0150 — Portes Michelin franchies par ÉVIDENCE PUBLIQUE RÉVÉLÉE.
 *
 * Doctrine (choix opérateur 2026-07-18) : « force révélée » PURE — on ne crédite
 * JAMAIS le déclaré (les réponses ADVE du dirigeant). Mais les portes de bas de
 * palier peuvent être franchies par de la PREUVE PUBLIQUE VÉRIFIABLE, mesurée
 * (pas déclarée) : âge de domaine RDAP, presse, audience, avis, présence sociale
 * publique. Une marque nationale ancienne (Chococam, 1967) franchit alors
 * FRAGILE/ORDINAIRE sur preuve, pas sur affirmation — et n'est plus LATENT par
 * artefact de plomberie.
 *
 * `actif-distinctif` (FORTE) et au-delà RESTENT gagnés au registre (duels réels)
 * — aucun signal public déterministe fiable ne les prouve. L'escalade stricte de
 * `itemsTier` fait le reste : une porte non franchie stoppe la montée.
 *
 * Seuils = canon PROPOSÉ (à ratifier opérateur, ADR-0150). Pur, zéro LLM, zéro IO.
 */

/** Signaux PUBLICS mesurés (empreinte), jamais des champs ADVE déclarés. */
export interface RevealedSignals {
  /** Âge du domaine en années (RDAP) — preuve datée de fondation. `null` = non mesuré. */
  readonly domainAgeYears: number | null;
  /** Nb de mentions presse récentes (Google News). */
  readonly pressCount: number;
  /** Fiche Google Business avec ≥1 avis. */
  readonly hasReviews: boolean;
  /** Site officiel atteignable (identité publique vérifiable). */
  readonly siteReachable: boolean;
  /** Nb de profils sociaux publics détectés. */
  readonly publicSocialCount: number;
  /** L'audience cumulée atteint le plancher d'audience de la ligue (arène A gagnée). */
  readonly audienceMeetsFloor: boolean;
  /**
   * AXE A (notabilité) — la marque a une page Wikipédia dédiée (empreinte
   * mesurée). Optionnel : rétro-compat avec les `RevealedSignals` construits
   * avant le collecteur Wikipédia. `undefined`/`false` = neutre (jamais fabriqué).
   */
  readonly hasWikipediaPage?: boolean;
  /**
   * AXE D (demande) — la marque apparaît dans son propre autocomplete de
   * recherche (Google la reconnaît comme requête). Optionnel : rétro-compat +
   * collecteur registered-but-off (souvent absent). `undefined`/`false` = neutre.
   */
  readonly brandInOwnAutocomplete?: boolean;
}

/** Seuils canon PROPOSÉS (ADR-0150) — conservateurs, ajustables. */
export interface RevealedGateThresholds {
  /** Âge de domaine (ans) au-delà duquel le mythe fondateur est « daté & prouvé ». */
  readonly mytheMinDomainAgeYears: number;
  /** Nb de mentions presse prouvant un market-fit (à défaut d'audience/avis). */
  readonly marketFitMinPress: number;
}

export const DEFAULT_REVEALED_GATE_THRESHOLDS: RevealedGateThresholds = {
  mytheMinDomainAgeYears: 3,
  marketFitMinPress: 3,
};

/** Ids d'items franchissables par preuve publique (sous-ensemble de MUST_HAVE_ITEMS). */
export const REVEALED_GATE_IDS = ["dirigeant-identifiable", "mythe-fondateur", "market-fit"] as const;
export type RevealedGateId = (typeof REVEALED_GATE_IDS)[number];

/**
 * Résout les portes franchies par preuve publique. Déterministe. N'ajoute
 * JAMAIS `actif-distinctif` ni les portes CULTE/ICONE (gagnées au registre).
 */
export function resolveRevealedGates(
  s: RevealedSignals,
  thresholds: RevealedGateThresholds = DEFAULT_REVEALED_GATE_THRESHOLDS,
): Set<RevealedGateId> {
  const met = new Set<RevealedGateId>();

  // FRAGILE — identité publique vérifiable de la marque (site OU présence sociale
  // publique OU page Wikipédia dédiée — axe A notabilité). Une marque avec une
  // vraie empreinte publique est identifiable. Ajout ADDITIF (monotone) : une
  // page Wikipédia ne peut qu'AJOUTER la porte, jamais la retirer.
  if (s.siteReachable || s.publicSocialCount >= 1 || s.hasWikipediaPage === true) {
    met.add("dirigeant-identifiable");
  }

  // ORDINAIRE — mythe fondateur DATÉ : la date de fondation est prouvée
  // publiquement (âge de domaine RDAP au-delà du seuil). Pas de date → pas de porte.
  if (s.domainAgeYears !== null && s.domainAgeYears >= thresholds.mytheMinDomainAgeYears) {
    met.add("mythe-fondateur");
  }

  // ORDINAIRE — market-fit prouvé : traction publique (audience ≥ plancher de
  // ligue) OU couverture presse OU avis clients réels OU demande de recherche
  // révélée (axe D — la marque est cherchée, Google l'autocomplète). Faisceau,
  // jamais déclaré. Ajout ADDITIF (monotone) : ne peut qu'AJOUTER la porte.
  if (
    s.audienceMeetsFloor ||
    s.pressCount >= thresholds.marketFitMinPress ||
    s.hasReviews ||
    s.brandInOwnAutocomplete === true
  ) {
    met.add("market-fit");
  }

  return met;
}
