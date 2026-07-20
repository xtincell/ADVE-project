/**
 * Quick Intake — Enrichissement public du pilier E (ADR-0121).
 *
 * Mandat : l'intake doit réussir « par tous les moyens » (légaux, données
 * publiques uniquement) à collecter l'empreinte du client pour combler le
 * pilier E du rapport — même quand le founder ne déclare NI site NI liens.
 *
 * Orchestration (chaque étage time-boxé, best-effort, jamais de throw) :
 *   0. PLAN — entity-gate Seshat (ADR-0162) : ambiguïté du nom + discriminants
 *      du contexte déclaré. Toute la collecte aval passe par `gate.judge` ;
 *   1. Footprint déterministe du site déclaré (web-footprint, existant) ;
 *   2. Découverte Brave des profils sociaux si rien de déclaré/trouvé
 *      (seshat/web-search — point d'accès internet unique, ADR-0108) ;
 *   3. Compteurs followers RÉELS via Apify (anubis/social-audit, token
 *      système `APIFY_TOKEN` env ADR-0075) → FollowerSnapshot persistés ;
 *   4. Mentions presse via Google News RSS (seshat/external-feeds, sans clé),
 *      requête DISCRIMINÉE à la source pour un nom ambigu ;
 *   5. RÉFUTATION adversariale (LLM optionnel, demote-only, ADR-0162) sur les
 *      candidats acceptés — jamais de repêchage, plancher déterministe.
 *
 * Zéro LLM dans le chemin déterministe ; le juge adversarial est optionnel et
 * ne peut que RETIRER du bruit. Aucune fabrication : ce qui n'est pas trouvé
 * reste absent (ADR-0046 no-magic-fallback), le rapport affiche un état
 * honnête (`entityGate.filtered`). Dégradations : cf. matrice ADR-0121.
 */

import {
  collectWebFootprint,
  detectSocialLinks,
  mergeFootprintIntoPillarE,
  type SocialProfile,
  type WebFootprint,
} from "./web-footprint";
import {
  COUNTRY_CITIES,
  createEntityGate,
  mentionsEntity,
  normalizeEntityText,
  type EntityGateReport,
} from "@/server/services/seshat/entity-gate";

// ── Types ──────────────────────────────────────────────────────────────
// Déplacés dans le module feuille `footprint-types` (rompt le cycle d'import
// statique `footprint-score` ↔ `public-enrichment` via `EnrichedFootprint.score`).
// Re-export ici pour la rétro-compat des consommateurs (footprint-score,
// footprint-narrative importent `EnrichedFootprint` depuis ce module).
export type {
  FollowerCountEntry,
  PressMention,
  ConnectedProfileEntry,
  EnrichedFootprint,
} from "./footprint-types";
import type {
  ConnectedProfileEntry,
  EnrichedFootprint,
  FollowerCountEntry,
  PressMention,
} from "./footprint-types";

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

/**
 * True ssi le texte mentionne le nom de marque (déterministe, zéro LLM).
 *
 * Depuis ADR-0162, délègue à la source canonique `seshat/entity-gate`
 * (`mentionsEntity`) : frontière de mot, séquence complète multi-mots, garde
 * de longueur < 3 alphabétique (fix prod 2026-07-19 — « a » matchait
 * « Gironde »). ATTENTION : cette garde reste LEXICALE — pour un nom de
 * marque qui est un mot du dictionnaire (« Top »), elle ne suffit PAS ; la
 * collecte doit passer par `createEntityGate().judge` (co-occurrence
 * discriminante exigée).
 */
