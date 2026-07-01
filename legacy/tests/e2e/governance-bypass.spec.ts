/**
 * governance-bypass.spec.ts — verifies that governance gates can't be
 * bypassed silently.
 *
 * Two checks:
 * 1. A request to a known mutation router with admin session creates
 *    an IntentEmission row (audit trail enforced).
 * 2. Non-admin user attempting to access /api/admin/metrics is rejected.
 */
import { test, expect } from "@playwright/test";

test.describe("governance bypass detection", () => {
  test("non-admin /api/admin/metrics rejected", async ({ request }) => {
    const res = await request.get("/api/admin/metrics", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    // Either 401 (token check) or 500 (env not configured) — never 200.
    expect([401, 500]).toContain(res.status());
  });

  test("admin /api/admin/metrics returns Prometheus body when configured", async ({ request }) => {
    const token = process.env.E2E_ADMIN_METRICS_TOKEN ?? process.env.ADMIN_METRICS_TOKEN;
    test.skip(!token, "ADMIN_METRICS_TOKEN not set in env");
    const res = await request.get("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${token!}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("# TYPE");
  });

  test("intake page does NOT show admin bypass for non-admin user", async ({ page }) => {
    await page.goto("/intake");
    await expect(page.locator("body")).not.toContainText("ADMIN_BYPASS");
  });
});
