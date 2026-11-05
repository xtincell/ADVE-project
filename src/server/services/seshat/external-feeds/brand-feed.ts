/**
 * Veille MULTI-SUJETS par marque (ADR-0143) — 100 % déterministe, ZÉRO LLM.
 *
 * Le flux d'une marque n'est pas « son secteur » : c'est un ENSEMBLE DE SUJETS
 * (la marque elle-même, son secteur, des thèmes additionnels). Chaque sujet est
 * interrogé sur Google News RSS dans plusieurs langues (feed-sources.ts) — la
 * langue n'est PAS un filtre —, les articles sont unis puis triés par PERTINENCE
 * déterministe (relevance.ts). Aucun LLM ne touche cette chaîne.
 *
 * Persistance : réutilise `KnowledgeEntry` (entryType EXTERNAL_FEED_DIGEST) avec
 * le champ libre `market = "brand:<strategyId>"` comme clé par marque — pas de
 * nouveau modèle, pas de migration. Idempotence journalière : un digest du jour
 * est réutilisé (cache read-through, aussi préchauffé par le cron).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { subjectSourcesFor, sectorHeadTerm } from "./feed-sources";
import { fetchRssText, parseRssItems, toFeedItems, type RssItem } from "./rss";
import { rankItemsByRelevance } from "./relevance";
import { deriveWatchSubjects, effectiveWatchSubjects } from "./watch-subjects";
import { braveWebSearch } from "@/server/services/seshat/web-search";
import { fetchSourceUrl } from "@/server/services/artemis/market-research/web-fetcher";
import { parseHtmlMeta } from "@/server/services/quick-intake/web-footprint";
import { watchlistSchema } from "@/domain/creative-intelligence";

/**
 * Sujets de veille EFFECTIFS d'une marque (ADR-0165) : l'édition manuelle
 * (`businessContext.watchSubjects`) prime ; sinon dérivation déterministe
 * depuis les piliers A (publics), V (marques du catalogue), D (personas et
 * concurrents), E (portrait du superfan et communauté). Best-effort : échec DB → [] (la veille retombe sur
 * nom + secteur, comportement historique).
 */
export async function loadWatchSubjects(
  db: PrismaClient,
  strategyId: string,
  businessContext: unknown,
  countryName?: string | null,
): Promise<{ subjects: string[]; source: "MANUAL" | "DERIVED" | "NONE" }> {
  const manual = ((businessContext ?? {}) as Record<string, unknown>).watchSubjects;
  const explicit = effectiveWatchSubjects(manual, []);
  if (explicit.source === "MANUAL") return explicit;
  try {
    const watch = watchlistSchema.safeParse(((businessContext ?? {}) as Record<string, unknown>).creativeWatchlist);
    const declared = watch.success ? await db.brandRef.findMany({ where: { id: { in: watch.data.map(w => w.brandRefId) } }, select: { name: true } }).catch(() => []) : [];
    const pillars = await db.pillar.findMany({
      where: { strategyId, key: { in: ["a", "v", "d", "e"] } },
      select: { key: true, content: true },
    });
    const byKey = Object.fromEntries(
      pillars.map((p) => [p.key, (p.content as Record<string, unknown> | null) ?? {}]),
    );
    const derived = deriveWatchSubjects({
      pillarA: byKey.a,
      pillarV: byKey.v,
      pillarD: byKey.d,
      pillarE: byKey.e,
      countryName,
    });
    // Explicit BrandRef watchlist feeds the same Hunter/news radar; no shadow rival taxonomy.
    return effectiveWatchSubjects(manual, [...new Set([...declared.map(r => countryName ? `${r.name} ${countryName}` : r.name), ...derived])].slice(0, 8));
  } catch {
    return effectiveWatchSubjects(manual, []);
  }
}

/**
 * Plafond de fraîcheur DUR (ADR-0165) : un panneau de veille n'affiche pas
 * des archives — le bonus de fraîcheur du ranking (départage [0,1]) laissait
 * passer des articles de 3 010 jours dès qu'ils matchaient les tokens du
 * sujet. Les items datés au-delà du plafond sont exclus AVANT ranking ; les
 * items non datés sont conservés (le ranking les départage).
 */
