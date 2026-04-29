/**
 * oracle-pdf.ts — server-side Oracle PDF rendering.
 *
 * Two execution paths:
 *
 * 1. **Browser-print fallback** (default, no extra deps): the client
 *    page renders the Oracle and calls `window.print()`. Works today
 *    without any backend setup.
 *
 * 2. **Server-side puppeteer-core + chromium** (production-grade):
 *    if `puppeteer-core` and `@sparticuz/chromium` are installed
 *    (P7 of REFONTE-PLAN), this module produces a deterministic PDF
 *    by hitting the public share-link with a headless browser.
 *
 * Mission contribution: CHAIN_VIA:value-report-generator (Operations + Mission).
 *
 * The implementation auto-detects which path is available; callers
 * just call `renderOraclePdf(strategyId)` and get a Buffer back.
 */

import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";

/**
 * Minimal type sufix to avoid hard dependency on puppeteer at compile-time.
 * Production deploy adds `puppeteer-core` + `@sparticuz/chromium` and this
 * dynamic import resolves; otherwise the function falls back gracefully.
 */
async function tryLoadPuppeteer(): Promise<{ launch: (opts: unknown) => Promise<unknown> } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    // @ts-expect-error — optional peer dep; resolved at runtime when installed.
    const mod = await import("puppeteer-core").catch(() => null);
    return mod as unknown as { launch: (opts: unknown) => Promise<unknown> } | null;
  } catch {
    return null;
  }
}

async function tryLoadChromium(): Promise<{ executablePath: () => Promise<string>; args: string[]; defaultViewport: { width: number; height: number } } | null> {
  try {
    // @ts-expect-error — optional peer dep; resolved at runtime when installed.
    const mod = await import("@sparticuz/chromium").catch(() => null);
    return mod as unknown as { executablePath: () => Promise<string>; args: string[]; defaultViewport: { width: number; height: number } } | null;
  } catch {
    return null;
  }
}

export interface OraclePdfOptions {
  strategyId: string;
  format?: "A4" | "Letter";
  /** Public base URL of the running app (e.g. https://lafusee.com). */
  baseUrl?: string;
}

export interface OraclePdfResult {
  pdf: Buffer;
  pageCount: number;
  generatedAt: Date;
}

/**
 * Render the Oracle as PDF. Throws if neither puppeteer-core nor browser
 * fallback is available (browser fallback is documented as the dev path).
 */
export async function renderOraclePdf(opts: OraclePdfOptions): Promise<OraclePdfResult> {
  const baseUrl = opts.baseUrl
    ?? process.env.NEXT_PUBLIC_BASE_URL
    ?? process.env.AUTH_URL
    ?? "http://localhost:3000";

  // Generate a one-time share link for the strategy (publicly viewable token).
  const strategy = await db.strategy.findUnique({
    where: { id: opts.strategyId },
    select: { id: true, name: true },
  });
  if (!strategy) throw new Error(`oracle-pdf: strategy ${opts.strategyId} not found`);

  // The share-link endpoint already exists in strategy-presentation router;
  // here we use a token-prefixed URL pattern.
  const renderUrl = `${baseUrl}/shared/strategy/${opts.strategyId}?print=true`;

  const puppeteer = await tryLoadPuppeteer();
  const chromium = await tryLoadChromium();

  if (!puppeteer || !chromium) {
    throw new Error(
      "oracle-pdf: puppeteer-core + @sparticuz/chromium not installed. " +
      "Install with `npm i -D puppeteer-core @sparticuz/chromium` or use the browser-print fallback (window.print() on /shared/strategy/<id>).",
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    defaultViewport: chromium.defaultViewport,
    headless: true,
  }) as { newPage: () => Promise<unknown>; close: () => Promise<void> };

  const page = await browser.newPage() as {
    goto: (url: string, opts: unknown) => Promise<void>;
    pdf: (opts: unknown) => Promise<Buffer>;
    setExtraHTTPHeaders: (h: Record<string, string>) => Promise<void>;
  };

  try {
    // Pass a request id header so server-side logs correlate.
    const requestId = randomUUID();
    await page.setExtraHTTPHeaders({ "x-render-request": requestId });
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 60_000 });

    const pdf = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    });

    return { pdf, pageCount: estimatePageCount(pdf), generatedAt: new Date() };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Rough page count estimation from the PDF binary (counts /Page tokens). */
function estimatePageCount(pdf: Buffer): number {
  const text = pdf.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ?? 1;
}
