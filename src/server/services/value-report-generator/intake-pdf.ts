/**
 * intake-pdf.ts — server-side rendering of the intake result page to a real .pdf.
 *
 * Uses puppeteer (full package — bundles its own Chromium) instead of
 * puppeteer-core + @sparticuz/chromium. Trade-off: install size ~300MB vs
 * a manual chromium binary, but works out-of-the-box across dev/prod and
 * removes the conditional-fallback fragility of oracle-pdf.ts.
 *
 * Public API: `renderIntakePdf({ token, baseUrl })` → Buffer.
 *
 * Auth model: the caller (the route handler) must validate the intake has a
 * paid IntakePayment row before invoking this service. This module trusts
 * its caller — it just renders.
 */

interface SessionCookie { name: string; value: string; url: string; httpOnly: boolean; secure: boolean; sameSite: "Lax" }

/** Forward only the existing session, scoped to our configured origin, never as a global header. */
export function intakePdfSessionCookies(baseUrl: string, header = ""): SessionCookie[] {
  const base = new URL(baseUrl);
  const configured = [process.env.NEXT_PUBLIC_BASE_URL, process.env.AUTH_URL, process.env.NEXTAUTH_URL]
    .filter((v): v is string => Boolean(v)).map(v => new URL(v).origin);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password
    || (!configured.includes(base.origin) && !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) {
    throw new Error("intake-pdf: application origin not configured");
  }
  return header.split(";").flatMap(part => {
    const at = part.indexOf("=");
    const name = part.slice(0, at).trim(), value = part.slice(at + 1).trim();
    if (at < 1 || !value || !/^(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?$/.test(name)) return [];
    return [{ name, value, url: base.origin, httpOnly: true, secure: base.protocol === "https:", sameSite: "Lax" as const }];
  });
}

interface PuppeteerLike {
  launch: (opts: unknown) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, opts?: unknown) => Promise<unknown>;
      pdf: (opts: unknown) => Promise<Uint8Array>;
      setViewport: (vp: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
      emulateMediaType: (type: string) => Promise<void>;
      setCookie: (...cookies: SessionCookie[]) => Promise<void>;
      waitForFunction: (expression: string, opts: { timeout: number }) => Promise<unknown>;
      evaluate: (fn: () => Promise<void>) => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
}

async function loadPuppeteer(): Promise<PuppeteerLike> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = (await import("puppeteer").catch(() => null)) as unknown as PuppeteerLike | null;
  if (!mod || typeof mod.launch !== "function") {
    throw new Error(
      "intake-pdf: `puppeteer` package not installed. Run `npm install puppeteer`.",
    );
  }
  return mod;
}

export interface RenderIntakePdfOptions {
  /** Public intake share token (url segment). */
  token: string;
  /** Base URL of the running app. Defaults to localhost:3000 in dev. */
  baseUrl?: string;
  /** A4 (default) or Letter. */
  format?: "A4" | "Letter";
  /** Existing ADMIN session from the authenticated route, memory only, never logged/persisted. */
  sessionCookieHeader?: string;
}

export interface IntakePdfResult {
  pdf: Buffer;
  bytes: number;
  generatedAt: Date;
}

export async function renderIntakePdf(opts: RenderIntakePdfOptions): Promise<IntakePdfResult> {
  const baseUrl =
    opts.baseUrl ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  // The page rechecks the same stored payment/session. A URL parameter is not a right.
  const cookies = intakePdfSessionCookies(baseUrl, opts.sessionCookieHeader);
  const renderUrl = new URL(`/intake/${encodeURIComponent(opts.token)}/result?pdfMode=1`, baseUrl).href;

  const puppeteer = await loadPuppeteer();

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 1 });
    if (cookies.length) await page.setCookie(...cookies);
    await page.goto(renderUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForFunction('document.querySelector(\'[data-intake-report-ready="true"]\') !== null', { timeout: 60_000 });
    // Tailwind v4 print queries kick in once we emulate the print media.
    await page.emulateMediaType("print");
    await page.evaluate(async () => { await document.fonts.ready; });

    const pdfBytes = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    });

    return {
      pdf: Buffer.from(pdfBytes),
      bytes: pdfBytes.length,
      generatedAt: new Date(),
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
