/**
 * Empreinte digitale — présence Google Business (ADR-0121 vague A).
 * Note + volume d'avis + extraits d'avis publics via actor Apify Google Maps.
 * Opt-in : `APIFY_MAPS_ACTOR_ID` (ex. `compass~crawler-google-places`) +
 * `APIFY_TOKEN`. Coût ~0,3-2 $/1000 résultats. Best-effort, zéro fabrication.
 */

export interface MapsPresence {
  status: "LIVE" | "DEFERRED_NO_KEY" | "NOT_FOUND" | "ERROR";
  placeName: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  topReviews: Array<{ text: string; stars: number }>;
}

const EMPTY = { placeName: null, rating: null, reviewCount: null, address: null, topReviews: [] as MapsPresence["topReviews"] };

/**
 * Parse un item place de l'actor crawler-google-places. Pur — fixtures.
 * Garde anti-faux-positif : le nom du lieu doit mentionner la marque
 * (vérifié par l'appelant via mentionsBrand — ici on ne fait qu'extraire).
 */
export function parseMapsPlaceItem(item: Record<string, unknown>): Omit<MapsPresence, "status"> | null {
  const placeName = (item.title as string | undefined) ?? (item.name as string | undefined) ?? null;
  if (!placeName) return null;
  const rating = typeof item.totalScore === "number" ? item.totalScore : typeof item.rating === "number" ? item.rating : null;
  const reviewCount =
    typeof item.reviewsCount === "number" ? item.reviewsCount : typeof item.userRatingCount === "number" ? item.userRatingCount : null;
  const address = (item.address as string | undefined) ?? null;
  const rawReviews = Array.isArray(item.reviews) ? (item.reviews as Array<Record<string, unknown>>) : [];
  const topReviews = rawReviews
    .filter((r) => typeof r.text === "string" && r.text.trim().length > 0)
    .slice(0, 3)
    .map((r) => ({ text: (r.text as string).slice(0, 280), stars: typeof r.stars === "number" ? r.stars : 0 }));
  return { placeName, rating, reviewCount, address, topReviews };
}

export async function fetchGoogleBusinessPresence(
  companyName: string,
  country: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<MapsPresence> {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_MAPS_ACTOR_ID;
  if (!token || !actorId || actorId === "off") return { status: "DEFERRED_NO_KEY", ...EMPTY };

  const timeoutMs = opts?.timeoutMs ?? 25_000;
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${Math.ceil(timeoutMs / 1000)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [`${companyName}${country ? ` ${country}` : ""}`],
          maxCrawledPlacesPerSearch: 1,
          maxReviews: 3,
          language: "fr",
        }),
        signal: AbortSignal.timeout(timeoutMs + 10_000),
      },
    );
    if (!res.ok) return { status: "ERROR", ...EMPTY };
    const items = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return { status: "NOT_FOUND", ...EMPTY };
    const parsed = parseMapsPlaceItem(items[0]!);
    if (!parsed) return { status: "NOT_FOUND", ...EMPTY };
    return { status: "LIVE", ...parsed };
  } catch {
    return { status: "ERROR", ...EMPTY };
  }
}
