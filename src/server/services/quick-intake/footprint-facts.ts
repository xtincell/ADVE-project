/**
 * Faits d'empreinte — la PREUVE derrière le score /100 (mandat opérateur :
 * « un simple score sans les infos traquées ça sonne trop arbitraire — on ne
 * sait pas sur quoi ça se base »).
 *
 * `buildFootprintFacts` projette l'`EnrichedFootprint` en un objet factuel
 * sérialisable (JSON-safe) : réseaux détectés avec handles + audience quand
 * mesurée, mentions presse avec titres + liens, domaine (âge, registrar),
 * infrastructure email, avis Google, performance. Uniquement ce qui a été
 * RÉELLEMENT observé (blocs LIVE/mesurés) — jamais une absence de mesure
 * présentée comme un fait (ADR-0046).
 *
 * Ces faits sont (1) renvoyés au /scorer pour le rapport dense, ET (2)
 * persistés dans `BrandFootprintSnapshot.facts` (ADR-0151 « jamais perdu ») —
 * le chemin cache montre EXACTEMENT la même preuve qu'un scan frais.
 *
 * Module pur — zéro IO, zéro LLM. Testé sur fixtures.
 */

import type { EnrichedFootprint } from "./footprint-types";

export interface FactSocial {
  platform: string;
  handle: string | null;
  url: string | null;
  /** Audience mesurée (Apify/CONNECTOR/YouTube API). null = compte détecté, audience non relevée. */
  followerCount: number | null;
  /** Provenance du relevé quand mesuré. */
  source: string | null;
}

export interface FactPress {
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string | null;
}

export interface FootprintFacts {
  socials: FactSocial[];
  press: FactPress[];
  domain: { domain: string | null; ageYears: number | null; registrar: string | null; createdAt: string | null } | null;
  email: { hasMx: boolean; mxProvider: string | null; hasSpf: boolean; hasDmarc: boolean } | null;
  reviews: { placeName: string | null; rating: number | null; reviewCount: number | null } | null;
  performance: { performanceScore: number | null; lcpMs: number | null } | null;
  youtube: { channelTitle: string | null; handle: string | null; subscriberCount: number | null; videoCount: number | null } | null;
  site: { url: string | null; reachable: boolean } | null;
  /**
   * ── Ce qu'une personne qui cherche la marque trouve vraiment (2026-07-31) ──
   *
   * Ces quatre signaux étaient COLLECTÉS et gate-validés depuis longtemps, et
   * n'atteignaient jamais l'écran : la projection ne les portait pas. « La
   * restitution est plus pauvre que la collecte » — le rapport taisait des
   * faits qu'il possédait.
   *
   * Aucun n'ajoute de note au score : ce sont des faits sourcés et
   * vérifiables. Tous facultatifs, pour rester lisibles depuis un snapshot
   * persisté avant cette date (`parseFootprintFacts` ne les exige jamais).
   */
  /** Pages publiques qui citent la marque — gate-validées (ADR-0164). */
  citations?: Array<{ title: string; url: string; host: string }>;
  /** Recherches associées au nom de marque (autocomplete). */
  searchSuggestions?: { suggestions: string[]; brandAppearsInOwnSuggest: boolean } | null;
  /** Fiche Wikipédia si elle existe — `null` est un négatif HONNÊTE, pas une absence de mesure. */
  wikipedia?: { title: string; extract: string | null; url: string | null; lang: string } | null;
  /** Publicités Meta actives — preuve d'investissement média visible du public. */
  ads?: { activeAdsCount: number; pageName: string | null } | null;
  /**
   * ── Ce que la marque déclare et publie elle-même (2026-07-31) ──
   *
   * Signalement opérateur : « les masterclass, formations et newsletter ne sont
   * relevées par aucun collecteur ». Elles l'étaient en partie — dans un HTML
   * déjà téléchargé, jamais lu au-delà des balises `og:`.
   *
   * `null` = le site a été lu et n'expose AUCUNE donnée structurée (négatif
   * mesuré, à dire tel quel — ce n'est pas un constat d'inactivité).
   * `undefined` = le site n'a pas été lu du tout.
   */
  declared?: {
    /** Réseaux revendiqués par la marque sur son propre site (`sameAs`). */
    profiles: Array<{ url: string; platform: string | null }>;
    hasNewsletter: boolean;
    newsletterProvider: string | null;
    events: Array<{ name: string; startDate: string | null; location: string | null }>;
    courses: Array<{ name: string; provider: string | null }>;
  } | null;
  /**
   * Rythme de publication réel, depuis le flux déclaré par le site.
   * `null` = aucun flux déclaré ; `undefined` = site non lu.
   */
  publishing?: {
    lastPublishedAt: string | null;
    medianDaysBetweenPosts: number | null;
    recentTitles: Array<{ title: string; url: string | null; publishedAt: string | null }>;
  } | null;
  /**
   * Aucun contexte ne permettait de DISCRIMINER les homonymes : ni secteur ni
   * pays, déclaré ou inférable. Les signaux ci-dessus reposent alors sur le
   * seul nom de la marque.
   *
   * Limite mesurée le 2026-07-30 : « Irawo » scoré sans contexte retombe sur
   * une association homonyme au nom EXACT — aucune règle d'extension ne peut
   * trancher entre deux entités qui portent le même nom. Le rapport doit le
   * DIRE et proposer au prospect de préciser son secteur, au lieu d'en
   * choisir une au hasard en silence.
   */
  undiscriminated: boolean;
}

