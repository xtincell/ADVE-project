/**
 * CinetPay provider — "Aurore" v1 API (api.cinetpay.net).
 *
 * Auth model (DIFFERENT from the legacy api-checkout.cinetpay.com/v2 API that
 * used apikey + site_id in the body):
 *   1. POST {base}/v1/oauth/login { api_key, api_password } -> { access_token, expires_in }
 *   2. `Authorization: Bearer <access_token>` on every subsequent call.
 *      Tokens live ~24h (expires_in seconds) and are cached in-process.
 *
 * Secrets come from env vars only (ADR-0075):
 *   CINETPAY_API_KEY + CINETPAY_API_PASSWORD  (from the panel: Ressources > API & sécurité)
 * Base URL is env-driven so the same code targets Sandbox / Production:
 *   CINETPAY_BASE_URL=https://api.cinetpay.net   (Sandbox default)
 *
 * NB — CinetPay restricts API calls to the account's IP allow-list ("Liste
 * blanche IP" in the panel). The CALLER server's public IP must be listed or
 * every call is rejected (HTTP 401/403) regardless of credentials.
 */
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";
import { PaymentProviderError } from "./types";

const DEFAULT_BASE_URL = "https://api.cinetpay.net";

function baseUrl(): string {
  return (process.env.CINETPAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

// In-process bearer-token cache. Refreshed a minute before expiry; reset on
// process restart — no persistence needed (a cold start just re-logs in).
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.value;

  const apiKey = process.env.CINETPAY_API_KEY;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;
  if (!apiKey || !apiPassword) {
    throw new PaymentProviderError("CINETPAY", "oauth/login", "CINETPAY_API_KEY + CINETPAY_API_PASSWORD required");
  }

  const res = await fetch(`${baseUrl()}/v1/oauth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new PaymentProviderError("CINETPAY", "oauth/login", data.message ?? `login failed (HTTP ${res.status})`);
  }

  const ttlMs = Math.max(60, data.expires_in ?? 86_400) * 1000;
  tokenCache = { value: data.access_token, expiresAt: now + ttlMs };
  return data.access_token;
}

/** Aurore expects separate first/last names; split a display name best-effort. */
function splitName(name: string | undefined): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Client", last: "-" };
  if (parts.length === 1) return { first: parts[0], last: "-" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export const cinetpayProvider: PaymentProvider = {
  id: "CINETPAY",

  isConfigured() {
    return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_API_PASSWORD);
  },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const token = await getAccessToken();
    const { first, last } = splitName(input.customer.name);

    const res = await fetch(`${baseUrl()}/v1/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currency: input.currency, // XAF for CEMAC / XOF for UEMOA — driven by caller
        merchantTransactionId: input.reference,
        amount: input.amount,
        lang: "fr",
        designation: input.description,
        clientEmail: input.customer.email,
        clientFirstName: first,
        clientLastName: last,
        successUrl: input.returnUrl,
        failedUrl: input.returnUrl,
        notifyUrl: input.notifyUrl,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      paymentUrl?: string;
      transactionId?: string;
      details?: { status?: string; mustBeRedirected?: boolean };
      message?: string;
    };
    if (!res.ok || !data.paymentUrl) {
      throw new PaymentProviderError("CINETPAY", input.reference, data.message ?? `init failed (HTTP ${res.status})`);
    }
    return { paymentUrl: data.paymentUrl, providerRef: data.transactionId };
  },

  async verifyPayment(reference: string): Promise<{ paid: boolean; raw?: unknown }> {
    const token = await getAccessToken();
    const res = await fetch(`${baseUrl()}/v1/payment/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      details?: { status?: string };
    };
    const status = data.status ?? data.details?.status;
    return { paid: status === "SUCCESS", raw: data };
  },
};
