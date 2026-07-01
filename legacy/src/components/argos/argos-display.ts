/**
 * Argos — coercion d'affichage du DNA/editorial (Json → vues typées tolérantes).
 */

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
