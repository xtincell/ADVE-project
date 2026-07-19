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
  };
}

/** Re-hydrate des facts persistés (Json unknown) — jamais throw, null si illisible. */
export function parseFootprintFacts(value: unknown): FootprintFacts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.socials) || !Array.isArray(v.press)) return null;
  return v as unknown as FootprintFacts;
}
