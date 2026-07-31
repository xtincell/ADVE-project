/**
 * Décodage des entités HTML pour un texte destiné au CLIENT.
 *
 * Extrait de `quick-intake/web-footprint` le 2026-07-31 : le lecteur de
 * données structurées en a besoin, et l'importer depuis le collecteur aurait
 * créé un cycle (le collecteur consomme le lecteur). Feuille partagée, sans
 * dépendance.
 *
 * Les entités NUMÉRIQUES manquaient : WordPress publie l'apostrophe
 * typographique en `&#8217;` et l'esperluette en `&#038;`, si bien qu'un titre
 * de presse arrivait à l'écran en « Irawo &#038; LemFi s&#8217;associent ». Le
 * défaut portait déjà sur les retombées presse collectées.
 */

/** Point de code hors plage ou invalide → on n'écrit rien plutôt qu'un déchet. */
function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return "";
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

/**
 * `&amp;` est traité EN DERNIER : le faire avant recréerait des entités à
 * partir d'un texte doublement encodé.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
