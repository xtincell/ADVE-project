/**
 * site-prober/browser.ts — real-browser pass (Playwright/Chromium).
 *
 * Catches the failures the HTTP layer can't see: console errors, uncaught
 * exceptions, hydration mismatches, failed XHR/fetch, broken <img>, and the
 * Next.js error overlay. Several browser contexts run in parallel to simulate
 * multiple simultaneous visitors ("plusieurs personnes").
 *
 * Degrades gracefully: if Chromium isn't installed, every page is returned with
 * a skippedReason instead of throwing — the HTTP report still stands.
 */

import type { BrowserResult, Finding, Severity } from "./types";
import type { ProberConfig } from "./config";

// Loaded lazily so the prober runs HTTP-only without Playwright present.
type ChromiumLike = {
  launch: (opts: { headless: boolean; args?: string[]; timeout?: number }) => Promise<BrowserLike>;
};
type BrowserLike = {
  newContext: (opts: { userAgent: string; ignoreHTTPSErrors: boolean }) => Promise<ContextLike>;
  close: () => Promise<void>;
};
type ContextLike = {
  newPage: () => Promise<PageLike>;
  close: () => Promise<void>;
  addCookies?: (cookies: unknown[]) => Promise<void>;
};

/** Chromium launch flags required to run headless in a container (no sandbox). */
export const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];
type PageLike = {
  on: (event: string, cb: (arg: unknown) => void) => void;
  goto: (url: string, opts: { waitUntil: string; timeout: number }) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  content: () => Promise<string>;
  close: () => Promise<void>;
};

export async function loadChromium(): Promise<ChromiumLike | null> {
  try {
    const mod = (await import("@playwright/test")) as unknown as {
      chromium: ChromiumLike;
    };
    return mod.chromium ?? null;
  } catch {
    try {
      const mod = (await import("playwright")) as unknown as {
        chromium: ChromiumLike;
      };
      return mod.chromium ?? null;
    } catch {
      return null;
    }
  }
}

