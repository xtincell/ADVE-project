/**
 * Empreinte digitale — présence Wikipédia (ADR-0121 vague A). Axe A : notoriété /
 * notabilité culturelle publique. API REST officielle de Wikimedia (publique,
 * sans clé, ToS-OK), déterministe. Best-effort : jamais de throw.
 *
 * Contrat P22-1 (`ConnectorResult<T>`, cf. `src/domain/connector-result.ts`) —
 * même honnêteté que les collecteurs `*Info` voisins, exprimée dans le type
 * canonique de connecteur. Zéro clé (no-key) → ne retourne JAMAIS
 * `DEFERRED_AWAITING_CREDENTIALS` :
 *   - `LIVE` avec `hasPage:true`  — une page dédiée (type "standard") existe ;
 *   - `LIVE` avec `hasPage:false` — l'API a répondu 404 : négatif RÉEL (pas un
 *     zéro fabriqué — l'API a bien tranché « aucune page ») ;
 *   - `DEGRADED(VENDOR_OUTAGE)`   — panne réseau / non-200 / JSON illisible ;
 *   - `DEGRADED(INSUFFICIENT_DATA)` — pas de nom de marque à interroger.
 *
 * Une page de DÉSAMBIGUÏSATION ne compte PAS comme page dédiée (évite les faux
 * positifs « Orange », « Apple »…) : `hasPage` n'est vrai que pour `type ===
 * "standard"` — l'anti-fabrication prime, on sous-compte plutôt qu'inventer.
 *
 * Étiquette API Wikimedia : `User-Agent` descriptif obligatoire (cf.
 * https://meta.wikimedia.org/wiki/User-Agent_policy).
 */

import type { ConnectorResult } from "@/domain";

export interface WikipediaSignal {
  /** True ssi une page Wikipédia dédiée (type "standard") existe pour la marque. */
  hasPage: boolean;
  /** Titre de l'article (null si pas de page dédiée). */
  title: string | null;
  /** Résumé d'une phrase (null si absent ou pas de page dédiée). */
  extract: string | null;
  /** URL canonique de l'article (null si pas de page dédiée). */
  url: string | null;
  /** Wiki interrogé (ex. "fr", "en"). */
  lang: string;
}

/** User-Agent conforme à la politique Wikimedia (identifiant + contact). */
const WIKIPEDIA_USER_AGENT =
  "LaFusee-Footprint/1.0 (https://powerupgraders.com; contact@powerupgraders.com) UPgraders-OS";

/**
 * Parse une réponse de l'endpoint REST summary. Pur — testé sur fixtures.
 * `hasPage` n'est vrai que pour un article « standard » ; désambiguïsation /
 * "no-extract" → `hasPage:false` avec des champs nuls (jamais présenter une
 * non-page comme la page de la marque).
 */
export function parseWikipediaSummary(json: Record<string, unknown>, lang: string): WikipediaSignal {
  const type = typeof json.type === "string" ? json.type : "";
  if (type !== "standard") {
    return { hasPage: false, title: null, extract: null, url: null, lang };
  }
  const title = typeof json.title === "string" && json.title.trim() ? json.title.trim() : null;
  const extract = typeof json.extract === "string" && json.extract.trim() ? json.extract.trim() : null;
  const contentUrls = (json.content_urls ?? {}) as Record<string, unknown>;
  const desktop = (contentUrls.desktop ?? {}) as Record<string, unknown>;
  const url = typeof desktop.page === "string" ? desktop.page : null;
  return { hasPage: true, title, extract, url, lang };
}

export async function fetchWikipediaPresence(
  brandName: string | null | undefined,
  opts?: { timeoutMs?: number; lang?: string },
): Promise<ConnectorResult<WikipediaSignal>> {
  const name = (brandName ?? "").trim();
  const lang = (opts?.lang ?? "en").trim().toLowerCase() || "en";
  if (!name) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };

  const timeoutMs = opts?.timeoutMs ?? 6_000;
  try {
    // Titre : espaces → underscores puis encodage (Wikipédia résout casse +
    // redirections). encodeURIComponent protège le chemin (« / » → %2F).
    const title = encodeURIComponent(name.replace(/\s+/g, "_"));
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json", "User-Agent": WIKIPEDIA_USER_AGENT },
      redirect: "follow",
    });
    if (res.status === 404) {
      // L'API a répondu « pas de page » — négatif RÉEL, jamais un zéro fabriqué.
      return {
        state: "LIVE",
        data: { hasPage: false, title: null, extract: null, url: null, lang },
        observedAt: new Date().toISOString(),
      };
    }
    if (!res.ok) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
    const json = (await res.json()) as Record<string, unknown>;
    return { state: "LIVE", data: parseWikipediaSummary(json, lang), observedAt: new Date().toISOString() };
  } catch {
    return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  }
}
