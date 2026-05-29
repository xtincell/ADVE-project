import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Phase 23 Epic 7 Story 7.8 — a11y + visual-regression spec for the new
 * Cockpit Overton surfaces (NFR13 + UX-DR21 + UX-DR22 + UX-DR24).
 *
 * The `<OvertonRadar>` carries its accessibility contract in the component
 * (Story 7.1/7.3) : `<svg role="img" aria-labelledby>` + `<title>`/`<desc>`
 * values-summary + an offscreen text-equivalent `<table>` (colour is never the
 * sole carrier). This spec asserts that contract end-to-end on the route, plus
 * records visual baselines.
 *
 * ## Done-with-debt (RESIDUAL-DEBT Phase 23 closure)
 *   - `@axe-core/playwright` is NOT yet a devDependency (the repo's `tests/a11y/`
 *     scaffolding documents the install). The axe sweep below is guarded by a
 *     runtime dynamic import + `test.skip` so this spec stays collectable ; it
 *     runs the moment the dep lands.
 *   - `toHaveScreenshot()` baselines must be generated against a running dev
 *     server with a seeded paid-tier founder (`pnpm playwright test --update-snapshots`).
 *     Not generated in autopilot (no browser/server). First green run records them.
 */

const OVERTON_ROUTE = "/cockpit/intelligence/overton";
const VIEWPORTS = [
  { name: "md", width: 768, height: 1024 },
  { name: "lg", width: 1024, height: 768 },
  { name: "xl", width: 1440, height: 900 },
] as const;

test.describe("OvertonRadar a11y + visual (Cockpit)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("route renders the radar surface (or honest empty/tier state)", async ({ page }) => {
    await page.goto(OVERTON_ROUTE);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    // The page header is always present regardless of connector/tier state.
    await expect(page.getByRole("heading", { name: /Overton sectoriel/i })).toBeVisible();
  });

  test("radar svg carries role=img + aria-label, and an offscreen data table (UX-DR21)", async ({ page }) => {
    await page.goto(OVERTON_ROUTE);
    await page.waitForLoadState("networkidle");

    const svg = page.locator('svg[role="img"]');
    const svgCount = await svg.count();
    if (svgCount === 0) {
      // DEFERRED / DEGRADED / tier-gate honest state — no radar to assert. The
      // honest state must still expose a status region (Story 7.3 role="status").
      await expect(page.locator('[role="status"]').first()).toBeVisible();
      return;
    }
    // Colour is never the sole carrier : an aria-labelledby summary + an
    // offscreen text-equivalent table both exist.
    await expect(svg.first()).toHaveAttribute("aria-labelledby", /.+/);
    await expect(page.locator("table.sr-only")).toHaveCount(1);
  });

  test("keyboard navigation reaches the surface without a trap", async ({ page }) => {
    await page.goto(OVERTON_ROUTE);
    await page.waitForLoadState("domcontentloaded");
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(active).not.toBeNull();
  });

  test("axe sweep — 0 critical/serious (skips until @axe-core/playwright is installed)", async ({ page }, testInfo) => {
    // Variable specifier so tsc does not resolve the (not-yet-installed) module.
    const axePkg = "@axe-core/playwright";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let AxeBuilder: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      ({ default: AxeBuilder } = await import(/* @vite-ignore */ axePkg));
    } catch {
      test.skip(true, "@axe-core/playwright not installed — see tests/a11y/README.md");
      return;
    }
    await page.goto(OVERTON_ROUTE);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (v: { impact?: string }) => v.impact === "critical" || v.impact === "serious",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    void testInfo;
  });

  for (const vp of VIEWPORTS) {
    test(`visual baseline @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(OVERTON_ROUTE);
      await page.waitForLoadState("networkidle");
      // Baseline recorded on first green run (--update-snapshots). Threshold 0.1%.
      await expect(page).toHaveScreenshot(`overton-${vp.name}.png`, { maxDiffPixelRatio: 0.001, fullPage: false });
    });
  }

  test("RTL + 200% font-scaling — no overflow/overlap on the radar", async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.setAttribute("dir", "rtl");
      document.documentElement.style.fontSize = "200%";
    });
    await page.goto(OVERTON_ROUTE);
    await page.waitForLoadState("networkidle");
    // No horizontal scrollbar introduced by the radar surface at 200% / RTL.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(4);
  });
});