export function mentionsBrand(text: string, companyName: string): boolean {
  return mentionsEntity(text, companyName);
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

  // ── PLAN (ADR-0162) — entity-gate : ambiguïté + discriminants ──
  // Construit UNE fois depuis le contexte DÉCLARÉ uniquement (secteur, pays,
  // site déclaré, liens sociaux déclarés). Toute la collecte aval juge ses
  // candidats via `gate.judge` — un nom-mot-du-dictionnaire (« Top ») exige
  // une co-occurrence discriminante, un nom distinctif passe sur la mention.
  const declared = (input.socialLinksRaw ?? "")
    .split(/\r?\n|,|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const declaredHandles = detectSocialLinks(declared.join("\n"))
    .map((p) => p.handle)
    .filter((h): h is string => !!h);
  const gate = createEntityGate(input.companyName, {
    sector: input.sector,
    country: input.country,
    countryCode: countryCodeGuess(input.country),
    websiteUrl: input.websiteUrl,
    socialHandles: declaredHandles,
  });
  const filtered = { press: 0, discovery: 0, maps: 0, site: 0, adversarial: 0 };
  /** Évidence (texte du hit Brave) par profil social DÉCOUVERT — pour la passe adversariale. */
  const discoveredSocialEvidence = new Map<string, string>();

  // ── 0.0. Auto-découverte du site officiel si RIEN n'est déclaré ──
  // Précondition de l'évidence révélée (ADR-0149) : sans site ni Brave, une
  // marque nationale n'a ni domaine daté (RDAP) ni tech site → le Scoreur la
  // cape LATENT par artefact. Déterministe, zéro clé, garde anti-faux-positif
  // (le candidat DOIT mentionner la marque). Payé UNIQUEMENT quand rien n'est
  // déclaré (site fourni → aucun coût). Borné pour ne pas affamer l'aval.
  let effectiveWebsiteUrl = input.websiteUrl ?? null;
  if (!effectiveWebsiteUrl && remaining() > 6_000) {
    try {
      const { discoverOfficialSite } = await import("./web-footprint");
      effectiveWebsiteUrl = await withTimeout(
        discoverOfficialSite(input.companyName, countryCodeGuess(input.country), {
          timeoutMs: 4_000,
          // Verdict entity-gate complet : pour un nom ambigu, la page candidate
          // doit co-mentionner un discriminant (secteur/pays) — `top.com` qui
          // contient juste le mot « top » est rejeté (filtered.site).
          validate: (pageText) => {
            const verdict = gate.judge(pageText);
            if (!verdict.accepted) filtered.site += 1;
            return verdict.accepted;
          },
        }),
        Math.min(6_000, remaining()),
        null,
      );
    } catch {
      /* best-effort — l'absence de site reste un état honnête */
    }
  }

  // ── 0. Signaux GRATUITS lancés en parallèle de tout le reste ──
  // Domaine (RDAP) + email (DNS) ne dépendent que de l'URL (déclarée ou
  // découverte) et coûtent 1-6 s : lancés ICI, ils ne peuvent plus être affamés
  // par les étages site/discovery/Apify (bug prod 2026-07-16 : « site fourni »
  // mais domaine/email « à mesurer » — l'étage final n'avait plus de budget).
  const freeCollectorsPromise = import("./footprint-collectors");
  const earlyDomainPromise = effectiveWebsiteUrl
    ? freeCollectorsPromise
        .then((c) => c.fetchDomainInfo(effectiveWebsiteUrl, { timeoutMs: 6_000 }))
        .catch(() => null)
    : Promise.resolve(null);
  const earlyEmailPromise = effectiveWebsiteUrl
    ? freeCollectorsPromise
        .then((c) => c.checkEmailInfrastructure(c.registrableDomain(effectiveWebsiteUrl!), { timeoutMs: 5_000 }))
        .catch(() => null)
    : Promise.resolve(null);

  // ── 1. Footprint déterministe (site + liens déclarés) ──
  let footprint: WebFootprint = {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: new Date().toISOString(),
    errors: [],
  };
  if (effectiveWebsiteUrl || declared.length > 0) {
    try {
      footprint = await withTimeout(
        collectWebFootprint({
          websiteUrl: effectiveWebsiteUrl,
          declaredSocialUrls: declared,
          companyName: input.companyName,
        }),
        // Jamais plus de ~40% du budget : un site lent ne doit pas affamer
        // les collecteurs gratuits d'aval (bug prod 2026-07-16).
        Math.min(12_000, Math.max(3_000, Math.floor(budgetMs * 0.4)), remaining()),
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
        // Garde anti-faux-positif ENTITY-GATE (ADR-0162) : le hit doit
        // mentionner la marque ET, si le nom est ambigu, co-mentionner un
        // discriminant. L'évidence (texte du hit) est conservée par profil
        // pour la passe adversariale aval.
        const accepted = result.hits.filter((h) => {
          const ok = gate.judge(`${h.title} ${h.description}`).accepted;
          if (!ok) filtered.discovery += 1;
          return ok;
        });
        const seen = new Set(footprint.socials.map((s) => `${s.platform}:${(s.handle ?? s.url).toLowerCase()}`));
        for (const h of accepted) {
          for (const p of detectSocialLinks(h.url)) {
            const key = `${p.platform}:${(p.handle ?? p.url).toLowerCase()}`;
            if (!seen.has(key)) {
              footprint.socials.push(p);
              seen.add(key);
              discoveredSocialEvidence.set(key, `${h.title} ${h.description}`.slice(0, 300));
            }
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

  // ── 3.0 P1 (plan validé) — les relevés CONNECTOR d'abord : quand la marque
  //     a CONNECTÉ ses réseaux (OAuth ADR-0128), les compteurs exacts existent
  //     déjà en base (FollowerSnapshot source=CONNECTOR, < 48 h). On les
  //     préfère au scraping Apify (estimation) — plateformes couvertes
  //     retirées de la liste à scraper, provenance SOURCE conservée.
  const followerCounts: FollowerCountEntry[] = [];
  const connectedProfiles: ConnectedProfileEntry[] = [];
  const connectorCovered = new Set<string>();
  try {
    const { db } = await import("@/lib/db");
    const recent = await db.followerSnapshot.findMany({
      where: {
        strategyId: input.strategyId,
        source: "CONNECTOR",
        capturedAt: { gte: new Date(Date.now() - 48 * 3_600_000) },
      },
      orderBy: { capturedAt: "desc" },
      select: { platform: true, handle: true, followerCount: true, capturedAt: true },
    });
    for (const snap of recent) {
      const key = String(snap.platform);
      if (connectorCovered.has(key)) continue; // dernier relevé par plateforme
      connectorCovered.add(key);
      followerCounts.push({
        platform: key,
        handle: snap.handle,
        followerCount: snap.followerCount,
        source: "CONNECTOR",
        capturedAt: snap.capturedAt.toISOString(),
      });
    }
    // Profils publics exacts des réseaux connectés (collecte élargie) : bio,
    // site, catégorie, localisation, volumes — donnée API, pas scraping.
    // Uniquement quand la Strategy existe (jamais un scan cross-marques).
    const conns = input.strategyId
      ? await db.socialConnection.findMany({
          where: { strategyId: input.strategyId, status: "ACTIVE" },
          select: { platform: true, accountName: true, metadata: true },
        })
      : [];
    for (const c of conns) {
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      const p = meta.profile as Record<string, unknown> | null | undefined;
      if (!p || typeof p !== "object") continue;
      connectedProfiles.push({
        platform: String(c.platform),
        accountName: c.accountName,
        bio: typeof p.bio === "string" ? p.bio : null,
        website: typeof p.website === "string" ? p.website : null,
        category: typeof p.category === "string" ? p.category : null,
        location: typeof p.location === "string" ? p.location : null,
        mediaCount: typeof p.mediaCount === "number" ? p.mediaCount : null,
        totalViews: typeof p.totalViews === "number" ? p.totalViews : null,
      });
    }
  } catch {
    // best-effort — l'absence de connexion ne dégrade rien, Apify prend le relais
  }

  // ── 3. Compteurs followers réels (Apify, token système env) ──
  let apifyStatus: EnrichedFootprint["enrichment"]["apify"] = "SKIPPED";
  const handles = toSocialHandles(footprint.socials).filter(
    (h) => !connectorCovered.has(String(h.platform)),
  );
  if (handles.length > 0 && remaining() > 3_000) {
    try {
      const { fetchPublicFollowers } = await import("@/server/services/anubis/social-audit");
      // Fenêtre 1 min (2026-07-16) : un actor Apify (scraping) prend 10-60 s —
      // avec les plateformes désormais en parallèle, on lui laisse jusqu'à 35 s
      // dans la fenêtre au lieu de l'étouffer à 15 s.
      const result = await withTimeout(
        fetchPublicFollowers(input.strategyId, handles, { timeoutMs: Math.min(35_000, remaining()) }),
        Math.min(40_000, remaining()),
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
      const ccPress = countryCodeGuess(input.country);

      // Juge + classe les items d'un flux : gate ADR-0162 (mention exigée +
      // discriminant co-occurrent pour un nom ambigu — « Le top 10 des
      // plages » est écarté), puis tri par nombre de discriminants matchés
      // (desc, ordre Google stable sinon) — tri, jamais suppression.
      const judgeFeed = (xml: string | null) =>
        !xml
          ? []
          : parseRssItems(xml, 25)
              .map((it) => ({ it, verdict: gate.judge(it.title) }))
              .filter(({ verdict }) => {
                if (!verdict.accepted) filtered.press += 1;
                return verdict.accepted;
              })
              .map((entry, i) => ({ ...entry, i }))
              .sort(
                (a, b) =>
                  b.verdict.matchedDiscriminants.length - a.verdict.matchedDiscriminants.length ||
                  a.i - b.i,
              );

      // Termes secteur (requête discriminée pour un nom AMBIGU — `"Top"
      // (boissons OR Cameroun)` : la requête nom-seul ne remonterait que du
      // bruit que le gate écarterait ensuite).
      const sectorTerms = [
        ...(input.sector ?? "")
          .split(/[\s,/;·]+/)
          .filter((w) => w.length >= 3)
          .slice(0, 2),
        ...(input.country?.trim() ? [input.country.trim()] : []),
      ];
      // Termes géo (cascade géo-d'abord — test BK Abidjan 2026-07-20) : pour
      // une marque mondiale déclarée sur UN marché, la requête nom-seul ne
      // remonte que la presse des gros marchés (France…) — du bruit
      // géographique pour le client d'Abidjan. On cherche d'abord
      // `"Burger King" ("Côte d'Ivoire" OR Abidjan)`.
      const geoTerms = input.country?.trim()
        ? [`"${input.country.trim()}"`, ...(ccPress ? (COUNTRY_CITIES[ccPress] ?? []) : [])].slice(0, 3)
        : [];

      // 12 s par flux : fetchRssText retente jusqu'à 5× (3,5 s max/tentative)
      // sur les IP round-robin mortes — une fenêtre de 8 s tuait le retry.
      const fetchFeed = async (extraTerms: readonly string[]) => {
        const feed = brandPressFeedFor(input.companyName, ccPress, { extraTerms });
        return withTimeout(fetchRssText(feed.url), Math.min(12_000, remaining()), null);
      };

      // Passe 1 — géo-scopée si un pays est déclaré ; sinon comportement
      // historique (discriminée si ambigu, nom-seul sinon).
      const pass1Terms = geoTerms.length > 0 ? geoTerms : gate.ambiguity.ambiguous ? sectorTerms : [];
      const accepted = judgeFeed(await fetchFeed(pass1Terms));

      // Passe 2 (rappel) — si la passe géo n'a pas rempli les 5 slots : requête
      // large (discriminée si ambigu), items ajoutés APRÈS ceux de la passe géo
      // (dédup par lien). La presse du marché déclaré prime toujours.
      if (geoTerms.length > 0 && accepted.length < 5 && remaining() > 3_000) {
        const seen = new Set(accepted.map(({ it }) => it.link));
        for (const entry of judgeFeed(await fetchFeed(gate.ambiguity.ambiguous ? sectorTerms : []))) {
          if (!seen.has(entry.it.link)) {
            seen.add(entry.it.link);
            accepted.push(entry);
          }
        }
      }

      for (const { it } of accepted.slice(0, 5)) {
        const { title, sourceName } = splitGoogleNewsTitle(it.title);
        press.push({ title, url: it.link, sourceName, publishedAt: it.pubDate || null });
      }
      if (accepted.length > 0 || filtered.press > 0) {
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
  // Signaux gratuits lancés à l'étage 0 — récupérés SANS condition de budget
  // (ils ont couru en parallèle, l'attente restante est ≤ leur propre timeout).
  {
    const [earlyDomain, earlyEmail] = await Promise.all([earlyDomainPromise, earlyEmailPromise]);
    if (earlyDomain) enrichedExtras.domain = earlyDomain;
    if (earlyEmail) enrichedExtras.emailInfra = earlyEmail;
  }
  if (remaining() > 500) {
    try {
      const collectors = await import("./footprint-collectors");
      const ytProfile = footprint.socials.find((s) => s.platform === "YOUTUBE" && s.handle);
      const stageBudget = Math.min(20_000, remaining());

      const [maps, youtube, performance, ads] = await Promise.all([
        collectors.fetchGoogleBusinessPresence(input.companyName, input.country, { timeoutMs: Math.min(stageBudget, 18_000) }),
        ytProfile
          ? collectors.fetchYouTubeChannelStats(ytProfile.handle!, { timeoutMs: Math.min(stageBudget, 6_000) })
          : Promise.resolve(null),
        collectors.fetchSitePerformance(footprint.site?.reachable ? footprint.site.url : null, { timeoutMs: Math.min(stageBudget, 18_000) }),
        collectors.fetchAdsPresence(input.companyName, { timeoutMs: Math.min(stageBudget, 15_000) }),
      ]);

      // Garde anti-faux-positif ENTITY-GATE : une fiche Maps qui ne passe pas
      // le verdict (mention + discriminant si nom ambigu — « Top Voyages »
      // n'est pas le soda Top) est rejetée (NOT_FOUND honnête, jamais les
      // avis d'un autre). L'adresse participe à l'évidence (ville = discriminant).
      const mapsRejected =
        maps.status === "LIVE" &&
        maps.placeName &&
        !gate.judge(`${maps.placeName} ${maps.address ?? ""}`).accepted;
      if (mapsRejected) filtered.maps += 1;
      enrichedExtras.maps = mapsRejected
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
      enrichedExtras.performance = performance;
      enrichedExtras.ads = ads;
    } catch (err) {
      errors.push(`collectors: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 5bis. RÉFUTATION adversariale (ADR-0162, demote-only, best-effort) ──
  // Un juge LLM tente de réfuter chaque candidat accepté par le gate
  // déterministe (presse, fiche Maps, profils découverts par Brave). Sans
  // LLM / timeout / erreur → les verdicts déterministes restent le plancher
  // et le rapport dit honnêtement DETERMINISTIC_ONLY.
  let judgeMode: EntityGateReport["judge"] = "DETERMINISTIC_ONLY";
  if (remaining() > 2_500) {
    try {
      const { adversarialRefute } = await import("@/server/services/seshat/entity-gate/adversarial");
      const candidates: Array<{ id: string; text: string; kind: "press" | "discovery" | "maps" }> = [
        ...press.map((p, i) => ({
          id: `press:${i}`,
          text: `${p.title}${p.sourceName ? ` — ${p.sourceName}` : ""}`,
          kind: "press" as const,
        })),
        ...(enrichedExtras.maps?.status === "LIVE" && enrichedExtras.maps.placeName
          ? [{ id: "maps:0", text: `${enrichedExtras.maps.placeName} ${enrichedExtras.maps.address ?? ""}`, kind: "maps" as const }]
          : []),
        ...[...discoveredSocialEvidence.entries()].map(([key, text]) => ({
          id: `disc:${key}`,
          text,
          kind: "discovery" as const,
        })),
      ];
      if (candidates.length > 0) {
        const result = await withTimeout(
          adversarialRefute({
            brandName: input.companyName,
            sector: input.sector,
            country: input.country,
            candidates,
          }),
          Math.min(10_000, remaining()),
          { status: "ERROR" as const, refutedIds: new Set<string>() },
        );
        if (result.status === "LIVE") {
          judgeMode = "DETERMINISTIC_PLUS_LLM";
          if (result.refutedIds.size > 0) {
            filtered.adversarial = result.refutedIds.size;
            // Presse : retire les mentions réfutées.
            for (let i = press.length - 1; i >= 0; i--) {
              if (result.refutedIds.has(`press:${i}`)) press.splice(i, 1);
            }
            if (press.length === 0 && pressStatus === "LIVE") pressStatus = "EMPTY";
            // Maps : fiche réfutée → NOT_FOUND honnête.
            if (result.refutedIds.has("maps:0") && enrichedExtras.maps) {
              enrichedExtras.maps = {
                ...enrichedExtras.maps,
                status: "NOT_FOUND",
                placeName: null,
                rating: null,
                reviewCount: null,
                address: null,
                topReviews: [],
              };
            }
            // Profils découverts : retirés, avec leurs compteurs scrapés.
            for (const [key] of discoveredSocialEvidence) {
              if (!result.refutedIds.has(`disc:${key}`)) continue;
              const idx = footprint.socials.findIndex(
                (s) => `${s.platform}:${(s.handle ?? s.url).toLowerCase()}` === key,
              );
              if (idx >= 0) {
                const removed = footprint.socials.splice(idx, 1)[0]!;
                for (let i = followerCounts.length - 1; i >= 0; i--) {
                  const fc = followerCounts[i]!;
                  if (
                    fc.source === "APIFY" &&
                    fc.platform === removed.platform &&
                    fc.handle.toLowerCase() === (removed.handle ?? "").toLowerCase()
                  ) {
                    followerCounts.splice(i, 1);
                  }
                }
              }
            }
          }
        }
      } else {
        // Rien à juger — le déterministe a tout tranché, pas d'appel LLM.
        judgeMode = "DETERMINISTIC_ONLY";
      }
    } catch {
      /* best-effort — plancher déterministe */
    }
  }

  const enriched: EnrichedFootprint = {
    ...footprint,
    ...enrichedExtras,
    followerCounts,
    ...(connectedProfiles.length > 0 ? { connectedProfiles } : {}),
    press,
    discovery,
    entityGate: {
      ambiguousName: gate.ambiguity.ambiguous,
      ambiguityReason: gate.ambiguity.reason,
      discriminants: gate.discriminants,
      judge: judgeMode,
      filtered,
    },
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

  const { challenged } = await persistFootprintToPillarE(strategyId, enriched);

  return {
    status: "OK",
    enrichment: enriched.enrichment,
    discovery: enriched.discovery,
    socialsFound: enriched.socials.length,
    pressFound: enriched.press.length,
    challenged,
  };
}

/**
 * Écrit l'empreinte MESURÉE dans le pilier E via le gateway (touchpoints +
 * webPresence factuel + primaryChannel inféré), provenance SOURCE. Assure
 * l'existence du row pilier — les marques PROSPECT (scoreProspect) n'ont pas de
 * pilier pré-créé, contrairement à l'intake. **Parité intake ↔ prospect** : toute
 * marque scorée reçoit AU MOINS son pilier E rempli depuis l'empreinte publique
 * (déterministe, zéro LLM) — la donnée nourrit la compréhension, pas seulement le
 * score. Débloque aussi les portes révélées du scoreur (elles lisent ce pilier E).
 */
export async function persistFootprintToPillarE(
  strategyId: string,
  enriched: EnrichedFootprint,
): Promise<{ challenged: string[] }> {
  const { db } = await import("@/lib/db");
  // Row pilier E garanti (prospects : aucun pilier pré-créé).
  await db.pillar.upsert({
    where: { strategyId_key: { strategyId, key: "e" } },
    create: { strategyId, key: "e", content: {}, confidence: 0 },
    update: {},
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
  if (fields.length === 0) return { challenged: [] };

  const { writePillarAndScore } = await import("@/server/services/pillar-gateway");
  const result = await writePillarAndScore({
    strategyId,
    pillarKey: "e",
    operation: { type: "SET_FIELDS", fields },
    author: { system: "EXTERNAL_SAAS", reason: "Empreinte publique → pilier E (parité intake/prospect, ADR-0121)" },
    options: {
      fieldProvenance: {
        touchpoints: "SOURCE",
        webPresence: "SOURCE",
        ...(inferredFields.includes("primaryChannel") ? { primaryChannel: "INFERRED" as const } : {}),
      },
    },
  });
  return { challenged: result.challenged ?? [] };
}

/**
 * Le pays intake est un nom libre ("Cameroun", "Côte d'Ivoire") ou un ISO-2.
 * Référentiel statique nom→ISO-2 (FR/EN, pays du COUNTRY_TLD web-footprint) —
 * sans lui, « Côte d'Ivoire » rendait null → locale presse retombée sur CM,
 * pas de TLD .ci probé, pas de démonymes entity-gate (bug test BK Abidjan
 * 2026-07-20). Normalisation diacritiques/ponctuation via entity-gate.
 */
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  "cameroun": "CM", "cameroon": "CM",
  "cote d ivoire": "CI", "ivory coast": "CI",
  "senegal": "SN",
  "france": "FR",
  "maroc": "MA", "morocco": "MA",
  "nigeria": "NG",
  "ghana": "GH",
  "tunisie": "TN", "tunisia": "TN",
  "congo": "CD", "rdc": "CD", "republique democratique du congo": "CD",
  "benin": "BJ",
  "togo": "TG",
  "gabon": "GA",
  "burkina faso": "BF", "burkina": "BF",
  "mali": "ML",
};

/** Exporté pour tests. */
export function countryCodeGuess(country?: string | null): string | null {
  if (!country) return null;
  const c = country.trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  const normalized = normalizeEntityText(c);
  return COUNTRY_NAME_TO_ISO2[normalized] ?? null;
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
      // Provenance réelle du relevé (CONNECTOR = compteur exact OAuth,
      // APIFY = estimation scrapée) — ne plus étiqueter tout « APIFY ».
      s.followerSource = real.source;
      s.capturedAt = real.capturedAt;
    }
  }
  if (enriched.press.length > 0) {
    webPresence.press = enriched.press;
  }
  // Profils publics exacts des réseaux connectés — mesure réelle (API),
  // même règle ADR-0046 : on n'écrit que ce qui a été effectivement lu.
  if (enriched.connectedProfiles && enriched.connectedProfiles.length > 0) {
    webPresence.connectedProfiles = enriched.connectedProfiles;
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
