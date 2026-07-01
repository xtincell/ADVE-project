/**
 * brief-adve-coherence-score.ts — cœur déterministe de la gate C6.
 *
 * Calcule la cohérence entre le **contenu d'un brief** et le **noyau ADVE** d'une
 * marque, par recouvrement de vocabulaire. Fonction **pure** : pas d'I/O, pas de
 * LLM, variance = 0 (cohérent avec la doctrine « Fusée non-dépendante du LLM » +
 * LOI 9). L'I/O (chargement des piliers) vit dans `brief-vs-adve-coherence.ts`.
 *
 * Mesure = **rappel du brief dans l'ADVE** : quelle fraction des tokens
 * significatifs du brief apparaît dans le vocabulaire ADVE. Un brief qui parle
 * d'un univers absent de l'ADVE (vocabulaire disjoint) → score bas → DIVERGENT.
 * Un brief qui décline le noyau (même si plus détaillé) → recouvrement → COHERENT.
 *
 * Le recouvrement de tokens est volontairement **conservateur** (seuil bas) : il
 * ne sert qu'à lever un avertissement honnête sur une divergence flagrante, pas à
 * juger finement la qualité (ça, c'est l'enforcement LLM-assisté + override
 * manuel de Phase 24, cf. ADR-0049 / scaffold).
 */

/** Seuils de bande (canon — modifier = changer la doctrine de cohérence). */
export const BRIEF_COHERENCE_THRESHOLDS = {
  /** En-deçà : le noyau ADVE est trop maigre pour juger → NOT_APPLICABLE. */
  minAdveTokens: 8,
  /** En-deçà : le brief est trop court pour juger → NOT_APPLICABLE. */
  minBriefTokens: 6,
  /** Recouvrement strictement inférieur → DIVERGENT (WARN). */
  divergent: 0.1,
} as const;

export type CoherenceBand = "COHERENT" | "DIVERGENT" | "NOT_APPLICABLE";

export interface BriefAdveCoherence {
  /** Rappel du brief dans l'ADVE, 0..1. */
  readonly score: number;
  readonly band: CoherenceBand;
  readonly briefTokenCount: number;
  readonly adveTokenCount: number;
  /** Tokens significatifs du brief retrouvés dans l'ADVE (échantillon trié). */
  readonly sharedTokens: readonly string[];
}

// Stopwords FR + EN — assez pour ne pas polluer le recouvrement de mots vides.
const STOPWORDS = new Set([
  // FR
  "les", "des", "une", "uns", "nos", "vos", "ses", "leur", "leurs", "avec", "sans",
  "pour", "dans", "par", "sur", "sous", "entre", "vers", "chez", "que", "qui", "quoi",
  "dont", "est", "sont", "été", "être", "avoir", "fait", "faire", "plus", "moins",
  "tres", "très", "tout", "tous", "toute", "toutes", "cette", "ces", "son", "sa",
  "mon", "ma", "mes", "ton", "ta", "tes", "notre", "votre", "aux", "elle", "ils",
  "nous", "vous", "leur", "donc", "mais", "car", "ainsi", "comme", "aussi", "encore",
  // EN
  "the", "and", "for", "with", "without", "from", "into", "onto", "this", "that",
  "these", "those", "are", "was", "were", "been", "being", "have", "has", "had",
  "will", "would", "shall", "should", "could", "their", "your", "our", "its",
  "you", "they", "them", "but", "not", "all", "any", "can", "may", "more", "most",
  "such", "than", "then", "also", "very", "just",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Tokenise un texte en mots significatifs : minuscules, sans accents, ≥ 3 chars,
 * hors stopwords, dédupliqués. Déterministe.
 */
export function tokenizeForCoherence(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const words = stripAccents(text.toLowerCase()).split(/[^a-z0-9]+/);
  for (const w of words) {
    if (w.length < 3) continue;
    if (STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue; // nombres purs
    out.add(w);
  }
  return out;
}

/**
 * Cohérence brief ↔ ADVE par recouvrement de vocabulaire. Pure, déterministe.
 */
export function computeBriefAdveCoherence(
  briefText: string,
  adveText: string,
): BriefAdveCoherence {
  const briefTokens = tokenizeForCoherence(briefText);
  const adveTokens = tokenizeForCoherence(adveText);

  if (
    adveTokens.size < BRIEF_COHERENCE_THRESHOLDS.minAdveTokens ||
    briefTokens.size < BRIEF_COHERENCE_THRESHOLDS.minBriefTokens
  ) {
    return {
      score: 0,
      band: "NOT_APPLICABLE",
      briefTokenCount: briefTokens.size,
      adveTokenCount: adveTokens.size,
      sharedTokens: [],
    };
  }

  const shared: string[] = [];
  for (const t of briefTokens) {
    if (adveTokens.has(t)) shared.push(t);
  }
  const score = shared.length / briefTokens.size;
  const band: CoherenceBand =
    score < BRIEF_COHERENCE_THRESHOLDS.divergent ? "DIVERGENT" : "COHERENT";

  return {
    score: Math.round(score * 1000) / 1000,
    band,
    briefTokenCount: briefTokens.size,
    adveTokenCount: adveTokens.size,
    sharedTokens: shared.sort().slice(0, 20),
  };
}

/**
 * Aplati récursivement les valeurs string d'un contenu pilier JSON en un seul
 * texte (pour tokenisation). Déterministe, borné en profondeur.
 */
export function flattenPillarText(content: unknown, depth = 0): string {
  if (depth > 6 || content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") return "";
  if (Array.isArray(content)) {
    return content.map((c) => flattenPillarText(c, depth + 1)).join(" ");
  }
  if (typeof content === "object") {
    return Object.entries(content as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_")) // skip _commentary / _meta
      .map(([, v]) => flattenPillarText(v, depth + 1))
      .join(" ");
  }
  return "";
}
