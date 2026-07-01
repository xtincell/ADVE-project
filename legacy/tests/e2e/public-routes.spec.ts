import { test, expect } from "@playwright/test";

test.describe("Public Routes", () => {
  test("Landing page loads with hero and CTAs", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    // Should have the main heading or brand name
    await expect(page.locator("text=Industry OS").first()).toBeVisible({ timeout: 30000 });
  });

  test("Login page renders form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Score page loads", async ({ page }) => {
    await page.goto("/score");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Quick Intake landing loads with form", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    // Should have form fields for the intake
    const inputs = page.locator("input");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Unauthorized page loads", async ({ page }) => {
    await page.goto("/unauthorized");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Protected routes redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/cockpit");
    await page.waitForURL(/login/);
    expect(page.url()).toContain("/login");
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
