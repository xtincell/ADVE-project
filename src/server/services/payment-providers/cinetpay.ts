/** CinetPay Aurore v1 adapter. Credentials remain in env (ADR-0075).
 * Wire contract: cinetpay/cinetpay-js, src/types/payment.ts.
 * Sandbox remains the default; deployment must explicitly select production.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";
import { PaymentProviderError } from "./types";

function baseUrl(): string {
  return (process.env.CINETPAY_BASE_URL ?? "https://api.cinetpay.net").replace(/\/+$/, "");
}

let tokenCache: { value: string; expiresAt: number; base: string } | null = null;
async function getAccessToken(signal: AbortSignal): Promise<string> {
  const now = Date.now();
  const base = baseUrl();
  if (tokenCache?.base === base && tokenCache.expiresAt > now + 60_000) return tokenCache.value;
  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;
  if (!apiKey || !apiPassword) {
    throw new PaymentProviderError("CINETPAY", "oauth/login", "Payment credentials unavailable");
  }
  const res = await fetch(`${base}/v1/oauth/login`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
  });
  const data = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().optional() })
    .safeParse(await res.json().catch(() => null));
  if (!res.ok || !data.success) {
    // Never echo an upstream body: it may contain credentials or notification proof.
    throw new PaymentProviderError("CINETPAY", "oauth/login", `Authentication unavailable (HTTP ${res.status})`);
  }
  tokenCache = { value: data.data.access_token, expiresAt: now + (data.data.expires_in ?? 86_400) * 1000, base };
  return tokenCache.value;
}

const initReceipt = z.object({
  payment_url: z.string().url().refine(value => new URL(value).protocol === "https:"),
  transaction_id: z.string().min(1), merchant_transaction_id: z.string().min(1),
  notify_token: z.string().min(1),
});
const statusReceipt = z.object({
  status: z.string().min(1), merchant_transaction_id: z.string().min(1), transaction_id: z.string().min(1),
  // These are not guaranteed by v1. Check them when supplied, never invent them.
  amount: z.number().finite().optional(), currency: z.string().optional(),
});
const paymentStatuses = new Set(["SUCCESS", "FAILED", "EXPIRED", "INITIATED", "PENDING", "OK"]);

export const cinetpayProvider: PaymentProvider = {
  id: "CINETPAY",
  isConfigured() { return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_API_PASSWORD); },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const signal = AbortSignal.timeout(20_000);
    const token = await getAccessToken(signal);
    const parts = (input.customer.name ?? "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] && parts[0].length >= 2 ? parts[0] : "Client";
    const last = parts.slice(1).join(" ") || "Client";
    const res = await fetch(`${baseUrl()}/v1/payment`, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currency: input.currency, merchant_transaction_id: input.reference,
        amount: input.amount, lang: "fr", designation: input.description,
        client_email: input.customer.email, client_first_name: first, client_last_name: last.length >= 2 ? last : "Client",
        success_url: input.returnUrl, failed_url: input.returnUrl, notify_url: input.notifyUrl, channel: "PUSH",
      }),
    });
    const data = initReceipt.safeParse(await res.json().catch(() => null));
    if (!res.ok || !data.success || data.data.merchant_transaction_id !== input.reference) {
      throw new PaymentProviderError("CINETPAY", input.reference, `Invalid initialization receipt (HTTP ${res.status})`);
    }
    return {
      paymentUrl: data.data.payment_url, providerRef: data.data.transaction_id,
      notificationTokenHash: createHash("sha256").update(data.data.notify_token).digest("hex"),
    };
  },

  async verifyPayment(reference: string) {
    // One deadline shared by authentication and status, no retry or fallback to the notification.
    const signal = AbortSignal.timeout(8_000);
    const token = await getAccessToken(signal);
    const res = await fetch(`${baseUrl()}/v1/payment/${encodeURIComponent(reference)}`, {
      method: "GET", signal, headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = statusReceipt.safeParse(await res.json().catch(() => null));
    if (!res.ok || !data.success || data.data.merchant_transaction_id !== reference || !paymentStatuses.has(data.data.status)) {
      throw new PaymentProviderError("CINETPAY", reference, `Status unavailable or inconsistent (HTTP ${res.status})`);
    }
    return { paid: data.data.status === "SUCCESS", raw: data.data };
  },
};
