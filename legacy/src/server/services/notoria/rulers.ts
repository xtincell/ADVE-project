/**
 * NOTORIA Field Rulers — un évaluateur DÉTERMINISTE par champ ADVE (ADR-0090).
 *
 * « Attribuer un ruler à CHAQUE champ de l'ADVE pour éviter la dilution de la
 * rigueur. » Chaque champ du noyau (et par extension tout champ piloté par la
 * Variable Bible) reçoit un verdict reproductible — zéro LLM, variance 0 :
 *
 *   verdict = { score /100, dimensions, violations, warnings, pass }
 *
 * Le score se décompose en 5 dimensions pondérées :
 *   - presence    (0.25) : non-vide, non-placeholder
 *   - structure   (0.20) : type attendu + violations Bible (validateAgainstBible)
 *   - richesse    (0.20) : densité d'information vs bande [minLength, maxLength]
 *   - specificite (0.20) : faits concrets (chiffres, noms propres) vs buzzwords
 *   - conformite  (0.15) : règles métier de la Bible respectées
 *
 * Le ruler sert deux usages :
 *   1. Scorer chaque Recommendation à la persistance (weightedScore stocké).
 *   2. Le GATE DE REMPLACEMENT : une nouvelle valeur ne remplace l'ancienne
 *      que si son score pondéré bat l'existant avec une marge d'hystérésis
 *      (RULER_REPLACEMENT_MARGIN) — fin des régressions silencieuses de
 *      contenu. Cf. compareForReplacement().
 *
 * Pur, importable côté lib/tests. Aucune IO, aucune dépendance serveur.
 */

import {
  getVariableSpec,
  validateAgainstBible,
  type BibleViolation,
  type VariableSpec,
} from "@/lib/types/variable-bible";

// ── Types ──────────────────────────────────────────────────────────────

export interface RulerDimensions {
  presence: number; // /100
  structure: number; // /100
  richesse: number; // /100
  specificite: number; // /100
  conformite: number; // /100
}

export interface FieldRulerVerdict {
  pillarKey: string;
  field: string;
  score: number; // /100 — somme pondérée des dimensions
  dimensions: RulerDimensions;
  violations: string[]; // BLOCK de la Bible
  warnings: string[]; // WARN de la Bible + heuristiques
  pass: boolean; // aucune violation BLOCK et score ≥ RULER_PASS_THRESHOLD
}

export interface ReplacementComparison {
  oldVerdict: FieldRulerVerdict;
  newVerdict: FieldRulerVerdict;
  /** Score pondéré de la nouvelle valeur (ruler + impact + confidence). */
  newWeightedScore: number;
  /** Score de référence de la valeur en place (ruler seul, baseline neutre). */
  oldWeightedScore: number;
  /** newWeightedScore − oldWeightedScore. */
  improvement: number;
  /** true si la nouvelle valeur a le droit de remplacer l'ancienne. */
  replaceAllowed: boolean;
  reason: string;
}

// ── Constantes canoniques (documentées ADR-0090) ──────────────────────

export const RULER_DIMENSION_WEIGHTS = {
  presence: 0.25,
  structure: 0.2,
  richesse: 0.2,
  specificite: 0.2,
  conformite: 0.15,
} as const;

/** Sous ce score, un champ est considéré non-défendable (pass=false). */
export const RULER_PASS_THRESHOLD = 40;

/**
 * Pondération du score composite d'une recommandation :
 *   weighted = 0.45×ruler(new) + 0.35×impactNormalisé + 0.20×confidence×100
 */
export const RECO_WEIGHTS = {
  ruler: 0.45,
  impact: 0.35,
  confidence: 0.2,
} as const;

/**
 * Hystérésis du gate de remplacement : la nouvelle valeur doit battre
 * l'ancienne d'au moins cette marge (en points /100) pour remplacer.
 * Évite le churn sur des différences de bruit.
 */
export const RULER_REPLACEMENT_MARGIN = 2;

/** Conversion delta-composite structurel (/200) → points d'impact /100. */
const IMPACT_POINTS_PER_COMPOSITE_POINT = 10;

