/**
 * Empreinte digitale — présence publicitaire Meta Ad Library (ADR-0121 vague A).
 * Données publiques de transparence publicitaire, via actor Apify (opt-in
 * `APIFY_ADS_ACTOR_ID`, ex. un scraper Facebook Ads Library). Best-effort.
 */

export interface AdsPresence {
  status: "LIVE" | "DEFERRED_NO_KEY" | "NOT_FOUND" | "ERROR";
  activeAdsCount: number | null;
  pageName: string | null;
}

const EMPTY = { activeAdsCount: null, pageName: null };

/** Parse les items ads-library (compte les ads actives). Pur — fixtures. */
export function parseAdsItems(items: Array<Record<string, unknown>>): Omit<AdsPresence, "status"> {
  if (items.length === 0) return EMPTY;
  const first = items[0]!;
  const pageName = (first.pageName as string | undefined) ?? (first.page_name as string | undefined) ?? null;
  return { activeAdsCount: items.length, pageName };
}

export async function fetchAdsPresence(
  companyName: string,
  opts?: { timeoutMs?: number },
): Promise<AdsPresence> {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_ADS_ACTOR_ID;
  if (!token || !actorId || actorId === "off") return { status: "DEFERRED_NO_KEY", ...EMPTY };

  const timeoutMs = opts?.timeoutMs ?? 20_000;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${Math.ceil(timeoutMs / 1000)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerms: [companyName], activeStatus: "active", resultsLimit: 25 }),
        signal: AbortSignal.timeout(timeoutMs + 10_000),
      },
    );
    if (!res.ok) return { status: "ERROR", ...EMPTY };
    const items = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return { status: "NOT_FOUND", ...EMPTY };
    return { status: "LIVE", ...parseAdsItems(items) };
  } catch {
    return { status: "ERROR", ...EMPTY };
  }
}
