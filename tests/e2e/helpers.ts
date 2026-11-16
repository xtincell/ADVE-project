import { type Page, expect } from "@playwright/test";

export async function openLogin(page: Page) {
  // This request starts in SessionProvider's effect, after React hydration.
  // Native form submission before then only posts back to /login.
  const hydrated = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/session"
    && response.request().method() === "GET" && response.ok());
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await hydrated;
  const essentials = page.getByRole("button", { name: "Essentiels uniquement", exact: true });
  if (await essentials.isVisible()) await essentials.click();
}

export async function login(page: Page, email: string, password: string) {
  await openLogin(page);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  const session = await page.request.get("/api/auth/session");
  expect(session.ok()).toBe(true);
  expect((await session.json()).user?.email).toBe(email);
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
    expect(errors).toHaveLength(0);
  };
}

export async function expectPageLoads(page: Page, url: string, textOnPage?: string) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).not.toMatch(/^\/(login|unauthorized)(\/|$)/);
  // Notifications keep an SSE connection open; networkidle never receives it.
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });
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
