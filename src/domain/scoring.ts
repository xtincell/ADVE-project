/**
 * Scoring structurel déterministe — port du canon legacy (ADR-0102).
 *
 * Sources : `legacy/src/lib/utils/scoring.ts` (poids canon figés) et
 * `legacy/src/domain/brand-tier.ts` (seuils de palier /200).
 *
 * LOI 9 (héritée, non négociable) : le scoring est une fonction PURE et
 * DÉTERMINISTE — aucun LLM, aucun modulateur qualité, variance 0. Une même
 * entrée produit toujours la même sortie.
 *
 * Deux étages :
 *   1. `scorePillarStructural` — la formule canon /25 (poids 15/7/3).
 *   2. `scorePillarContent` / `scoreBrand` — l'adaptateur v7 qui dérive les
 *      trois ratios depuis le contenu réel d'un pilier et sa liste de champs
 *      (`PILLAR_FIELDS`), puis agrège en composite /200 + palier.
 */
import { BRAND_LEVELS, PILLARS, type BrandLevel, type PillarKey } from "./pillars";
import { PILLAR_FIELDS, type FieldDef } from "./pillar-fields";

// ── Constantes canon (figées — toute modification = changement de doctrine) ──

/**
 * Poids structurels canoniques (ADR-0102 legacy, formule Annexe G) :
 *   atoms       — présence des champs requis
 *   collections — champs-listes au nombre minimal d'items
 *   crossRefs   — enrichissement au-delà du seuil minimal
 */
export const STRUCTURAL_WEIGHTS = {
  atoms: 15,
  collections: 7,
  crossRefs: 3,
} as const;

/** Plafond canonique d'un pilier = somme des poids (= 25). */
export const PILLAR_MAX_SCORE =
  STRUCTURAL_WEIGHTS.atoms + STRUCTURAL_WEIGHTS.collections + STRUCTURAL_WEIGHTS.crossRefs;

/** Plafond composite = 8 piliers × 25 (= 200, échelle des paliers de marque). */
export const COMPOSITE_MAX_SCORE = PILLAR_MAX_SCORE * PILLARS.length;

/**
 * Bornes supérieures (inclusives) des paliers sur l'échelle /200
 * (port de `TIER_UPPER_BOUNDS_200`, legacy brand-tier.ts). ICONE est l'apex
 * ouvert (> 180) — chaque bande se resserre en approchant du sommet :
 * plus on monte, plus chaque point coûte.
 */
export const LEVEL_UPPER_BOUNDS_200: Record<Exclude<BrandLevel, "ICONE">, number> = {
  LATENT: 40,
  FRAGILE: 80,
  ORDINAIRE: 120,
  FORTE: 160,
  CULTE: 180,
};

export interface LevelDefinition {
  /** Label FR court pour les badges UI. */
  label: string;
  /** Positionnement en une ligne. */
  tagline: string;
  /** Signaux observables qui placent une marque à ce palier. */
  signals: string;
}

/** Définitions FR des paliers (port réduit de TIER_DEFINITIONS legacy). */
export const LEVEL_DEFINITIONS: Record<BrandLevel, LevelDefinition> = {
  LATENT: {
    label: "Latent",
    tagline: "Invisible — fondations à poser",
    signals:
      "Pas de proposition de valeur différenciée, pas d'ADN exprimé, pas de communauté. La marque existe juridiquement mais pas dans la tête des gens.",
  },
  FRAGILE: {
    label: "Fragile",
    tagline: "Intuitions justes — cohérence à stabiliser",
    signals:
      "Mission ou promesse esquissée mais pas codifiée. Cohérence verbale et visuelle inconstante. Communauté embryonnaire, pas de rituels.",
  },
  ORDINAIRE: {
    label: "Ordinaire",
    tagline: "Fonctionnelle — substituable",
    signals:
      "La marque livre, mais son identité reste générique sur son marché. Concurrence interchangeable, pas de signature mémorable.",
  },
  FORTE: {
    label: "Forte",
    tagline: "Distincte — préférée par certains",
    signals:
      "Positionnement clair, différenciation réelle, voix reconnaissable. Premiers ambassadeurs spontanés, rituels émergents.",
  },
  CULTE: {
    label: "Culte",
    tagline: "Mouvement — communauté engagée",
    signals:
      "Communauté structurée, rituels réguliers, signature identifiable, vocabulaire interne, ennemi commun. La mythologie est portée par les fans.",
  },
  ICONE: {
    label: "Icône",
    tagline: "Référence sectorielle — patrimoine",
    signals:
      "Position dominante établie, transmission générationnelle. La marque définit la catégorie ; la fenêtre d'Overton a basculé.",
  },
};