const MAX_ARTICLE_AGE_DAYS = 120;

function withinFreshnessCap(items: RssItem[]): RssItem[] {
  const cutoff = Date.now() - MAX_ARTICLE_AGE_DAYS * 86_400_000;
  return items.filter((it) => {
    if (!it.pubDate) return true;
    const t = Date.parse(it.pubDate);
    return !Number.isFinite(t) || t >= cutoff;
  });
}

export interface BrandFeedArticle {
  title: string;
  link: string;
  source?: string;
  sourceUrl?: string;
  discoveryUrl?: string;
  publishedAt?: string;
  /** Vignette réelle fournie par le flux, si présente. */
  imageUrl?: string;
  /** Extrait réellement reçu du flux, sans rédaction inventée. */
  summary?: string;
}

/** Retrieve a publisher's own preview through the existing search/fetch paths.
 * Max three articles per refresh; never use an aggregator logo as article art.
 */
export async function enrichArticlePreview(article: BrandFeedArticle): Promise<BrandFeedArticle> {
  let resolved = article;
  try {
    let link = article.link;
    const original = new URL(link);
    if (!["http:", "https:"].includes(original.protocol)) return article;
    if (original.hostname === "news.google.com") {
      if (!article.sourceUrl) return article;
      const publisher = new URL(article.sourceUrl).hostname.replace(/^www\./, "");
      const result = await braveWebSearch(`site:${publisher} "${article.title}"`, { count: 3, allowlistOnly: true });
      if (result.status !== "OK") return article;
      const tokens = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(t => t.length > 3);
      const wanted = [...new Set(tokens(article.title))];
      const match = result.hits.find(hit => {
        try {
          const url = new URL(hit.url);
          const host = url.hostname.replace(/^www\./, "");
          const found = new Set(tokens(hit.title));
          return ["http:", "https:"].includes(url.protocol) && (host === publisher || host.endsWith(`.${publisher}`)) &&
            wanted.length >= 3 && wanted.filter(t => found.has(t)).length / wanted.length >= 0.7;
        } catch { return false; }
      });
      if (!match) return article;
      link = match.url;
      resolved = { ...article, link, discoveryUrl: article.link };
    }
    const fetched = await fetchSourceUrl(link);
    if (!fetched.ok || !fetched.text || !fetched.contentType?.includes("html")) return resolved;
    const meta = parseHtmlMeta(fetched.text);
    let imageUrl = article.imageUrl;
    if (!imageUrl && meta.ogImage) {
      try {
        const image = new URL(meta.ogImage, link);
        if (image.protocol === "https:" && !image.username && !image.password) imageUrl = image.href;
      } catch { /* A malformed picture must not discard a received publisher summary. */ }
    }
    // Google RSS descriptions often only repeat the headline. Prefer publisher
    // metadata in that case; preserve a richer full excerpt supplied by the RSS.
    const summaryRepeatsTitle = article.summary?.startsWith(article.title);
    const summary = meta.description && (!article.summary || summaryRepeatsTitle || meta.description.length > article.summary.length)
      ? meta.description : article.summary;
    return { ...resolved, ...(summary ? { summary } : {}), ...(imageUrl ? { imageUrl } : {}) };
  } catch { return resolved; }
}

export interface BrandFeedResult {
  articles: BrandFeedArticle[];
  /** Sujets réellement suivis (marque, secteur…) — affichables honnêtement. */
  subjects: string[];
  generatedAt: string;
  /** true = servi depuis le digest du jour ; false = reconstruit à l'instant. */
  cached: boolean;
}

/** Borne le nombre de flux RSS interrogés par build (coût réseau + anti-throttle). */
const MAX_SOURCES = 16;

function marketKeyFor(strategyId: string): string {
  return `brand:${strategyId}`;
}