// Placeholders qui signent un contenu non-écrit. Déterministe, lowercase.
const PLACEHOLDER_PATTERNS = [
  "todo",
  "tbd",
  "à définir",
  "a definir",
  "à compléter",
  "a completer",
  "lorem ipsum",
  "xxx",
  "n/a",
  "???",
  "à venir",
  "placeholder",
  "exemple",
];

// Buzzwords génériques sans contenu informatif — pénalité specificité.
// Liste volontairement courte et défendable (chaque entrée est un signal
// fort de langue de bois marketing, pas un mot du métier).
const GENERIC_BUZZWORDS = [
  "leader incontesté",
  "solutions innovantes",
  "world-class",
  "best-in-class",
  "synergie",
  "disruptif",
  "révolutionnaire",
  "incontournable",
  "à 360",
  "n°1 du marché",
  "excellence opérationnelle",
  "client au coeur",
  "client au cœur",
];

// ── Helpers purs ───────────────────────────────────────────────────────

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function flattenToText(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 4) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flattenToText(v, depth + 1)).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => flattenToText(v, depth + 1))
      .join(" ");
  }
  return "";
}

function countFilledLeaves(value: unknown, depth = 0): { filled: number; total: number } {
  if (depth > 4) return { filled: 0, total: 0 };
  if (value === null || value === undefined) return { filled: 0, total: 1 };
  if (typeof value === "string") return { filled: value.trim().length > 0 ? 1 : 0, total: 1 };
  if (typeof value === "number" || typeof value === "boolean") return { filled: 1, total: 1 };
  if (Array.isArray(value)) {
    if (value.length === 0) return { filled: 0, total: 1 };
    return (value as unknown[]).reduce<{ filled: number; total: number }>(
      (acc, v) => {
        const r = countFilledLeaves(v, depth + 1);
        return { filled: acc.filled + r.filled, total: acc.total + r.total };
      },
      { filled: 0, total: 0 },
    );
  }
  if (typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    if (entries.length === 0) return { filled: 0, total: 1 };
    return entries.reduce<{ filled: number; total: number }>(
      (acc, v) => {
        const r = countFilledLeaves(v, depth + 1);
        return { filled: acc.filled + r.filled, total: acc.total + r.total };
      },
      { filled: 0, total: 0 },
    );
  }
  return { filled: 0, total: 1 };
}

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Résout la spec Bible : champ exact, sinon premier segment du chemin. */
export function resolveSpec(pillarKey: string, field: string): VariableSpec | undefined {
  return (
    getVariableSpec(pillarKey, field) ??
    getVariableSpec(pillarKey, field.split(".")[0] ?? field)
  );
}

// ── Dimensions ─────────────────────────────────────────────────────────

function scorePresence(value: unknown): { score: number; warnings: string[] } {
  if (isEmptyValue(value)) return { score: 0, warnings: ["Champ vide"] };
  const text = flattenToText(value).toLowerCase();
  const hit = PLACEHOLDER_PATTERNS.find((p) => text.includes(p));
  // « exemple » seul est trop fréquent en langue naturelle — on ne le
  // pénalise que s'il est l'essentiel du contenu (texte court).
  if (hit && (hit !== "exemple" || text.length < 40)) {
    return { score: 25, warnings: [`Placeholder détecté: « ${hit} »`] };
  }
  return { score: 100, warnings: [] };
}

function scoreStructure(
  pillarKey: string,
  field: string,
  value: unknown,
  bibleViolations: BibleViolation[],
): { score: number; violations: string[]; warnings: string[] } {
  const blocks = bibleViolations.filter((v) => v.severity === "BLOCK");
  const warns = bibleViolations.filter((v) => v.severity === "WARN");
  if (blocks.length > 0) {
    return {
      score: 0,
      violations: blocks.map((b) => b.message),
      warnings: warns.map((w) => w.message),
    };
  }
  // Chaque WARN structurel coûte 25 points.
  return {
    score: clamp100(100 - warns.length * 25),
    violations: [],
    warnings: warns.map((w) => w.message),
  };
}