/**
 * Classification déterministe d'un composite en palier. `maxScore` normalise
 * depuis d'autres échelles (ex. un diagnostic ADVE /100). Même entrée → même
 * sortie.
 */
export function classifyLevel(composite: number, maxScore = COMPOSITE_MAX_SCORE): BrandLevel {
  const n = maxScore === COMPOSITE_MAX_SCORE ? composite : (composite / maxScore) * COMPOSITE_MAX_SCORE;
  if (n <= LEVEL_UPPER_BOUNDS_200.LATENT) return "LATENT";
  if (n <= LEVEL_UPPER_BOUNDS_200.FRAGILE) return "FRAGILE";
  if (n <= LEVEL_UPPER_BOUNDS_200.ORDINAIRE) return "ORDINAIRE";
  if (n <= LEVEL_UPPER_BOUNDS_200.FORTE) return "FORTE";
  if (n <= LEVEL_UPPER_BOUNDS_200.CULTE) return "CULTE";
  return "ICONE";
}

/** Palier suivant sur l'échelle, ou null à l'apex. */
export function nextLevel(level: BrandLevel): BrandLevel | null {
  const i = BRAND_LEVELS.indexOf(level);
  return BRAND_LEVELS[i + 1] ?? null;
}

// ── Étage 1 : formule canon /25 ───────────────────────────────────────

export interface PillarScoreInput {
  atomsValid: number;
  atomsRequired: number;
  collectionsComplete: number;
  collectionsTotal: number;
  crossRefsValid: number;
  crossRefsRequired: number;
}

/**
 * Formule structurelle canon (Annexe G legacy) :
 *   score = (atoms/requis × 15) + (collections/totales × 7) + (crossRefs/requises × 3)
 * Plafonnée à 25. Dénominateur nul → l'axe rapporte 0 (comportement legacy).
 */
export function scorePillarStructural(input: PillarScoreInput): number {
  const atomScore =
    input.atomsRequired > 0
      ? (input.atomsValid / input.atomsRequired) * STRUCTURAL_WEIGHTS.atoms
      : 0;
  const collectionScore =
    input.collectionsTotal > 0
      ? (input.collectionsComplete / input.collectionsTotal) * STRUCTURAL_WEIGHTS.collections
      : 0;
  const crossRefScore =
    input.crossRefsRequired > 0
      ? (input.crossRefsValid / input.crossRefsRequired) * STRUCTURAL_WEIGHTS.crossRefs
      : 0;
  return Math.min(PILLAR_MAX_SCORE, atomScore + collectionScore + crossRefScore);
}

// ── Sondes de contenu (pures, tolérantes aux shapes hérités) ──────────

/** Un contenu est « rempli » : string non vide, nombre fini, liste ≥ 1, objet ≥ 1 valeur remplie. */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => isFilled(item));
  if (typeof value === "object") return Object.values(value).some((v) => isFilled(v));
  return false;
}

/**
 * Cardinal d'une « liste » : longueur remplie d'un tableau, ou nombre de
 * valeurs remplies d'un objet (ex. SWOT = 4 quadrants, catalogue par canal
 * = N canaux). 0 pour tout le reste.
 */
export function listCount(value: unknown): number {
  if (Array.isArray(value)) return value.filter((item) => isFilled(item)).length;
  if (value !== null && typeof value === "object") {
    return Object.values(value).filter((v) => isFilled(v)).length;
  }
  return 0;
}

