/**
 * Stripe provider — international cards / Apple Pay / Google Pay.
 *
 * Uses REST API directly to avoid pulling in the Stripe SDK dependency.
 */
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";
import { PaymentProviderError } from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export const stripeProvider: PaymentProvider = {
  id: "STRIPE",

  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new PaymentProviderError("STRIPE", input.reference, "STRIPE_SECRET_KEY required");

    const lowerCurrency = input.currency.toLowerCase();
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${input.returnUrl}?ref=${input.reference}&status=paid`,
      cancel_url: `${input.returnUrl}?ref=${input.reference}&status=cancelled`,
      customer_email: input.customer.email,
      client_reference_id: input.reference,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": lowerCurrency,
      "line_items[0][price_data][unit_amount]": String(input.amount),
      "line_items[0][price_data][product_data][name]": input.description,
    });
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      params.append(`metadata[${key}]`, value);
    }

    const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!data.url) {
      throw new PaymentProviderError("STRIPE", input.reference, data.error?.message ?? "no checkout URL");
    }
    return { paymentUrl: data.url, providerRef: data.id };
  },

  async verifyPayment(reference: string) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) return { paid: false };
    // Search Stripe sessions by client_reference_id
    const params = new URLSearchParams({ query: `client_reference_id:"${reference}"`, limit: "1" });
    const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json() as { data?: Array<{ payment_status?: string }> };
    const session = data.data?.[0];
    return { paid: session?.payment_status === "paid", raw: session };
  },
};
