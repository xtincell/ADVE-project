/**
 * Historique par champ — pur TS, zéro IO.
 *
 * Les `PillarRevision` sont des instantanés du contenu ENTIER du pilier ;
 * la dernière modification d'UN champ se retrouve en comparant les valeurs
 * du champ entre révisions consécutives (apparition, changement, effacement
 * comptent tous comme une modification).
 */

export interface RevisionSnapshot {
  version: number;
  reason: string;
  createdAt: Date;
  /** Contenu complet du pilier à cette révision (colonne Json). */
  content: unknown;
}

export interface FieldChange {
  version: number;
  reason: string;
  createdAt: Date;
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

function fieldValue(content: unknown, fieldId: string): unknown {
  if (content !== null && typeof content === "object" && !Array.isArray(content)) {
    return (content as Record<string, unknown>)[fieldId];
  }
  return undefined;
}

/**
 * Dernière révision ayant modifié `fieldId`. Null si le champ n'apparaît
 * dans aucune révision fournie. Si la fenêtre de révisions est tronquée et
 * que le champ y est partout identique, la plus ancienne révision fournie
 * fait foi (meilleure information disponible, jamais inventée).
 */
export function lastFieldChange(
  revisions: readonly RevisionSnapshot[],
  fieldId: string,
): FieldChange | null {
  const ordered = [...revisions].sort(
    (a, b) => a.version - b.version || a.createdAt.getTime() - b.createdAt.getTime(),
  );
  let previous: unknown;
  let last: FieldChange | null = null;
  let seen = false;

  for (const revision of ordered) {
    const value = fieldValue(revision.content, fieldId);
    if (value !== undefined) seen = true;
    if (stableJson(value) !== stableJson(previous)) {
      last = {
        version: revision.version,
        reason: revision.reason,
        createdAt: revision.createdAt,
      };
    }
    previous = value;
  }
  return seen ? last : null;
}

/** Libellés FR des reasons de révision (registre du schéma). */
const REASON_LABELS: Record<string, string> = {
  intake: "intake",
  operator_amend: "amendement",
  rtis_refresh: "dérivation RTIS",
  import: "import",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Ligne d'historique « v{n} · {reason} · {date} » prête à afficher. */
export function formatFieldChange(change: FieldChange): string {
  return `v${change.version} · ${reasonLabel(change.reason)} · ${DATE_FORMAT.format(change.createdAt)}`;
}
