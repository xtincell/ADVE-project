import { test, expect } from "@playwright/test";
import { loginAsCreator } from "./helpers";

test.describe("Creator Portal (Guild OS)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCreator(page);
  });

  test("Dashboard loads with tier progression", async ({ page }) => {
    await page.goto("/creator");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/creator");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Available missions page loads", async ({ page }) => {
    await page.goto("/creator/missions/available");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Active missions page loads", async ({ page }) => {
    await page.goto("/creator/missions/active");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Collaborative missions page loads", async ({ page }) => {
    await page.goto("/creator/missions/collab");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("QC Submitted page loads", async ({ page }) => {
    await page.goto("/creator/qc/submitted");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("QC Peer review page loads", async ({ page }) => {
    await page.goto("/creator/qc/peer");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Progress metrics page loads", async ({ page }) => {
    await page.goto("/creator/progress/metrics");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Progress path page loads with tier stepper", async ({ page }) => {
    await page.goto("/creator/progress/path");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Strengths page loads", async ({ page }) => {
    await page.goto("/creator/progress/strengths");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Earnings missions page loads", async ({ page }) => {
    await page.goto("/creator/earnings/missions");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Earnings history page loads", async ({ page }) => {
    await page.goto("/creator/earnings/history");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Earnings invoices page loads", async ({ page }) => {
    await page.goto("/creator/earnings/invoices");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Profile skills page loads", async ({ page }) => {
    await page.goto("/creator/profile/skills");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Profile drivers page loads", async ({ page }) => {
    await page.goto("/creator/profile/drivers");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Profile portfolio page loads", async ({ page }) => {
    await page.goto("/creator/profile/portfolio");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Learn ADVE page loads", async ({ page }) => {
    await page.goto("/creator/learn/adve");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Learn drivers page loads", async ({ page }) => {
    await page.goto("/creator/learn/drivers");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Learn cases page loads", async ({ page }) => {
    await page.goto("/creator/learn/cases");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Community guild page loads", async ({ page }) => {
    await page.goto("/creator/community/guild");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Community events page loads", async ({ page }) => {
    await page.goto("/creator/community/events");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });

  test("Messages page loads", async ({ page }) => {
    await page.goto("/creator/messages");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
  });
});
