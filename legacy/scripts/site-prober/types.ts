/**
 * site-prober/types.ts — shared types for the black-box production prober.
 *
 * Zero coupling to `src/**` on purpose: the prober is an external tester that
 * must run even when the app code doesn't compile. It only speaks HTTP.
 */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

/** How a route is *expected* to behave (derived from the app's own proxy.ts). */
export type Expectation =
  | "public" //   should answer 2xx (intended-public surface)
  | "protected" // should redirect to /login or answer 401/403 when anonymous
  | "redirect" //  legacy path, should 3xx to a known target
  | "api" //       API route, behaviour is endpoint-specific
  | "unknown"; //  discovered by crawl, no a-priori expectation

/** A single thing the bot decided is worth reporting. */
export interface Finding {
  id: string; // stable dedupe key
  severity: Severity;
  category: string; // e.g. "auth-leak", "server-error", "broken-link"
  title: string;
  target: string; // URL or procedure under test
  detail: string;
  evidence?: string; // snippet / header / status chain
  source: "http" | "browser" | "recon";
  discoveredFrom?: string; // referrer URL when found via crawl
}

/** One hop in a redirect chain. */
export interface RedirectHop {
  status: number;
  location: string;
}

/** Result of probing one URL over plain HTTP. */
export interface HttpResult {
  url: string;
  expectation: Expectation;
  ok: boolean; // network-level success (got a response)
  status: number; // final status after following redirects (0 = network error)
  finalUrl: string;
  redirectChain: RedirectHop[];
  contentType: string;
  bytes: number;
  timingMs: number;
  headers: Record<string, string>;
  bodySample: string; // capped sample of the body for disclosure scanning
  networkError?: string;
  discoveredFrom?: string;
}

/** Result of loading one URL in a real browser (Playwright). */
export interface BrowserResult {
  url: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[]; // uncaught exceptions
  failedRequests: { url: string; method: string; failure: string }[];
  badResponses: { url: string; status: number }[]; // subresource 4xx/5xx
  brokenImages: string[];
  hadErrorOverlay: boolean;
  loadMs: number;
  skippedReason?: string;
}

export interface ProbeReport {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  config: Record<string, unknown>;
  stats: {
    urlsProbed: number;
    requestsSent: number;
    pagesCrawled: number;
    browserPages: number;
    findingsBySeverity: Record<Severity, number>;
  };
  findings: Finding[];
  siteMap: { url: string; status: number; expectation: Expectation }[];
  httpResults: HttpResult[];
  browserResults: BrowserResult[];
}