function scoreRichesse(value: unknown, spec: VariableSpec | undefined): number {
  if (isEmptyValue(value)) return 0;

  if (typeof value === "string") {
    const len = value.trim().length;
    const min = spec?.minLength ?? 0;
    const max = spec?.maxLength ?? 0;
    if (min > 0 && len < min) return clamp100((len / min) * 60); // sous le plancher
    if (max > 0 && len > max) return 70; // trop long mais riche
    if (min > 0 && max > 0) {
      // Dans la bande — score plein dès min atteint, bonus de progression.
      const band = max - min || 1;
      return clamp100(80 + ((len - min) / band) * 20);
    }
    // Pas de bande déclarée : heuristique mots (8 mots = riche pour un scalaire).
    const words = value.trim().split(/\s+/).length;
    return clamp100(40 + words * 7.5);
  }

  if (Array.isArray(value)) {
    // 3 items bien remplis = plein score (la Bible cappe via rules max/min).
    const { filled, total } = countFilledLeaves(value);
    const fillRatio = total > 0 ? filled / total : 0;
    return clamp100(Math.min(value.length, 3) * (100 / 3) * (0.5 + 0.5 * fillRatio));
  }

  if (typeof value === "object" && value !== null) {
    const { filled, total } = countFilledLeaves(value);
    // lafusee:allow-adhoc-completion — primitive de remplissage d'un champ ADVE (ruler), plus bas niveau que pillar.readiness (qu'elle alimente)
    return total > 0 ? clamp100((filled / total) * 100) : 0;
  }

  return 100; // nombre/booléen présents = informatifs par nature
}

function scoreSpecificite(value: unknown): { score: number; warnings: string[] } {
  const text = flattenToText(value);
  if (text.trim().length === 0) return { score: 0, warnings: [] };

  const warnings: string[] = [];
  let score = 50; // base neutre

  // Faits concrets : chiffres, pourcentages, montants, années.
  const digitTokens = (text.match(/\d[\d\s.,%]*\b/g) ?? []).length;
  if (digitTokens > 0) score += Math.min(20, digitTokens * 5);

  // Noms propres (capitalisées hors début de phrase) — proxy d'ancrage réel.
  const properNouns = (text.match(/(?<=[a-zà-ÿ,;:]\s)[A-ZÀ-Ý][a-zà-ÿ]{2,}/g) ?? []).length;
  if (properNouns > 0) score += Math.min(20, properNouns * 4);

  // Pénalité buzzwords génériques.
  const lower = text.toLowerCase();
  const hits = GENERIC_BUZZWORDS.filter((b) => lower.includes(b));
  if (hits.length > 0) {
    score -= hits.length * 15;
    warnings.push(`Buzzword générique: ${hits.join(", ")}`);
  }

  // Texte très court sans aucun fait : plafonné.
  if (text.trim().length < 25 && digitTokens === 0 && properNouns === 0) {
    score = Math.min(score, 45);
  }

  return { score: clamp100(score), warnings };
}

function scoreConformite(bibleViolations: BibleViolation[], spec: VariableSpec | undefined): number {
  if (!spec) return 70; // pas de règles déclarées : neutre-positif
  const ruleCount = Math.max(1, (spec.rules?.length ?? 0) + (spec.minLength ? 1 : 0) + (spec.maxLength ? 1 : 0));
  const broken = bibleViolations.length;
  return clamp100(((ruleCount - Math.min(broken, ruleCount)) / ruleCount) * 100);
}

// ── API principale ─────────────────────────────────────────────────────

/**
 * Évalue UNE valeur de champ avec le ruler déterministe de ce champ.
 * Reproductible : même entrée → même verdict, toujours.
 */
export function evaluateField(
  pillarKey: string,
  field: string,
  value: unknown,
): FieldRulerVerdict {
  const key = pillarKey.toLowerCase();
  const spec = resolveSpec(key, field);

  // validateAgainstBible itère les champs de la Bible présents dans l'objet
  // passé — on lui donne uniquement { [topField]: value } pour un verdict
  // strictement scoped au champ évalué.
  const topField = field.split(".")[0] ?? field;
  const bibleViolations = validateAgainstBible(key, { [topField]: value });

  const presence = scorePresence(value);
  const structure = scoreStructure(key, field, value, bibleViolations);
  const richesse = scoreRichesse(value, spec);
  const specificite = scoreSpecificite(value);
  const conformite = scoreConformite(bibleViolations, spec);

  const dimensions: RulerDimensions = {
    presence: Math.round(presence.score),
    structure: Math.round(structure.score),
    richesse: Math.round(richesse),
    specificite: Math.round(specificite.score),
    conformite: Math.round(conformite),
  };

  const score =
    Math.round(
      (dimensions.presence * RULER_DIMENSION_WEIGHTS.presence +
        dimensions.structure * RULER_DIMENSION_WEIGHTS.structure +
        dimensions.richesse * RULER_DIMENSION_WEIGHTS.richesse +
        dimensions.specificite * RULER_DIMENSION_WEIGHTS.specificite +
        dimensions.conformite * RULER_DIMENSION_WEIGHTS.conformite) *
        100,
    ) / 100;

  const violations = structure.violations;
  const warnings = [...presence.warnings, ...structure.warnings, ...specificite.warnings];

  return {
    pillarKey: key,
    field,
    score,
    dimensions,
    violations,
    warnings,
    pass: violations.length === 0 && score >= RULER_PASS_THRESHOLD,
  };
}

