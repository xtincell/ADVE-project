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
// [x] Persisted in DB via IntakePayment model
// [x] Webhook receivers (CinetPay + Stripe at /api/payment/webhook/{provider})
// [ ] Real CinetPay integration (requires CINETPAY_API_KEY + CINETPAY_SITE_ID)
// [ ] Real Stripe integration (requires STRIPE_SECRET_KEY)
// ============================================================================

import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import { isCinetPayCountry } from "@/lib/constants/intake-options";
import crypto from "crypto";

// ── Pricing ─────────────────────────────────────────────────────────
// FCFA for African market, EUR for international.
// MVP: free unlock (0 FCFA / 0 EUR) — paywall gate stays in place so we can
// flip to real prices later without touching the result-page UI.
export const PAYWALL_PRICES = {
  INTAKE_REPORT_FCFA: 0,
  INTAKE_REPORT_EUR: 0,
} as const;

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
      if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
        throw new Error("Intake non finalise");
      }

      const reference = generateReference();
      // Auto-pick provider: CinetPay for African + Wakanda, Stripe otherwise
      const provider = input.provider === "AUTO"
        ? (isCinetPayCountry(intake.country) ? "CINETPAY" : "STRIPE")
        : input.provider;

      const amount = provider === "CINETPAY" ? PAYWALL_PRICES.INTAKE_REPORT_FCFA : PAYWALL_PRICES.INTAKE_REPORT_EUR * 100;
      const currency = provider === "CINETPAY" ? "XAF" as const : "EUR" as const;

      // Mock mode if amount is 0 (MVP free unlock), or if API keys missing (dev)
      const mockMode = amount === 0
        || (provider === "CINETPAY" && !process.env.CINETPAY_API_KEY)
        || (provider === "STRIPE" && !process.env.STRIPE_SECRET_KEY);

      if (mockMode) {
        await ctx.db.intakePayment.create({
          data: {
            reference,
            intakeToken: input.intakeToken,
            amount,
            currency,
            provider: "MOCK",
            status: "PAID",
            paidAt: new Date(),
          },
        });
        return {
          paymentUrl: `${input.returnUrl}?ref=${reference}&status=paid&mock=true`,
          reference,
          provider: "MOCK" as const,
          amount,
          currency,
        };
      }

      await ctx.db.intakePayment.create({
        data: {
          reference,
          intakeToken: input.intakeToken,
          amount,
          currency,
          provider,
          status: "PENDING",
        },
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
        await ctx.db.intakePayment.update({
          where: { reference },
          data: {
            status: "FAILED",
            failureReason: err instanceof Error ? err.message : "Payment initialization failed",
          },
        }).catch(() => undefined);
        throw new Error(err instanceof Error ? err.message : "Payment initialization failed");
      }
    }),

  /**
   * Verify a payment status by reference.
   * Used by the result page after redirect to gate the paid content.
   */
  verifyPayment: publicProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.intakePayment.findUnique({
        where: { reference: input.reference },
        select: { status: true, intakeToken: true, provider: true },
      });
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
      return {
        recommended: isCinetPayCountry(input.country) ? "CINETPAY" : "STRIPE",
        prices: {
          fcfa: PAYWALL_PRICES.INTAKE_REPORT_FCFA,
          eur: PAYWALL_PRICES.INTAKE_REPORT_EUR,
        },
      };
    }),

  // ── Admin: list/inspect IntakePayment rows ────────────────────────

  /**
   * List intake paywall payments. Admin only.
   * Supports filtering by status/provider, date range, and intake token.
   * Returns rows + cursor for pagination.
   */
  listAdmin: adminProcedure
    .input(z.object({
      status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
      provider: z.enum(["CINETPAY", "STRIPE", "MOCK"]).optional(),
      intakeToken: z.string().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
      limit: z.number().int().min(1).max(200).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.provider && { provider: input.provider }),
        ...(input.intakeToken && { intakeToken: input.intakeToken }),
        ...((input.from || input.to) && {
          createdAt: {
            ...(input.from && { gte: input.from }),
            ...(input.to && { lte: input.to }),
          },
        }),
      };

      const rows = await ctx.db.intakePayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
      };
    }),

  /**
   * Aggregate stats for an admin dashboard. Counts + revenue by currency.
   */
  statsAdmin: adminProcedure
    .input(z.object({
      from: z.date().optional(),
      to: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = (input.from || input.to)
        ? {
            createdAt: {
              ...(input.from && { gte: input.from }),
              ...(input.to && { lte: input.to }),
            },
          }
        : {};

      const [byStatus, paidByCurrency] = await Promise.all([
        ctx.db.intakePayment.groupBy({
          by: ["status"],
          where,
          _count: true,
        }),
        ctx.db.intakePayment.groupBy({
          by: ["currency"],
          where: { ...where, status: "PAID" },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return {
        countByStatus: Object.fromEntries(
          byStatus.map((r) => [r.status, r._count]),
        ) as Record<"PENDING" | "PAID" | "FAILED", number>,
        revenueByCurrency: paidByCurrency.map((r) => ({
          currency: r.currency,
          amount: r._sum.amount ?? 0,
          count: r._count,
        })),
      };
    }),
});
