/**
 * site-prober/analyzers.ts — turn raw HTTP results into Findings.
 *
 * Each analyzer is pure: (result, ctx) -> Finding[]. The "marked liquid" lives
 * here — every check is a tracer that lights up where the plumbing leaks.
 */

import type { Finding, HttpResult, Severity } from "./types";
import {
  EXPECTED_SECURITY_HEADERS,
  LEGACY_REDIRECTS,
  type ApiKind,
  type ProberConfig,
} from "./config";

const SLOW_MS = 4000;

function mk(
  severity: Severity,
  category: string,
  title: string,
  target: string,
  detail: string,
  evidence?: string,
  discoveredFrom?: string,
): Finding {
  return {
    id: `${category}:${target}:${title}`.slice(0, 200),
    severity,
    category,
    title,
    target,
    detail,
    evidence,
    source: "http",
    discoveredFrom,
  };
}

/** Patterns that should never appear in a public response body. */
const DISCLOSURE_PATTERNS: { re: RegExp; sev: Severity; what: string }[] = [
  { re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, sev: "CRITICAL", what: "private key" },
  { re: /\bsk-[a-zA-Z0-9]{20,}/, sev: "CRITICAL", what: "OpenAI-style secret key" },
  { re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}/, sev: "CRITICAL", what: "Stripe live secret" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, sev: "CRITICAL", what: "AWS access key id" },
  { re: /\bghp_[0-9A-Za-z]{30,}/, sev: "CRITICAL", what: "GitHub token" },
  { re: /postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/, sev: "CRITICAL", what: "Postgres DSN with credentials" },
  { re: /\bNEXTAUTH_SECRET\b\s*[:=]\s*["'][^"']+["']/, sev: "CRITICAL", what: "NextAuth secret" },
  { re: /PrismaClientKnownRequestError|PrismaClientValidationError/, sev: "HIGH", what: "Prisma error class in response" },
  { re: /\b(?:relation|column)\s+"[^"]+"\s+does not exist/, sev: "HIGH", what: "raw SQL error" },
  { re: /\bat\s+\/(?:home|Users|var|app)\/[^\s)]+\.(?:ts|tsx|js):\d+/, sev: "HIGH", what: "server stack trace with absolute path" },
  { re: /\b[A-Z]:\\(?:Users|Projects|dev)\\[^\s"']+/, sev: "MEDIUM", what: "Windows filesystem path" },
  { re: /webpack-internal:\/\//, sev: "LOW", what: "webpack-internal reference (dev artifact)" },
];

export function analyzeStatusAndAuth(r: HttpResult, authenticated = false): Finding[] {
  const out: Finding[] = [];
  const path = new URL(r.url).pathname;

  if (!r.ok) {
    out.push(
      mk("HIGH", "network-error", "Request failed (no response)", r.url, `Network-level failure after retries: ${r.networkError ?? "unknown"}`, undefined, r.discoveredFrom),
    );
    return out;
  }

  // Redirect loops
  if (r.redirectChain.length >= 6) {
    out.push(mk("HIGH", "redirect-loop", "Redirect chain too long / loop", r.url, `Followed ${r.redirectChain.length} hops without settling`, r.redirectChain.map((h) => `${h.status}→${h.location}`).join("  ")));
  }

  switch (r.expectation) {
    case "protected": {
      const redirectsToLogin =
        r.redirectChain.some((h) => /\/login/.test(h.location)) ||
        /\/login/.test(r.finalUrl);
      const bouncedUnauthorized = /\/unauthorized/.test(r.finalUrl);
      const blocked = r.status === 401 || r.status === 403 || redirectsToLogin || bouncedUnauthorized;
      if (authenticated) {
        // With a session the route SHOULD render. The findings flip:
        if (r.status >= 500) out.push(mk("CRITICAL", "server-error", "Protected page 5xx (authenticated)", r.url, `Status ${r.status} behind the auth wall — a real server error a logged-in user hits.`, snippet(r.bodySample)));
        else if (redirectsToLogin) out.push(mk("MEDIUM", "session-not-honored", "Protected route still bounces to /login", r.url, `Authenticated but redirected to login → session not honored, or the route over-restricts.`));
        else if (bouncedUnauthorized) out.push(mk("LOW", "role-insufficient", "Route refused for this role", r.url, `Authenticated session lacks the role for this route (→ /unauthorized). Use an ADMIN account for full coverage.`));
        else if (r.status === 404) out.push(mk("MEDIUM", "broken-link", "Protected route 404 (authenticated)", r.url, `Reachable route returns 404 for a logged-in user — dead branchement.`));
        else if (r.status >= 400) out.push(mk("MEDIUM", "client-error", `Protected page ${r.status} (authenticated)`, r.url, `Unexpected ${r.status} behind the auth wall.`));
      } else {
        if (r.status === 200 && !blocked) {
          out.push(mk("CRITICAL", "auth-leak", "Protected route served to anonymous user", r.url, `Expected redirect to /login or 401/403, got 200 (${r.bytes}b of ${r.contentType}). This route is declared protected in proxy.ts but is reachable without a session.`, snippet(r.bodySample)));
        } else if (!blocked && r.status !== 404) {
          out.push(mk("MEDIUM", "auth-anomaly", "Protected route returned unexpected status", r.url, `Expected login bounce / 401 / 403, got ${r.status} → ${r.finalUrl}`));
        }
      }
      break;
    }
    case "public": {
      if (r.status >= 500) out.push(mk("CRITICAL", "server-error", "Public page returns 5xx", r.url, `Status ${r.status} on an intended-public page`, snippet(r.bodySample)));
      else if (r.status === 404) out.push(mk("HIGH", "broken-link", "Public route 404", r.url, `Route is listed/linked as public but returns 404 — dead branchement`));
      else if (r.status >= 400) out.push(mk("MEDIUM", "client-error", `Public page ${r.status}`, r.url, `Unexpected ${r.status} on intended-public page`));
      break;
    }
    case "redirect": {
      const expectedTarget = LEGACY_REDIRECTS[path];
      const landed = r.finalUrl.replace(new URL(r.url).origin, "");
      if (r.status >= 400) {
        out.push(mk("HIGH", "broken-redirect", "Legacy redirect is dead", r.url, `Expected 3xx → ${expectedTarget}, got ${r.status}`));
      } else if (expectedTarget && !landed.startsWith(expectedTarget) && !/\/login/.test(landed)) {
        out.push(mk("LOW", "redirect-drift", "Legacy redirect lands elsewhere", r.url, `Expected → ${expectedTarget}, landed → ${landed}`));
      }
      break;
    }
    case "unknown": {
      if (r.status >= 500) out.push(mk("HIGH", "server-error", "Discovered link returns 5xx", r.url, `Status ${r.status}`, snippet(r.bodySample), r.discoveredFrom));
      else if (r.status === 404) out.push(mk("MEDIUM", "broken-link", "Discovered link 404", r.url, `Linked from a page but 404`, undefined, r.discoveredFrom));
      break;
    }
    case "api":
      // handled by analyzeApi
      break;
  }

  // Slow responses (any kind)
  if (r.ok && r.timingMs > SLOW_MS && r.status < 400) {
    out.push(mk("LOW", "slow-response", "Slow response", r.url, `${(r.timingMs / 1000).toFixed(1)}s (threshold ${SLOW_MS / 1000}s)`));
  }

  return out;
}

export function analyzeDisclosure(r: HttpResult): Finding[] {
  const out: Finding[] = [];
  if (!r.bodySample) return out;
  for (const p of DISCLOSURE_PATTERNS) {
    const m = r.bodySample.match(p.re);
    if (m) {
      out.push(mk(p.sev, "info-disclosure", `Possible ${p.what} in response`, r.url, `Pattern for "${p.what}" matched in the response body of a reachable URL.`, snippet(m[0])));
    }
  }
  // x-powered-by / server version leak
  const xpb = r.headers["x-powered-by"];
  if (xpb) out.push(mk("INFO", "header-leak", "x-powered-by header present", r.url, `Reveals stack: ${xpb}`));
  return out;
}

export function analyzeSecurityHeaders(r: HttpResult): Finding[] {
  // Only meaningful on successful HTML documents.
  if (!r.ok || r.status >= 400 || !/text\/html/.test(r.contentType)) return [];
  const out: Finding[] = [];
  for (const h of EXPECTED_SECURITY_HEADERS) {
    if (!(h.header in r.headers)) {
      out.push(mk(h.severity, "security-header", `Missing ${h.header}`, r.url, h.why));
    }
  }
  return out;
}

/** Does a JSON body look like a successfully-executed job? */
function looksExecuted(body: string): boolean {
  return /"(?:success|ok)"\s*:\s*true/.test(body) || /"(?:durationMs|processesExecuted|composed|sent|maintain)"\s*:/.test(body);
}

export function analyzeApi(
  r: HttpResult,
  meta: { mustNotLeak: boolean; note: string; kind: ApiKind; sideEffecting?: boolean },
): Finding[] {
  const { mustNotLeak, note, kind } = meta;
  const out: Finding[] = [];
  if (!r.ok) {
    const timedOut = /abort|timeout/i.test(r.networkError ?? "");
    if (timedOut && (kind === "cron" || kind === "test")) {
      out.push(mk("HIGH", "resource-exhaustion", "Unauthenticated endpoint hangs / long-running", r.url, `${note}: an anonymous GET did not return within the timeout. A slow, expensive endpoint with no auth is a DoS / denial-of-wallet vector (holds connections, burns serverless time, may invoke LLM/feed fetches).`, r.networkError));
    } else {
      out.push(mk("MEDIUM", "api-error", "API endpoint unreachable", r.url, `${note}: ${r.networkError}`));
    }
    return out;
  }

  const protectedOk = r.status === 401 || r.status === 403 || /\/login/.test(r.finalUrl);
  const body = r.bodySample.trim();

  // ── Smart, kind-aware verdicts ──
  if (kind === "cron") {
    if (r.status === 200 && looksExecuted(body)) {
      out.push(mk("CRITICAL", "unauth-cron", "Cron job executes for anonymous callers", r.url, `${note}: a plain anonymous GET ran the scheduled job and returned a success payload. Any visitor can trigger this on demand → data mutation, email/asset/LLM cost (denial-of-wallet), score/tier tampering. Cron routes must verify CRON_SECRET / the x-vercel-cron header.`, snippet(body)));
    } else if (r.status === 200) {
      out.push(mk("HIGH", "unauth-cron", "Cron endpoint answers 200 anonymously", r.url, `${note}: returned 200 without auth. Confirm it isn't doing privileged work.`, snippet(body)));
    } else if (!protectedOk && r.status < 500) {
      out.push(mk("LOW", "api-anomaly", "Cron endpoint unexpected status", r.url, `${note}: ${r.status} (expected 401)`));
    }
  } else if (kind === "test") {
    if (r.status === 200 || r.status === 500) {
      out.push(mk("CRITICAL", "test-endpoint-in-prod", "Test endpoint exposed in production", r.url, `${note}: reachable anonymously and runs test logic against the live system (creates DB records and/or echoes internal logs & the admin identity). Test routes must not ship to prod.`, snippet(body)));
    }
  } else if (kind === "mcp") {
    if (r.status === 200 && /"tools"|"server"/.test(body)) {
      out.push(mk("MEDIUM", "mcp-catalog-leak", "MCP tool catalog exposed without auth", r.url, `${note}: the per-server endpoint returns its full tool list + descriptions to anonymous callers, while /api/mcp itself returns 401. Inconsistent auth — verify POST (tool execution) is also rejected here.`, snippet(body)));
    }
  } else if (kind === "admin") {
    if (r.status >= 500) {
      out.push(mk("MEDIUM", "misconfig", "Admin endpoint misconfigured (500)", r.url, `${note}: returned ${r.status}. Fails closed (good) but is broken and the message leaks an internal env-var name.`, snippet(body)));
    } else if (r.status === 200 && body && !/^\s*(\{\s*\}|null)\s*$/.test(body)) {
      out.push(mk("HIGH", "auth-leak", "Admin endpoint answers 200 anonymously", r.url, `${note}: returned data without auth.`, snippet(body)));
    }
  } else {
    // generic
    if (r.status >= 500) out.push(mk("HIGH", "server-error", "API 5xx", r.url, `${note}: status ${r.status}`, snippet(body)));
    else if (mustNotLeak && r.status === 200 && !/^\s*(\{\s*\}|null|\[\s*\])\s*$/.test(body)) {
      out.push(mk("MEDIUM", "auth-leak", "Sensitive API answers 200 anonymously", r.url, `${note}: 200 with a non-empty body where a rejection was expected.`, snippet(body)));
    }
  }

  // Generic 5xx note for non-generic kinds too (except admin/test already handled)
  if (r.status >= 500 && kind !== "admin" && kind !== "test" && kind !== "generic") {
    out.push(mk("HIGH", "server-error", "API 5xx", r.url, `${note}: status ${r.status}`, snippet(body)));
  }

  // disclosure scan applies to API bodies too
  out.push(...analyzeDisclosure(r));
  return out;
}

export function analyzeSensitiveFile(r: HttpResult): Finding[] {
  if (!r.ok) return [];
  const path = new URL(r.url).pathname;
  // robots/sitemap are "should exist" rather than "should not"
  if (path === "/robots.txt" || path === "/sitemap.xml") {
    if (r.status === 404) {
      return [mk("LOW", "seo", `Missing ${path}`, r.url, `${path} returns 404 — crawlers get no guidance / no sitemap`)];
    }
    return [];
  }
  if (path === "/.well-known/security.txt" && r.status === 404) {
    return [mk("INFO", "seo", "No security.txt", r.url, "No /.well-known/security.txt for vuln reporting (best practice)")];
  }
  if (r.status === 200 && r.bytes > 0) {
    return [mk("CRITICAL", "exposed-file", `Sensitive file reachable: ${path}`, r.url, `Returned 200 (${r.bytes}b). Source/config/secret files must not be served.`, snippet(r.bodySample))];
  }
  return [];
}

function snippet(s: string, n = 280): string {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

export function runHttpAnalyzers(r: HttpResult, cfg: ProberConfig): Finding[] {
  return [
    ...analyzeStatusAndAuth(r, cfg.authenticated),
    ...analyzeDisclosure(r),
    ...analyzeSecurityHeaders(r),
  ];
}
