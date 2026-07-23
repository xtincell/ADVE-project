/**
 * Empreinte digitale — demande de recherche via l'autocomplete public Google
 * (ADR-0121 vague A). Axe D : demande / marque-comme-requête. Quand Google
 * propose des complétions pour le nom de marque, la marque est une requête
 * réellement cherchée — signal de demande publique.
 *
 * ⚠️ ENDPOINT PUBLIC NON OFFICIEL (ToS-GRAY). `suggestqueries.google.com` n'est
 * PAS une API documentée. Posture conservatrice OBLIGATOIRE :
 *   - UNE seule requête par marque. JAMAIS de retry-storm, JAMAIS de batch à
 *     l'échelle. Timeout généreux ;
 *   - dégradation honnête (`ConnectorResult`) sur tout non-200 / parse illisible
 *     (`DEGRADED(VENDOR_OUTAGE)`) — jamais un signal inventé ;
 *   - REGISTERED-BUT-OFF PAR DÉFAUT : n'émet une requête réseau que si
 *     `SEARCH_AUTOCOMPLETE_ENABLED` est activé (choix opérateur explicite).
 *     Désactivé → `DEGRADED(MISSING_PREREQUISITE)` (l'opérateur peut l'activer,
 *     ce n'est pas une panne). « Honnête plutôt que téméraire ».
 *
 * Zéro clé (no-key) → ne retourne JAMAIS `DEFERRED_AWAITING_CREDENTIALS` (il n'y
 * a pas de credential à attendre : le verrou est un flag, pas une clé). Contrat
 * P22-1 (`ConnectorResult<T>`). Best-effort : jamais de throw.
 */

import type { ConnectorResult } from "@/domain";

export interface SearchAutocompleteSignal {
  /** Suggestions renvoyées par Google pour la requête = nom de marque. */
  suggestions: string[];
  /** True ssi ≥1 suggestion contient le nom de marque — Google reconnaît la marque comme requête (demande, axe D). */
  brandAppearsInOwnSuggest: boolean;
}

/**
 * Activation opérateur (défaut OFF). Endpoint non officiel ToS-gray : on ne
 * l'interroge que sur opt-in explicite via `SEARCH_AUTOCOMPLETE_ENABLED`.
 */
export function isSearchAutocompleteEnabled(): boolean {
  const v = (process.env.SEARCH_AUTOCOMPLETE_ENABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** Normalisation insensible casse/diacritiques pour la garde de mention. Pure. */
function normalizeSuggestToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Parse la réponse `client=firefox` : `[query, [sugg1, sugg2, ...]]`. Pur —
 * testé sur fixtures. Suggestions vides = négatif honnête (Google n'a pas de
 * complétion pour cette marque), jamais une absence présentée comme une panne.
 */
export function parseAutocompleteResponse(raw: unknown, brandName: string): SearchAutocompleteSignal {
  const arr = Array.isArray(raw) ? raw : [];
  const rawSuggestions = Array.isArray(arr[1]) ? (arr[1] as unknown[]) : [];
  const suggestions = rawSuggestions
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  const needle = normalizeSuggestToken(brandName);
  const brandAppearsInOwnSuggest =
    needle.length > 0 && suggestions.some((s) => normalizeSuggestToken(s).includes(needle));
  return { suggestions, brandAppearsInOwnSuggest };
}

export async function fetchSearchAutocomplete(
  brandName: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<ConnectorResult<SearchAutocompleteSignal>> {
  // Verrou ToS-gray : désactivé par défaut. Pas DEFERRED (pas de credential) —
  // l'unlock est une action opérateur, d'où MISSING_PREREQUISITE.
  if (!isSearchAutocompleteEnabled()) return { state: "DEGRADED", reason: "MISSING_PREREQUISITE" };

  const name = (brandName ?? "").trim();
  if (!name) return { state: "DEGRADED", reason: "INSUFFICIENT_DATA" };

  const timeoutMs = opts?.timeoutMs ?? 6_000;
  try {
    // UNE seule requête, single-shot (posture ToS). Pas de retry.
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
    // L'endpoint peut renvoyer un content-type text/javascript : lecture texte
    // puis JSON.parse tolérant (parse-fail → DEGRADED honnête, jamais un crash).
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
    }
    return { state: "LIVE", data: parseAutocompleteResponse(json, name), observedAt: new Date().toISOString() };
  } catch {
    return { state: "DEGRADED", reason: "VENDOR_OUTAGE" };
  }
}
