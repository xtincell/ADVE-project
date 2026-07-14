/**
 * Tarsis external feeds (ADR-0037 PR-G → RSS réel ADR-0099 → RSS-pur ADR-0143).
 *
 * Génère un `EXTERNAL_FEED_DIGEST` KnowledgeEntry par couple pays×secteur :
 *   - articles réels + signaux dérivés depuis les vrais flux RSS (Google News,
 *     déterministe, zéro clé, MULTILINGUE par pays) ;
 *   - Trend Tracker macro (World Bank, déterministe) injecté à part.
 *
 * ADR-0143 — le fallback LLM (« synthèse qualitative » quand le RSS est vide)
 * a été RETIRÉ : doctrine « dépendre au minimum des LLMs ». RSS vide = état
 * vide HONNÊTE (macro déterministe conservé, articles absents), jamais une
 * invention. La recherche d'actualité est donc 100 % déterministe.
 *
 * Cron orchestration : `/api/cron/external-feeds` (quotidien) appelle
 * `refreshAllPriorityPairs()` ; callable aussi via FETCH_EXTERNAL_FEED intent.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ExternalFeedDigestDataSchema } from "@/server/services/seshat/knowledge/schemas";
import { collectTrendTracker, countTrendTrackerCovered } from "./trend-collector";
import { feedSourcesFor } from "./feed-sources";
import { fetchRssText, parseRssItems, buildDigestFromItems, toFeedItems, type RssItem } from "./rss";

export const PRIORITY_PAIRS: Array<{ countryCode: string; sector: string }> = [
  { countryCode: "CM", sector: "fmcg" },
  { countryCode: "CM", sector: "fintech" },
  { countryCode: "NG", sector: "fmcg" },
  { countryCode: "NG", sector: "fintech" },
  { countryCode: "CI", sector: "fmcg" },
  { countryCode: "ZA", sector: "fmcg" },
  { countryCode: "ZA", sector: "fintech" },
  { countryCode: "MA", sector: "fmcg" },
];

/** Plafond de paires par refresh — borne le coût (RSS gratuit mais LLM fallback payant). */
const MAX_PAIRS_PER_REFRESH = 24;

/** Normalise un secteur libre ("FMCG / Agroalimentaire") en clé de paire. */
export function normalizeSectorKey(sector: string): string | null {
  const s = sector.trim().toLowerCase().replace(/\s+/g, " ");
  return s.length >= 3 ? s : null;
}

/**
 * Feeds DYNAMIQUES (vague C) : les paires pays×secteur sont dérivées des
 * stratégies RÉELLES en base (countryCode dénormalisé + businessContext.sector),
 * pas seulement de la liste statique — un client au Sénégal en cosmétique
 * reçoit ses données marché sans édition de code. Les PRIORITY_PAIRS restent
 * en tête (marchés vitrine), la dérive est dédupliquée et plafonnée.
 * Best-effort : toute erreur DB → statique seul (jamais de throw).
 */
