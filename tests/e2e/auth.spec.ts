import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("Admin can login and access console", async ({ page }) => {
    await login(page, "alexandre@upgraders.com", "Admin123!");
    await page.goto("/console");
    await page.waitForLoadState("domcontentloaded");
    // Should not redirect to login or unauthorized
    expect(page.url()).toContain("/console");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Client can login and access cockpit", async ({ page }) => {
    await login(page, "client@cimencam.cm", "Client123!");
    await page.goto("/cockpit");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/cockpit");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Creator can login and access creator portal", async ({ page }) => {
    await login(page, "marc@freelance.cm", "Creator123!");
    await page.goto("/creator");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/creator");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Wrong credentials show error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "WrongPassword!");
    await page.click('button[type="submit"]');
    // Should stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });

  test("Creator cannot access console (role restriction)", async ({ page }) => {
    await login(page, "marc@freelance.cm", "Creator123!");
    await page.goto("/console");
    await page.waitForLoadState("domcontentloaded");
    // Should redirect to unauthorized
    expect(page.url()).toContain("/unauthorized");
  });

  test("Client cannot access creator portal (role restriction)", async ({ page }) => {
    await login(page, "client@cimencam.cm", "Client123!");
    await page.goto("/creator");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/unauthorized");
  });
});
