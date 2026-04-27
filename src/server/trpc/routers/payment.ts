// ============================================================================
// MODULE — Payment Router
// CinetPay (Africa) + Stripe (international) integration
// Used for: intake result paywall (audit ADVE detaille + RTIS recos + PDF)
// ============================================================================
//
// Status:
// [x] Schema definitions for payment intent
// [x] Mock provider for dev/testing (returns "paid" immediately)
// [x] Verify payment status by reference
// [ ] Real CinetPay integration (requires CINETPAY_API_KEY + CINETPAY_SITE_ID)
// [ ] Real Stripe integration (requires STRIPE_SECRET_KEY)
// [ ] Webhook receivers (separate API routes)
// ============================================================================

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import crypto from "crypto";

// ── Pricing ─────────────────────────────────────────────────────────
// FCFA for African market, EUR for international
export const PAYWALL_PRICES = {
  INTAKE_REPORT_FCFA: 5000,   // ~7,60 EUR — audit ADVE detaille + RTIS recos + PDF
  INTAKE_REPORT_EUR: 9,
} as const;

// ── In-memory store (TODO: persist in DB once Payment model exists) ──
// For now we keep payment state in-memory and the QuickIntake.diagnostic field.
const pendingPayments = new Map<string, {
  reference: string;
  intakeToken: string;
  amount: number;
  currency: "XAF" | "EUR";
  provider: "CINETPAY" | "STRIPE" | "MOCK";
  status: "PENDING" | "PAID" | "FAILED";
  createdAt: number;
}>();

function generateReference(): string {
  return `lafusee_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// ── Provider helpers ────────────────────────────────────────────────

async function initCinetPayPayment(input: {
  reference: string;
  amount: number;
  description: string;
  returnUrl: string;
  notifyUrl: string;
  customer: { name: string; email: string };
}): Promise<{ paymentUrl: string }> {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) {
    throw new Error("CinetPay non configure (CINETPAY_API_KEY + CINETPAY_SITE_ID requis)");
  }

  const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: input.reference,
      amount: input.amount,
      currency: "XAF",
      description: input.description,
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      channels: "ALL", // Mobile Money + Card
    }),
  });

  const data = await response.json() as { code: string; data?: { payment_url: string }; message?: string };
  if (data.code !== "201" || !data.data?.payment_url) {
    throw new Error(`CinetPay error: ${data.message ?? "Unknown"}`);
  }
  return { paymentUrl: data.data.payment_url };
}

async function initStripePayment(input: {
  reference: string;
  amount: number; // in cents
  description: string;
  returnUrl: string;
  customer: { email: string };
}): Promise<{ paymentUrl: string }> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("Stripe non configure (STRIPE_SECRET_KEY requis)");
  }

  // Use Stripe REST API directly (no SDK dependency to keep bundle light)
  const params = new URLSearchParams({
    "mode": "payment",
    "success_url": `${input.returnUrl}?ref=${input.reference}&status=paid`,
    "cancel_url": `${input.returnUrl}?ref=${input.reference}&status=cancelled`,
    "customer_email": input.customer.email,
    "client_reference_id": input.reference,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(input.amount),
    "line_items[0][price_data][product_data][name]": input.description,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json() as { url?: string; error?: { message: string } };
  if (!data.url) {
    throw new Error(`Stripe error: ${data.error?.message ?? "Unknown"}`);
  }
  return { paymentUrl: data.url };
}

// ── Router ──────────────────────────────────────────────────────────

export const paymentRouter = createTRPCRouter({
  /**
   * Initialize a payment for the intake report unlock.
   * Returns the payment provider URL for redirect.
   * In dev (no API keys), uses MOCK provider that auto-confirms.
   */
  initIntakeReport: publicProcedure
    .input(z.object({
      intakeToken: z.string(),
      provider: z.enum(["CINETPAY", "STRIPE", "AUTO"]).default("AUTO"),
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.intakeToken },
        select: { id: true, contactName: true, contactEmail: true, companyName: true, country: true, status: true },
      });
      if (!intake) throw new Error("Intake introuvable");
      if (intake.status !== "COMPLETED") throw new Error("Intake non finalise");

      const reference = generateReference();
      // Auto-pick provider: CinetPay for African countries, Stripe otherwise
      const africanCountries = ["CM", "CI", "SN", "GA", "CG", "CD", "BF", "ML"];
      const isAfrican = intake.country && africanCountries.includes(intake.country);
      const provider = input.provider === "AUTO"
        ? (isAfrican ? "CINETPAY" : "STRIPE")
        : input.provider;

      const amount = provider === "CINETPAY" ? PAYWALL_PRICES.INTAKE_REPORT_FCFA : PAYWALL_PRICES.INTAKE_REPORT_EUR * 100;
      const currency = provider === "CINETPAY" ? "XAF" as const : "EUR" as const;

      // Mock mode if no API keys (dev)
      const mockMode = (provider === "CINETPAY" && !process.env.CINETPAY_API_KEY)
        || (provider === "STRIPE" && !process.env.STRIPE_SECRET_KEY);

      if (mockMode) {
        pendingPayments.set(reference, {
          reference,
          intakeToken: input.intakeToken,
          amount,
          currency,
          provider: "MOCK",
          status: "PAID", // Auto-confirm in mock mode
          createdAt: Date.now(),
        });
        return {
          paymentUrl: `${input.returnUrl}?ref=${reference}&status=paid&mock=true`,
          reference,
          provider: "MOCK" as const,
          amount,
          currency,
        };
      }

      pendingPayments.set(reference, {
        reference,
        intakeToken: input.intakeToken,
        amount,
        currency,
        provider,
        status: "PENDING",
        createdAt: Date.now(),
      });

      try {
        const description = `Audit ADVE complet — ${intake.companyName}`;
        const result = provider === "CINETPAY"
          ? await initCinetPayPayment({
              reference,
              amount,
              description,
              returnUrl: input.returnUrl,
              notifyUrl: `${input.returnUrl.split("/intake")[0]}/api/payment/webhook/cinetpay`,
              customer: { name: intake.contactName, email: intake.contactEmail },
            })
          : await initStripePayment({
              reference,
              amount,
              description,
              returnUrl: input.returnUrl,
              customer: { email: intake.contactEmail },
            });

        return {
          paymentUrl: result.paymentUrl,
          reference,
          provider,
          amount,
          currency,
        };
      } catch (err) {
        pendingPayments.delete(reference);
        throw new Error(err instanceof Error ? err.message : "Payment initialization failed");
      }
    }),

  /**
   * Verify a payment status by reference.
   * Used by the result page after redirect to gate the paid content.
   */
  verifyPayment: publicProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ input }) => {
      const payment = pendingPayments.get(input.reference);
      if (!payment) {
        return { status: "NOT_FOUND" as const, paid: false };
      }
      return {
        status: payment.status,
        paid: payment.status === "PAID",
        intakeToken: payment.intakeToken,
        provider: payment.provider,
      };
    }),

  /**
   * Get pricing for the result page paywall display.
   * Returns both prices so the UI can pick based on country.
   */
  getPricing: publicProcedure
    .input(z.object({ country: z.string().optional() }))
    .query(({ input }) => {
      const africanCountries = ["CM", "CI", "SN", "GA", "CG", "CD", "BF", "ML"];
      const isAfrican = input.country && africanCountries.includes(input.country);
      return {
        recommended: isAfrican ? "CINETPAY" : "STRIPE",
        prices: {
          fcfa: PAYWALL_PRICES.INTAKE_REPORT_FCFA,
          eur: PAYWALL_PRICES.INTAKE_REPORT_EUR,
        },
      };
    }),
});
