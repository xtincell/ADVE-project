/**
 * Quick Intake — Enrichissement public du pilier E (ADR-0121).
 *
 * Mandat : l'intake doit réussir « par tous les moyens » (légaux, données
 * publiques uniquement) à collecter l'empreinte du client pour combler le
 * pilier E du rapport — même quand le founder ne déclare NI site NI liens.
 *
 * Orchestration (chaque étage time-boxé, best-effort, jamais de throw) :
 *   1. Footprint déterministe du site déclaré (web-footprint, existant) ;
 *   2. Découverte Brave des profils sociaux si rien de déclaré/trouvé
 *      (seshat/web-search — point d'accès internet unique, ADR-0108) ;
 *   3. Compteurs followers RÉELS via Apify (anubis/social-audit, token
 *      système `APIFY_TOKEN` env ADR-0075) → FollowerSnapshot persistés ;
 *   4. Mentions presse via Google News RSS (seshat/external-feeds, sans clé).
 *
 * Zéro LLM dans ce module. Aucune fabrication : ce qui n'est pas trouvé
 * reste absent (ADR-0046 no-magic-fallback), le rapport affiche un état
 * honnête. Dégradations : cf. matrice ADR-0121 §Dégradation.
 */

import {
  collectWebFootprint,
  detectSocialLinks,
  mergeFootprintIntoPillarE,
  type SocialProfile,
  type WebFootprint,
} from "./web-footprint";

// ── Types ──────────────────────────────────────────────────────────────

export interface FollowerCountEntry {
  platform: string;
  handle: string;
  followerCount: number;
  source: "APIFY";
  capturedAt: string;
}

export interface PressMention {
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string | null;
}

export interface EnrichedFootprint extends WebFootprint {
  followerCounts: FollowerCountEntry[];
  press: PressMention[];
  discovery: {
    attempted: boolean;
    queries: string[];
    status: "OK" | "DEFERRED_NO_KEY" | "ERROR" | "SKIPPED_DECLARED";
  };
  enrichment: {
    apify: "LIVE" | "DEFERRED" | "DEGRADED" | "SKIPPED";
    press: "LIVE" | "EMPTY" | "ERROR";
    totalMs: number;
    errors: string[];
  };
  // ── ADR-0121 vague A — empreinte ENTIÈRE (tous optionnels : rétro-compat
  // avec les webFootprint JSON déjà persistés). Chaque bloc porte son statut.
  maps?: import("./footprint-collectors").MapsPresence;
  youtube?: import("./footprint-collectors").YouTubeStats;
  domain?: import("./footprint-collectors").DomainInfo;
  emailInfra?: import("./footprint-collectors").EmailInfra;
  performance?: import("./footprint-collectors").SitePerformance;
  ads?: import("./footprint-collectors").AdsPresence;
  score?: import("./footprint-score").FootprintScore;
  narrative?: { text: string; source: "LLM" | "TEMPLATE" };
}

export interface EnrichPublicFootprintInput {
  companyName: string;
  country?: string | null;
  sector?: string | null;
  websiteUrl?: string | null;
  socialLinksRaw?: string | null;
  /** Strategy créée par complete() avant les écritures pilier. */
  strategyId: string | null;
  /** Budget global (défaut 20 s) — chaque étage a aussi son propre plafond. */
  budgetMs?: number;
}

// ── Helpers purs ───────────────────────────────────────────────────────

/** Normalisation insensible casse/diacritiques pour la garde anti-faux-positif. */
export function normalizeBrandToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True ssi le texte mentionne le nom de marque (déterministe, zéro LLM). */
export function mentionsBrand(text: string, companyName: string): boolean {
  const brand = normalizeBrandToken(companyName);
  if (!brand) return false;
  return normalizeBrandToken(text).includes(brand);
}

