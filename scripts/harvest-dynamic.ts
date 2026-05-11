/**
 * harvest-dynamic.ts — Playwright crawler qui simule un user réel et capture
 * les bugs visibles (DOM `[object Object]`, console errors, tRPC 500, JS
 * exceptions, network failures).
 *
 * Complément du harvester static : trouve les bugs runtime que tsc/lint/audit
 * ne voient pas. Sortie : logs/harvest-dynamic-<ts>.{json,md} groupé par
 * class de bug pour fix-by-class NEFER.
 *
 * Prérequis :
 *   - `npm run dev` lancé en parallèle (le crawler ne le démarre pas)
 *   - DB seedée avec demo users (`npm run db:seed`) :
 *     - admin : alexandre@upgraders.com / Admin123!  → console
 *     - founder : client@cimencam.cm / Client123!   → cockpit
 *
 * Usage :
 *   npm run harvest:dynamic              # tout
 *   npm run harvest:dynamic -- --portal=cockpit
 *   npm run harvest:dynamic -- --portal=console
 *   npm run harvest:dynamic -- --max-pages=20
 *   npm run harvest:dynamic -- --no-screenshots
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page, type ConsoleMessage } from "playwright";

/**
 * Localise un chrome-headless-shell exécutable utilisable. Playwright 1.59
 * cherche par défaut chromium_headless_shell-1217, mais on tolère les caches
 * locaux existants (1208 dans ms-playwright, ou puppeteer cache) plutôt que
 * de forcer un téléchargement de 200MB à chaque dev fresh.
 */
function discoverChromiumExecutable(): string | undefined {
  // Ordre de priorité : prefer chrome-headless-shell (binaires complets, ~190MB)
  // sur chrome.exe (souvent stub launcher 3MB dans chromium-1208 ms-playwright).
  // Puppeteer cache priorisé sur Playwright cache car versions plus récentes.
  const candidates: string[] = [];
  const home = homedir();
  // 1. Puppeteer cache headless-shell (newest first)
  const puRoot = join(home, ".cache", "puppeteer", "chrome-headless-shell");
  try {
    const versions = readdirSync(puRoot).sort().reverse();
    for (const v of versions) {
      candidates.push(join(puRoot, v, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
    }
  } catch {/* dir may not exist */}
  // 2. Playwright cache chromium_headless_shell-*
  const pwRoot = join(home, "AppData", "Local", "ms-playwright");
  try {
    for (const dir of readdirSync(pwRoot)) {
      if (dir.startsWith("chromium_headless_shell-")) {
        candidates.push(join(pwRoot, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
      }
    }
  } catch {/* dir may not exist */}
  // 3. Playwright cache chromium-* (chrome.exe — souvent stub, last resort)
  try {
    for (const dir of readdirSync(pwRoot)) {
      if (dir.startsWith("chromium-") && !dir.startsWith("chromium_headless_shell-")) {
        candidates.push(join(pwRoot, dir, "chrome-win64", "chrome.exe"));
        candidates.push(join(pwRoot, dir, "chrome-win", "chrome.exe"));
      }
    }
  } catch {/* dir may not exist */}
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined;
}

// ── CONFIG ──────────────────────────────────────────────────────────

const ROOT = join(__dirname, "..");
const BASE_URL = process.env.HARVEST_BASE_URL ?? "http://localhost:3000";

const args = process.argv.slice(2);
const PORTAL_FILTER = (args.find((a) => a.startsWith("--portal="))?.slice(9) ?? "all") as
  | "all" | "cockpit" | "console" | "public";
const MAX_PAGES = Number(args.find((a) => a.startsWith("--max-pages="))?.slice(12) ?? 200);
const NO_SCREENSHOTS = args.includes("--no-screenshots");

const ACCOUNTS = {
  admin: { email: "alexandre@upgraders.com", password: "Admin123!", portal: "console" as const },
  founder: { email: "client@cimencam.cm", password: "Client123!", portal: "cockpit" as const },
};

// ── TYPES ───────────────────────────────────────────────────────────

interface Finding {
  page: string;          // route relatif au BASE_URL
  class: string;         // class de bug (pour fix-by-class)
  severity: "ERROR" | "WARN";
  detail: string;        // message bref
  fullMessage?: string;  // message complet si différent du detail
  source?: string;       // url/file qui a émis l'event
  screenshot?: string;   // path relative au logs/
}

interface PageResult {
  route: string;
  portal: "cockpit" | "console" | "public" | "other";
  loadTimeMs: number;
  status: "OK" | "ERROR" | "TIMEOUT" | "AUTH_REDIRECT";
  findings: Finding[];
}

// ── DISCOVERY ───────────────────────────────────────────────────────

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const s = statSync(full);
    if (s.isDirectory()) yield* walkFiles(full);
    else if (s.isFile() && entry === "page.tsx") yield full;
  }
}

function routeOf(absPath: string): string {
  const rel = relative(join(ROOT, "src/app"), absPath).replace(/\\/g, "/").replace(/\/page\.tsx$/, "");
  // Strip route groups (parens) and replace [param] with sample
  let r = "/" + rel.replace(/\([^)]+\)\//g, "").replace(/\([^)]+\)/g, "");
  r = r.replace(/\[\.\.\.[^\]]+\]/g, "demo"); // catch-all
  r = r.replace(/\[\[?([^\]]+)\]\]?/g, (_, name) => {
    // sensible samples per common param names
    if (name === "id" || name === "campaignId" || name === "brandId" || name === "strategyId") return "demo-strategy-cimencam";
    if (name === "token") return "demo-token";
    if (name === "key") return "executive-summary";
    return "demo";
  });
  if (r.endsWith("/")) r = r.slice(0, -1);
  if (r === "") r = "/";
  return r;
}

