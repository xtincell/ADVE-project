/**
 * scripts/preview-landing-mobile.ts — Mobile landing preview generator.
 *
 * Capture la landing page en viewport mobile et exporte :
 *   - 1 PDF full-page (scroll capturé, multi-pages A4)
 *   - 1 PNG full-page (screenshot continu pour review visuelle)
 *
 * Usage :
 *   1. Démarrer le dev server : `npm run dev` (port 3000 par défaut)
 *   2. Run : `npx tsx scripts/preview-landing-mobile.ts`
 *   3. Output : `reports/landing-mobile-<viewport>-<timestamp>.{pdf,png}`
 *
 * Variables d'environnement :
 *   - PREVIEW_URL   : base URL (default http://localhost:3000)
 *   - PREVIEW_PATH  : path relatif (default "/")
 *   - VIEWPORT      : "iphone14pro" | "iphonese" | "pixel5" (default iphone14pro)
 *   - WAIT_MS       : extra wait après networkidle (default 1500 — laisse animations finir)
 *   - DARK_MODE     : "true" pour forcer prefers-color-scheme dark (default false)
 *   - OUTPUT_DIR    : default "reports"
 *
 * Pourquoi puppeteer plutôt que playwright : déjà devDep `puppeteer ^24.42`,
 * pas besoin de Browser binaries supplémentaires (puppeteer télécharge Chromium
 * au `npm install`).
 *
 * Cf. CLAUDE.md règle UI : "For UI or frontend changes, start the dev server
 * and use the feature in a browser before reporting the task as complete."
 * Ce script est l'outil pour respecter ça en headless / sans display server.
 */

import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

// ─── Viewport presets (largeur × hauteur · DPR) ────────────────────────────

const VIEWPORTS = {
  iphone14pro: {
    label: "iPhone 14 Pro",
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  iphonese: {
    label: "iPhone SE",
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  pixel5: {
    label: "Pixel 5",
    width: 393,
    height: 851,
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

// ─── Config ────────────────────────────────────────────────────────────────

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:3000";
const PREVIEW_PATH = process.env.PREVIEW_PATH ?? "/";
const VIEWPORT_KEY = (process.env.VIEWPORT ?? "iphone14pro") as ViewportKey;
const WAIT_MS = Number(process.env.WAIT_MS ?? 1500);
const DARK_MODE = process.env.DARK_MODE === "true";
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? "reports";

if (!(VIEWPORT_KEY in VIEWPORTS)) {
  console.error(`[preview-mobile] unknown VIEWPORT '${VIEWPORT_KEY}'. Valid: ${Object.keys(VIEWPORTS).join(", ")}`);
  process.exit(1);
}

const viewport = VIEWPORTS[VIEWPORT_KEY];
const fullUrl = `${PREVIEW_URL.replace(/\/$/, "")}${PREVIEW_PATH}`;

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[preview-mobile] capture ${fullUrl}`);
  console.log(`[preview-mobile] viewport ${viewport.label} (${viewport.width}×${viewport.height} @ ${viewport.deviceScaleFactor}x DPR)`);
  console.log(`[preview-mobile] dark mode : ${DARK_MODE}`);

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[preview-mobile] created output dir : ${OUTPUT_DIR}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.emulate({
      viewport: {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      },
      userAgent: viewport.userAgent,
    });

    if (DARK_MODE) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    }

    console.log(`[preview-mobile] navigating...`);
    await page.goto(fullUrl, { waitUntil: "networkidle0", timeout: 60_000 });

    console.log(`[preview-mobile] waiting ${WAIT_MS}ms for animations...`);
    await new Promise((r) => setTimeout(r, WAIT_MS));

    // Trigger lazy-loaded sections by scrolling through the entire page,
    // then return to top before capture.
    await page.evaluate(async () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const step = window.innerHeight;
      for (let pos = 0; pos < scrollHeight; pos += step) {
        window.scrollTo(0, pos);
        await new Promise((r) => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 500));
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split(".")[0];
    const baseName = `landing-mobile-${VIEWPORT_KEY}-${timestamp}${DARK_MODE ? "-dark" : ""}`;
    const pdfPath = join(OUTPUT_DIR, `${baseName}.pdf`);
    const pngPath = join(OUTPUT_DIR, `${baseName}.png`);

    console.log(`[preview-mobile] exporting PDF : ${pdfPath}`);
    await page.pdf({
      path: pdfPath,
      width: `${viewport.width}px`,
      // height auto via printBackground + preferCSSPageSize override
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      // Each "page" = one viewport-height frame for easier review
      height: `${viewport.height}px`,
      pageRanges: "",
    });

    console.log(`[preview-mobile] exporting PNG screenshot : ${pngPath}`);
    await page.screenshot({
      path: pngPath as `${string}.png`,
      fullPage: true,
      type: "png",
    });

    // Stat the outputs to confirm they exist + report sizes
    const [pdfStat, pngStat] = await Promise.all([fs.stat(pdfPath), fs.stat(pngPath)]);

    console.log(`\n[preview-mobile] ✓ Done`);
    console.log(`  PDF : ${pdfPath} (${(pdfStat.size / 1024).toFixed(1)} KB)`);
    console.log(`  PNG : ${pngPath} (${(pngStat.size / 1024).toFixed(1)} KB)`);
    console.log(`\n  Open with : open ${pdfPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[preview-mobile] FAILED : ${err instanceof Error ? err.message : String(err)}`);
  console.error(`\nCommon issues :`);
  console.error(`  - Dev server not running ? Start with : npm run dev`);
  console.error(`  - Wrong port ? Override with : PREVIEW_URL=http://localhost:3001 npx tsx scripts/preview-landing-mobile.ts`);
  console.error(`  - Puppeteer not installed ? Run : npm install`);
  process.exit(1);
});
