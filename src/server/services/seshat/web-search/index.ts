/**
 * web-search — le point d'accès internet UNIQUE de La Fusée (ADR-0108, Phase 24).
 *
 * DOCTRINE (directive opérateur 2026-06-28) :
 *   « Tous les process impliquant internet doivent être câblés sur Brave si le
 *   modèle ne supporte pas la recherche internet. Les mécaniques internet sont
 *   gouvernées par Seshat : l'information est d'abord récoltée/stockée chez
 *   Seshat, puis les autres restent mécaniques. »
 *
 * Le modèle texte courant (owl-alpha / Claude via OpenRouter) n'a PAS de
 * recherche web native. Donc toute « recherche internet » passe par Brave Search,
 * et ce client EST le seul endroit qui parle à Brave. Avant, le code Brave était
 * dupliqué inline (rtis-cascade + quick-intake) — doublure supprimée ici.
 *
 * Découplage / honnêteté :
 *   - Sans `BRAVE_API_KEY` → `DEFERRED_NO_KEY` (jamais de hard-fail, jamais de
 *     résultat inventé) — le caller continue mécaniquement sur ce qu'il a.
 *   - Erreur réseau / timeout → `ERROR` (best-effort, le caller dégrade).
 *   - Filtrage SSRF optionnel via `isUrlAllowed` (web-fetcher) quand le caller
 *     compte ensuite FETCH les URLs.
 */

import { isUrlAllowed } from "@/server/services/artemis/market-research/web-fetcher";

export interface WebSearchHit {
  title: string;
  url: string;
  description: string;
}

export type WebSearchResult =
  | { status: "OK"; hits: WebSearchHit[] }
  | { status: "DEFERRED_NO_KEY" }
  | { status: "ERROR"; error: string };

export interface WebSearchOptions {
  /** Nombre de résultats (Brave `count`). Défaut 5, borné [1, 20]. */
  count?: number;
  /** Timeout réseau ms. Défaut 8000. */
  timeoutMs?: number;
  /** Ne garder que les URLs FETCHABLES (filtre SSRF `isUrlAllowed`). Défaut false. */
  allowlistOnly?: boolean;
}

const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

/** True ssi une clé Brave est configurée — signal de skip mécanique pour les callers. */
export function isBraveConfigured(): boolean {
  return !!process.env.BRAVE_API_KEY;
}

/**
 * Recherche web via Brave. Point d'accès internet canonique de La Fusée.
 * Ne lève jamais : renvoie un résultat discriminé honnête.
 */
export async function braveWebSearch(query: string, opts?: WebSearchOptions): Promise<WebSearchResult> {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return { status: "DEFERRED_NO_KEY" };

  const count = Math.min(Math.max(opts?.count ?? 5, 1), 20);
  const timeoutMs = opts?.timeoutMs ?? 8000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(BRAVE_ENDPOINT);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("count", String(count));

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json", "X-Subscription-Token": braveKey },
    });
    if (!res.ok) return { status: "ERROR", error: `Brave HTTP ${res.status}` };

    const data: unknown = await res.json();
    const rawResults =
      data && typeof data === "object" && "web" in data && data.web && typeof data.web === "object" && "results" in data.web
        ? (data.web as { results?: unknown }).results
        : undefined;
    const list = Array.isArray(rawResults) ? rawResults : [];

    const hits: WebSearchHit[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const u = typeof rec.url === "string" ? rec.url : null;
      if (!u) continue;
      if (opts?.allowlistOnly && !isUrlAllowed(u).ok) continue;
      hits.push({
        url: u,
        title: typeof rec.title === "string" ? rec.title : "",
        description: typeof rec.description === "string" ? rec.description : "",
      });
    }
    return { status: "OK", hits };
  } catch (err) {
    return { status: "ERROR", error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Formate des hits en bloc de grounding lisible (PUR). Le contenu vient
 * d'internet → l'appelant DOIT le neutraliser (`wrapUntrusted`) avant tout LLM.
 * "" si aucun hit.
 */
export function formatWebHits(hits: WebSearchHit[]): string {
  if (hits.length === 0) return "";
  return hits
    .map((h, i) => `[${i + 1}] ${h.title}\n${h.url}${h.description ? `\n${h.description}` : ""}`)
    .join("\n\n");
}
