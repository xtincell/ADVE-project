/**
 * Mock provider — auto-confirms in dev/staging when no real provider keys
 * are configured. NEVER used in production.
 */
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";

export const mockProvider: PaymentProvider = {
  id: "MOCK",

  isConfigured() {
    // Mock is "configured" only when no real provider is + we're not in prod.
    return process.env.NODE_ENV !== "production";
  },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    return {
      paymentUrl: `${input.returnUrl}?ref=${input.reference}&status=paid&mock=true`,
      providerRef: `mock_${input.reference}`,
    };
  },

  async verifyPayment() {
    return { paid: true };
  },
};
