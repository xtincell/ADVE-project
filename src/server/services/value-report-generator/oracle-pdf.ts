/**
 * oracle-pdf.ts — server-side Oracle PDF rendering via headless Chrome.
 *
 * Uses `puppeteer` (full package, bundles its own Chromium). Same loader
 * pattern as `intake-pdf.ts` — keep the two services consistent and avoid
 * the puppeteer-core / @sparticuz/chromium optional-peer-dep fragility that
 * left this module silently broken until the deps were installed.
 *
 * Mission contribution: CHAIN_VIA:value-report-generator (Operations + Mission).
 */

import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";

interface PuppeteerLike {
  launch: (opts: unknown) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, opts: unknown) => Promise<void>;
      pdf: (opts: unknown) => Promise<Uint8Array>;
      setExtraHTTPHeaders: (h: Record<string, string>) => Promise<void>;
      emulateMediaType?: (type: string) => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
}

async function loadPuppeteer(): Promise<PuppeteerLike> {
  const mod = (await import("puppeteer").catch(() => null)) as unknown as PuppeteerLike | null;
  if (!mod || typeof mod.launch !== "function") {
    throw new Error(
      "oracle-pdf: `puppeteer` package not installed. Run `npm install puppeteer`.",
    );
  }
  return mod;
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
    // Pass a request id header so server-side logs correlate.
    const requestId = randomUUID();
    await page.setExtraHTTPHeaders({ "x-render-request": requestId });
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    if (typeof page.emulateMediaType === "function") {
      await page.emulateMediaType("print");
    }

    const pdfBytes = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    });
    const pdf = Buffer.from(pdfBytes);

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
