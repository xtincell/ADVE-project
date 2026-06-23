/**
 * site-prober/config.ts — what to hit and how to behave.
 *
 * Route classification mirrors `src/proxy.ts` so the bot can tell an honest
 * leak (protected route serving content anonymously) from expected behaviour
 * (protected route bouncing to /login). Seeds are explicit; the crawler then
 * discovers the rest from the live HTML.
 */

import type { Expectation } from "./types";

export interface ProberConfig {
  baseUrl: string;
  concurrency: number;
  timeoutMs: number;
  maxRetries: number;
  maxPages: number; // crawl cap
  maxDepth: number; // crawl depth cap
  jitterMs: number; // politeness jitter per request
  burstWaves: number; // load-simulation waves (0 = off)
  burstConcurrency: number;
  runBrowser: boolean;
  bodySampleBytes: number;
  outputDir: string;
  userAgent: string;
}

export const DEFAULT_CONFIG: ProberConfig = {
  baseUrl: process.env.PROBE_BASE_URL ?? "https://lafusee-app.vercel.app",
  concurrency: 10,
  timeoutMs: 20_000,
  maxRetries: 2,
  maxPages: 250,
  maxDepth: 4,
  jitterMs: 150,
  burstWaves: 0,
  burstConcurrency: 24,
  runBrowser: true,
  bodySampleBytes: 200_000,
  outputDir: "reports",
  userAgent:
    "LaFusee-SiteProber/1.0 (+authorized QA; owner=xtincell; read-only GET/HEAD)",
};

/**
 * Intended-public surface. The bot expects 2xx here; anything else is a
 * broken branchement worth a finding.
 */
export const PUBLIC_ROUTES: string[] = [
  "/",
  // marketing (route group "(marketing)")
  "/agence",
  "/blog",
  "/contact",
  "/la-guilde",
  "/lafusee",
  "/landingintake",
  "/methode",
  "/pricing",
  "/realisations",
  "/services",
  "/tarifs",
  // public (route group "(public)")
  "/LaGuilde",
  "/LaGuilde/publier",
  "/LaGuilde/rejoindre",
  "/argos",
  "/cgu",
  "/cgv",
  "/changelog",
  "/dpa",
  "/mentions-legales",
  "/privacy",
  "/sla",
  "/status",
  "/trust-center",
  // intake (public funnel)
  "/intake",
  "/score",
  "/launchpad/crew-bootstrap",
  "/launchpad/portfolio-bulk-import",
  // auth screens
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  // misc
  "/portals", // NB: declared PROTECTED in proxy.ts PROTECTED_ROUTES but absent
  //              from the middleware matcher — probe verifies which wins.
  "/unauthorized",
];

/**
 * Protected portals (proxy.ts PROTECTED_ROUTES + matcher). Anonymous access
 * must bounce to /login (307) or answer 401/403. A 200 with real content here
 * is a CRITICAL leak.
 */
export const PROTECTED_ROUTES: string[] = [
  "/console",
  "/console/governance/accounts",
  "/console/socle/pricing",
  "/console/anubis/credentials",
  "/console/seshat/argos",
  "/cockpit",
  "/cockpit/new",
  "/cockpit/brand/identity",
  "/cockpit/intelligence/overton",
  "/cockpit/settings",
  "/agency",
  "/agency/clients",
  "/agency/revenue",
  "/creator",
  "/creator/missions/available",
  "/creator/earnings/missions",
];

/**
 * Legacy redirects from proxy.ts LEGACY_REDIRECTS. Each should 3xx to its
 * target; a 404 means the wiring is dead.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/os": "/cockpit",
  "/os/dashboard": "/cockpit",
  "/os/missions": "/cockpit/operate/missions",
  "/impulsion": "/console/strategy-portfolio/clients",
  "/impulsion/clients": "/console/strategy-portfolio/clients",
  "/pilotis": "/creator",
  "/pilotis/missions": "/creator/missions/available",
  "/dashboard": "/cockpit",
  "/admin": "/console",
  "/talent": "/creator",
  "/diagnostic": "/intake",
  "/quick-diagnostic": "/intake",
  "/onboarding": "/intake",
  "/strategy": "/cockpit",
  "/campaigns": "/cockpit/operate/campaigns",
  "/missions": "/cockpit/operate/missions",
  "/guild": "/creator/community/guild",
  "/messages": "/cockpit/messages",
};

/**
 * API endpoints worth poking ANONYMOUSLY with a safe GET. We never POST to
 * webhooks/mutations — the bot is read-only and must not touch production data
 * or trigger payments/cron side effects.
 *
 * - `kind` drives smart severity (cron execution & test endpoints are far worse
 *   than a generic 200, because the GET itself does privileged work).
 * - `sideEffecting: true` → a single GET runs real work (sends mail, mutates
 *   DB, downloads paid assets). Probed once, never retried, never bursted, and
 *   skippable via `--skip-sideeffects`.
 * - `mustNotLeak: true` → a 200 returning data is a finding (should be 401/403).
 */
export type ApiKind = "cron" | "mcp" | "admin" | "test" | "generic";

export interface ApiProbe {
  path: string;
  mustNotLeak: boolean;
  note: string;
  kind: ApiKind;
  sideEffecting?: boolean;
}