const SNAPSHOT_PLATFORMS = new Set(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER", "YOUTUBE"]);

/** Profils → handles Apify (drop WhatsApp / plateformes hors enum Prisma / sans handle). */
export function toSocialHandles(
  socials: SocialProfile[],
): Array<{ platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE"; handle: string }> {
  const out: Array<{ platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE"; handle: string }> = [];
  for (const s of socials) {
    if (!s.handle || !SNAPSHOT_PLATFORMS.has(s.platform)) continue;
    out.push({
      platform: s.platform as "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE",
      handle: s.handle.replace(/^@/, ""),
    });
  }
  return out;
}

/** Google News RSS : « Titre - Source » → sépare titre et nom de source. */
export function splitGoogleNewsTitle(title: string): { title: string; sourceName: string | null } {
  const idx = title.lastIndexOf(" - ");
  if (idx <= 0) return { title, sourceName: null };
  return { title: title.slice(0, idx).trim(), sourceName: title.slice(idx + 3).trim() || null };
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

// ── Orchestrateur ──────────────────────────────────────────────────────

export async function enrichPublicFootprint(input: EnrichPublicFootprintInput): Promise<EnrichedFootprint> {
  const t0 = Date.now();
  const budgetMs = input.budgetMs ?? 20_000;
  const remaining = () => Math.max(0, budgetMs - (Date.now() - t0));
  const errors: string[] = [];

  // ── 1. Footprint déterministe (site + liens déclarés) ──
  const declared = (input.socialLinksRaw ?? "")
    .split(/\r?\n|,|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  let footprint: WebFootprint = {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: new Date().toISOString(),
    errors: [],
  };
  if (input.websiteUrl || declared.length > 0) {
    try {
      footprint = await withTimeout(
        collectWebFootprint({
          websiteUrl: input.websiteUrl,
          declaredSocialUrls: declared,
          companyName: input.companyName,
        }),
        Math.min(12_000, remaining()),
        footprint,
      );
    } catch (err) {
      errors.push(`footprint: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 2. Découverte Brave — seulement si aucun profil social trouvé ──
  const discovery: EnrichedFootprint["discovery"] = {
    attempted: false,
    queries: [],
    status: "SKIPPED_DECLARED",
  };
  if (footprint.socials.length === 0 && remaining() > 2_000) {
    discovery.attempted = true;
    const query = `"${input.companyName}" ${input.country ?? ""} instagram OR facebook OR tiktok OR linkedin`.trim();
    discovery.queries.push(query);
    try {
      const { braveWebSearch } = await import("@/server/services/seshat/web-search");
      const result = await withTimeout(
        braveWebSearch(query, { count: 10, timeoutMs: Math.min(6_000, remaining()) }),
        Math.min(7_000, remaining()),
        { status: "ERROR" as const, error: "timeout" },
      );
      if (result.status === "OK") {
        discovery.status = "OK";
        // Garde anti-faux-positif déterministe : le hit doit mentionner la
        // marque dans son titre/description pour être retenu.
        const accepted = result.hits.filter((h) => mentionsBrand(`${h.title} ${h.description}`, input.companyName));
        const detected = detectSocialLinks(accepted.map((h) => h.url).join("\n"));
        const seen = new Set(footprint.socials.map((s) => `${s.platform}:${(s.handle ?? s.url).toLowerCase()}`));
        for (const p of detected) {
          const key = `${p.platform}:${(p.handle ?? p.url).toLowerCase()}`;
          if (!seen.has(key)) {
            footprint.socials.push(p);
            seen.add(key);
          }
        }
      } else if (result.status === "DEFERRED_NO_KEY") {
        discovery.status = "DEFERRED_NO_KEY";
      } else {
        discovery.status = "ERROR";
        errors.push(`discovery: ${result.error}`);
      }
    } catch (err) {
      discovery.status = "ERROR";
      errors.push(`discovery: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 3. Compteurs followers réels (Apify, token système env) ──
  const followerCounts: FollowerCountEntry[] = [];
  let apifyStatus: EnrichedFootprint["enrichment"]["apify"] = "SKIPPED";
  const handles = toSocialHandles(footprint.socials);
  if (handles.length > 0 && remaining() > 3_000) {
    try {
      const { fetchPublicFollowers } = await import("@/server/services/anubis/social-audit");
      const result = await withTimeout(
        fetchPublicFollowers(input.strategyId, handles, { timeoutMs: Math.min(15_000, remaining()) }),
        Math.min(18_000, remaining()),
        { state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const },
      );
      switch (result.state) {
        case "LIVE": {
          apifyStatus = "LIVE";
          for (const d of result.data) {
            followerCounts.push({
              platform: d.platform,
              handle: d.handle,
              followerCount: d.followerCount,
              source: "APIFY",
              capturedAt: result.observedAt,
            });
          }
          break;
        }
        case "DEFERRED_AWAITING_CREDENTIALS":
          apifyStatus = "DEFERRED";
          break;
        case "DEGRADED":
          apifyStatus = "DEGRADED";
          errors.push(`apify: ${result.reason}`);
          break;
      }
    } catch (err) {
      apifyStatus = "DEGRADED";
      errors.push(`apify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 4. Mentions presse (Google News RSS, sans clé) ──
  const press: PressMention[] = [];
  let pressStatus: EnrichedFootprint["enrichment"]["press"] = "EMPTY";
  if (remaining() > 2_000) {
    try {
      const { brandPressFeedFor } = await import("@/server/services/seshat/external-feeds/feed-sources");
      const { fetchRssText, parseRssItems } = await import("@/server/services/seshat/external-feeds/rss");
      const feed = brandPressFeedFor(input.companyName, countryCodeGuess(input.country));
      const xml = await withTimeout(fetchRssText(feed.url), Math.min(8_000, remaining()), null);
      if (xml) {
        const items = parseRssItems(xml, 25).filter((it) => mentionsBrand(it.title, input.companyName));
        for (const it of items.slice(0, 5)) {
          const { title, sourceName } = splitGoogleNewsTitle(it.title);
          press.push({ title, url: it.link, sourceName, publishedAt: it.pubDate || null });
        }
        pressStatus = press.length > 0 ? "LIVE" : "EMPTY";
      }
    } catch (err) {
      pressStatus = "ERROR";
      errors.push(`press: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 5. Empreinte entière — collecteurs parallèles (ADR-0121 vague A). ──
  // Read-only, chacun time-boxé et honnête ; l'échec d'un collecteur
  // n'affecte pas les autres.
  const enrichedExtras: Pick<EnrichedFootprint, "maps" | "youtube" | "domain" | "emailInfra" | "performance" | "ads"> = {};
  if (remaining() > 3_000) {
    try {
      const collectors = await import("./footprint-collectors");
      const domainName = input.websiteUrl ? collectors.registrableDomain(input.websiteUrl) : null;
      const ytProfile = footprint.socials.find((s) => s.platform === "YOUTUBE" && s.handle);
      const stageBudget = Math.min(20_000, remaining());

      const [maps, youtube, domain, emailInfra, performance, ads] = await Promise.all([
        collectors.fetchGoogleBusinessPresence(input.companyName, input.country, { timeoutMs: Math.min(stageBudget, 18_000) }),
        ytProfile
          ? collectors.fetchYouTubeChannelStats(ytProfile.handle!, { timeoutMs: Math.min(stageBudget, 6_000) })
          : Promise.resolve(null),
        collectors.fetchDomainInfo(input.websiteUrl, { timeoutMs: Math.min(stageBudget, 6_000) }),
        collectors.checkEmailInfrastructure(domainName, { timeoutMs: Math.min(stageBudget, 5_000) }),
        collectors.fetchSitePerformance(footprint.site?.reachable ? footprint.site.url : null, { timeoutMs: Math.min(stageBudget, 18_000) }),
        collectors.fetchAdsPresence(input.companyName, { timeoutMs: Math.min(stageBudget, 15_000) }),
      ]);

      // Garde anti-faux-positif : une fiche Maps qui ne mentionne pas la
      // marque est rejetée (NOT_FOUND honnête, jamais les avis d'un autre).
      enrichedExtras.maps =
        maps.status === "LIVE" && maps.placeName && !mentionsBrand(maps.placeName, input.companyName)
          ? { ...maps, status: "NOT_FOUND", placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] }
          : maps;
      if (youtube) {
        enrichedExtras.youtube = youtube;
        // Audience YouTube mesurée → FollowerSnapshot (même sémantique que le
        // chemin Apify ; source CONNECTOR, plateforme dans l'enum Prisma).
        if (youtube.status === "LIVE" && youtube.subscriberCount !== null && input.strategyId) {
          try {
            const { db } = await import("@/lib/db");
            await db.followerSnapshot.create({
              data: {
                strategyId: input.strategyId,
                platform: "YOUTUBE",
                handle: (youtube.handle ?? ytProfile?.handle ?? "").replace(/^@/, ""),
                followerCount: youtube.subscriberCount,
                source: "CONNECTOR",
              },
            });
          } catch (err) {
            errors.push(`youtube-snapshot: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      enrichedExtras.domain = domain;
      enrichedExtras.emailInfra = emailInfra;
      enrichedExtras.performance = performance;
      enrichedExtras.ads = ads;
    } catch (err) {
      errors.push(`collectors: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const enriched: EnrichedFootprint = {
    ...footprint,
    ...enrichedExtras,
    followerCounts,
    press,
    discovery,
    enrichment: {
      apify: apifyStatus,
      press: pressStatus,
      totalMs: Date.now() - t0,
      errors: [...footprint.errors, ...errors],
    },
  };

  // ── 6. Score d'empreinte /100 (déterministe, renormalisé sur le mesuré). ──
  try {
    const { computeFootprintScore } = await import("./footprint-score");
    enriched.score = computeFootprintScore(enriched);
  } catch (err) {
    enriched.enrichment.errors.push(`score: ${err instanceof Error ? err.message : String(err)}`);
  }

  return enriched;
}

/**
 * Re-run opérateur (Intent `ENRICH_E_FROM_PUBLIC_FOOTPRINT`, ADR-0121 —
 * parité manual-first ADR-0060 avec le chemin intake automatique).
 * Re-collecte l'empreinte publique de la marque et écrit les champs E via le
 * gateway en author EXTERNAL_SAAS + provenance SOURCE/INFERRED : le guard
 * refuse tout écrasement d'un champ HUMAN (l'ADVE reste founder-owned).
 */
export async function rerunPublicEnrichmentForStrategy(strategyId: string): Promise<{
  status: "OK" | "NO_STRATEGY";
  enrichment?: EnrichedFootprint["enrichment"];
  discovery?: EnrichedFootprint["discovery"];
  socialsFound?: number;
  pressFound?: number;
  challenged?: string[];
}> {
  const { db } = await import("@/lib/db");
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, name: true, countryCode: true },
  });
  if (!strategy) return { status: "NO_STRATEGY" };

  // L'intake d'origine (si la strategy en vient) porte les déclarations les
  // plus fiables (site, liens, secteur). Fallback : nom de la strategy.
  const intake = await db.quickIntake.findFirst({
    where: { convertedToId: strategyId },
    select: { companyName: true, sector: true, country: true, websiteUrl: true, socialLinksRaw: true },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await enrichPublicFootprint({
    companyName: intake?.companyName ?? strategy.name,
    country: intake?.country ?? strategy.countryCode,
    sector: intake?.sector,
    websiteUrl: intake?.websiteUrl,
    socialLinksRaw: intake?.socialLinksRaw,
    strategyId,
    budgetMs: 30_000,
  });

  const pillar = await db.pillar.findFirst({
    where: { strategyId, key: "e" },
    select: { content: true },
  });
  const eContent = (pillar?.content as Record<string, unknown> | null) ?? {};
  const { content: merged, inferredFields } = mergeEnrichedFootprintIntoPillarE(eContent, enriched);

  const fields: Array<{ path: string; value: unknown }> = [];
  if (merged.touchpoints) fields.push({ path: "touchpoints", value: merged.touchpoints });
  if (merged.webPresence) fields.push({ path: "webPresence", value: merged.webPresence });
  if (inferredFields.includes("primaryChannel")) {
    fields.push({ path: "primaryChannel", value: merged.primaryChannel });
  }

  let challenged: string[] = [];
  if (fields.length > 0) {
    const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
    const result = await writePillarAndScore({
      strategyId,
      pillarKey: "e",
      operation: { type: "SET_FIELDS", fields },
      author: { system: "EXTERNAL_SAAS", reason: "Re-scan empreinte publique (ENRICH_E_FROM_PUBLIC_FOOTPRINT, ADR-0121)" },
      options: {
        fieldProvenance: {
          touchpoints: "SOURCE",
          webPresence: "SOURCE",
          ...(inferredFields.includes("primaryChannel") ? { primaryChannel: "INFERRED" as const } : {}),
        },
      },
    });
    challenged = result.challenged ?? [];
  }

  return {
    status: "OK",
    enrichment: enriched.enrichment,
    discovery: enriched.discovery,
    socialsFound: enriched.socials.length,
    pressFound: enriched.press.length,
    challenged,
  };
}

/** Le pays intake est un nom libre ("Cameroun") ou un ISO-2 — best-effort ISO-2. */
function countryCodeGuess(country?: string | null): string | null {
  if (!country) return null;
  const c = country.trim();
  return /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null;
}

// ── Writeback pilier E (pur) ───────────────────────────────────────────

const PLATFORM_TO_CHANNEL: Record<string, string> = {
  INSTAGRAM: "INSTAGRAM",
  FACEBOOK: "FACEBOOK",
  TIKTOK: "TIKTOK",
  LINKEDIN: "LINKEDIN",
  TWITTER: "TWITTER",
  YOUTUBE: "YOUTUBE",
};

/**
 * Superpose l'enrichissement sur le merge footprint existant :
 *   - `webPresence.socials[].followerCount` RÉEL (Apify) à côté du hint ;
 *   - `webPresence.press` (mentions Google News) ;
 *   - `primaryChannel` inféré UNIQUEMENT depuis un compteur réel le plus
 *     grand, et seulement s'il est absent du contenu (jamais d'écrasement).
 * Pas de KPI de remplissage (min 6 Zod) — pas de fabrication (ADR-0046).
 * Pur — testé sans IO.
 */
export function mergeEnrichedFootprintIntoPillarE(
  eContent: Record<string, unknown>,
  enriched: EnrichedFootprint,
): { content: Record<string, unknown>; inferredFields: string[] } {
  // Base : merge footprint existant (touchpoints + webPresence factuel).
  const out = mergeFootprintIntoPillarE(eContent, enriched);
  const inferredFields: string[] = [];

  const byHandle = new Map<string, FollowerCountEntry>();
  for (const fc of enriched.followerCounts) {
    byHandle.set(`${fc.platform}:${fc.handle.toLowerCase()}`, fc);
  }

  const webPresence = (out.webPresence ?? {}) as Record<string, unknown>;
  const socials = Array.isArray(webPresence.socials) ? (webPresence.socials as Array<Record<string, unknown>>) : [];
  for (const s of socials) {
    const key = `${String(s.platform)}:${String(s.handle ?? "").toLowerCase()}`;
    const real = byHandle.get(key);
    if (real) {
      s.followerCount = real.followerCount;
      s.followerSource = "APIFY";
      s.capturedAt = real.capturedAt;
    }
  }
  if (enriched.press.length > 0) {
    webPresence.press = enriched.press;
  }

  // ── ADR-0121 vague A — empreinte ENTIÈRE dans webPresence (provenance
  // SOURCE via l'appel gateway). N'AJOUTE que ce qui a été réellement mesuré
  // (statut LIVE/NOT_FOUND) ; les blocs DEFERRED/ERROR/SKIPPED sont omis pour
  // ne jamais présenter une absence de mesure comme un fait (ADR-0046).
  if (enriched.maps && (enriched.maps.status === "LIVE" || enriched.maps.status === "NOT_FOUND")) {
    webPresence.maps = enriched.maps;
  }
  if (enriched.youtube && enriched.youtube.status === "LIVE") {
    webPresence.youtube = enriched.youtube;
  }
  if (enriched.domain && enriched.domain.status === "LIVE") {
    webPresence.domain = enriched.domain;
  }
  if (enriched.emailInfra && enriched.emailInfra.status === "LIVE") {
    webPresence.emailInfra = enriched.emailInfra;
  }
  if (enriched.performance && enriched.performance.status === "LIVE") {
    webPresence.performance = enriched.performance;
  }
  if (enriched.ads && enriched.ads.status === "LIVE") {
    webPresence.ads = enriched.ads;
  }
  if (enriched.site?.tech) {
    const site = (webPresence.site ?? {}) as Record<string, unknown>;
    site.tech = enriched.site.tech;
    webPresence.site = site;
  }
  if (enriched.score) {
    webPresence.footprintScore = enriched.score;
  }
  out.webPresence = webPresence;

  // primaryChannel : plus grande audience RÉELLE (Apify + YouTube), seulement
  // si absent. Jamais d'écrasement (le guard de provenance protège en aval).
  const audiences: Array<{ platform: string; count: number }> = enriched.followerCounts.map((c) => ({
    platform: c.platform,
    count: c.followerCount,
  }));
  if (enriched.youtube?.status === "LIVE" && enriched.youtube.subscriberCount) {
    audiences.push({ platform: "YOUTUBE", count: enriched.youtube.subscriberCount });
  }
  if (!out.primaryChannel && audiences.length > 0) {
    const biggest = audiences.sort((a, b) => b.count - a.count)[0]!;
    const channel = PLATFORM_TO_CHANNEL[biggest.platform];
    if (channel) {
      out.primaryChannel = channel;
      inferredFields.push("primaryChannel");
    }
  }

  return { content: out, inferredFields };
}
