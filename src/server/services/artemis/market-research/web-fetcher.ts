/**
 * MarketResearch — web-fetcher (ADR-0037 PR-I + ADR-0060 manual-first parity).
 *
 * Operator can provide N source URLs as input to a market research run.
 * We fetch each URL server-side, extract its text content, and feed it
 * to the LLM as grounded context. Anti-fabrication contract : every
 * datapoint claimed in the report MUST cite one of these URLs as source.
 *
 * SSRF hardening :
 *   - Only http / https schemes accepted.
 *   - Hostname denylist (loopback, link-local, RFC1918 private ranges).
 *   - Max response body size : 5 MB.
 *   - Hard timeout : 12 s per URL.
 *   - Total wall-clock budget : 60 s for the whole batch (callers should
 *     set their own AbortController if a tighter budget is needed).
 *
 * Round-8 : `isUrlAllowed` reste un pré-filtre regex SYNC (consommé par
 * `seshat/web-search` + son test) ; le fetch réel passe par `ssrfSafeFetch`
 * (`@/lib/net/ssrf-guard`) qui ajoute la résolution DNS (ferme l'IP décimale +
 * le nom public résolvant vers du privé) ET la re-validation de chaque
 * redirection — l'ancien suivi automatique menait un 302 vers du privé.
 */

import { ssrfSafeFetch } from "@/lib/net/ssrf-guard";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

export interface FetchedSource {
  url: string;
  ok: boolean;
  status: number;
  contentType?: string;
  text?: string;
  error?: string;
  bytesRead: number;
}

export function isUrlAllowed(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `unsupported protocol "${parsed.protocol}"` };
  }
  // Node URL.hostname for IPv6 keeps the brackets ("[::1]"). Strip them
  // before regex matching so the loopback / private patterns work.
  const host = parsed.hostname.replace(/^\[/, "").replace(/\]$/, "");
  for (const pat of PRIVATE_HOST_PATTERNS) {
    if (pat.test(host)) {
      return { ok: false, reason: `hostname "${parsed.hostname}" is not allowed` };
    }
  }
  return { ok: true, url: parsed };
}

/**
 * Fetch a single URL and return its text body. Truncates aggressively at
 * MAX_BODY_BYTES. HTML is returned as-is — the LLM is good at digesting
 * raw HTML ; cleaning it server-side adds latency without quality gain
 * for small budgets (Claude tolerates HTML noise).
 */
export async function fetchSourceUrl(rawUrl: string): Promise<FetchedSource> {
  const validated = isUrlAllowed(rawUrl);
  if (!validated.ok) {
    return { url: rawUrl, ok: false, status: 0, error: validated.reason, bytesRead: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // `isUrlAllowed` (ci-dessus) n'est qu'un pré-filtre regex sans DNS ;
    // `ssrfSafeFetch` résout le DNS + re-valide chaque redirection (redirect
    // MANUEL) — c'est lui qui ferme le SSRF, pas le pré-filtre.
    const response = await ssrfSafeFetch(rawUrl, {
      method: "GET",
      headers: {
        "user-agent": "LaFusee-MarketResearch/1.0 (Seshat governor; contact via Console)",
        accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? undefined;

    if (!response.ok) {
      return {
        url: rawUrl,
        ok: false,
        status: response.status,
        contentType,
        error: `HTTP ${response.status} ${response.statusText}`,
        bytesRead: 0,
      };
    }

    // Stream-read with a hard cap so we don't OOM on large files.
    const reader = response.body?.getReader();
    if (!reader) {
      return { url: rawUrl, ok: false, status: response.status, contentType, error: "no response body", bytesRead: 0 };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    let truncated = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const text = merged.toString("utf-8");

    return {
      url: rawUrl,
      ok: true,
      status: response.status,
      contentType,
      text: truncated ? text + "\n[...truncated]" : text,
      bytesRead: total,
    };
  } catch (err) {
    return {
      url: rawUrl,
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
      bytesRead: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSources(urls: string[]): Promise<FetchedSource[]> {
  const dedup = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
  const results: FetchedSource[] = [];
  for (const url of dedup) {
    results.push(await fetchSourceUrl(url));
  }
  return results;
}