export const API_PROBES: ApiProbe[] = [
  // Admin
  { path: "/api/admin/metrics", mustNotLeak: true, note: "admin-only metrics", kind: "admin" },
  // Test endpoints that must never ship to prod
  { path: "/api/test-e2e", mustNotLeak: true, note: "E2E test endpoint", kind: "test", sideEffecting: true },
  // Cron — every one of these must require CRON_SECRET / x-vercel-cron
  { path: "/api/cron/scheduler", mustNotLeak: true, note: "scheduler cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/sentinels", mustNotLeak: true, note: "sentinels cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/sentinel-handlers", mustNotLeak: true, note: "sentinel-handlers cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/founder-digest", mustNotLeak: true, note: "founder-digest cron (SENDS EMAIL)", kind: "cron", sideEffecting: true },
  { path: "/api/cron/external-feeds", mustNotLeak: true, note: "external-feeds cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/asset-impact", mustNotLeak: true, note: "asset-impact cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/auto-promotion", mustNotLeak: true, note: "auto-promotion cron (MUTATES TIERS)", kind: "cron", sideEffecting: true },
  { path: "/api/cron/feedback-loop", mustNotLeak: true, note: "feedback-loop cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/ops-sweep", mustNotLeak: true, note: "ops-sweep cron", kind: "cron", sideEffecting: true },
  { path: "/api/cron/ptah-download", mustNotLeak: true, note: "ptah-download cron (PULLS ASSETS)", kind: "cron", sideEffecting: true },
  // MCP per-server endpoints (aggregate /api/mcp should 401 — compare)
  { path: "/api/mcp", mustNotLeak: true, note: "MCP aggregate (expect 401)", kind: "mcp" },
  { path: "/api/mcp/seshat", mustNotLeak: true, note: "MCP seshat", kind: "mcp" },
  { path: "/api/mcp/artemis", mustNotLeak: true, note: "MCP artemis", kind: "mcp" },
  { path: "/api/mcp/creative", mustNotLeak: true, note: "MCP creative", kind: "mcp" },
  { path: "/api/mcp/guild", mustNotLeak: true, note: "MCP guild", kind: "mcp" },
  { path: "/api/mcp/intelligence", mustNotLeak: true, note: "MCP intelligence", kind: "mcp" },
  { path: "/api/mcp/operations", mustNotLeak: true, note: "MCP operations", kind: "mcp" },
  { path: "/api/mcp/ptah", mustNotLeak: true, note: "MCP ptah", kind: "mcp" },
  { path: "/api/mcp/pulse", mustNotLeak: true, note: "MCP pulse", kind: "mcp" },
  { path: "/api/mcp/advertis-inbound", mustNotLeak: true, note: "MCP advertis-inbound", kind: "mcp" },
  // Generic — should be benign, recorded for completeness
  { path: "/api/nsp", mustNotLeak: false, note: "realtime sub-protocol (expect 400/401)", kind: "generic" },
  { path: "/api/auth/session", mustNotLeak: false, note: "NextAuth session (expect null/empty)", kind: "generic" },
  { path: "/api/push/vapid-key", mustNotLeak: false, note: "public VAPID key (ok public)", kind: "generic" },
  { path: "/api/widget/score", mustNotLeak: false, note: "embeddable score widget", kind: "generic" },
];

/** Common files that should NOT be reachable in prod. */
export const SENSITIVE_FILES: string[] = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.git/config",
  "/.git/HEAD",
  "/package.json",
  "/prisma/schema.prisma",
  "/next.config.js",
  "/next.config.mjs",
  "/server.js",
  "/.well-known/security.txt",
  "/robots.txt",
  "/sitemap.xml",
];

/** Pages we always load in the real browser (highest-value surfaces). */
export const BROWSER_SEED_PAGES: string[] = [
  "/",
  "/landingintake",
  "/pricing",
  "/intake",
  "/login",
  "/register",
  "/LaGuilde",
  "/argos",
  "/contact",
  "/methode",
  "/score",
];

/** Security headers we expect on HTML responses, with severity if missing. */
export const EXPECTED_SECURITY_HEADERS: {
  header: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  why: string;
}[] = [
  { header: "strict-transport-security", severity: "MEDIUM", why: "no HSTS — downgrade/MITM risk" },
  { header: "x-content-type-options", severity: "LOW", why: "missing nosniff — MIME sniffing" },
  { header: "content-security-policy", severity: "MEDIUM", why: "no CSP — XSS blast radius" },
  { header: "x-frame-options", severity: "LOW", why: "no frame protection (clickjacking)" },
  { header: "referrer-policy", severity: "LOW", why: "referrer may leak to third parties" },
  { header: "permissions-policy", severity: "LOW", why: "browser features not restricted" },
];

export function classify(path: string): Expectation {
  if (path.startsWith("/api/")) return "api";
  if (path in LEGACY_REDIRECTS) return "redirect";
  if (
    /^\/(console|cockpit|agency|creator)(\/|$)/.test(path) ||
    path === "/portals"
  ) {
    return "protected";
  }
  if (PUBLIC_ROUTES.includes(path)) return "public";
  return "unknown";
}