/**
 * Score pondéré d'une recommandation — la grandeur « incontestable » :
 *   0.45 × ruler(nouvelle valeur)
 * + 0.35 × impact structurel normalisé (50 = neutre, ±10 pts par point composite)
 * + 0.20 × confidence × 100
 */
export function computeRecoWeightedScore(args: {
  rulerScore: number;
  scoreImpactEstimate: number | null | undefined; // delta composite /200
  confidence: number; // 0..1
}): number {
  const impactNormalized = clamp100(
    50 + (args.scoreImpactEstimate ?? 0) * IMPACT_POINTS_PER_COMPOSITE_POINT,
  );
  const weighted =
    args.rulerScore * RECO_WEIGHTS.ruler +
    impactNormalized * RECO_WEIGHTS.impact +
    clamp100(args.confidence * 100) * RECO_WEIGHTS.confidence;
  return Math.round(weighted * 100) / 100;
}

/**
 * GATE DE REMPLACEMENT — une nouvelle valeur ne remplace l'ancienne que si
 * son score pondéré bat le score de l'existant (ruler de la valeur en place,
 * baseline impact/confidence neutres) avec la marge d'hystérésis.
 *
 * Cas particuliers :
 *   - Ancienne valeur vide → remplacement toujours autorisé (on remplit).
 *   - Nouvelle valeur en violation BLOCK Bible → toujours refusé.
 */
export function compareForReplacement(args: {
  pillarKey: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  confidence: number;
  scoreImpactEstimate?: number | null;
}): ReplacementComparison {
  const oldVerdict = evaluateField(args.pillarKey, args.field, args.oldValue);
  const newVerdict = evaluateField(args.pillarKey, args.field, args.newValue);

  const newWeightedScore = computeRecoWeightedScore({
    rulerScore: newVerdict.score,
    scoreImpactEstimate: args.scoreImpactEstimate,
    confidence: args.confidence,
  });
  // Baseline de l'existant : son ruler, impact neutre (50), confidence
  // pleine (il est DÉJÀ le contenu en production — bénéfice du titulaire).
  const oldWeightedScore = computeRecoWeightedScore({
    rulerScore: oldVerdict.score,
    scoreImpactEstimate: 0,
    confidence: 1,
  });

  const improvement = Math.round((newWeightedScore - oldWeightedScore) * 100) / 100;

  let replaceAllowed: boolean;
  let reason: string;

  if (newVerdict.violations.length > 0) {
    replaceAllowed = false;
    reason = `Nouvelle valeur en violation Bible: ${newVerdict.violations.join("; ")}`;
  } else if (isEmptyValue(args.oldValue)) {
    replaceAllowed = true;
    reason = "Champ vide — remplissage autorisé";
  } else if (improvement >= RULER_REPLACEMENT_MARGIN) {
    replaceAllowed = true;
    reason = `Amélioration +${improvement} pts (ancien ${oldWeightedScore}, nouveau ${newWeightedScore})`;
  } else {
    replaceAllowed = false;
    reason = `RULER_INFERIOR: nouveau ${newWeightedScore} ne bat pas l'existant ${oldWeightedScore} (marge ${RULER_REPLACEMENT_MARGIN} pts requise)`;
  }

  return {
    oldVerdict,
    newVerdict,
    newWeightedScore,
    oldWeightedScore,
    improvement,
    replaceAllowed,
    reason,
  };
}
