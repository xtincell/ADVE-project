/**
 * PayPal provider — Orders v2 REST API.
 *
 * OAuth2 client_credentials flow + Orders create + approval URL extraction.
 * Sandbox/live switch via PAYPAL_ENV ("sandbox" | "live").
 */
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";
import { PaymentProviderError } from "./types";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

function baseUrl(): string {
  return process.env.PAYPAL_ENV === "live" ? LIVE_BASE : SANDBOX_BASE;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET required");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!data.access_token) {
    throw new Error(`PayPal OAuth failed: ${data.error_description ?? "unknown"}`);
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };
  return data.access_token;
}

export const paypalProvider: PaymentProvider = {
  id: "PAYPAL",

  isConfigured() {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    if (!this.isConfigured()) {
      throw new PaymentProviderError("PAYPAL", input.reference, "PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET required");
    }

    let token: string;
    try {
      token = await getAccessToken();
    } catch (err) {
      throw new PaymentProviderError("PAYPAL", input.reference, (err as Error).message);
    }

    // PayPal expects amount as decimal string in display units (e.g. "49.00").
    // Stripe-style "smallest unit" inputs are converted here.
    const decimalAmount = formatPayPalAmount(input.amount, input.currency);

    const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.reference,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.reference,
            description: input.description.slice(0, 127),
            amount: {
              currency_code: input.currency,
              value: decimalAmount,
            },
            custom_id: input.reference,
          },
        ],
        application_context: {
          brand_name: "La Fusée",
          locale: "fr-FR",
          landing_page: "NO_PREFERENCE",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${input.returnUrl}?ref=${input.reference}&status=paid&provider=paypal`,
          cancel_url: `${input.returnUrl}?ref=${input.reference}&status=cancelled&provider=paypal`,
        },
        payer: input.customer.email ? { email_address: input.customer.email } : undefined,
      }),
    });

    const data = await res.json() as {
      id?: string;
      links?: Array<{ rel: string; href: string }>;
      message?: string;
      details?: Array<{ description?: string }>;
    };
    if (!data.id || !data.links) {
      const reason = data.message ?? data.details?.[0]?.description ?? "init failed";
      throw new PaymentProviderError("PAYPAL", input.reference, reason);
    }
    const approve = data.links.find((l) => l.rel === "approve" || l.rel === "payer-action");
    if (!approve?.href) {
      throw new PaymentProviderError("PAYPAL", input.reference, "no approval link returned");
    }
    return { paymentUrl: approve.href, providerRef: data.id };
  },

  async verifyPayment(reference: string) {
    // Un ordre `intent: "CAPTURE"` APPROUVÉ n'a PAS encaissé : l'acheteur a
    // consenti, les fonds n'ont pas bougé. « Vérifier » = tenter la CAPTURE
    // (idempotente) puis reporter si COMPLETED. `reference` = order id
    // (providerRef). Sans capture, l'ancien code livrait le PDF sur un APPROVED
    // et n'encaissait JAMAIS ($0 collecté sur chaque vente PayPal).
    if (!this.isConfigured()) return { paid: false };
    const cap = await capturePayPalOrder(reference).catch(() => ({ captured: false, raw: null as unknown }));
    return { paid: cap.captured, raw: cap.raw };
  },
};

/**
 * Capture un ordre PayPal APPROUVÉ (déplace réellement les fonds). Idempotent :
 *   - `PayPal-Request-Id` déterministe → PayPal dédoublonne côté serveur ;
 *   - une seconde capture d'un ordre déjà capturé renvoie 422
 *     `ORDER_ALREADY_CAPTURED` → traité comme `captured: true`.
 * Retourne `captured:false` sans lever (le webhook/route décide de NE PAS
 * marquer PAID) — jamais de livraison sur une capture ratée.
 */
export async function capturePayPalOrder(orderId: string): Promise<{ captured: boolean; raw: unknown }> {
  if (!paypalProvider.isConfigured()) return { captured: false, raw: null };
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return { captured: false, raw: null };
  }
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Clé déterministe : rejoue = même capture, pas un double encaissement.
      "PayPal-Request-Id": `capture-${orderId}`,
    },
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    name?: string;
    details?: Array<{ issue?: string }>;
  };
  if (res.ok && data.status === "COMPLETED") return { captured: true, raw: data };
  const alreadyCaptured =
    data.name === "UNPROCESSABLE_ENTITY" &&
    (data.details ?? []).some((d) => d.issue === "ORDER_ALREADY_CAPTURED");
  if (alreadyCaptured) return { captured: true, raw: data };
  return { captured: false, raw: data };
}

/** Convert smallest-unit input to PayPal's "49.00"-style decimal string. */
function formatPayPalAmount(amount: number, currency: string): string {
  // Currencies without decimals (XAF, XOF, JPY, KRW, etc.) are sent as integers.
  const zeroDecimalCurrencies = new Set(["XAF", "XOF", "JPY", "KRW", "VND", "CLP", "PYG", "RWF"]);
  if (zeroDecimalCurrencies.has(currency.toUpperCase())) {
    return Math.round(amount).toString();
  }
  return (amount / 100).toFixed(2);
}
