/**
 * Empreinte digitale — performance du site (ADR-0121 vague A).
 * PageSpeed Insights API, gratuite (25 000 req/jour), env `PAGESPEED_API_KEY`.
 * Score performance mobile + LCP. Best-effort (PSI peut prendre 15-25 s —
 * time-box court, l'absence est honnête).
 */

export interface SitePerformance {
  status: "LIVE" | "DEFERRED_NO_KEY" | "ERROR" | "SKIPPED";
  performanceScore: number | null; // 0-100
  lcpMs: number | null;
}

const EMPTY = { performanceScore: null, lcpMs: null };

/** Parse la réponse PSI (lighthouseResult). Pur — fixtures. */
export function parsePsiResponse(json: Record<string, unknown>): Omit<SitePerformance, "status"> {
  const lighthouse = (json.lighthouseResult ?? {}) as Record<string, unknown>;
  const categories = (lighthouse.categories ?? {}) as Record<string, unknown>;
  const perf = (categories.performance ?? {}) as Record<string, unknown>;
  const audits = (lighthouse.audits ?? {}) as Record<string, unknown>;
  const lcp = (audits["largest-contentful-paint"] ?? {}) as Record<string, unknown>;
  const score = typeof perf.score === "number" ? Math.round(perf.score * 100) : null;
  const lcpMs = typeof lcp.numericValue === "number" ? Math.round(lcp.numericValue) : null;
  return { performanceScore: score, lcpMs };
}

export async function fetchSitePerformance(
  siteUrl: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<SitePerformance> {
  if (!siteUrl) return { status: "SKIPPED", ...EMPTY };
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return { status: "DEFERRED_NO_KEY", ...EMPTY };

  const timeoutMs = opts?.timeoutMs ?? 20_000;
  try {
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(siteUrl)}&strategy=mobile&category=performance&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { status: "ERROR", ...EMPTY };
    const json = (await res.json()) as Record<string, unknown>;
    return { status: "LIVE", ...parsePsiResponse(json) };
  } catch {
    return { status: "ERROR", ...EMPTY };
  }
}
