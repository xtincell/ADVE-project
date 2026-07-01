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

import { db } from "@/lib/db";

interface PuppeteerLike {
  launch: (opts: unknown) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, opts?: unknown) => Promise<unknown>;
      pdf: (opts: unknown) => Promise<Uint8Array>;
      setViewport: (vp: { width: number; height: number; deviceScaleFactor?: number }) => Promise<void>;
      emulateMediaType: (type: string) => Promise<void>;
      waitForTimeout?: (ms: number) => Promise<void>;
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

  // Look up an existing paid reference for this intake. We pass it in the
  // result-page URL so the React page boots in `isPaid=true` state and the
  // PDF carries the full unlocked content. Auth is validated by the caller
  // (route handler) before calling this service — we just need the ref to
  // satisfy the page's client-side gate.
  const paid = await db.intakePayment.findFirst({
    where: { intakeToken: opts.token, status: "PAID" },
    orderBy: { paidAt: "desc" },
    select: { reference: true },
  });
  if (!paid) {
    throw new Error("intake-pdf: no paid IntakePayment for this token — cannot render");
  }

  const renderUrl = `${baseUrl}/intake/${opts.token}/result?ref=${encodeURIComponent(paid.reference)}&status=paid&pdfMode=1`;

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
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    // Tailwind v4 print queries kick in once we emulate the print media.
    await page.emulateMediaType("print");
    if (typeof page.waitForTimeout === "function") {
      // Small breather so any post-render async (fonts, images) settles.
      await page.waitForTimeout(500);
    }

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
