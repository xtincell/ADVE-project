/**
 * site-prober/http.ts — dependency-free HTTP client + link extraction.
 *
 * Uses Node's global fetch (undici). Manual redirect following so we can record
 * the full chain and catch loops. Read-only: only GET/HEAD are ever issued.
 */

import type { HttpResult, RedirectHop, Expectation } from "./types";
import type { ProberConfig } from "./config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let requestsSent = 0;
export const getRequestCount = () => requestsSent;

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => (out[k] = v));
  return out;
}

async function rawFetch(
  url: string,
  cfg: ProberConfig,
  method: "GET" | "HEAD",
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    requestsSent++;
    return await fetch(url, {
      method,
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "user-agent": cfg.userAgent,
        accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Probe one URL: follow up to 6 redirects manually, capture the chain, time it,
 * and sample the final body for the disclosure scanner.
 */
export async function probeUrl(
  url: string,
  expectation: Expectation,
  cfg: ProberConfig,
  discoveredFrom?: string,
): Promise<HttpResult> {
  const started = Date.now();
  const redirectChain: RedirectHop[] = [];
  let current = url;
  let lastErr: string | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      if (cfg.jitterMs > 0) await sleep(Math.random() * cfg.jitterMs);
      let hops = 0;
      let res = await rawFetch(current, cfg, "GET");

      while (
        res.status >= 300 &&
        res.status < 400 &&
        res.headers.get("location") &&
        hops < 6
      ) {
        const loc = res.headers.get("location")!;
        redirectChain.push({ status: res.status, location: loc });
        current = new URL(loc, current).toString();
        hops++;
        if (cfg.jitterMs > 0) await sleep(Math.random() * cfg.jitterMs);
        res = await rawFetch(current, cfg, "GET");
      }

      const ct = res.headers.get("content-type") ?? "";
      let bodySample = "";
      let bytes = 0;
      // Only read text-ish bodies, capped.
      if (/text|json|xml|javascript|svg/.test(ct) || ct === "") {
        const buf = await res.arrayBuffer();
        bytes = buf.byteLength;
        bodySample = Buffer.from(buf)
          .toString("utf8")
          .slice(0, cfg.bodySampleBytes);
      } else {
        // binary — drain without storing
        const buf = await res.arrayBuffer();
        bytes = buf.byteLength;
      }

      return {
        url,
        expectation,
        ok: true,
        status: res.status,
        finalUrl: current,
        redirectChain,
        contentType: ct,
        bytes,
        timingMs: Date.now() - started,
        headers: headersToObject(res.headers),
        bodySample,
        discoveredFrom,
      };
    } catch (e) {
      lastErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      if (attempt < cfg.maxRetries) {
        await sleep(2 ** attempt * 500); // backoff: 500ms, 1s, 2s
        current = url; // reset chain on retry
        redirectChain.length = 0;
      }
    }
  }

  return {
    url,
    expectation,
    ok: false,
    status: 0,
    finalUrl: current,
    redirectChain,
    contentType: "",
    bytes: 0,
    timingMs: Date.now() - started,
    headers: {},
    bodySample: "",
    networkError: lastErr,
    discoveredFrom,
  };
}

/** Cheap HEAD for asset liveness checks. Falls back to GET if HEAD is blocked. */
export async function headUrl(
  url: string,
  cfg: ProberConfig,
): Promise<number> {
  try {
    const res = await rawFetch(url, cfg, "HEAD");
    if (res.status === 405 || res.status === 501) {
      const g = await rawFetch(url, cfg, "GET");
      return g.status;
    }
    return res.status;
  } catch {
    return 0;
  }
}

const SKIP_SCHEMES = /^(mailto:|tel:|javascript:|data:|blob:|#)/i;

/** Decode the handful of HTML entities that show up in href/src attributes. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x2[fF];/g, "/")
    .replace(/&#0?47;/g, "/")
    .replace(/&#x3[dD];/g, "=")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Extract same-origin links and same-origin asset URLs from an HTML body.
 * Regex-based (no cheerio dep) — good enough for a crawler/asset map.
 */
export function extractLinks(
  html: string,
  pageUrl: string,
  origin: string,
): { links: string[]; assets: string[]; external: string[] } {
  const links = new Set<string>();
  const assets = new Set<string>();
  const external = new Set<string>();

  const push = (rawIn: string, kind: "link" | "asset") => {
    const raw = decodeEntities(rawIn.trim());
    if (!raw || SKIP_SCHEMES.test(raw)) return;
    let abs: URL;
    try {
      abs = new URL(raw, pageUrl);
    } catch {
      return;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return;
    abs.hash = "";
    const norm = abs.toString();
    if (abs.origin === origin) {
      (kind === "link" ? links : assets).add(norm);
    } else if (kind === "link") {
      external.add(norm);
    }
  };

  // <a href>, <area href>, <link href>
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) {
    push(m[1]!, "link");
  }
  // assets: src= on script/img/source, href on <link rel=stylesheet/icon>
  for (const m of html.matchAll(/\b(?:src|srcset)\s*=\s*["']([^"']+)["']/gi)) {
    // srcset may contain multiple; take the first URL token
    const first = m[1]!.split(",")[0]!.trim().split(/\s+/)[0]!;
    push(first, "asset");
  }
  for (const m of html.matchAll(
    /<link\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi,
  )) {
    push(m[1]!, "asset");
  }

  return {
    links: [...links],
    assets: [...assets],
    external: [...external],
  };
}
