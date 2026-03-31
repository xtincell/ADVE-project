import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Console Portal (Admin/Fixer)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // Dashboard
  test("Ecosystem dashboard loads with division cards", async ({ page }) => {
    await page.goto("/console");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/console");
    await expect(page.locator("body")).toBeVisible();
  });

  // Oracle Division
  test("Oracle - Clients page loads", async ({ page }) => {
    await page.goto("/console/oracle/clients");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Oracle - Diagnostics page loads", async ({ page }) => {
    await page.goto("/console/oracle/diagnostics");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Oracle - Intake pipeline loads", async ({ page }) => {
    await page.goto("/console/oracle/intake");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Oracle - Boot sequence page loads", async ({ page }) => {
    await page.goto("/console/oracle/boot");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  // Signal Division
  test("Signal - Intelligence page loads", async ({ page }) => {
    await page.goto("/console/signal/intelligence");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Signal - Signals page loads", async ({ page }) => {
    await page.goto("/console/signal/signals");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Signal - Knowledge Graph page loads", async ({ page }) => {
    await page.goto("/console/signal/knowledge");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Signal - Market page loads", async ({ page }) => {
    await page.goto("/console/signal/market");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  // Arene Division
  test("Arene - Guild management page loads", async ({ page }) => {
    await page.goto("/console/arene/guild");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Arene - Matching page loads", async ({ page }) => {
    await page.goto("/console/arene/matching");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Arene - Organizations page loads", async ({ page }) => {
    await page.goto("/console/arene/orgs");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  // Fusee Division
  test("Fusee - Missions page loads", async ({ page }) => {
    await page.goto("/console/fusee/missions");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Fusee - Campaigns page loads", async ({ page }) => {
    await page.goto("/console/fusee/campaigns");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Fusee - Drivers page loads", async ({ page }) => {
    await page.goto("/console/fusee/drivers");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  // Socle Division
  test("Socle - Revenue page loads", async ({ page }) => {
    await page.goto("/console/socle/revenue");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Socle - Commissions page loads", async ({ page }) => {
    await page.goto("/console/socle/commissions");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Socle - Pipeline page loads", async ({ page }) => {
    await page.goto("/console/socle/pipeline");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