export async function listActiveFeedPairs(): Promise<Array<{ countryCode: string; sector: string }>> {
  const seen = new Set(PRIORITY_PAIRS.map((p) => `${p.countryCode}::${p.sector}`));
  const pairs = [...PRIORITY_PAIRS];
  try {
    const strategies = await db.strategy.findMany({
      where: {
        countryCode: { not: null },
        status: { not: "ARCHIVED" },
      },
      select: { countryCode: true, businessContext: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    for (const s of strategies) {
      if (pairs.length >= MAX_PAIRS_PER_REFRESH) break;
      const ctx = (s.businessContext ?? {}) as Record<string, unknown>;
      const rawSector = typeof ctx.sector === "string" ? ctx.sector : null;
      const sector = rawSector ? normalizeSectorKey(rawSector) : null;
      if (!s.countryCode || !sector) continue;
      const key = `${s.countryCode.toUpperCase()}::${sector}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ countryCode: s.countryCode.toUpperCase(), sector });
    }
  } catch (err) {
    console.warn("[external-feeds] dérivation des paires dynamiques impossible (statique seul):", err instanceof Error ? err.message : err);
  }
  return pairs.slice(0, MAX_PAIRS_PER_REFRESH);
}

export interface FetchFeedResult {
  status: "OK" | "FETCH_FAILED" | "VALIDATION_FAILED";
  /** Voie qui a produit le digest : RSS (articles réels), RSS_EMPTY (flux vide
   *  → macro déterministe seul, zéro LLM) ou CACHED (digest du jour déjà présent). */
  mode?: "RSS" | "RSS_EMPTY" | "CACHED";
  feedSource?: string;
  countryCode: string;
  sector: string;
  entryId?: string;
  signalsCreated: number;
  trendTrackerVarsCovered: number;
  error?: string;
}

/**
 * Fetch a single (country, sector) pair, persist as EXTERNAL_FEED_DIGEST.
 * Idempotent at day-granularity : if a digest already exists for today,
 * return early without re-fetching.
 */
export async function fetchAndPersistFeedDigest(
  countryCode: string,
  sector: string,
): Promise<FetchFeedResult> {
  const country = await db.country.findUnique({ where: { code: countryCode } });
  const countryName = country?.name ?? countryCode;

  // Idempotence : skip if a digest exists for today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await db.knowledgeEntry.findFirst({
    where: {
      entryType: "EXTERNAL_FEED_DIGEST",
      countryCode,
      sector: { contains: sector, mode: "insensitive" as Prisma.QueryMode },
      createdAt: { gte: today },
    },
    select: { id: true },
  });
  if (existing) {
    return { status: "OK", mode: "CACHED", countryCode, sector, entryId: existing.id, signalsCreated: 0, trendTrackerVarsCovered: 0 };
  }

  // ── Trend Tracker : COLLECTE DÉTERMINISTE (World Bank, sans clé), indépendante
  // de la voie RSS/LLM → calculée une fois, injectée dans les deux. Jamais inventée
  // par le LLM ; les variables sans source gratuite restent absentes (cf.
  // trend-collector.ts / NON_FREE_SOURCE_REGISTRY).
  const trendTracker = await collectTrendTracker(countryCode);
  const ttCovered = countTrendTrackerCovered(trendTracker);

  // ── Voie DÉTERMINISTE primaire : vrais flux RSS (zéro LLM, zéro clé) ──────────
  const sources = feedSourcesFor(countryCode, sector, countryName);
  const items: RssItem[] = [];
  for (const src of sources) {
    const xml = await fetchRssText(src.url);
    if (xml) items.push(...parseRssItems(xml));
  }
  if (items.length > 0) {
    const { macroSignals, weakSignals } = buildDigestFromItems(items, { sector });
    // ADR-0128 — articles réels conservés dans le digest (max 12, dédupliqués,
    // source extraite du suffixe Google News) pour la veille cockpit.
    const feedItems = toFeedItems(items, 12);
    const digest = ExternalFeedDigestDataSchema.safeParse({
      macroSignals,
      weakSignals,
      ...(ttCovered > 0 ? { trendTracker } : {}),
      items: feedItems,
      generatedAt: new Date().toISOString(),
      feedSource: `rss:${sources.map((s) => s.name).join(",")}`,
    });
    if (digest.success) {
      const signalsCreated = macroSignals.length + weakSignals.length;
      const entry = await db.knowledgeEntry.create({
        data: {
          entryType: "EXTERNAL_FEED_DIGEST",
          sector,
          countryCode,
          market: countryCode,
          data: JSON.parse(JSON.stringify(digest.data)) as Prisma.InputJsonValue,
          sampleSize: signalsCreated,
        },
      });
      return {
        status: "OK",
        mode: "RSS",
        feedSource: digest.data.feedSource,
        countryCode,
        sector,
        entryId: entry.id,
        signalsCreated,
        trendTrackerVarsCovered: ttCovered,
      };
    }
  }

  // ── RSS injoignable/vide → état vide HONNÊTE, ZÉRO LLM (ADR-0143) ────────────
  // Doctrine « dépendre au minimum des LLMs » : plus de synthèse qualitative par
  // modèle quand le flux est vide. Le pilier Track garde les agrégats macro
  // DÉTERMINISTES (World Bank — trendTracker) ; les articles restent ABSENTS
  // (l'absence est un état first-class, pas une invention). Si même le
  // trendTracker est vide → on ne persiste rien (retry au prochain passage du
  // cron), plutôt qu'une entrée creuse.
  if (ttCovered === 0) {
    return { status: "OK", mode: "RSS_EMPTY", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: 0 };
  }
  const emptyDigest = ExternalFeedDigestDataSchema.safeParse({
    macroSignals: [],
    weakSignals: [],
    trendTracker,
    items: [],
    generatedAt: new Date().toISOString(),
    feedSource: "rss:empty",
  });
  if (!emptyDigest.success) {
    return { status: "VALIDATION_FAILED", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: ttCovered, error: emptyDigest.error.message.slice(0, 200) };
  }
  const emptyEntry = await db.knowledgeEntry.create({
    data: {
      entryType: "EXTERNAL_FEED_DIGEST",
      sector,
      countryCode,
      market: countryCode,
      data: JSON.parse(JSON.stringify(emptyDigest.data)) as Prisma.InputJsonValue,
      sampleSize: 0,
    },
  });
  return {
    status: "OK",
    mode: "RSS_EMPTY",
    feedSource: "rss:empty",
    countryCode,
    sector,
    entryId: emptyEntry.id,
    signalsCreated: 0,
    trendTrackerVarsCovered: ttCovered,
  };
}

/**
 * Refresh all feed pairs in sequence. Used by the cron `/api/cron/external-feeds`
 * (daemon in-process ou scheduled-ops.yml). Vague C : couvre les paires
 * DYNAMIQUES dérivées des stratégies actives, plus la liste statique.
 */
export async function refreshAllPriorityPairs(): Promise<FetchFeedResult[]> {
  const results: FetchFeedResult[] = [];
  const pairs = await listActiveFeedPairs();
  for (const pair of pairs) {
    try {
      const r = await fetchAndPersistFeedDigest(pair.countryCode, pair.sector);
      results.push(r);
    } catch (err) {
      results.push({
        status: "FETCH_FAILED",
        countryCode: pair.countryCode,
        sector: pair.sector,
        signalsCreated: 0,
        trendTrackerVarsCovered: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
