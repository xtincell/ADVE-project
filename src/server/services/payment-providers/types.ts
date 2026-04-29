/**
 * Payment provider abstraction — Operations sub-system.
 *
 * Each provider implements `PaymentProvider`. The router picks one based
 * on country / preference / availability. Adding a new provider = add a
 * file in this folder + register in `index.ts`.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE (THOT). Without payment
 * rails, no money flows, no retainer, no sustained mission.
 */

export type PaymentProviderId = "CINETPAY" | "STRIPE" | "PAYPAL" | "MOCK";

export interface PaymentInitInput {
  /** Internal reference used to correlate webhook events. */
  readonly reference: string;
  /** Amount in the smallest unit of the currency (e.g. cents for EUR/USD,
   *  or absolute units for XAF/XOF since they have no subunits). */
  readonly amount: number;
  /** ISO-4217 currency code. */
  readonly currency: string;
  /** Public-facing description shown on the payment page. */
  readonly description: string;
  /** URL the user lands on after success/cancel. */
  readonly returnUrl: string;
  /** URL the provider posts webhook events to. */
  readonly notifyUrl: string;
  /** Customer info — name optional for some providers. */
  readonly customer: {
    readonly name?: string;
    readonly email: string;
  };
  /** Optional metadata propagated to the provider for tracking. */
  readonly metadata?: Record<string, string>;
}

export interface PaymentInitResult {
  /** URL to redirect the user to. */
  readonly paymentUrl: string;
  /** Provider-side identifier (Stripe session id, PayPal order id, etc.). */
  readonly providerRef?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Whether the provider has the env vars / config to function. */
  isConfigured(): boolean;
  /** Initialize a payment session and return the URL to redirect to. */
  initPayment(input: PaymentInitInput): Promise<PaymentInitResult>;
  /** Verify a payment status by reference (post-webhook reconciliation). */
  verifyPayment?(reference: string): Promise<{ paid: boolean; raw?: unknown }>;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly providerId: PaymentProviderId,
    public readonly reference: string,
    message: string,
  ) {
    super(`[${providerId}] ${reference}: ${message}`);
    this.name = "PaymentProviderError";
  }
}
