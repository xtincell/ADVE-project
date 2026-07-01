/**
 * Domain — Cult Index tier (échelle de maturité culturelle de la marque).
 *
 * Source de vérité unique pour les 5 paliers du Cult Index, l'indicateur
 * DISTINCTIF La Fusée qui mesure la masse culturelle accumulée (score 0-100).
 * Distinct du Devotion Ladder (rungs d'UN fan : SPECTATEUR→EVANGELISTE) et de
 * la BrandClassification (LATENT→ICONE, composite ADVERTIS).
 *
 * **Audit Oracle 2026-06-13 (galileo)** — observé sur CIMENCAM : le
 * `CultIndexSnapshot.tier` écrit par `cult-index-engine` (valeur `"FUNCTIONAL"`)
 * était relu côté Oracle via `parseDevotionLadderTier`, qui le REJETAIT (ce
 * n'est pas un rung Devotion Ladder) → `cultIndex: null`. Résultat : le Cult
 * Index disparaissait silencieusement de l'Executive Summary (§01), des KPIs
 * (§16) et du Profil Superfan (§15), alors que la section distinctive Cult Index
 * (§31) l'affichait brut. Même snapshot, rendu contradictoire. Ce module
 * canonicalise le scale et fournit le parser read-side manquant.
 *
 * Bandes (cf. `cult-index-engine` REQ-2, source historique) :
 *   GHOST 0-20 · FUNCTIONAL 21-40 · LOVED 41-60 · EMERGING 61-80 · CULT 81-100
 */

/**
 * 5 paliers Cult Index, ordonnés du plus faible (à peine perçu) au plus fort
 * (culte formé).
 *
 * - **GHOST** : marque fonctionnelle mais invisible culturellement (0-20).
 * - **FUNCTIONAL** : reconnue, utilisée, sans charge affective (21-40).
 * - **LOVED** : base affective réelle, premiers ambassadeurs (41-60).
 * - **EMERGING** : dynamique de masse culturelle enclenchée (61-80).
 * - **CULT** : culte formé, superfans en orbite, fenêtre Overton déplacée (81-100).
 *
 * Anti-confusion (cf. devotion-ladder.ts §ADR-0047) :
 * - `DevotionLadderTier` (SPECTATEUR…EVANGELISTE) mesure UN fan, pas la marque.
 * - `BrandClassification` (LATENT…ICONE) est le composite ADVERTIS structurel.
 *   Ne JAMAIS utiliser comme `cultIndex.tier`.
 */
export const CULT_INDEX_TIERS = ["GHOST", "FUNCTIONAL", "LOVED", "EMERGING", "CULT"] as const;

export type CultIndexTier = (typeof CULT_INDEX_TIERS)[number];

/** Borne supérieure (incluse) du score /100 par palier. */
export const CULT_INDEX_TIER_UPPER_BOUNDS: Record<CultIndexTier, number> = {
  GHOST: 20,
  FUNCTIONAL: 40,
  LOVED: 60,
  EMERGING: 80,
  CULT: 100,
};

/**
 * Dérive le palier canonique depuis un score /100. Clamp les valeurs hors borne.
 * Source historique : `cult-index-engine.getCultTier`.
 */
export function getCultIndexTier(score: number): CultIndexTier {
  if (!Number.isFinite(score)) return "GHOST";
  if (score <= 20) return "GHOST";
  if (score <= 40) return "FUNCTIONAL";
  if (score <= 60) return "LOVED";
  if (score <= 80) return "EMERGING";
  return "CULT";
}

/** Tolère casse + accents. Aucun alias cross-échelle (un rung Devotion → null). */
const CULT_TIER_ALIASES: Record<string, CultIndexTier> = {
  ghost: "GHOST",
  functional: "FUNCTIONAL",
  fonctionnel: "FUNCTIONAL",
  loved: "LOVED",
  aime: "LOVED",
  aimé: "LOVED",
  emerging: "EMERGING",
  emergent: "EMERGING",
  émergent: "EMERGING",
  cult: "CULT",
  culte: "CULT",
};

/**
 * Parse une valeur arbitraire (string libre DB) en `CultIndexTier` canonique.
 * Retourne `null` si la valeur n'est pas un palier Cult Index reconnaissable
 * — y compris si c'est un `DevotionLadderTier` ou une `BrandClassification`
 * (pas de conflation silencieuse dans un sens ou dans l'autre).
 *
 * @example
 * parseCultIndexTier("FUNCTIONAL")  // "FUNCTIONAL"
 * parseCultIndexTier("functional")  // "FUNCTIONAL"
 * parseCultIndexTier("AMBASSADEUR") // null (DevotionLadderTier)
 * parseCultIndexTier("ICONE")       // null (BrandClassification)
 */
export function parseCultIndexTier(value: unknown): CultIndexTier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if ((CULT_INDEX_TIERS as readonly string[]).includes(upper)) {
    return upper as CultIndexTier;
  }
  return CULT_TIER_ALIASES[normalized] ?? null;
}

/**
 * Résolution read-side robuste. Le `tier` n'est qu'une étiquette de bande du
 * score : on honore le tier stocké UNIQUEMENT s'il concorde avec la bande du
 * score ; sinon le score fait foi. Garantit que tier et score ne se
 * contredisent JAMAIS — un tier périmé ou étranger ("FUNCTIONAL" relu en
 * DevotionLadder, ou "EMERGING" sur un score de 42.5) ne peut ni faire
 * disparaître le Cult Index ni surévaluer la maturité (audit galileo).
 */
export function resolveCultIndexTier(rawTier: unknown, score: number): CultIndexTier {
  const fromScore = getCultIndexTier(score);
  const stored = parseCultIndexTier(rawTier);
  return stored !== null && stored === fromScore ? stored : fromScore;
}

/** Position 0-indexée (GHOST=0 … CULT=4). */
export function cultIndexTierPosition(tier: CultIndexTier): number {
  return CULT_INDEX_TIERS.indexOf(tier);
}
