// ============================================================================
// Quick Intake Result — premier écran du résultat gratuit
// ============================================================================
// Une note sur 100, un palier, trois constats, une action. Fonctions pures :
// chaque constat vient du vecteur ADVE et des textes que le diagnostic a déjà
// calculés et enregistrés — rien n'est inventé ici. Quand un texte manque, la
// page affiche une phrase type (clé de traduction), jamais une valeur forgée.
//
// Échelle unique du parcours gratuit : /100. Le vecteur porte chaque pilier
// ADVE sur 25 (la somme des quatre fait la note /100) ; l'écran affiche donc
// chaque pilier ramené sur 100, et la moyenne des quatre retombe sur la note.
// ============================================================================

import { ADVE_KEYS as DOMAIN_ADVE_KEYS, type AdveKey as DomainAdveKey } from "@/domain/pillars";

/** Clés du vecteur (minuscules), dérivées du canon des piliers. */
export type AdveKey = Lowercase<DomainAdveKey>;

export const ADVE_KEYS: readonly AdveKey[] = DOMAIN_ADVE_KEYS.map((key) => key.toLowerCase() as AdveKey);

/** Un pilier ADVE (vecteur sur 25) ramené sur 100, borné et arrondi. */
export function pillarOn100(raw: number | null | undefined): number {
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  return Math.round(Math.min(Math.max(value, 0), 25) * 4);
}

export interface FirstScreenFinding {
  kind: "strength" | "gap";
  pillar: AdveKey;
  score100: number;
  /** Texte déjà produit par le diagnostic ; null → phrase type côté page. */
  text: string | null;
}

export interface FirstScreen {
  findings: FirstScreenFinding[];
  action: string | null;
}

export interface FirstScreenDiagnostic {
  strengths?: Array<{ key: string; insight?: string | null }> | null;
  recommendations?: Array<{ key: string; diagnostic?: string | null; actions?: string[] | null }> | null;
  brandLevel?: { nextMilestone?: { moves?: string[] | null } | null } | null;
  narrativeReport?: {
    recommendation?: { prioritizedActions?: Array<{ title?: string | null }> | null } | null;
  } | null;
}

/**
 * Mentions de fabrication laissées par l'évaluateur de secours (« Évaluation
 * déterministe (sans LLM) : … ») : utiles au dossier, illisibles pour un client.
 */
const MACHINE_PREFIX = /^\s*[ÉE]valuation d[ée]terministe\s*\(sans LLM\)\s*:\s*/i;

/** « 1.6/25 » écrit par le générateur avant le 18 novembre 2026 → « 6/100 ». */
const ON_25 = /(\d+(?:[.,]\d+)?)\s?\/\s?25\b/g;

export function clientText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(MACHINE_PREFIX, "")
    .replace(ON_25, (_match, raw: string) => `${pillarOn100(Number(raw.replace(",", ".")))}/100`)
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const cleaned = clientText(value);
    if (cleaned) return cleaned;
  }
  return null;
}

/**
 * Trois constats : le pilier le plus solide (point d'appui), puis les deux plus
 * faibles, du plus faible au moins faible (à renforcer). Une action : la
 * première action priorisée du bloc stratégique s'il existe, sinon la première
 * action du plan calculé pour le pilier le plus faible, sinon le premier
 * mouvement vers le palier suivant.
 */
export function buildFirstScreen(
  vector: Partial<Record<string, number | null | undefined>>,
  diagnostic: FirstScreenDiagnostic | null | undefined,
): FirstScreen {
  const ranked = ADVE_KEYS.map((key, order) => ({ key, order, score100: pillarOn100(vector[key]) }))
    .sort((x, y) => y.score100 - x.score100 || x.order - y.order);

  const strongest = ranked[0]!;
  const gaps = ranked.slice(1).reverse().slice(0, 2);

  const recommendationFor = (key: AdveKey) => diagnostic?.recommendations?.find((r) => r.key === key);

  const findings: FirstScreenFinding[] = [
    {
      kind: "strength",
      pillar: strongest.key,
      score100: strongest.score100,
      text: firstText(diagnostic?.strengths?.find((s) => s.key === strongest.key)?.insight),
    },
    ...gaps.map((gap): FirstScreenFinding => ({
      kind: "gap",
      pillar: gap.key,
      score100: gap.score100,
      text: firstText(recommendationFor(gap.key)?.diagnostic),
    })),
  ];

  const weakest = gaps[0];
  const action = firstText(
    diagnostic?.narrativeReport?.recommendation?.prioritizedActions?.[0]?.title,
    weakest ? recommendationFor(weakest.key)?.actions?.[0] : null,
    diagnostic?.recommendations?.[0]?.actions?.[0],
    diagnostic?.brandLevel?.nextMilestone?.moves?.[0],
  );

  return { findings, action };
}