function portalOf(route: string): "cockpit" | "console" | "public" | "other" {
  if (route.startsWith("/cockpit")) return "cockpit";
  if (route.startsWith("/console")) return "console";
  if (
    route === "/" ||
    route.startsWith("/login") ||
    route.startsWith("/register") ||
    route.startsWith("/forgot-password") ||
    route.startsWith("/reset-password") ||
    route.startsWith("/changelog") ||
    route.startsWith("/status") ||
    route.startsWith("/privacy") ||
    route.startsWith("/intake") ||
    route.startsWith("/score") ||
    route.startsWith("/shared")
  ) return "public";
  return "other";
}

function discoverRoutes(): { route: string; portal: ReturnType<typeof portalOf> }[] {
  const out: { route: string; portal: ReturnType<typeof portalOf> }[] = [];
  for (const f of walkFiles(join(ROOT, "src/app"))) {
    if (f.includes("/api/") || f.includes("\\api\\")) continue;
    const route = routeOf(f);
    out.push({ route, portal: portalOf(route) });
  }
  return out;
}

// ── LOGIN ───────────────────────────────────────────────────────────

async function loginAs(
  browser: Browser,
  account: typeof ACCOUNTS.admin,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.fill("#email", account.email);
  await page.fill("#password", account.password);
  // NextAuth credentials provider uses XHR + manual router.push — race-prone.
  // Submit + wait for cookie OR URL change OR error message.
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => {
      // Auth cookie set? URL changed away from /login? Or error visible?
      const hasCookie = document.cookie.includes("next-auth.session-token") ||
                        document.cookie.includes("__Secure-next-auth.session-token") ||
                        document.cookie.includes("authjs.session-token") ||
                        document.cookie.includes("__Secure-authjs.session-token");
      const onLoginStill = window.location.pathname.startsWith("/login");
      const errorVisible = document.body.innerText.includes("Email ou mot de passe invalide") ||
                           document.body.innerText.includes("erreur est survenue");
      return hasCookie || !onLoginStill || errorVisible;
    },
    { timeout: 30_000 },
  ).catch(() => undefined);

  // NextAuth v5 beta : JWT cookie write peut prendre quelques 100ms après response.
  // Retry up to 3 fois avec waits progressifs pour absorber la race condition.
  let lastUrl = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.waitForTimeout(attempt * 1500); // 1.5s, 3s, 4.5s
    await page.goto(`${BASE_URL}/${account.portal}`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    lastUrl = page.url();
    if (!lastUrl.includes("/login")) break;
  }
  if (lastUrl.includes("/login")) {
    // Check for /unauthorized — would indicate wrong role, not auth failure
    if (lastUrl.includes("/unauthorized")) {
      await page.close();
      await ctx.close();
      throw new Error(`Login succeeded but ${account.email} role can't access /${account.portal} — redirected /unauthorized`);
    }
    const cookies = await ctx.cookies();
    const sessionCookie = cookies.find((c) => c.name.includes("session-token"));
    await page.close();
    await ctx.close();
    throw new Error(
      `Login failed for ${account.email} — redirected to /login from /${account.portal} after 3 retries. ` +
      `Session cookie: ${sessionCookie ? `set (${sessionCookie.name})` : "NOT SET"}.`
    );
  }
  await page.close();
  return ctx;
}

