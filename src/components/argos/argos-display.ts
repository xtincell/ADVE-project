/**
 * Argos — coercion d'affichage du DNA/editorial (Json → vues typées tolérantes)
 * et mention de la source d'une lecture publique.
 */

import type { ArgosReadSource } from "@/domain/argos-library";

export interface DnaView {
  palette: string[];
  typography: string[];
  voice: string;
  visualCodes: string[];
  keyPhrases: string[];
  axes: string[];
}

export interface EditorialView {
  sections: Array<{ title: string; body: string }>;
}

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function coerceDna(raw: unknown): DnaView {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    palette: strArr(r.palette),
    typography: strArr(r.typography),
    voice: typeof r.voice === "string" ? r.voice : "",
    visualCodes: strArr(r.visualCodes),
    keyPhrases: strArr(r.keyPhrases),
    axes: strArr(r.axes),
  };
}

export function coerceEditorial(raw: unknown): EditorialView {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sections = Array.isArray(r.sections)
    ? r.sections
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({ title: String(s.title ?? ""), body: String(s.body ?? "") }))
        .filter((s) => s.title || s.body)
    : [];
  return { sections };
}

// ── Source d'une lecture publique (SHK-0002 point 5) ─────────────────────────


export interface SourceNoticeView {
  /** `plain` : ligne discrète (bibliothèque) ; sinon encart Alert. */
  tone: "plain" | "info" | "warning";
  title: string | null;
  text: string;
}

export function formatArgosDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const FALLBACK_CAUSE: Record<Exclude<Extract<ArgosReadSource, { origin: "JOURNAL" }>["reason"], "NOT_CONFIGURED">, string> = {
  MISCONFIGURED: "Le raccordement à la bibliothèque Argos est mal configuré",
  TIMEOUT: "La bibliothèque Argos n'a pas répondu à temps",
  UNREACHABLE: "La bibliothèque Argos est injoignable pour le moment",
  INVALID_RESPONSE: "La bibliothèque Argos a renvoyé une réponse que ce site ne sait pas lire",
};

/**
 * Phrase honnête sur l'origine et la fraîcheur de ce qui est affiché.
 * `scope` : `list` (mur, dernière publication connue) ou `dossier` (fiche).
 */
export function describeArgosSource(source: ArgosReadSource, scope: "list" | "dossier"): SourceNoticeView {
  if (source.origin === "STUDIO") {
    return {
      tone: "plain",
      title: null,
      text: `Source : bibliothèque Argos, consultée le ${formatArgosDate(source.observedAt, true)}.`,
    };
  }
  const freshness = source.latestPublishedAt
    ? scope === "list"
      ? `dernière publication le ${formatArgosDate(source.latestPublishedAt)}`
      : `dossier publié le ${formatArgosDate(source.latestPublishedAt)}`
    : scope === "list"
      ? "aucune publication enregistrée"
      : "ce dossier n'y figure pas";
  if (source.reason === "NOT_CONFIGURED") {
    return {
      tone: "info",
      title: "Dossiers publiés par La Fusée",
      text: `La bibliothèque Argos n'est pas raccordée à ce site : vous consultez les dossiers publiés par La Fusée (${freshness}).`,
    };
  }
  return {
    tone: "warning",
    title: "Bibliothèque Argos indisponible",
    text: `${FALLBACK_CAUSE[source.reason]} : vous consultez les dossiers publiés par La Fusée, qui peuvent différer de la bibliothèque (${freshness}).`,
  };
}