/** Sujets suivis pour une marque : la marque + son secteur (tête) + extras. */
export function brandFeedSubjects(brand: {
  name: string;
  sector: string | null;
  extraSubjects?: string[];
}): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (v.length >= 2 && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  push(brand.name);
  if (brand.sector) push(sectorHeadTerm(brand.sector));
  for (const e of brand.extraSubjects ?? []) push(e);
  return out;
}

/**
 * Construit (ou lit le cache du jour) la veille multi-sujets d'UNE marque.
 * Best-effort : toute erreur réseau/DB dégrade honnêtement vers `articles: []`.
 */
export async function getOrBuildBrandFeed(
  db: PrismaClient,
  brand: {
    strategyId: string;
    name: string;
    countryCode: string;
    sector: string | null;
    extraSubjects?: string[];
  },
  opts?: { force?: boolean },
): Promise<BrandFeedResult> {
  const marketKey = marketKeyFor(brand.strategyId);
  const subjects = brandFeedSubjects(brand);

  // ── Cache journalier (read-through) ──────────────────────────────────────────
  if (!opts?.force) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await db.knowledgeEntry
      .findFirst({
        where: { entryType: "EXTERNAL_FEED_DIGEST", market: marketKey, createdAt: { gte: today } },
        orderBy: { createdAt: "desc" },
        select: { data: true, createdAt: true },
      })
      .catch(() => null);
    if (existing) {
      const d = (existing.data ?? {}) as { items?: BrandFeedArticle[]; subjects?: string[] };
      const cachedItems = Array.isArray(d.items) ? d.items : [];
      // ADR-0165 — le cache du jour n'est valable que pour les MÊMES sujets :
      // quand l'opérateur édite ses sujets suivis (ou que l'ADVE en dérive de
      // nouveaux), la veille se reconstruit immédiatement au lieu d'attendre
      // demain.
      const norm = (xs: string[]) => [...xs.map((x) => x.toLowerCase().trim())].sort().join("|");
      const sameSubjects = norm(Array.isArray(d.subjects) ? d.subjects : []) === norm(subjects);
      // Un digest VIDE n'est pas une réponse (bug prod 2026-07-16 « gazette
      // vide ») : un seul échec de collecte (throttle/timeout RSS) figeait le
      // panneau à zéro pour toute la journée. Cache vide → on retente.
      if (cachedItems.length > 0 && sameSubjects) {
        return {
          articles: cachedItems.slice(0, 12),
          subjects: Array.isArray(d.subjects) && d.subjects.length > 0 ? d.subjects : subjects,
          generatedAt: existing.createdAt.toISOString(),
          cached: true,
        };
      }
    }
  }

  // ── Collecte multi-sujets × multi-langue (déterministe) ──────────────────────
  const bySubject = subjects.map(s => subjectSourcesFor(s, brand.countryCode));
  // Cover every ADVE topic before spending the cap on additional languages.
  const sources = [0, 1, 2, 3].flatMap(i => bySubject.flatMap(rows => rows[i] ? [rows[i]!] : [])).slice(0, MAX_SOURCES);
  const items: RssItem[] = [];
  await Promise.all(
    sources.map(async (src) => {
      const xml = await fetchRssText(src.url).catch(() => null);
      if (xml) items.push(...parseRssItems(xml));
    }),
  );

  // Plafond de fraîcheur AVANT ranking (ADR-0165 — fini les articles de 3 010 j).
  const fresh = withinFreshnessCap(items);
  let ranked = rankItemsByRelevance(fresh, subjects, { limit: 12 });
  if (ranked.length === 0 && fresh.length > 0) {
    // Les flux interrogés sont déjà des recherches scopées au sujet (Google
    // News search par marque/secteur) : si le matching par tokens écarte tout
    // (accents, élisions, titres reformulés), la récence brute reste honnête.
    const seenTitles = new Set<string>();
    ranked = fresh
      .filter((it) => {
        const t = (it.title ?? "").trim().toLowerCase();
        if (!t || seenTitles.has(t)) return false;
        seenTitles.add(t);
        return true;
      })
      .sort((a, b) => (Date.parse(b.pubDate ?? "") || 0) - (Date.parse(a.pubDate ?? "") || 0))
      .slice(0, 12)
      .map((it) => ({ ...it, relevance: 0 }));
  }
  if (items.length === 0) {
    console.warn(`[brand-feed] collecte VIDE pour ${brand.name} (${sources.length} sources) — probable throttle/timeout RSS`);
  }
  const articles = toFeedItems(ranked, 12).map((a) => ({
    title: a.title,
    link: a.link,
    ...(a.summary ? { summary: a.summary } : {}),
    ...(a.sourceUrl ? { sourceUrl: a.sourceUrl } : {}),
    ...(a.source ? { source: a.source } : {}),
    ...(a.publishedAt ? { publishedAt: a.publishedAt } : {}),
    ...(a.imageUrl ? { imageUrl: a.imageUrl } : {}),
  }));

  // Sequential search respects the existing free-tier throttle; persisted cache
  // prevents repeated page retrieval on every Gazette visit.
  for (let i = 0; i < Math.min(3, articles.length); i++) {
    articles[i] = await enrichArticlePreview(articles[i]!);
  }
  const generatedAt = new Date().toISOString();

  // ── Persistance best-effort (cache du jour) ─────────────────────────────────
  const data = {
    items: articles,
    subjects,
    macroSignals: [],
    weakSignals: [],
    generatedAt,
    feedSource: "rss:brand-multi-subject",
  };
  // Jamais de cache VIDE : un échec de collecte ne doit pas figer le panneau
  // à zéro jusqu'à minuit (la prochaine requête retentera).
  if (articles.length > 0) {
    await db.knowledgeEntry
      .create({
        data: {
          entryType: "EXTERNAL_FEED_DIGEST",
          market: marketKey,
          countryCode: brand.countryCode,
          sector: brand.sector ?? null,
          data: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
          sampleSize: articles.length,
        },
      })
      .catch(() => undefined);
  }

  return { articles, subjects, generatedAt, cached: false };
}

