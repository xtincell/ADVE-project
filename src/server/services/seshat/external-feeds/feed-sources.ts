/**
 * Sources RSS par sujet — Google News RSS (public, sans clé). Déterministe.
 * ADR-0143 : la langue N'EST PAS un filtre. On peut parler d'une marque dans
 * n'importe quelle langue (« on parle de moi partout ») ; restreindre à la
 * langue du pays ferait rater les mentions étrangères. On interroge donc un JEU
 * LARGE de langues pour CHAQUE sujet, et la PERTINENCE est tranchée en aval par
 * une mécanique déterministe (relevance.ts), jamais par un LLM. Le secteur est
 * réduit à son terme-tête searchable (la queue positionnement/marketing d'un
 * ADVE ne matche aucun article — cf. SPAWT « foodtech / découverte culinaire
 * communautaire » → 0 résultat).
 */

export interface FeedSource {
  url: string;
  name: string;
}

/**
 * Langues Google News interrogées pour CHAQUE sujet — large par design :
 * fr + en + ar + pt couvrent l'essentiel de la presse africaine ET
 * internationale. Ce n'est PAS un filtre pays : `gl` biaise vers une édition
 * sans exclure les autres langues. Ajouter une langue ici élargit la veille
 * pour tout le monde.
 */
export const SEARCH_LOCALES = ["fr", "en", "ar", "pt"] as const;

/**
 * Terme-tête searchable d'un secteur libre : on coupe la queue marketing /
 * positionnement pour garder un terme que Google News indexe réellement.
 *   "foodtech / découverte culinaire communautaire" → "foodtech"
 *   "FMCG / Agroalimentaire"                        → "FMCG"
 *   "fintech"                                       → "fintech"
 * Borné à ~5 mots / 60 caractères ; jamais vide (fallback = secteur brut).
 */
export function sectorHeadTerm(sector: string): string {
  const head = (sector.split(/[/—–|,·:]/)[0] ?? sector).trim();
  const bounded = head.split(/\s+/).slice(0, 5).join(" ").slice(0, 60).trim();
  return bounded || sector.trim();
}

/**
 * Sources RSS pour UN sujet (nom de marque, terme secteur, thème…), interrogé
 * dans TOUTES les langues de SEARCH_LOCALES. L'appelant concatène les items de
 * tous les sujets/langues puis trie par pertinence (relevance.ts).
 */
export function subjectSourcesFor(subject: string, countryCode: string): FeedSource[] {
  const cc = (countryCode || "CM").toUpperCase();
  const clean = subject.trim();
  if (clean.length < 2) return [];
  const q = encodeURIComponent(clean);
  const label = clean.toLowerCase().slice(0, 40);
  return SEARCH_LOCALES.map((hl) => ({
    url: `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${cc}&ceid=${cc}:${hl}`,
    name: `google-news:${label}:${cc}:${hl}`,
  }));
}

/**
 * Flux RSS pour un couple pays×secteur (digest sectoriel PARTAGÉ du cron).
 * Sujet = terme-tête du secteur + nom du pays, interrogé multi-langue.
 */
export function feedSourcesFor(countryCode: string, sector: string, countryName?: string): FeedSource[] {
  const cc = (countryCode || "CM").toUpperCase();
  const head = sectorHeadTerm(sector);
  return subjectSourcesFor(`${head} ${countryName ?? cc}`.trim(), cc);
}

/**
 * Flux presse pour une MARQUE nommée (mentions presse, intake pilier E).
 * Même mécanique Google News RSS, requête exacte sur le nom de marque.
 */
export function brandPressFeedFor(companyName: string, countryCode?: string | null): FeedSource {
  const cc = (countryCode ?? "CM").toUpperCase();
  const locale = `hl=fr&gl=${cc}&ceid=${cc}:fr`;
  const q = encodeURIComponent(`"${companyName}"`);
  return {
    url: `https://news.google.com/rss/search?q=${q}&${locale}`,
    name: `google-news:brand:${companyName.toLowerCase()}:${cc}`,
  };
}
