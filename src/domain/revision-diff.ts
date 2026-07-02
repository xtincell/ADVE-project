/**
 * Diff de révisions de pilier — pur TS, zéro IO.
 *
 * Les `PillarRevision` sont des instantanés du contenu ENTIER du pilier :
 * « ce qui a changé » à la révision N se lit en comparant son contenu à celui
 * de la révision N-1 du MÊME pilier. Utilisé par la timeline /app/revisions
 * (port de l'esprit « sources/history » du cockpit legacy).
 *
 * Les clés `_*` sont des métadonnées de dérivation (convention legacy,
 * cf. domain/rtis.ts) — jamais comptées comme des champs métier.
 */

export interface RevisionFieldDiff {
  /** Champs absents avant, remplis maintenant. */
  added: string[];
  /** Champs présents avant ET maintenant, avec une valeur différente. */
  changed: string[];
  /** Champs présents avant, absents maintenant (effacement explicite). */
  removed: string[];
}

/** JSON à clés triées — comparaison de valeurs stable, sans dépendance. */
function stableJson(value: unknown): string {
  return JSON.stringify(sortDeep(value)) ?? "undefined";
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

function contentRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Champs métier modifiés entre deux instantanés de contenu (prev → next).
 * `prev` null/undefined = première révision : tout champ rempli est « added ».
 * Ordre alphabétique stable — déterminisme d'affichage.
 */
export function diffRevisionFields(prev: unknown, next: unknown): RevisionFieldDiff {
  const before = contentRecord(prev);
  const after = contentRecord(next);
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    if (key.startsWith("_")) continue; // métadonnées de dérivation
    const inBefore = key in before;
    const inAfter = key in after;
    if (!inBefore && inAfter) added.push(key);
    else if (inBefore && !inAfter) removed.push(key);
    else if (stableJson(before[key]) !== stableJson(after[key])) changed.push(key);
  }
  return { added, changed, removed };
}

/** Ligne FR compacte « +2 champs · ~1 modifié · −1 effacé » (null si rien). */
export function formatRevisionDiff(diff: RevisionFieldDiff): string | null {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`+${diff.added.length} champ${diff.added.length > 1 ? "s" : ""}`);
  if (diff.changed.length > 0) parts.push(`~${diff.changed.length} modifié${diff.changed.length > 1 ? "s" : ""}`);
  if (diff.removed.length > 0) parts.push(`−${diff.removed.length} effacé${diff.removed.length > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
