/**
 * Sprint F — Playwright smoke tests for Imhotep + Anubis Console pages.
 *
 * Loads each new page, asserts the page header is present + key form
 * affordances render. No DB interaction (TRPC mutations stubbed at network
 * layer in CI ; smoke = page mounts cleanly).
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Imhotep Console — Crew Programs (Phase 7+)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Crew dashboard loads", async ({ page }) => {
    await page.goto("/console/crew");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/Imhotep/i)).toBeVisible();
    await expect(page.getByText(/Crew Programs/i).first()).toBeVisible();
  });

  test("Crew - Matching page form", async ({ page }) => {
    await page.goto("/console/crew/matching");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByPlaceholder(/wk-mission-/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Matcher/i })).toBeVisible();
  });

  test("Crew - Team Builder page form", async ({ page }) => {
    await page.goto("/console/crew/team-builder");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Buckets/i)).toBeVisible();
    await expect(page.getByText(/Manipulation Modes/i)).toBeVisible();
  });

  test("Crew - Training page form", async ({ page }) => {
    await page.goto("/console/crew/training");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByPlaceholder(/wk-talent-creator-/)).toBeVisible();
  });
});

test.describe("Anubis Console — Comms (Phase 8+)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Comms dashboard loads", async ({ page }) => {
    await page.goto("/console/comms");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Anubis/i)).toBeVisible();
    await expect(page.getByText(/Comms/i).first()).toBeVisible();
    await expect(page.getByText(/cost_per_superfan/i)).toBeVisible();
  });

  test("Comms - Broadcast page form", async ({ page }) => {
    await page.goto("/console/comms/broadcast");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Channel/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Diffuser/i })).toBeVisible();
  });

  test("Comms - Ad Launcher page form", async ({ page }) => {
    await page.goto("/console/comms/ad-launcher");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Platform/i).first()).toBeVisible();
    await expect(page.getByText(/Expected superfans/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Lancer la campagne/i })).toBeVisible();
  });

  test("Comms - Drop Scheduler page form", async ({ page }) => {
    await page.goto("/console/comms/drop-scheduler");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Channels/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Programmer le drop/i })).toBeVisible();
  });
});

test.describe("Console nav — Imhotep + Anubis sidebar entries", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Sidebar contains Imhotep group", async ({ page }) => {
    await page.goto("/console");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("link", { name: /Matching/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("Sidebar contains Anubis group", async ({ page }) => {
    await page.goto("/console");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("link", { name: /Ad Launcher/i }).first()).toBeVisible({ timeout: 5000 });
  });
});
