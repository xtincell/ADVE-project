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

// Pattern ASYNCHRONE en 2 temps (démarrer le run → poller court → lire le
// dataset) au lieu de `run-sync-get-dataset-items` : le long-poll tenait la
// connexion ouverte pendant tout le run de l'actor (30-75 s) et se faisait
// tuer par les intermédiaires qui coupent à ~60 s (NAT FAI mesuré test BK
// Abidjan 2026-07-20, proxys/edge en prod). Ici chaque requête dure < 8 s,
// et l'orchestrateur peut DÉMARRER tôt / RÉCOLTER tard — l'actor travaille
// chez Apify pendant que le reste du pipeline tourne.

export type MapsRunStart = { runId: string } | { status: "DEFERRED_NO_KEY" | "ERROR" };

const shortFetch = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });

/** Démarre le run Apify (requête courte). Ne lève jamais. */
export async function startGoogleBusinessRun(
  companyName: string,
  country: string | null | undefined,
): Promise<MapsRunStart> {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_MAPS_ACTOR_ID;
  if (!token || !actorId || actorId === "off") return { status: "DEFERRED_NO_KEY" };
  try {
    const startRes = await shortFetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [`${companyName}${country ? ` ${country}` : ""}`],
          maxCrawledPlacesPerSearch: 1,
          maxReviews: 3,
          language: "fr",
        }),
      },
    );
    if (!startRes.ok) return { status: "ERROR" };
    const started = (await startRes.json()) as { data?: { id?: string } };
    return started.data?.id ? { runId: started.data.id } : { status: "ERROR" };
  } catch {
    return { status: "ERROR" };
  }
}

/** Récolte le run (poll 4 s + dataset). Abort best-effort si la fenêtre expire. */
export async function collectGoogleBusinessRun(
  runId: string,
  opts?: { timeoutMs?: number },
): Promise<MapsPresence> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return { status: "DEFERRED_NO_KEY", ...EMPTY };
  const deadline = Date.now() + (opts?.timeoutMs ?? 25_000);
  try {
    let runStatus = "RUNNING";
    for (;;) {
      try {
        const st = await shortFetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`);
        if (st.ok) {
          const body = (await st.json()) as { data?: { status?: string } };
          runStatus = body.data?.status ?? "RUNNING";
          if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus)) break;
        }
      } catch {
        /* poll transitoire raté — on continue jusqu'à la deadline */
      }
      if (Date.now() >= deadline) break;
      await new Promise((r) => setTimeout(r, Math.min(4_000, Math.max(250, deadline - Date.now()))));
    }
    if (runStatus !== "SUCCEEDED") {
      // Fenêtre épuisée ou run mort : abort best-effort (ne pas brûler de
      // crédits sur un run que personne ne lira), verdict honnête.
      if (!["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus)) {
        shortFetch(`https://api.apify.com/v2/actor-runs/${runId}/abort?token=${encodeURIComponent(token)}`, {
          method: "POST",
        }).catch(() => undefined);
      }
      return { status: "ERROR", ...EMPTY };
    }

    const itemsRes = await shortFetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${encodeURIComponent(token)}&limit=3`,
    );
    if (!itemsRes.ok) return { status: "ERROR", ...EMPTY };
    const items = (await itemsRes.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return { status: "NOT_FOUND", ...EMPTY };
    const parsed = parseMapsPlaceItem(items[0]!);
    if (!parsed) return { status: "NOT_FOUND", ...EMPTY };
    return { status: "LIVE", ...parsed };
  } catch {
    return { status: "ERROR", ...EMPTY };
  }
}

/** Compat : démarre + récolte dans la même fenêtre (callers hors orchestrateur). */
export async function fetchGoogleBusinessPresence(
  companyName: string,
  country: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<MapsPresence> {
  const started = await startGoogleBusinessRun(companyName, country);
  if ("status" in started) return { status: started.status, ...EMPTY };
  return collectGoogleBusinessRun(started.runId, opts);
}
