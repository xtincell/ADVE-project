/**
 * Tarsis external feeds (ADR-0037 PR-G).
 *
 * Generates an `EXTERNAL_FEED_DIGEST` KnowledgeEntry country+sector for
 * each priority pair, populating macroSignals + weakSignals + the Trend
 * Tracker 49 variables. Fed by LLM synthesis with the CONTEXTE PAYS
 * constraint block (PR-D pattern). Future iteration : replace LLM
 * synthesis with real RSS / Google News / Statista API once API keys
 * are provisioned via the Anubis Credentials Vault (ADR-0021).
 *
 * Cron orchestration : the Anubis scheduler can register one DAEMON per
 * priority pair. Out of scope for this PR — the service is callable
 * synchronously via FETCH_EXTERNAL_FEED intent.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { UNTRUSTED_NOTICE, sanitizeInline } from "@/server/services/utils/untrusted-content";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ExternalFeedDigestDataSchema } from "@/server/services/seshat/knowledge/schemas";
import { collectTrendTracker, countTrendTrackerCovered } from "./trend-collector";
import { feedSourcesFor } from "./feed-sources";
import { fetchRssText, parseRssItems, buildDigestFromItems, type RssItem } from "./rss";

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
  status: "OK" | "LLM_FAILED" | "VALIDATION_FAILED";
  /** Voie qui a produit le digest : RSS (déterministe, primaire) ou LLM (fallback). */
  mode?: "RSS" | "LLM" | "CACHED";
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
  const region = country?.region ?? "?";
  const ppp = country?.purchasingPowerIndex;

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
    const digest = ExternalFeedDigestDataSchema.safeParse({
      macroSignals,
      weakSignals,
      ...(ttCovered > 0 ? { trendTracker } : {}),
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
  // ── Fallback LLM (uniquement si RSS injoignable/vide — réseau bloqué, etc.) ───
  // Les 49 variables Trend Tracker (macro chiffrés pays×secteur : PIB, inflation,
  // pénétration mobile…) ne sont PAS demandées au LLM : un modèle ne doit jamais
  // deviner un agrégat macro-économique. Elles sont COLLECTÉES de façon
  // déterministe (World Bank — trend-collector.ts) puis injectées plus bas,
  // identiquement en mode RSS et LLM. Le LLM ne produit ici qu'une synthèse
  // QUALITATIVE des signaux.

  // LOT 1e — entrée non fiable neutralisée (anti-injection). Les vrais items
  // RSS (vecteur attaquant) ne transitent PAS par cet appel : ils passent par
  // la voie déterministe `buildDigestFromItems` qui court-circuite avant ce
  // fallback. Restent ici `sector`/`countryName` (params intent / dérivés
  // saisie), neutralisés inline ; `countryCode`/`region`/`ppp` viennent de la
  // table Country (taxonomie interne).
  const sectorSafe = sanitizeInline(sector, { max: 120 });
  const countryNameSafe = sanitizeInline(countryName, { max: 120 });
  const systemPrompt = `${UNTRUSTED_NOTICE}

Tu es un agrégateur de feed sectoriel. Tu produis un digest qualitatif macro/micro pour un pays + secteur donné.

CONTEXTE PAYS — CONTRAINTE DURE :
- Pays : ${countryNameSafe} (${countryCode}) — région ${region}${ppp !== undefined ? ` — PPP ${ppp}` : ""}
- Secteur : ${sectorSafe}
- Tous les signaux DOIVENT être plausibles dans ${countryNameSafe} pour ${sectorSafe}.
- N'invente AUCUN chiffre précis (PIB, taux, montants, parts de marché). Décris des tendances QUALITATIVES. Si tu n'as pas de tendance fiable, retourne MOINS de signaux plutôt que d'en inventer.

Format JSON strict (UNIQUEMENT ces deux clés) :
{
  "macroSignals": [{ "trend": "...", "evidence": "...", "timeHorizon": "SHORT|MEDIUM|LONG" }] (3-6),
  "weakSignals": [{ "event": "...", "causalChain": ["...", "..."], "impactCategory": "...", "urgency": "LOW|MEDIUM|HIGH|CRITICAL" }] (1-3)
}`;

  const llmResult = await callLLM({
    system: systemPrompt,
    prompt: `Synthétise le digest qualitatif ${countryCode} × ${sectorSafe}. JSON uniquement, les deux clés macroSignals et weakSignals.`,
    caller: "seshat:external-feeds",
    maxOutputTokens: 2000,
  });

  const raw = llmResult.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { status: "LLM_FAILED", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: 0, error: "No JSON in LLM response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch (err) {
    return { status: "LLM_FAILED", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: 0, error: err instanceof Error ? err.message : String(err) };
  }

  const validated = ExternalFeedDigestDataSchema.safeParse({
    ...((parsed as Record<string, unknown>) ?? {}),
    // trendTracker = déterministe (World Bank), jamais issu du LLM. Injecté APRÈS
    // le spread pour écraser tout chiffre que le modèle aurait émis par erreur.
    ...(ttCovered > 0 ? { trendTracker } : {}),
    generatedAt: new Date().toISOString(),
    feedSource: "tarsis-llm-synthesis",
  });
  if (!validated.success) {
    return { status: "VALIDATION_FAILED", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: 0, error: validated.error.message.slice(0, 200) };
  }

  const trendTrackerVarsCovered = ttCovered;
  const signalsCreated = (validated.data.macroSignals?.length ?? 0) + (validated.data.weakSignals?.length ?? 0);

  const entry = await db.knowledgeEntry.create({
    data: {
      entryType: "EXTERNAL_FEED_DIGEST",
      sector,
      countryCode,
      market: countryCode,
      data: JSON.parse(JSON.stringify(validated.data)) as Prisma.InputJsonValue,
      sampleSize: signalsCreated,
    },
  });

  return {
    status: "OK",
    mode: "LLM",
    feedSource: "tarsis-llm-synthesis",
    countryCode,
    sector,
    entryId: entry.id,
    signalsCreated,
    trendTrackerVarsCovered,
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
        status: "LLM_FAILED",
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
