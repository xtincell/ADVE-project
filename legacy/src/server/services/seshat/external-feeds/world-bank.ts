/**
 * Client DÉTERMINISTE de l'API World Bank Open Data (v2) — zéro LLM, zéro clé.
 *
 * Le Trend Tracker (49 variables macro/micro du pilier T) n'est PAS un champ
 * « llmable » : ce sont des agrégats factuels (PIB, inflation, pénétration
 * internet, urbanisation, Gini…). On les COLLECTE depuis des sources prédéfinies
 * — gratuites quand elles existent (World Bank ici), payantes ailleurs (cf.
 * `trend-collector.ts`) — et Seshat les FORMATE dans le schéma trendTracker.
 *
 * API publique, sans clé : https://api.worldbank.org/v2/country/{ISO2}/indicator/{CODE}
 * Les pays sont adressés en ISO2 (CM, NG, CI, ZA, MA…), supportés nativement.
 */

export interface WorldBankPoint {
  /** Valeur numérique récente non-nulle. */
  value: number;
  /** Année de la mesure (0 si indéterminée). */
  year: number;
  /** Code indicateur WB (ex: NY.GDP.MKTP.KD.ZG). */
  indicator: string;
  /** Code pays ISO2 demandé. */
  iso: string;
}

const WB_BASE = "https://api.worldbank.org/v2";
const TIMEOUT_MS = 8_000;

/**
 * Récupère la valeur récente NON-NULLE d'un indicateur WB pour un pays (ISO2).
 * `mrnev=1` = "most recent non-empty value" : l'API renvoie directement la
 * dernière mesure non-nulle. Best-effort : retourne null sur échec réseau,
 * 404, indicateur inexistant ou absence de donnée — ne throw jamais.
 */
export async function fetchWorldBankIndicator(
  iso2: string,
  indicator: string,
): Promise<WorldBankPoint | null> {
  const iso = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(iso) || !/^[A-Z0-9.]+$/i.test(indicator)) return null;

  const url = `${WB_BASE}/country/${iso}/indicator/${indicator}?format=json&mrnev=1&per_page=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LaFuseeBot/1.0 (+https://lafusee.upgraders.io/trust-center)",
        Accept: "application/json",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    // Forme WB : [ { page, pages, ... }, [ { value, date, ... }, ... ] ]
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
    const rows = json[1] as Array<Record<string, unknown>>;
    for (const row of rows) {
      const v = row?.value;
      if (typeof v === "number" && Number.isFinite(v)) {
        const d = row?.date;
        const year = typeof d === "string" ? parseInt(d, 10) : typeof d === "number" ? d : NaN;
        return { value: v, year: Number.isFinite(year) ? year : 0, indicator, iso };
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Récupère plusieurs indicateurs WB pour un pays, en parallèle (best-effort).
 * Les indicateurs sans donnée sont simplement absents du résultat.
 */
export async function fetchWorldBankBatch(
  iso2: string,
  indicators: string[],
): Promise<Record<string, WorldBankPoint>> {
  const settled = await Promise.all(
    indicators.map((ind) => fetchWorldBankIndicator(iso2, ind)),
  );
  const out: Record<string, WorldBankPoint> = {};
  settled.forEach((p, i) => {
    if (p) out[indicators[i]!] = p;
  });
  return out;
}