// ── CRAWL ───────────────────────────────────────────────────────────

async function crawlPage(page: Page, route: string, logsDir: string): Promise<PageResult> {
  const findings: Finding[] = [];
  const url = `${BASE_URL}${route}`;

  // Listeners
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter NextAuth dev noise + cors preflight noise
      if (text.includes("[next-auth][DEBUG]")) return;
      if (text.includes("favicon.ico")) return;
      findings.push({
        page: route,
        class: classifyConsoleError(text),
        severity: "ERROR",
        detail: text.slice(0, 200),
        fullMessage: text,
        source: msg.location().url,
      });
    }
  };
  const onPageError = (err: Error) => {
    findings.push({
      page: route,
      class: classifyPageError(err.message),
      severity: "ERROR",
      detail: err.message.slice(0, 200),
      fullMessage: err.stack ?? err.message,
    });
  };
  const onResponse = (resp: import("playwright").Response) => {
    const status = resp.status();
    if (status >= 500) {
      findings.push({
        page: route,
        class: status === 504 ? "network:timeout" : "network:5xx",
        severity: "ERROR",
        detail: `${status} ${resp.statusText()} ${new URL(resp.url()).pathname}`,
        source: resp.url(),
      });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const start = Date.now();
  let status: PageResult["status"] = "OK";

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Wait for hydration + idle network (best effort)
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    if (response && response.status() >= 500) {
      status = "ERROR";
    }

    // Auth redirect detection
    const finalUrl = page.url();
    if (finalUrl.includes("/login") && !route.startsWith("/login")) {
      status = "AUTH_REDIRECT";
      findings.push({
        page: route,
        class: "auth:unexpected-redirect",
        severity: "WARN",
        detail: `Redirected to ${new URL(finalUrl).pathname} (expected to reach ${route})`,
      });
    }

    // DOM scan for [object Object] rendering bug
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
    if (bodyText.includes("[object Object]")) {
      const snippet = bodyText.split("[object Object]")[0].slice(-80) + "[object Object]" +
        (bodyText.split("[object Object]")[1] ?? "").slice(0, 80);
      findings.push({
        page: route,
        class: "dom:object-object-rendered",
        severity: "ERROR",
        detail: "Page renders literal '[object Object]'",
        fullMessage: snippet,
      });
    }

    // Detect "Error" / "Erreur" boundary fallbacks
    const errorBoundaryHints = ["Application error", "Une erreur est survenue", "Quelque chose s'est mal passé"];
    for (const hint of errorBoundaryHints) {
      if (bodyText.includes(hint)) {
        findings.push({
          page: route,
          class: "dom:error-boundary-fallback",
          severity: "ERROR",
          detail: `Error boundary surfaced: "${hint}"`,
        });
        break;
      }
    }

    // Detect undefined/null leaked to DOM
    if (bodyText.match(/\bundefined\b/) && route !== "/changelog") {
      findings.push({
        page: route,
        class: "dom:undefined-leaked",
        severity: "WARN",
        detail: "Page contains literal 'undefined' in visible text",
      });
    }

    // Screenshot on error
    if (!NO_SCREENSHOTS && findings.some((f) => f.severity === "ERROR")) {
      const safeName = route.replace(/[/:?&=]/g, "_").replace(/^_/, "") || "root";
      const shotPath = `screenshots/${safeName}.png`;
      const absPath = join(logsDir, shotPath);
      mkdirSync(join(logsDir, "screenshots"), { recursive: true });
      await page.screenshot({ path: absPath, fullPage: false }).catch(() => undefined);
      findings.forEach((f) => {
        if (f.severity === "ERROR" && !f.screenshot) f.screenshot = shotPath;
      });
    }
  } catch (err) {
    status = err instanceof Error && err.message.includes("Timeout") ? "TIMEOUT" : "ERROR";
    findings.push({
      page: route,
      class: status === "TIMEOUT" ? "page:timeout" : "page:navigation-failed",
      severity: "ERROR",
      detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  }

  return { route, portal: portalOf(route), loadTimeMs: Date.now() - start, status, findings };
}

// ── CLASSIFY ────────────────────────────────────────────────────────

function classifyConsoleError(text: string): string {
  if (text.includes("Hydration")) return "react:hydration-mismatch";
  if (text.includes("Cannot read prop") || text.includes("Cannot read properties")) return "js:null-access";
  if (text.includes("Cannot destructure")) return "js:null-destructure";
  if (text.includes("is not a function")) return "js:not-a-function";
  if (text.includes("Maximum update depth")) return "react:infinite-loop";
  if (text.includes("Each child in a list should have a unique")) return "react:missing-key";
  if (text.includes("validateDOMNesting")) return "react:dom-nesting";
  if (text.includes("TRPCClientError")) return "trpc:client-error";
  if (text.includes("Warning:")) return "react:warning";
  if (text.includes("CORS") || text.includes("blocked")) return "network:cors-blocked";
  return "console:generic-error";
}

function classifyPageError(message: string): string {
  if (message.includes("ChunkLoadError")) return "js:chunk-load-failed";
  if (message.includes("hydrat")) return "react:hydration-mismatch";
  return "js:uncaught-exception";
}

// ── REPORT ──────────────────────────────────────────────────────────

interface ClassSummary {
  class: string;
  severity: "ERROR" | "WARN";
  count: number;
  pages: string[];          // 5 first
  sampleDetail: string;
}

function classify(results: PageResult[]): ClassSummary[] {
  const byClass = new Map<string, Finding[]>();
  for (const r of results) {
    for (const f of r.findings) {
      if (!byClass.has(f.class)) byClass.set(f.class, []);
      byClass.get(f.class)!.push(f);
    }
  }
  const out: ClassSummary[] = [];
  for (const [cls, items] of byClass) {
    const sev = items.some((i) => i.severity === "ERROR") ? "ERROR" : "WARN";
    out.push({
      class: cls,
      severity: sev,
      count: items.length,
      pages: Array.from(new Set(items.map((i) => i.page))).slice(0, 5),
      sampleDetail: items[0]!.detail,
    });
  }
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "ERROR" ? -1 : 1;
    return b.count - a.count;
  });
  return out;
}

