/**
 * Sources RSS par (pays, secteur) — Google News RSS (public, sans clé).
 * Déterministe : URLs construites depuis countryCode + secteur. ADR-0099 suite.
 */

export interface FeedSource {
  url: string;
  name: string;
}

/**
 * Flux RSS pour un couple pays×secteur. Google News RSS accepte une requête
 * libre + locale (hl/gl/ceid) et renvoie de vrais articles récents, sans clé.
 */
export function feedSourcesFor(countryCode: string, sector: string, countryName?: string): FeedSource[] {
  const cc = countryCode.toUpperCase();
  const locale = `hl=fr&gl=${cc}&ceid=${cc}:fr`;
  const q = encodeURIComponent(`${sector} ${countryName ?? cc}`);
  return [
    {
      url: `https://news.google.com/rss/search?q=${q}&${locale}`,
      name: `google-news:${sector}:${cc}`,
    },
  ];
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
