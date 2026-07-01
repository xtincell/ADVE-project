/**
 * site-prober/auth.ts — authenticated mode.
 *
 * Logs in once through the real `/login` form (Playwright fills #email/#password
 * and submits — NextAuth credentials), captures the session cookies, and hands
 * them back so both the HTTP phase (Cookie header) and the browser phase
 * (context cookies) crawl behind the auth wall as that account.
 *
 * Credentials come from env vars only (PROBE_EMAIL / PROBE_PASSWORD) — never
 * hard-coded. A single ADMIN-role account covers all four portals (proxy.ts
 * lists ADMIN in every role set). The crawl stays read-only (GET) even when
 * authenticated: it loads pages, it does not submit forms or mutate data.
 */

import type { ProberConfig } from "./config";
import { loadChromium, LAUNCH_ARGS } from "./browser";

export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface AuthResult {
  ok: boolean;
  cookieHeader?: string;
  cookies?: BrowserCookie[];
  landedUrl?: string;
  error?: string;
}

// NextAuth session cookie names (v5 authjs / legacy next-auth, secure or not).
const SESSION_COOKIE_RE = /(?:authjs|next-auth)\.session-token/;

// Minimal Playwright surface used here (the tool keeps hand-rolled types).
interface LoginPage {
  goto: (url: string, opts: { waitUntil: string; timeout: number }) => Promise<unknown>;
  fill: (selector: string, value: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  waitForURL: (pred: (u: URL) => boolean, opts: { timeout: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  url: () => string;
}
interface LoginContext {
  newPage: () => Promise<LoginPage>;
  cookies: () => Promise<BrowserCookie[]>;
}
interface LoginBrowser {
  newContext: (opts: { userAgent: string; ignoreHTTPSErrors: boolean }) => Promise<LoginContext>;
  close: () => Promise<void>;
}

const msg = (e: unknown) => (e instanceof Error ? e.message.split("\n")[0] : String(e));

export async function loginViaForm(cfg: ProberConfig): Promise<AuthResult> {
  if (!cfg.email || !cfg.password) {
    return { ok: false, error: "no credentials (set PROBE_EMAIL / PROBE_PASSWORD)" };
  }
  const chromium = await loadChromium();
  if (!chromium) return { ok: false, error: "Playwright/Chromium not available for login" };

  let browser: LoginBrowser;
  try {
    browser = (await chromium.launch({
      headless: true,
      timeout: 30_000,
      args: LAUNCH_ARGS,
    })) as unknown as LoginBrowser;
  } catch (e) {
    return { ok: false, error: `chromium launch failed (npx playwright install chromium): ${msg(e)}` };
  }

  try {
    const ctx = await browser.newContext({ userAgent: cfg.userAgent, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const loginUrl = new URL("/login", cfg.baseUrl).toString();

    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: cfg.timeoutMs });
    await page.fill("#email", cfg.email);
    await page.fill("#password", cfg.password);
    await page.click('button[type="submit"]');

    // Success = navigated away from /login. Tolerate a client-side redirect.
    await page
      .waitForURL((u: URL) => !u.pathname.startsWith("/login"), { timeout: cfg.timeoutMs })
      .catch(() => {});
    await page.waitForTimeout(1500);

    const cookies = await ctx.cookies();
    const landedUrl = page.url();
    await browser.close().catch(() => {});

    const hasSession = cookies.some((c) => SESSION_COOKIE_RE.test(c.name));
    if (!hasSession) {
      return {
        ok: false,
        landedUrl,
        error: `no session cookie after submit (landed ${landedUrl}) — wrong credentials, OAuth-only, or form changed`,
      };
    }
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    return { ok: true, cookieHeader, cookies, landedUrl };
  } catch (e) {
    await browser.close().catch(() => {});
    return { ok: false, error: msg(e) };
  }
}
