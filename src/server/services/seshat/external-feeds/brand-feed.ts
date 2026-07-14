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

export interface BrandFeedArticle {
  title: string;
  link: string;
  source?: string;
  publishedAt?: string;
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
      return {
        articles: Array.isArray(d.items) ? d.items.slice(0, 12) : [],
        subjects: Array.isArray(d.subjects) && d.subjects.length > 0 ? d.subjects : subjects,
        generatedAt: existing.createdAt.toISOString(),
        cached: true,
      };
    }
  }

  // ── Collecte multi-sujets × multi-langue (déterministe) ──────────────────────
  const sources = subjects.flatMap((s) => subjectSourcesFor(s, brand.countryCode)).slice(0, MAX_SOURCES);
  const items: RssItem[] = [];
  await Promise.all(
    sources.map(async (src) => {
      const xml = await fetchRssText(src.url).catch(() => null);
      if (xml) items.push(...parseRssItems(xml));
    }),
  );

  const ranked = rankItemsByRelevance(items, subjects, { limit: 12 });
  const articles = toFeedItems(ranked, 12).map((a) => ({
    title: a.title,
    link: a.link,
    ...(a.source ? { source: a.source } : {}),
    ...(a.publishedAt ? { publishedAt: a.publishedAt } : {}),
  }));

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
      take: opts?.max ?? 50,
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
    const r = await getOrBuildBrandFeed(db, {
      strategyId: s.id,
      name: s.name,
      countryCode: s.countryCode,
      sector,
    }).catch(() => null);
    if (r && !r.cached) built++;
    else skipped++;
  }
  return { built, skipped };
}
