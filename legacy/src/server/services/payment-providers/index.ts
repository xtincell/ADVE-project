/**
 * Payment providers registry — Operations sub-system.
 *
 * Single source of truth for payment provider abstraction.
 * Routers/services consume `pickProvider()` to select; provider-specific
 * code lives in the per-provider file.
 *
 * Provider selection rules:
 *   1. If a specific provider is requested AND configured → use it.
 *   2. Auto:
 *      - For African / CFA-zone countries → CinetPay (Mobile Money + cards).
 *      - For PayPal-friendly markets (US/UK/EU when env requests it) → PayPal.
 *      - Otherwise → Stripe.
 *   3. If the chosen provider is NOT configured AND non-prod → Mock.
 *      In production, fail loud (no silent free-unlock).
 */

import { isCinetPayCountry } from "@/lib/constants/intake-options";
import { cinetpayProvider } from "./cinetpay";
import { stripeProvider } from "./stripe";
import { paypalProvider } from "./paypal";
import { mockProvider } from "./mock";
import type { PaymentProvider, PaymentProviderId } from "./types";

export { type PaymentProvider, type PaymentProviderId, type PaymentInitInput, type PaymentInitResult, PaymentProviderError } from "./types";

const REGISTRY: Record<Exclude<PaymentProviderId, "MOCK">, PaymentProvider> = {
  CINETPAY: cinetpayProvider,
  STRIPE: stripeProvider,
  PAYPAL: paypalProvider,
};

export interface PickContext {
  /** ISO-2 country code, used for Auto provider selection. */
  readonly countryCode?: string;
  /** Force a specific provider (overrides Auto). */
  readonly preferred?: PaymentProviderId;
  /** Whether to allow falling back to Mock in non-prod. */
  readonly allowMock?: boolean;
}

export function pickProvider(ctx: PickContext): PaymentProvider {
  const isProd = process.env.NODE_ENV === "production";

  // 1. Explicit preference (when configured).
  if (ctx.preferred && ctx.preferred !== "MOCK") {
    const candidate = REGISTRY[ctx.preferred];
    if (candidate.isConfigured()) return candidate;
  }

  // 2. Auto selection by country.
  let auto: PaymentProvider;
  if (ctx.countryCode && isCinetPayCountry(ctx.countryCode)) {
    auto = cinetpayProvider;
  } else if (process.env.PAYMENT_PREFER_PAYPAL === "true" && paypalProvider.isConfigured()) {
    auto = paypalProvider;
  } else {
    auto = stripeProvider;
  }
  if (auto.isConfigured()) return auto;

  // 3. Fall back to first configured provider.
  for (const provider of Object.values(REGISTRY)) {
    if (provider.isConfigured()) return provider;
  }

  // 4. Mock — non-prod only.
  if (!isProd && (ctx.allowMock ?? true)) {
    return mockProvider;
  }

  throw new Error(
    "No payment provider configured. Set CINETPAY_API_KEY+CINETPAY_SITE_ID, STRIPE_SECRET_KEY, or PAYPAL_CLIENT_ID+PAYPAL_CLIENT_SECRET.",
  );
}

export function listProviders(): readonly { id: PaymentProviderId; configured: boolean }[] {
  const list: Array<{ id: PaymentProviderId; configured: boolean }> = [];
  for (const id of Object.keys(REGISTRY) as Array<Exclude<PaymentProviderId, "MOCK">>) {
    list.push({ id, configured: REGISTRY[id].isConfigured() });
  }
  list.push({ id: "MOCK", configured: mockProvider.isConfigured() });
  return list;
}
