/**
 * Stripe Subscription helper — for MONTHLY tiers (Cockpit / Retainer).
 *
 * Creates a Stripe Checkout Session in `mode: subscription` so a paid
 * customer auto-renews monthly. Webhooks (customer.subscription.*)
 * keep our `Subscription` table in sync.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — recurring revenue is
 * what funds the OS to keep brands moving toward apogee long-term.
 */

import { PaymentProviderError } from "./types";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export interface SubscriptionInitInput {
  reference: string;
  amountPerPeriod: number; // smallest unit (cents)
  currency: string;
  tierKey: string;
  productName: string;
  returnUrl: string;
  customer: { email: string; name?: string };
  /** Existing Stripe customer id, if any (to reuse). */
  stripeCustomerId?: string;
  /** Optional metadata for tracking. */
  metadata?: Record<string, string>;
}

export interface SubscriptionInitResult {
  paymentUrl: string;
  sessionId: string;
}

export async function initStripeSubscription(input: SubscriptionInitInput): Promise<SubscriptionInitResult> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new PaymentProviderError("STRIPE", input.reference, "STRIPE_SECRET_KEY required");

  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${input.returnUrl}?ref=${input.reference}&status=paid&kind=subscription`,
    cancel_url: `${input.returnUrl}?ref=${input.reference}&status=cancelled&kind=subscription`,
    customer_email: input.stripeCustomerId ? "" : input.customer.email,
    client_reference_id: input.reference,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(input.amountPerPeriod),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": input.productName,
    "subscription_data[metadata][tierKey]": input.tierKey,
    "subscription_data[metadata][reference]": input.reference,
  });
  if (input.stripeCustomerId) params.set("customer", input.stripeCustomerId);
  for (const [k, v] of Object.entries(input.metadata ?? {})) {
    params.append(`metadata[${k}]`, v);
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!data.url || !data.id) {
    throw new PaymentProviderError("STRIPE", input.reference, data.error?.message ?? "subscription init failed");
  }
  return { paymentUrl: data.url, sessionId: data.id };
}

/** Cancel a subscription at period end. */
export async function cancelStripeSubscription(subscriptionId: string): Promise<void> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY required");

  const res = await fetch(`${STRIPE_API_BASE}/subscriptions/${subscriptionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "cancel_at_period_end=true",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Stripe cancel failed: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`);
  }
}