function writeReport(results: PageResult[], logsDir: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const totalFindings = results.reduce((s, r) => s + r.findings.length, 0);
  const errorPages = results.filter((r) => r.status !== "OK").length;
  const classes = classify(results);

  const json = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    portalFilter: PORTAL_FILTER,
    pagesAttempted: results.length,
    pagesWithErrors: errorPages,
    totalFindings,
    classes,
    pageResults: results,
  };
  writeFileSync(join(logsDir, `harvest-dynamic-${ts}.json`), JSON.stringify(json, null, 2));

  let md = `# Harvest Dynamic — ${new Date().toISOString()}\n\n`;
  md += `**${results.length} pages crawled** — **${errorPages} with errors** (${totalFindings} findings total).\n\n`;
  md += `Portal filter: \`${PORTAL_FILTER}\` · Base URL: \`${BASE_URL}\`\n\n---\n\n`;
  md += `## Classes (fix-by-class)\n\n`;
  md += `| # | Class | Sev | Count | Sample page | Sample detail |\n`;
  md += `|---|---|---|---|---|---|\n`;
  classes.forEach((c, i) => {
    md += `| ${i + 1} | \`${c.class}\` | ${c.severity} | ${c.count} | \`${c.pages[0] ?? ""}\` | ${c.sampleDetail.slice(0, 80).replace(/\|/g, "\\|")} |\n`;
  });
  md += `\n---\n\n## Pages avec erreurs (${errorPages})\n\n`;
  for (const r of results) {
    if (r.status === "OK") continue;
    md += `### \`${r.route}\` — ${r.status} (${r.loadTimeMs}ms)\n\n`;
    for (const f of r.findings) {
      md += `- **${f.severity}** \`${f.class}\` : ${f.detail}\n`;
      if (f.screenshot) md += `  - screenshot: \`${f.screenshot}\`\n`;
    }
    md += `\n`;
  }
  writeFileSync(join(logsDir, `harvest-dynamic-${ts}.md`), md);

  console.log(`\n✓ Report: logs/harvest-dynamic-${ts}.{json,md}`);
  console.log(`  Classes: ${classes.length}`);
  console.log(`  Errors:  ${classes.filter((c) => c.severity === "ERROR").reduce((s, c) => s + c.count, 0)}`);
  console.log(`  Top 5 error classes:`);
  classes.filter((c) => c.severity === "ERROR").slice(0, 5).forEach((c) =>
    console.log(`    - ${c.class} × ${c.count}`),
  );
}

