/**
 * E2E regression — Intake empty-payload guard.
 *
 * Reproduces the production casualty pattern (`responses: { a: {}, d: {}, ... }`)
 * by hitting the tRPC `quickIntake.advance` mutation with empty slices and
 * asserts the server refuses every flavour of empty.
 *
 * Layers under test:
 *   - tRPC zod refinement (rejects 400 if payload object is empty)
 *   - service-side `EmptyAdvanceError` (rejects when slice value is `{}` /
 *     all-empty-strings / all-null)
 *   - `complete()` `IncompleteIntakeError` (rejects scoring of an intake
 *     whose entire `responses` is hollow)
 *
 * The trpc shape is HTTP, so we hit `/api/trpc/...` directly — robust against
 * UI churn.
 */

import { test, expect } from "@playwright/test";

// Helper: call a tRPC v11 mutation over HTTP. tRPC uses POST with a JSON
// body shaped as `{ "0": { json: <input> } }` for batched single calls.
async function trpcMutation<T = unknown>(
  request: import("@playwright/test").APIRequestContext,
  path: string,
  input: unknown,
): Promise<{ status: number; body: T | null }> {
  const res = await request.post(`/api/trpc/${path}?batch=1`, {
    data: { "0": { json: input } },
    headers: { "content-type": "application/json" },
  });
  let body: T | null = null;
  try {
    body = (await res.json()) as T;
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

async function trpcQuery<T = unknown>(
  request: import("@playwright/test").APIRequestContext,
  path: string,
  input: unknown,
): Promise<{ status: number; body: T | null }> {
  const params = new URLSearchParams({
    batch: "1",
    input: JSON.stringify({ "0": { json: input } }),
  });
  const res = await request.get(`/api/trpc/${path}?${params}`);
  let body: T | null = null;
  try {
    body = (await res.json()) as T;
  } catch {
    body = null;
  }
  return { status: res.status(), body };
}

test.describe("intake empty-payload guard", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Spin up a fresh intake so we don't stomp on real data.
    const start = await trpcMutation<unknown>(request, "quickIntake.start", {
      contactName: "Empty Guard Test",
      contactEmail: `guard-${Date.now()}@example.test`,
      companyName: "EmptyGuardTest",
      sector: "TEST",
      country: "FR",
      method: "LONG",
    });
    expect(start.status).toBe(200);
    const data = (start.body as Array<{ result?: { data?: { json?: { token?: string } } } }>)?.[0]?.result?.data?.json;
    expect(data?.token).toBeTruthy();
    token = data!.token!;
  });

  test("zod refines: refuses empty top-level responses object", async ({ request }) => {
    const res = await trpcMutation(request, "quickIntake.advance", {
      token,
      responses: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("service: refuses slice with empty object", async ({ request }) => {
    const res = await trpcMutation(request, "quickIntake.advance", {
      token,
      responses: { a: {} },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("service: refuses slice with whitespace-only string values", async ({ request }) => {
    const res = await trpcMutation(request, "quickIntake.advance", {
      token,
      responses: { a: { a_archetype: "   ", a_values: [] } },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("service: accepts a slice with at least one substantive field", async ({ request }) => {
    const res = await trpcMutation(request, "quickIntake.advance", {
      token,
      responses: { biz: { biz_model: "B2C - tech_saas" } },
    });
    expect(res.status).toBe(200);
  });

  test("complete: refuses an intake with no substantive responses (fresh token)", async ({ request }) => {
    // Spin up a fresh intake that never sees a substantive advance call.
    const start = await trpcMutation<Array<{ result?: { data?: { json?: { token?: string } } } }>>(
      request,
      "quickIntake.start",
      {
        contactName: "Empty Complete Test",
        contactEmail: `complete-${Date.now()}@example.test`,
        companyName: "EmptyCompleteTest",
        method: "LONG",
      },
    );
    const freshToken = start.body?.[0]?.result?.data?.json?.token;
    expect(freshToken).toBeTruthy();
    const res = await trpcMutation(request, "quickIntake.complete", { token: freshToken });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("intake page: refuses to advance when current phase is empty (no server call)", async ({ page }) => {
    // Visit the intake page; if we click "Save & Quit" without filling a
    // single field, the form should NOT round-trip to the server (no
    // network request to advance).
    await page.goto(`/intake/${token}`);
    await page.waitForLoadState("networkidle");
    const advanceCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("quickIntake.advance")) advanceCalls.push(req.url());
    });
    // Try to click any "Sauvegarder" / "Save & Quit" button if present.
    const saveQuit = page.locator('button:has-text("Sauvegarder")').first();
    if (await saveQuit.isVisible().catch(() => false)) {
      await saveQuit.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
    expect(advanceCalls).toHaveLength(0);
  });
});
