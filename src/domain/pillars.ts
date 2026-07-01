/**
 * Cœur de la méthode — cascade A→D→V→E→R→T→I→S.
 * ADVE = socle déclaré/amendé par l'opérateur ; RTIS = dérivé, jamais édité à la main.
 * Transplanté du legacy (src/domain/pillars.ts) — la méthode est l'actif, pas le code.
 */
export const ADVE_PILLARS = ["A", "D", "V", "E"] as const;
export const RTIS_PILLARS = ["R", "T", "I", "S"] as const;
export const PILLARS = [...ADVE_PILLARS, ...RTIS_PILLARS] as const;

export type AdvePillarKey = (typeof ADVE_PILLARS)[number];
export type RtisPillarKey = (typeof RTIS_PILLARS)[number];
export type PillarKey = (typeof PILLARS)[number];

export function isAdve(key: PillarKey): key is AdvePillarKey {
  return (ADVE_PILLARS as readonly string[]).includes(key);
}

/**
 * Paliers de maturité de marque, du sol à l'apex.
 * Nommage canon v3.3 natif : LATENT (pas ZOMBIE) — le rename legacy est caduc ici.
 */
export const BRAND_LEVELS = [
  "LATENT",
  "FRAGILE",
  "ORDINAIRE",
  "FORTE",
  "CULTE",
  "ICONE",
] as const;

export type BrandLevel = (typeof BRAND_LEVELS)[number];

export function compareLevels(a: BrandLevel, b: BrandLevel): number {
  return BRAND_LEVELS.indexOf(a) - BRAND_LEVELS.indexOf(b);
}