// ── PREFLIGHT ───────────────────────────────────────────────────────

async function preflight(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    if (res.status >= 600) return { ok: false, reason: `${BASE_URL} returned ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Cannot reach ${BASE_URL} — is 'npm run dev' running? (${err instanceof Error ? err.message : err})` };
  }
}

// ── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== HARVEST DYNAMIC La Fusée ===`);
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Portal   : ${PORTAL_FILTER}`);
  console.log(`Max pages: ${MAX_PAGES}`);
  console.log(`Screenshots: ${NO_SCREENSHOTS ? "OFF" : "ON"}\n`);

  // Preflight
  const pf = await preflight();
  if (!pf.ok) {
    console.error(`\n✗ Preflight failed: ${pf.reason}\n`);
    process.exit(2);
  }

  // Discover routes
  const allRoutes = discoverRoutes();
  const filtered = allRoutes.filter((r) => PORTAL_FILTER === "all" || r.portal === PORTAL_FILTER);
  const routes = filtered.slice(0, MAX_PAGES);
  console.log(`Discovered ${allRoutes.length} routes, ${filtered.length} after portal filter, crawling ${routes.length}.\n`);

  // Logs dir
  const logsDir = join(ROOT, "logs");
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  // Browser
  const executablePath = discoverChromiumExecutable();
  if (executablePath) {
    console.log(`Chromium: ${executablePath}`);
  } else {
    console.warn(`[WARN] No chrome-headless-shell found in caches — Playwright will try to download.`);
  }
  const browser = await chromium.launch({ headless: true, executablePath });
  const results: PageResult[] = [];

  try {
    // Public context (no auth)
    const publicCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let consoleCtx: BrowserContext | null = null;
    let cockpitCtx: BrowserContext | null = null;

    // Login flows (best effort — continue on failure for public-only crawls)
    if (routes.some((r) => r.portal === "console")) {
      try {
        consoleCtx = await loginAs(browser, ACCOUNTS.admin);
        console.log(`[OK] Logged in as ${ACCOUNTS.admin.email} (console)`);
      } catch (err) {
        console.warn(`[WARN] Console login failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (routes.some((r) => r.portal === "cockpit")) {
      try {
        cockpitCtx = await loginAs(browser, ACCOUNTS.founder);
        console.log(`[OK] Logged in as ${ACCOUNTS.founder.email} (cockpit)`);
      } catch (err) {
        console.warn(`[WARN] Cockpit login failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Crawl
    for (let i = 0; i < routes.length; i++) {
      const { route, portal } = routes[i]!;
      const ctx = portal === "console" ? consoleCtx : portal === "cockpit" ? cockpitCtx : publicCtx;
      if (!ctx) {
        results.push({ route, portal, loadTimeMs: 0, status: "ERROR", findings: [{
          page: route, class: "preflight:no-auth-context", severity: "WARN",
          detail: `No auth context for portal ${portal} (login failed earlier)`,
        }] });
        continue;
      }
      const page = await ctx.newPage();
      try {
        const result = await crawlPage(page, route, logsDir);
        results.push(result);
        const indicator = result.status === "OK" ? "✓" : "✗";
        const errs = result.findings.filter((f) => f.severity === "ERROR").length;
        console.log(`[${i + 1}/${routes.length}] ${indicator} ${route}  (${result.loadTimeMs}ms, ${errs} errs)`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  writeReport(results, logsDir);

  const errCount = results.reduce((s, r) => s + r.findings.filter((f) => f.severity === "ERROR").length, 0);
  process.exit(errCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("HARVEST DYNAMIC FATAL:", err);
  process.exit(2);
});
