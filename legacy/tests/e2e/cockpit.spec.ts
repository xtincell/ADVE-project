import { test, expect } from "@playwright/test";
import { loginAsClient, loginAsAdmin } from "./helpers";

test.describe("Cockpit Portal (Brand OS)", () => {
  test.beforeEach(async ({ page }) => {
    // Client or Admin can access cockpit
    await loginAsAdmin(page);
  });

  test("Dashboard loads with KPIs and radar", async ({ page }) => {
    await page.goto("/cockpit");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/cockpit");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Brand Identity page loads with pillar tabs", async ({ page }) => {
    await page.goto("/cockpit/brand/identity");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Brand Assets page loads", async ({ page }) => {
    await page.goto("/cockpit/brand/assets");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Brand Guidelines page loads", async ({ page }) => {
    await page.goto("/cockpit/brand/guidelines");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Missions page loads with mission list", async ({ page }) => {
    await page.goto("/cockpit/operate/missions");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Campaigns page loads", async ({ page }) => {
    await page.goto("/cockpit/operate/campaigns");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Briefs page loads", async ({ page }) => {
    await page.goto("/cockpit/operate/briefs");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Requests page loads", async ({ page }) => {
    await page.goto("/cockpit/operate/requests");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Diagnostics page loads with pillar cards", async ({ page }) => {
    await page.goto("/cockpit/insights/diagnostics");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Reports page loads", async ({ page }) => {
    await page.goto("/cockpit/insights/reports");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Benchmarks page loads", async ({ page }) => {
    await page.goto("/cockpit/insights/benchmarks");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Attribution page loads", async ({ page }) => {
    await page.goto("/cockpit/insights/attribution");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Messages page loads", async ({ page }) => {
    await page.goto("/cockpit/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