/**
 * Préchauffe (cron) les veilles de toutes les marques actives avec un pays —
 * ainsi le dashboard sert toujours depuis le cache, jamais un build synchrone.
 * Best-effort, séquentiel (anti-throttle Google News). Retourne un résumé.
 */
export async function refreshActiveBrandFeeds(
  db: PrismaClient,
  opts?: { max?: number },
): Promise<{ built: number; skipped: number }> {
  const strategies = await db.strategy
    .findMany({
      where: { countryCode: { not: null }, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, countryCode: true, businessContext: true },
      orderBy: { updatedAt: "desc" },
      // 50 → 200 (rationalisation 2026-07-16) : au-delà du cap, la N+1ᵉ marque
      // déclenchait un build RSS SYNCHRONE dans la requête cockpit (latence +
      // throttle Google News) au lieu de servir du cache préchauffé.
      take: opts?.max ?? 200,
    })
    .catch(() => []);
  let built = 0;
  let skipped = 0;
  for (const s of strategies) {
    if (!s.countryCode) {
      skipped++;
      continue;
    }
    const ctx = (s.businessContext ?? {}) as Record<string, unknown>;
    const sector = typeof ctx.sector === "string" ? ctx.sector : null;
    // ADR-0165 — le cron préchauffe avec les MÊMES sujets que le cockpit
    // (ADVE dérivé / édition manuelle), sinon le cache du jour servirait la
    // veille générique et l'ADVE ne serait consulté qu'au build à la demande.
    const { countryDisplayNameFr } = await import("./watch-subjects");
    const watch = await loadWatchSubjects(db, s.id, s.businessContext, countryDisplayNameFr(s.countryCode));
    const r = await getOrBuildBrandFeed(db, {
      strategyId: s.id,
      name: s.name,
      countryCode: s.countryCode,
      sector,
      extraSubjects: watch.subjects,
    }).catch(() => null);
    if (r && !r.cached) built++;
    else skipped++;
  }
  return { built, skipped };
}