/** Seuil de profondeur d'un champ texte pour l'axe enrichissement. */
export const ENRICHED_TEXT_MIN_CHARS = 120;

/**
 * Axe crossRefs, réduction v7 : « enrichi » = le contenu dépasse le seuil
 * minimal. Texte : ≥ 120 caractères, ou objet structuré (≥ 2 sous-champs
 * remplis), ou valeur exacte (nombre/booléen). Liste : cardinal ≥ minItems.
 * (L'axe legacy mesurait les exigences ENRICHED cross-pilier ; la bible
 * réduite n'ayant plus ce contrat, l'axe devient un axe de profondeur.)
 */
export function isEnriched(field: FieldDef, value: unknown): boolean {
  if (!isFilled(value)) return false;
  if (field.type === "liste") return listCount(value) >= (field.minItems ?? 1);
  if (typeof value === "string") return value.trim().length >= ENRICHED_TEXT_MIN_CHARS;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return listCount(value) >= 2;
  if (typeof value === "object" && value !== null) return listCount(value) >= 2;
  return false;
}

// ── Étage 2 : score d'un pilier depuis son contenu réel ───────────────

export interface PillarContentScore {
  /** Score lisible /100. */
  score: number;
  /** Score canon /25 (1 décimale) — c'est lui qui s'agrège en composite /200. */
  score25: number;
  /** Ids des champs remplis. */
  filled: string[];
  /** Ids des champs vides. */
  missing: string[];
}

/**
 * Score structurel d'un pilier depuis son contenu brut et sa liste de champs.
 *   atoms       — champs remplis / champs requis
 *   collections — listes à ≥ minItems / listes
 *   crossRefs   — champs enrichis / champs
 * Déterministe, sans jugement de fond : la qualité du texte n'est PAS notée
 * (pas de LLM dans le chemin de scoring — LOI 9).
 */
export function scorePillarContent(
  content: Record<string, unknown> | null | undefined,
  fields: FieldDef[],
): PillarContentScore {
  const safe = content ?? {};
  const filled: string[] = [];
  const missing: string[] = [];
  let collectionsTotal = 0;
  let collectionsComplete = 0;
  let crossRefsValid = 0;

  for (const field of fields) {
    const value = safe[field.id];
    if (isFilled(value)) filled.push(field.id);
    else missing.push(field.id);

    if (field.type === "liste") {
      collectionsTotal += 1;
      if (listCount(value) >= (field.minItems ?? 1)) collectionsComplete += 1;
    }
    if (isEnriched(field, value)) crossRefsValid += 1;
  }

  const raw = scorePillarStructural({
    atomsValid: filled.length,
    atomsRequired: fields.length,
    collectionsComplete,
    collectionsTotal,
    crossRefsValid,
    crossRefsRequired: fields.length,
  });

  const score25 = Math.round(raw * 10) / 10;
  return {
    score: Math.round((raw / PILLAR_MAX_SCORE) * 100),
    score25,
    filled,
    missing,
  };
}

// ── Composite marque /200 + palier ────────────────────────────────────

export type BrandPillarsContent = Partial<Record<PillarKey, Record<string, unknown> | null>>;

export interface BrandScore {
  /** Composite /200 (somme des 8 scores /25, 1 décimale). */
  total: number;
  byPillar: Record<PillarKey, PillarContentScore>;
  level: BrandLevel;
}

/**
 * Score composite d'une marque : les 8 piliers contre `PILLAR_FIELDS`.
 * Pilier absent = contenu vide = 0. Palier classé sur l'échelle /200
 * (LATENT ≤ 40 … ICONE > 180).
 */
export function scoreBrand(pillars: BrandPillarsContent): BrandScore {
  const byPillar = {} as Record<PillarKey, PillarContentScore>;
  let total = 0;
  for (const key of PILLARS) {
    const pillarScore = scorePillarContent(pillars[key], PILLAR_FIELDS[key]);
    byPillar[key] = pillarScore;
    total += pillarScore.score25;
  }
  total = Math.round(total * 10) / 10;
  return { total, byPillar, level: classifyLevel(total) };
}
