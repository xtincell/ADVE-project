/**
 * Ancrage documentaire d'une recommandation — mesure déterministe (ADR-0184).
 *
 * Le moteur voit désormais la documentation de la marque (PR #653) et on lui
 * demande de citer ses sources. Restait le plus important : **vérifier**. Une
 * consigne d'ancrage qu'on ne contrôle pas est une décoration — le modèle peut
 * citer `source:abc` sans que rien de ce qu'il écrit ne vienne du document.
 *
 * Ce module mesure, sans LLM, deux choses distinctes :
 *
 *  1. **le recouvrement réel** entre ce que la reco propose et les extraits
 *     effectivement soumis au générateur → `score` + `groundedSourceIds` ;
 *  2. **les citations revendiquées** dans la justification (`source:<id>`) →
 *     `citedSourceIds`, et surtout celles qui ne correspondent à AUCUN extrait
 *     recouvrant → `unverifiedCitations`, signal de fabrication.
 *
 * Fonction **pure** (aucun I/O, aucun LLM, variance nulle — LOI 9), sur le même
 * tokeniseur que la gate de cohérence brief↔ADVE (`tokenizeForCoherence`). On
 * réutilise le cœur existant plutôt que d'en écrire un second.
 *
 * Le recouvrement de vocabulaire est **conservateur** : il détecte la
 * divergence flagrante (une reco dont rien ne vient des documents), pas la
 * nuance. Il informe l'opérateur ; il ne décide pas à sa place (ADR-0085).
 */

import { tokenizeForCoherence } from "@/server/services/mestor/gates/brief-adve-coherence-score";

export type GroundingBand = "GROUNDED" | "WEAK" | "UNGROUNDED" | "NO_SOURCE";

/** Seuils canon — les modifier change la doctrine d'ancrage. */
export const GROUNDING_THRESHOLDS = {
  /** Recouvrement ≥ : la reco reprend le vocabulaire des documents. */
  grounded: 0.35,
  /** Recouvrement ≥ : contact partiel, à relire. En-deçà : non ancrée. */
  weak: 0.15,
  /** Recouvrement minimal avec UN document pour le compter comme appui. */
  perSource: 0.2,
  /** En-deçà, la reco est trop courte pour qu'un recouvrement veuille dire quoi que ce soit. */
  minRecoTokens: 5,
} as const;

export interface GroundingExcerpt {
  sourceId: string;
  text: string;
}

export interface RecoGrounding {
  /** Recouvrement avec l'union des extraits, 0..1. */
  score: number;
  band: GroundingBand;
  /** Documents dont le vocabulaire soutient réellement la reco. */
  groundedSourceIds: string[];
  /** Documents revendiqués par la justification (`source:<id>`). */
  citedSourceIds: string[];
  /**
   * Revendiqués mais non soutenus par la mesure — soit l'identifiant n'existe
   * pas dans le contexte fourni, soit le document ne recouvre pas la reco.
   */
  unverifiedCitations: string[];
}

/** `source:<id>` — le format demandé au générateur dans la consigne d'ancrage. */
const CITATION_RE = /source:([A-Za-z0-9_-]{6,64})/g;

/** Extrait les identifiants de source revendiqués dans un texte libre. */
export function extractCitedSourceIds(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(CITATION_RE)) {
    const id = m[1];
    if (id) out.add(id);
  }
  return [...out];
}

function overlap(recoTokens: Set<string>, text: string): number {
  if (recoTokens.size === 0) return 0;
  const tokens = tokenizeForCoherence(text);
  if (tokens.size === 0) return 0;
  let shared = 0;
  for (const t of recoTokens) if (tokens.has(t)) shared++;
  return shared / recoTokens.size;
}

/**
 * Mesure l'ancrage d'une reco sur les extraits qui ont réellement été soumis au
 * générateur.
 *
 * @param recoText   Ce que la reco AFFIRME (valeur proposée aplatie).
 * @param rationale  Sa justification — c'est là que vivent les citations.
 * @param excerpts   Les extraits présentés au générateur pour cette production.
 */
export function computeRecoGrounding(
  recoText: string,
  rationale: string,
  excerpts: readonly GroundingExcerpt[],
): RecoGrounding {
  const citedSourceIds = extractCitedSourceIds(rationale);

  if (excerpts.length === 0) {
    // Aucune documentation soumise : ce n'est pas « non ancré », c'est « rien à
    // quoi s'ancrer ». Une citation revendiquée dans ce cas est fabriquée.
    return {
      score: 0,
      band: "NO_SOURCE",
      groundedSourceIds: [],
      citedSourceIds,
      unverifiedCitations: citedSourceIds,
    };
  }

  // On mesure sur la VALEUR PROPOSÉE, pas sur la justification : c'est ce qui
  // sera écrit dans le pilier. Une justification bien tournée ne doit pas
  // pouvoir faire passer une proposition sortie de nulle part.
  const recoTokens = tokenizeForCoherence(recoText);
  if (recoTokens.size < GROUNDING_THRESHOLDS.minRecoTokens) {
    return {
      score: 0,
      band: "NO_SOURCE",
      groundedSourceIds: [],
      citedSourceIds,
      unverifiedCitations: [],
    };
  }

  const byDocument = new Map<string, string>();
  for (const e of excerpts) {
    byDocument.set(e.sourceId, `${byDocument.get(e.sourceId) ?? ""}\n${e.text}`);
  }

  const groundedSourceIds: string[] = [];
  for (const [sourceId, text] of byDocument) {
    if (overlap(recoTokens, text) >= GROUNDING_THRESHOLDS.perSource) {
      groundedSourceIds.push(sourceId);
    }
  }

  const score = overlap(recoTokens, [...byDocument.values()].join("\n"));
  const band: GroundingBand =
    score >= GROUNDING_THRESHOLDS.grounded
      ? "GROUNDED"
      : score >= GROUNDING_THRESHOLDS.weak
        ? "WEAK"
        : "UNGROUNDED";

  const grounded = new Set(groundedSourceIds);
  return {
    score: Math.round(score * 1000) / 1000,
    band,
    groundedSourceIds: groundedSourceIds.sort(),
    citedSourceIds,
    unverifiedCitations: citedSourceIds.filter((id) => !grounded.has(id)).sort(),
  };
}

/**
 * Aplati une valeur proposée (JSON arbitraire) en texte mesurable. Borné en
 * profondeur — une reco ne porte pas d'arbre infini.
 */
export function flattenProposedValue(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flattenProposedValue(v, depth + 1)).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_"))
      .map(([, v]) => flattenProposedValue(v, depth + 1))
      .join(" ");
  }
  return "";
}
