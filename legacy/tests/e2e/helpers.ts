import { type Page, expect } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
}

export async function loginAsAdmin(page: Page) {
  await login(page, "alexandre@upgraders.com", "Admin123!");
}

export async function loginAsClient(page: Page) {
  await login(page, "client@cimencam.cm", "Client123!");
}

export async function loginAsCreator(page: Page) {
  await login(page, "marc@freelance.cm", "Creator123!");
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => {
    const real = errors.filter(
      (e) => !e.includes("hydration") && !e.includes("ChunkLoadError")
    );
    expect(real).toHaveLength(0);
  };
}

export async function expectPageLoads(page: Page, url: string, textOnPage?: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  // No crash = page rendered something
  const body = page.locator("body");
  await expect(body).toBeVisible();
  // Should not show the global error boundary
  const errorBoundary = page.locator("text=Une erreur est survenue");
  const hasError = await errorBoundary.isVisible().catch(() => false);
  if (hasError) {
    throw new Error(`Error boundary triggered on ${url}`);
  }
  if (textOnPage) {
    await expect(page.locator(`text=${textOnPage}`).first()).toBeVisible({ timeout: 10000 });
  }
}
