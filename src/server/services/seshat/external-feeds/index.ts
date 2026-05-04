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
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { ExternalFeedDigestDataSchema } from "@/server/services/seshat/knowledge/schemas";
import { TREND_TRACKER_49 } from "@/server/services/seshat/knowledge/trend-tracker-49";

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

export interface FetchFeedResult {
  status: "OK" | "LLM_FAILED" | "VALIDATION_FAILED";
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
    return { status: "OK", countryCode, sector, entryId: existing.id, signalsCreated: 0, trendTrackerVarsCovered: 0 };
  }

  const trendCatalog = TREND_TRACKER_49.map(
    (v) => `${v.code} (${v.category}) "${v.label}" [${v.unit}]`,
  ).join("\n");

  const systemPrompt = `Tu es un agrégateur de feed sectoriel. Tu produis un digest macro/micro pour un pays + secteur donné.

CONTEXTE PAYS — CONTRAINTE DURE :
- Pays : ${countryName} (${countryCode}) — région ${region}${ppp !== undefined ? ` — PPP ${ppp}` : ""}
- Secteur : ${sector}
- Tous les signaux DOIVENT être plausibles dans ${countryName} pour ${sector}. Si tu ne connais pas, retourne null pour la variable concernée — n'invente pas de chiffres.

Format JSON strict :
{
  "macroSignals": [{ "trend": "...", "evidence": "...", "timeHorizon": "SHORT|MEDIUM|LONG" }] (3-6),
  "weakSignals": [{ "event": "...", "causalChain": ["...", "..."], "impactCategory": "...", "urgency": "LOW|MEDIUM|HIGH|CRITICAL" }] (1-3),
  "trendTracker": {
    "<CODE>": { "value": <number|string>, "year": <number>, "source": "..." } | null
  }
}

49 variables Trend Tracker à remplir (retourne null si tu n'as pas l'info pour ${countryCode}) :
${trendCatalog}`;

  const llmResult = await callLLM({
    system: systemPrompt,
    prompt: `Synthétise le digest ${countryCode} × ${sector}. JSON uniquement.`,
    caller: "seshat:external-feeds",
    maxOutputTokens: 6000,
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
    generatedAt: new Date().toISOString(),
    feedSource: "tarsis-llm-synthesis",
  });
  if (!validated.success) {
    return { status: "VALIDATION_FAILED", countryCode, sector, signalsCreated: 0, trendTrackerVarsCovered: 0, error: validated.error.message.slice(0, 200) };
  }

  const trendTrackerVarsCovered = validated.data.trendTracker
    ? Object.keys(validated.data.trendTracker).filter((k) => validated.data.trendTracker![k]?.value != null).length
    : 0;
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
    countryCode,
    sector,
    entryId: entry.id,
    signalsCreated,
    trendTrackerVarsCovered,
  };
}

/**
 * Refresh all priority pairs in sequence. Used by the daily cron.
 */
export async function refreshAllPriorityPairs(): Promise<FetchFeedResult[]> {
  const results: FetchFeedResult[] = [];
  for (const pair of PRIORITY_PAIRS) {
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
