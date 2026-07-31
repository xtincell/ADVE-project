/**
 * Fusion d'empreintes — un fait mesuré ne s'évapore jamais (V1, 2026-07-31).
 *
 * ── Le défaut, mesuré en production ──
 *
 * Le rescan v4 d'Irawo a rendu `press: EMPTY` (variance de la recherche
 * presse) alors que trois retombées RÉELLES et gate-validées existaient
 * (CANAL+ Côte d'Ivoire, Mylène Flicka, ANKA). Le pipeline a alors servi une
 * empreinte SANS presse : le fait mesuré la veille s'était évaporé — non pas
 * réfuté, juste non re-trouvé ce jour-là.
 *
 * ── La règle ──
 *
 * Au rescan, bloc par bloc :
 *   - un bloc FRAIS non-vide fait foi (l'état actuel du monde) ;
 *   - un bloc frais VIDE conserve le précédent, avec son `capturedAt`
 *     d'origine — « je n'ai rien trouvé aujourd'hui » n'est pas « cela
 *     n'existe plus » (même distinction que undefined/null dans les facts).
 *
 * Ce n'est PAS une fabrication (ADR-0046) : chaque fait conservé a été
 * réellement mesuré et gate-validé lors d'une collecte antérieure, et il
 * garde sa date de capture. C'est l'esprit ADR-0151 (« jamais perdu »)
 * appliqué à l'empreinte.
 *
 * Garde d'identité : si le SITE élu change entre les deux collectes (autre
 * host), on ne fusionne RIEN — les faits de l'ancienne entité ne doivent pas
 * contaminer la nouvelle (leçon du rescan v3 : `irawo.net`, l'association
 * homonyme de Cotonou, à la place d'`irawotalents.com`).
 *
 * Pur — zéro IO, testé sur fixtures.
 */

import type { EnrichedFootprint } from "./footprint-types";

/** Host nu (sans www) d'une URL, `null` si illisible. */
function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Fusionne l'empreinte précédente dans la fraîche.
 *
 * La fraîche est TOUJOURS la base (site, tech, audiences, statuts d'enrich…) ;
 * seuls les blocs de FAITS qu'elle rend vides héritent du précédent.
 */
export function mergeFootprints(
  previous: EnrichedFootprint | null | undefined,
  fresh: EnrichedFootprint,
): EnrichedFootprint {
  if (!previous) return fresh;

  // ── Garde d'identité : autre site élu ⇒ autre entité possible ⇒ zéro report ──
  const prevHost = hostOf(previous.site?.url);
  const freshHost = hostOf(fresh.site?.url);
  if (prevHost && freshHost && prevHost !== freshHost) return fresh;

  const merged: EnrichedFootprint = { ...fresh };

  // Presse : le bloc le plus coûteux à re-trouver et le plus volatil à la
  // recherche. Frais vide → on garde les retombées déjà validées.
  if ((fresh.press?.length ?? 0) === 0 && (previous.press?.length ?? 0) > 0) {
    merged.press = previous.press;
  }

  // Articles du site : même règle.
  if ((fresh.articles?.length ?? 0) === 0 && (previous.articles?.length ?? 0) > 0) {
    merged.articles = previous.articles;
  }

  // Audiences : un relevé Apify raté (panne fournisseur) ne doit pas effacer
  // le dernier relevé réel — il date, mais il a été mesuré.
  if ((fresh.followerCounts?.length ?? 0) === 0 && (previous.followerCounts?.length ?? 0) > 0) {
    merged.followerCounts = previous.followerCounts;
  }

  // Déclaré structuré + flux : un site momentanément illisible (mur anti-bot,
  // timeout) ne retire pas ce qu'il déclarait hier.
  if (!fresh.structured && previous.structured) merged.structured = previous.structured;
  if (!fresh.feed && previous.feed) merged.feed = previous.feed;

  return merged;
}
