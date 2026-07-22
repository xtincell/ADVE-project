/**
 * schema-normalizer.ts — normalisation déterministe vers le schéma STRICT (ADR-0172).
 *
 * Décision opérateur (2026-07-22) : les schémas Zod restent la loi ; la matière
 * humaine (canon, ingestion) s'y CONFORME. Ce module fournit les coercions
 * déterministes qui rapprochent une valeur brute de sa forme stricte :
 *   - `coerceEnum` : accents/casse/espaces → membre canonique de l'enum ;
 *   - `stableUuid` : id lisible (« risk-m19-001 ») → UUID stable et reproductible
 *     (pour satisfaire `z.string().uuid()` SANS perdre l'identité — même seed →
 *     même UUID, donc les références croisées restent cohérentes après remap) ;
 *   - `coerceNumber` : « ≈150 000 FCFA » → 150000.
 *
 * Layer-0 pur (zéro dépendance Node, zéro LLM, zéro Math.random/Date.now).
 * Réutilisé par (a) l'ingestion (Phase 3), (b) la mise en conformité des canons.
 */

/** Replie une chaîne en ascii (sans accents), trim. */
export function foldAscii(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/** Clé de comparaison : ascii, majuscules, séparateurs unifiés en `_`. */
function enumKey(s: string): string {
  return foldAscii(s).toUpperCase().replace(/[\s\-/]+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

/**
 * Coerce une valeur vers un membre canonique de l'enum (tolérant accents/casse/
 * séparateurs). « Engagé » → `ENGAGE`, « Activation » → `ACTIVATION`,
 * « in-store » → `IN_STORE`. Retourne le membre canonique OU null si aucun match.
 */
export function coerceEnum(raw: unknown, allowed: readonly string[]): string | null {
  if (typeof raw !== "string") return null;
  const target = enumKey(raw);
  if (!target) return null;
  // 1. match exact sur clé normalisée.
  for (const a of allowed) if (enumKey(a) === target) return a;
  // 2. match par préfixe non-ambigu (« Engagé (fort) » → ENGAGE).
  const prefixed = allowed.filter((a) => target.startsWith(enumKey(a)) || enumKey(a).startsWith(target));
  if (prefixed.length === 1) return prefixed[0]!;
  return null;
}

// ── UUID stable et déterministe (pur, sans crypto Node) ──────────────────────

/** Hash 128-bit déterministe d'une chaîne (cyrb128). */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

const hex8 = (n: number): string => (n >>> 0).toString(16).padStart(8, "0");

/**
 * UUID (format v4) déterministe depuis une graine. Même graine → même UUID
 * (reproductible), donc convertir un id lisible ET ses références produit la
 * MÊME valeur → la cohérence des arêtes est préservée après remap. Satisfait
 * `z.string().uuid()`. Pur (cyrb128, pas de random).
 */
export function stableUuid(seed: string): string {
  const [a, b, c, d] = cyrb128(seed || "seed");
  const h = hex8(a) + hex8(b) + hex8(c) + hex8(d); // 32 hex
  // Force version 4 (13e nibble) + variant (17e nibble ∈ 8..b).
  const v4 = h.slice(0, 12) + "4" + h.slice(13, 16);
  const variantNibble = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  const withVar = v4 + variantNibble + h.slice(17, 20);
  const full = withVar + h.slice(20, 32);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}-${full.slice(16, 20)}-${full.slice(20, 32)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** true si `s` est déjà un UUID valide (on ne le re-hash pas → idempotent). */
export function isUuid(s: unknown): boolean {
  return typeof s === "string" && UUID_RE.test(s);
}

/** Renvoie `id` s'il est déjà un UUID, sinon un UUID stable dérivé de lui. */
export function normalizeId(id: string): string {
  return isUuid(id) ? id : stableUuid(id);
}

// ── Coercion numérique ───────────────────────────────────────────────────────

/**
 * Extrait un nombre d'une chaîne (« ≈150 000 FCFA » → 150000, « 7,5 M » → null
 * car ambigu). Conservateur : espaces = séparateurs de milliers, virgule =
 * décimale seulement si ≤ 2 chiffres après. Retourne null si non-extractible.
 */
export function coerceNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const m = raw.replace(/ /g, " ").match(/-?\d[\d\s]*(?:,\d{1,2})?/);
  if (!m) return null;
  const cleaned = m[0].replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
