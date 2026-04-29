/**
 * tenant-isolation.spec.ts — verifies cross-operator data leak is impossible.
 *
 * Setup: two operators (A, B) each with their own strategy. User of A
 * attempts to access B's strategy by id. Must receive 403/404, never the
 * row.
 */
import { test, expect } from "@playwright/test";

test.describe("tenant isolation", () => {
  test.skip(({ baseURL }) => !baseURL?.includes("localhost"), "skipped outside local dev");

  test("operator A cannot read operator B's strategy", async ({ request }) => {
    const operatorAStrategyId = process.env.E2E_OPERATOR_A_STRATEGY_ID;
    const operatorBStrategyId = process.env.E2E_OPERATOR_B_STRATEGY_ID;
    const operatorASessionToken = process.env.E2E_OPERATOR_A_SESSION_TOKEN;
    test.skip(
      !operatorAStrategyId || !operatorBStrategyId || !operatorASessionToken,
      "E2E_OPERATOR_*_STRATEGY_ID + E2E_OPERATOR_A_SESSION_TOKEN env vars required",
    );

    // Sanity: A can read its own.
    const own = await request.get(
      `/api/trpc/strategy.getById?input=${encodeURIComponent(JSON.stringify({ strategyId: operatorAStrategyId }))}`,
      { headers: { cookie: `next-auth.session-token=${operatorASessionToken}` } },
    );
    expect(own.status()).toBe(200);

    // Cross: A attempts B → must fail.
    const cross = await request.get(
      `/api/trpc/strategy.getById?input=${encodeURIComponent(JSON.stringify({ strategyId: operatorBStrategyId }))}`,
      { headers: { cookie: `next-auth.session-token=${operatorASessionToken}` } },
    );
    // Acceptable: 200 with error body (tRPC convention) OR 403/404.
    if (cross.status() === 200) {
      const body = await cross.json() as { error?: { code?: string }; result?: { data?: unknown } };
      // No data leaked.
      expect(body.error).toBeDefined();
      expect(body.result?.data).toBeUndefined();
    } else {
      expect([401, 403, 404]).toContain(cross.status());
    }
  });
});