async function probePage(
  ctx: ContextLike,
  url: string,
  cfg: ProberConfig,
): Promise<BrowserResult> {
  const res: BrowserResult = {
    url,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
    brokenImages: [],
    hadErrorOverlay: false,
    loadMs: 0,
  };
  const page = await ctx.newPage();
  const started = Date.now();
  try {
    page.on("console", (msg: unknown) => {
      const m = msg as { type: () => string; text: () => string };
      const type = m.type();
      const text = m.text();
      if (type === "error") res.consoleErrors.push(text.slice(0, 500));
      else if (type === "warning") res.consoleWarnings.push(text.slice(0, 300));
    });
    page.on("pageerror", (err: unknown) => {
      const e = err as Error;
      res.pageErrors.push(`${e.name}: ${e.message}`.slice(0, 500));
    });
    page.on("requestfailed", (req: unknown) => {
      const r = req as { url: () => string; method: () => string; failure: () => { errorText: string } | null };
      res.failedRequests.push({
        url: r.url(),
        method: r.method(),
        failure: r.failure()?.errorText ?? "unknown",
      });
    });
    page.on("response", (resp: unknown) => {
      const r = resp as { status: () => number; url: () => string };
      const s = r.status();
      if (s >= 400) res.badResponses.push({ url: r.url(), status: s });
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: cfg.timeoutMs });
    await page.waitForTimeout(1200); // let hydration + late XHR settle

    // Next.js error overlay / generic error text
    const html = await page.content();
    res.hadErrorOverlay =
      /nextjs-portal|__next-error|Application error: a (?:client|server)-side exception|Unhandled Runtime Error/i.test(
        html,
      );

    // Broken images (loaded but zero natural size)
    res.brokenImages = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll("img").forEach((img) => {
        const el = img as HTMLImageElement;
        if (el.complete && el.naturalWidth === 0 && el.src) bad.push(el.src);
      });
      return bad.slice(0, 30);
    });
  } catch (e) {
    res.skippedReason = `goto failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    res.loadMs = Date.now() - started;
    await page.close().catch(() => {});
  }
  return res;
}

/** Run the browser pass over `urls` with `parallel` simultaneous contexts.
 * When `cookies` are supplied (from an authenticated login) each context is
 * seeded with them, so the browser pass crawls behind the auth wall. */
export async function runBrowserPass(
  urls: string[],
  cfg: ProberConfig,
  parallel = 4,
  cookies?: unknown[],
): Promise<{ results: BrowserResult[]; skipped?: string }> {
  const chromium = await loadChromium();
  if (!chromium) {
    return {
      results: urls.map((u) => ({
        url: u,
        consoleErrors: [],
        consoleWarnings: [],
        pageErrors: [],
        failedRequests: [],
        badResponses: [],
        brokenImages: [],
        hadErrorOverlay: false,
        loadMs: 0,
        skippedReason: "playwright module not found",
      })),
      skipped: "Playwright not importable",
    };
  }

  let browser: BrowserLike;
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 30_000,
      args: LAUNCH_ARGS,
    });
  } catch (e) {
    return {
      results: urls.map((u) => ({
        url: u,
        consoleErrors: [],
        consoleWarnings: [],
        pageErrors: [],
        failedRequests: [],
        badResponses: [],
        brokenImages: [],
        hadErrorOverlay: false,
        loadMs: 0,
        skippedReason: "chromium launch failed",
      })),
      skipped: `Chromium launch failed (run: npx playwright install chromium). ${e instanceof Error ? e.message : ""}`,
    };
  }

  const results: BrowserResult[] = [];
  try {
    const queue = [...urls];
    const worker = async () => {
      const ctx = await browser.newContext({
        userAgent: cfg.userAgent,
        ignoreHTTPSErrors: true,
      });
      if (cookies?.length && ctx.addCookies) {
        await ctx.addCookies(cookies).catch(() => {});
      }
      try {
        for (;;) {
          const url = queue.shift();
          if (!url) break;
          results.push(await probePage(ctx, url, cfg));
          process.stdout.write(".");
        }
      } finally {
        await ctx.close().catch(() => {});
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker));
  } finally {
    await browser.close().catch(() => {});
  }
  process.stdout.write("\n");
  return { results };
}

/** Convert browser results into findings. */
export function analyzeBrowser(results: BrowserResult[]): Finding[] {
  const out: Finding[] = [];
  for (const r of results) {
    if (r.skippedReason) continue;
    const add = (sev: Severity, cat: string, title: string, detail: string, evidence?: string) =>
      out.push({ id: `${cat}:${r.url}:${title}`.slice(0, 200), severity: sev, category: cat, title, target: r.url, detail, evidence, source: "browser" });

    // Filter environment/Next.js noise so we don't cry wolf:
    //  - net::ERR_ABORTED on `?_rsc=` = Next.js RSC prefetch cancelled on
    //    navigation/tab-close (normal, not a failure)
    //  - SSL/cert errors = this sandbox's TLS-intercepting proxy, not the site
    const isNoise = (s: string) => /_rsc=|ERR_ABORTED|favicon|analytics|beacon|gtag|_vercel\/insights/.test(s);
    const isEnvCert = (s: string) => /SSL certificate|ERR_CERT/i.test(s);

    if (r.hadErrorOverlay) add("HIGH", "client-crash", "Page renders an error overlay/boundary", "Next.js error overlay or runtime exception detected in the DOM.");
    if (r.pageErrors.length) add("HIGH", "js-exception", `${r.pageErrors.length} uncaught JS exception(s)`, "Uncaught exceptions thrown during load.", r.pageErrors.slice(0, 3).join(" | "));
    const realConsole = r.consoleErrors.filter((e) => !isEnvCert(e) && !/ERR_ABORTED/.test(e));
    if (realConsole.length) add("MEDIUM", "console-error", `${realConsole.length} console error(s)`, "Errors logged to the browser console (e.g. a public page calling an authed endpoint → 401).", realConsole.slice(0, 3).join(" | "));
    const realFails = r.failedRequests.filter((f) => !isNoise(f.url) && !isNoise(f.failure));
    if (realFails.length) add("MEDIUM", "failed-request", `${realFails.length} failed network request(s)`, "Sub-resource or XHR/fetch requests genuinely failed (excluding cancelled prefetches).", realFails.slice(0, 3).map((f) => `${f.method} ${f.url} (${f.failure})`).join(" | "));
    const realBad = r.badResponses.filter((b) => !/favicon|_vercel\/insights|_rsc=/.test(b.url));
    if (realBad.length) add("MEDIUM", "subresource-4xx5xx", `${realBad.length} sub-resource error response(s)`, "Resources returned 4xx/5xx while loading the page.", realBad.slice(0, 4).map((b) => `${b.status} ${b.url}`).join(" | "));
    if (r.brokenImages.length) add("LOW", "broken-image", `${r.brokenImages.length} broken image(s)`, "Images that loaded with zero natural size.", r.brokenImages.slice(0, 5).join(" | "));
    if (r.consoleWarnings.some((w) => /hydrat/i.test(w))) add("MEDIUM", "hydration", "Hydration warning", "React hydration mismatch warning in console.", r.consoleWarnings.find((w) => /hydrat/i.test(w)));
  }
  return out;
}
