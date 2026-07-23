/**
 * Format standard des `publicSlug` de marque (page publique `/b/[slug]`).
 *
 * Mandat opérateur go-live : « les public slug doivent avoir un format standard
 * pour éviter les problèmes : LFA-<brandshortname> » (ex. `LFA-spawt`, `LFA-motion19`).
 *
 * Un seul point de vérité : tout écriture de `Strategy.publicSlug` (seeds, admin,
 * futures surfaces) passe par `brandPublicSlug()`. Le validateur `isBrandPublicSlug()`
 * verrouille la forme. 100 % déterministe, zéro dépendance.
 *
 * NB : ceci ne concerne PAS `Mission.publicSlug` (slugs de missions La Guilde,
 * format libre lisible) — seulement les pages publiques de MARQUE.
 */

/** Préfixe canonique — « La Fusée / Agency ». */
export const BRAND_SLUG_PREFIX = "LFA-";

/** Forme valide : `LFA-` + segment kebab minuscule non vide. */
export const BRAND_SLUG_RE = /^LFA-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugifie un nom court en segment kebab minuscule (sans le préfixe). */
export function brandShortName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug public canonique d'une marque au format `LFA-<brandshortname>`.
 * Idempotent : `brandPublicSlug("LFA-spawt")` ⇒ `LFA-spawt`.
 * Lève si le nom ne produit aucun segment exploitable.
 */
export function brandPublicSlug(nameOrSlug: string): string {
  const stripped = nameOrSlug.trim().replace(/^LFA-/i, "");
  const short = brandShortName(stripped);
  if (!short) throw new Error(`brandPublicSlug: nom vide/non-sluggable « ${nameOrSlug} »`);
  return `${BRAND_SLUG_PREFIX}${short}`;
}

/** Vrai si `slug` respecte le format canonique `LFA-<brandshortname>`. */
export function isBrandPublicSlug(slug: string): boolean {
  return BRAND_SLUG_RE.test(slug);
}

/**
 * Variante GARANTIE NON VIDE pour l'activation self-service (noms arbitraires).
 * Si le nom ne produit aucun segment (ex. « 摩托19 » 100 % non-latin), retombe
 * sur un slug basé sur l'id — au lieu de LEVER (le `brandPublicSlug` strict
 * crashait la mutation d'activation de la page publique). Audit adversarial 2026-07-22.
 */
export function brandPublicSlugSafe(name: string, id: string): string {
  const short = brandShortName(name.replace(/^LFA-/i, ""));
  if (short) return `${BRAND_SLUG_PREFIX}${short}`;
  const idFrag = brandShortName(id).slice(0, 8) || "brand";
  return `${BRAND_SLUG_PREFIX}${idFrag}`;
}

/**
 * Désambiguïse une collision de `publicSlug` (globalement `@unique`) en suffixant
 * un fragment d'id. Sans ça, deux marques homonymes (« Nike ») produisaient le même
 * slug → P2002 → 500 + blocage PERMANENT de la 2ᵉ (le nom régénère toujours la collision).
 */
export function disambiguateBrandSlug(baseSlug: string, id: string): string {
  const idFrag = brandShortName(id).slice(0, 6) || "x";
  return `${baseSlug}-${idFrag}`;
}