/** Projection factuelle de l'empreinte — que du mesuré, JSON-safe, déterministe. */
export function buildFootprintFacts(f: EnrichedFootprint): FootprintFacts {
  // ── Réseaux : chaque compte détecté, avec l'audience mesurée quand elle existe ──
  const measured = new Map<string, { count: number; source: string }>();
  for (const fc of f.followerCounts ?? []) {
    const byHandle = `${fc.platform}:${fc.handle.replace(/^@/, "").toLowerCase()}`;
    measured.set(byHandle, { count: fc.followerCount, source: fc.source });
    // fallback par plateforme seule (handle Apify peut différer du handle parsé)
    if (!measured.has(fc.platform)) measured.set(fc.platform, { count: fc.followerCount, source: fc.source });
  }
  if (f.youtube?.status === "LIVE" && f.youtube.subscriberCount !== null) {
    measured.set("YOUTUBE", { count: f.youtube.subscriberCount, source: "YOUTUBE_API" });
  }

  const socials: FactSocial[] = [];
  const seenPlatformHandle = new Set<string>();
  for (const s of f.socials ?? []) {
    const handle = s.handle ? s.handle.replace(/^@/, "") : null;
    const key = `${s.platform}:${(handle ?? s.url).toLowerCase()}`;
    if (seenPlatformHandle.has(key)) continue;
    seenPlatformHandle.add(key);
    const m = (handle ? measured.get(`${s.platform}:${handle.toLowerCase()}`) : undefined) ?? measured.get(s.platform);
    socials.push({
      platform: s.platform,
      handle,
      url: s.url ?? null,
      followerCount: m?.count ?? null,
      source: m?.source ?? null,
    });
  }
  // Relevés mesurés sans profil parsé correspondant (ex. connecteur OAuth seul).
  for (const fc of f.followerCounts ?? []) {
    const handle = fc.handle.replace(/^@/, "");
    const key = `${fc.platform}:${handle.toLowerCase()}`;
    if (seenPlatformHandle.has(key)) continue;
    seenPlatformHandle.add(key);
    socials.push({ platform: fc.platform, handle, url: null, followerCount: fc.followerCount, source: fc.source });
  }
  // Invariant de preuve (fix prod 2026-07-19) : TOUTE source comptée dans le
  // total d'audience du score a sa ligne ici. L'audience YouTube (API) entre
  // dans le total même quand Apify n'a rien relevé — si aucun profil YOUTUBE
  // parsé ne l'a portée ci-dessus, on pousse la ligne depuis la mesure API.
  if (
    f.youtube?.status === "LIVE" &&
    f.youtube.subscriberCount !== null &&
    !socials.some((s) => s.platform === "YOUTUBE" && s.followerCount !== null)
  ) {
    const existingIdx = socials.findIndex((s) => s.platform === "YOUTUBE");
    const row: FactSocial = {
      platform: "YOUTUBE",
      handle: f.youtube.handle ? f.youtube.handle.replace(/^@/, "") : null,
      url: existingIdx >= 0 ? socials[existingIdx]!.url : null,
      followerCount: f.youtube.subscriberCount,
      source: "YOUTUBE_API",
    };
    if (existingIdx >= 0) socials[existingIdx] = { ...socials[existingIdx]!, ...row, handle: row.handle ?? socials[existingIdx]!.handle };
    else socials.push(row);
  }

  return {
    socials,
    press: (f.press ?? []).slice(0, 8).map((p) => ({
      title: p.title,
      url: p.url,
      sourceName: p.sourceName,
      publishedAt: p.publishedAt,
    })),
    domain:
      f.domain?.status === "LIVE"
        ? { domain: f.domain.domain, ageYears: f.domain.ageYears, registrar: f.domain.registrar, createdAt: f.domain.createdAt }
        : null,
    email:
      f.emailInfra?.status === "LIVE"
        ? { hasMx: f.emailInfra.hasMx, mxProvider: f.emailInfra.mxProvider, hasSpf: f.emailInfra.hasSpf, hasDmarc: f.emailInfra.hasDmarc }
        : null,
    reviews:
      f.maps?.status === "LIVE" && f.maps.rating !== null
        ? { placeName: f.maps.placeName, rating: f.maps.rating, reviewCount: f.maps.reviewCount }
        : null,
    performance:
      f.performance?.status === "LIVE" && f.performance.performanceScore !== null
        ? { performanceScore: f.performance.performanceScore, lcpMs: f.performance.lcpMs }
        : null,
    youtube:
      f.youtube?.status === "LIVE"
        ? { channelTitle: f.youtube.channelTitle, handle: f.youtube.handle, subscriberCount: f.youtube.subscriberCount, videoCount: f.youtube.videoCount }
        : null,
    site: f.site ? { url: f.site.url ?? null, reachable: f.site.reachable } : null,

    // ── Les quatre signaux longtemps collectés puis tus ──
    // Chacun n'est projeté QUE s'il porte un fait : un collecteur qui n'a pas
    // tourné (clé absente, erreur) reste absent des faits — l'écran ne doit
    // pas pouvoir confondre « rien trouvé » avec « pas cherché ».
    citations:
      f.webMentions?.status === "LIVE" ? f.webMentions.items.slice(0, 6) : undefined,
    searchSuggestions:
      f.searchAutocomplete?.state === "LIVE" && f.searchAutocomplete.data.suggestions.length > 0
        ? {
            suggestions: f.searchAutocomplete.data.suggestions.slice(0, 8),
            brandAppearsInOwnSuggest: f.searchAutocomplete.data.brandAppearsInOwnSuggest,
          }
        : undefined,
    // `hasPage: false` est un négatif MESURÉ (l'API a répondu 404) : on le
    // rend comme `null` pour que l'écran puisse dire « aucune fiche », alors
    // qu'un collecteur non exécuté reste `undefined` (rien à dire).
    wikipedia:
      f.wikipedia?.state === "LIVE"
        ? f.wikipedia.data.hasPage && f.wikipedia.data.title
          ? {
              title: f.wikipedia.data.title,
              extract: f.wikipedia.data.extract,
              url: f.wikipedia.data.url,
              lang: f.wikipedia.data.lang,
            }
          : null
        : undefined,
    ads:
      f.ads?.status === "LIVE" && (f.ads.activeAdsCount ?? 0) > 0
        ? { activeAdsCount: f.ads.activeAdsCount ?? 0, pageName: f.ads.pageName }
        : f.ads?.status === "NOT_FOUND"
          ? null
          : undefined,
    // Le site a-t-il été LU ? Sans lecture, rien à dire (undefined). Lu sans
    // données structurées → `null` : un négatif mesuré, qui doit s'énoncer
    // « ce site n'expose pas de données structurées » et jamais « cette marque
    // ne publie rien » (3 des 4 sites mesurés le 2026-07-31 sont dans ce cas).
    declared: f.structured
      ? f.structured.hasStructuredData || f.structured.hasNewsletter
        ? {
            profiles: f.structured.declaredProfiles.map((p) => ({ url: p.url, platform: p.platform })),
            hasNewsletter: f.structured.hasNewsletter,
            newsletterProvider: f.structured.newsletterProvider,
            events: f.structured.events.slice(0, 6),
            courses: f.structured.courses.slice(0, 6),
          }
        : null
      : undefined,
    publishing: f.structured
      ? f.feed
        ? {
            lastPublishedAt: f.feed.lastPublishedAt,
            medianDaysBetweenPosts: f.feed.medianDaysBetweenPosts,
            recentTitles: f.feed.entries.slice(0, 5).map((e) => ({ title: e.title, url: e.link, publishedAt: e.publishedAt })),
          }
        : null
      : undefined,

    // Le gate n'avait AUCUN discriminant : tout ce qui précède tient sur le
    // seul nom. Deux entités homonymes au nom exact sont alors indécidables —
    // on l'annonce plutôt que de laisser croire à une certitude.
    undiscriminated: (f.entityGate?.discriminants.length ?? 0) === 0,
  };
}

/** Re-hydrate des facts persistés (Json unknown) — jamais throw, null si illisible. */
export function parseFootprintFacts(value: unknown): FootprintFacts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.socials) || !Array.isArray(v.press)) return null;
  return v as unknown as FootprintFacts;
}
