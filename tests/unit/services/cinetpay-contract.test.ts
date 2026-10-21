import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const fetcher = vi.fn();
const input = {
  reference: "owned-order", amount: 10000, currency: "XAF", description: "Recette détenue",
  returnUrl: "https://owned.invalid/result", notifyUrl: "https://owned.invalid/notify",
  customer: { name: "Recette Détenue", email: "test@owned.invalid" },
};
const init = { payment_url: "https://owned.invalid/pay", transaction_id: "owned-tx", merchant_transaction_id: input.reference, notify_token: "owned-notify-only" };
const status = { status: "SUCCESS", merchant_transaction_id: input.reference, transaction_id: "owned-tx" };
function auth() { fetcher.mockResolvedValueOnce(Response.json({ access_token: "owned-auth-only", expires_in: 86400 })); }
beforeEach(() => {
  vi.resetModules(); fetcher.mockReset(); vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("CINETPAY_API_KEY", "owned-key"); vi.stubEnv("CINETPAY_API_PASSWORD", "owned-password");
  vi.stubEnv("CINETPAY_BASE_URL", "https://owned.invalid");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("CinetPay v1 wire contract — all transport is fake, no PSP call", () => {
  it("sends snake_case fields and returns only the per-payment proof digest", async () => {
    auth(); fetcher.mockResolvedValueOnce(Response.json(init));
    const { cinetpayProvider: p } = await import("@/server/services/payment-providers/cinetpay");
    const result = await p.initPayment(input);
    expect(result).toEqual({ paymentUrl: init.payment_url, providerRef: init.transaction_id,
      notificationTokenHash: createHash("sha256").update(init.notify_token).digest("hex") });
    expect(JSON.stringify(result)).not.toContain(init.notify_token);
    expect(fetcher.mock.calls[1]![0]).toBe("https://owned.invalid/v1/payment");
    expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({
      merchant_transaction_id: input.reference, amount: input.amount, currency: input.currency,
      client_email: input.customer.email, success_url: input.returnUrl, notify_url: input.notifyUrl, channel: "PUSH",
    });
    expect(fetcher.mock.calls[1]![1].body).not.toContain("merchantTransactionId");
    expect(fetcher.mock.calls[1]![1].headers.Authorization).toBe("Bearer owned-auth-only");
  });
  it.each([{ ...init, notify_token: undefined }, { ...init, merchant_transaction_id: "foreign-order" },
    { paymentUrl: init.payment_url, transactionId: init.transaction_id }])("refuses an unusable initialization receipt %#", async raw => {
    auth(); fetcher.mockResolvedValueOnce(Response.json(raw));
    const { cinetpayProvider: p } = await import("@/server/services/payment-providers/cinetpay");
    await expect(p.initPayment(input)).rejects.toThrow("Invalid initialization receipt");
  });
  it("verifies SUCCESS without requiring undocumented amount/currency and shares one deadline", async () => {
    auth(); fetcher.mockResolvedValueOnce(Response.json(status));
    const { cinetpayProvider: p } = await import("@/server/services/payment-providers/cinetpay");
    expect(await p.verifyPayment!(input.reference)).toEqual({ paid: true, raw: status });
    expect(fetcher.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
    expect(fetcher.mock.calls[1]![1].signal).toBe(fetcher.mock.calls[0]![1].signal);
  });
  it("preserves a pending financial status", async () => {
    auth(); fetcher.mockResolvedValueOnce(Response.json({ ...status, status: "PENDING" }));
    const { cinetpayProvider: p } = await import("@/server/services/payment-providers/cinetpay");
    expect((await p.verifyPayment!(input.reference)).paid).toBe(false);
  });
  it.each([{ raw: status, http: 503 }, { raw: { status: "SUCCESS" }, http: 200 },
    { raw: { ...status, merchant_transaction_id: "foreign-order" }, http: 200 },
    { raw: { ...status, status: "INVALID_TOKEN" }, http: 200 }])("throws on transport/API/identity failure %#", async x => {
    auth(); fetcher.mockResolvedValueOnce(Response.json(x.raw, { status: x.http }));
    const { cinetpayProvider: p } = await import("@/server/services/payment-providers/cinetpay");
    await expect(p.verifyPayment!(input.reference)).rejects.toThrow("Status unavailable or inconsistent");
  });
});
