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
import { auditedProcedure } from "@/server/governance/governed-procedure";
import { resolvePrice } from "@/server/services/monetization";
import { pickProvider, PaymentProviderError, type PaymentProviderId } from "@/server/services/payment-providers";

// @governed-procedure-applied
const _auditedAdmin = auditedProcedure(adminProcedure, "payment");
/* eslint-disable @typescript-eslint/no-unused-vars */
/* lafusee:strangler-active */

// ── Pricing ─────────────────────────────────────────────────────────
// Prices come from the monetization service (market-localized). Admin
// users bypass the paywall entirely (no DB IntakePayment row needed —
// they're trusted operators). Non-admin users in dev without provider
// keys get a Mock provider that auto-confirms BUT this only works in
// non-production NODE_ENV — see payment-providers/mock.ts.

function generateReference(): string {
  return `lafusee_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

// Provider integrations live in src/server/services/payment-providers/.
// This router consumes them via `pickProvider()`.

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
      provider: z.enum(["CINETPAY", "STRIPE", "PAYPAL", "AUTO"]).default("AUTO"),
      returnUrl: z.string().url(),
      tierKey: z.enum(["INTAKE_PDF", "ORACLE_FULL"]).default("INTAKE_PDF"),
    }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.intakeToken },
        select: { id: true, contactName: true, contactEmail: true, companyName: true, country: true, status: true },
      });
      if (!intake) throw new Error("Intake introuvable");
      if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
        throw new Error("Intake non finalisé");
      }

      const reference = generateReference();

      // ── Admin bypass — operator users get free unlock without provider call.
      const isAdmin = ctx.session?.user?.role === "ADMIN";
      if (isAdmin) {
        await ctx.db.intakePayment.create({
          data: {
            reference,
            intakeToken: input.intakeToken,
            amount: 0,
            currency: "EUR",
            provider: "ADMIN_BYPASS",
            status: "PAID",
            paidAt: new Date(),
          },
        });
        return {
          paymentUrl: `${input.returnUrl}?ref=${reference}&status=paid&bypass=admin`,
          reference,
          provider: "ADMIN_BYPASS" as const,
          amount: 0,
          currency: "EUR",
        };
      }

      // ── Resolve real localized price via monetization service ──
      const country = intake.country ?? "FR";
      const resolved = await resolvePrice(input.tierKey, country);
      // Convert to provider's smallest unit (cents for EUR/USD/MAD; absolute units for XAF/XOF/NGN).
      const decimals = resolved.currencyCode === "EUR" || resolved.currencyCode === "USD" || resolved.currencyCode === "MAD" ? 2 : 0;
      const providerAmount = decimals === 2 ? Math.round(resolved.amount * 100) : Math.round(resolved.amount);

      // ── Pick provider via registry ──
      let providerImpl;
      try {
        providerImpl = pickProvider({
          countryCode: country,
          preferred: input.provider === "AUTO" ? undefined : input.provider as PaymentProviderId,
        });
      } catch (err) {
        throw new Error(`Aucun provider de paiement disponible. ${(err as Error).message}`);
      }

      const providerId = providerImpl.id;

      // ── Mock = auto-paid (non-prod only). Real providers require keys. ──
      if (providerId === "MOCK") {
        await ctx.db.intakePayment.create({
          data: {
            reference,
            intakeToken: input.intakeToken,
            amount: providerAmount,
            currency: resolved.currencyCode as "EUR" | "XAF" | "XOF" | "USD" | "MAD" | "NGN" | "GHS" | "TND" | "CDF" | "WKD",
            provider: "MOCK",
            status: "PAID",
            paidAt: new Date(),
          },
        });
        const result = await providerImpl.initPayment({
          reference,
          amount: providerAmount,
          currency: resolved.currencyCode,
          description: `Audit ADVE complet — ${intake.companyName}`,
          returnUrl: input.returnUrl,
          notifyUrl: `${input.returnUrl.split("/intake")[0]}/api/payment/webhook/mock`,
          customer: { name: intake.contactName, email: intake.contactEmail },
          metadata: { tierKey: input.tierKey, intakeToken: input.intakeToken },
        });
        return {
          paymentUrl: result.paymentUrl,
          reference,
          provider: "MOCK" as const,
          amount: providerAmount,
          currency: resolved.currencyCode,
        };
      }

      await ctx.db.intakePayment.create({
        data: {
          reference,
          intakeToken: input.intakeToken,
          amount: providerAmount,
          currency: resolved.currencyCode as "EUR" | "XAF" | "XOF" | "USD" | "MAD" | "NGN" | "GHS" | "TND" | "CDF" | "WKD",
          provider: providerId,
          status: "PENDING",
        },
      });

      try {
        const description = `${input.tierKey === "ORACLE_FULL" ? "Oracle complet" : "Audit ADVE+RTIS"} — ${intake.companyName}`;
        const result = await providerImpl.initPayment({
          reference,
          amount: providerAmount,
          currency: resolved.currencyCode,
          description,
          returnUrl: input.returnUrl,
          notifyUrl: `${input.returnUrl.split("/intake")[0]}/api/payment/webhook/${providerId.toLowerCase()}`,
          customer: { name: intake.contactName, email: intake.contactEmail },
          metadata: { tierKey: input.tierKey, intakeToken: input.intakeToken },
        });
        return {
          paymentUrl: result.paymentUrl,
          reference,
          provider: providerId,
          amount: providerAmount,
          currency: resolved.currencyCode,
        };
      } catch (err) {
        await ctx.db.intakePayment.update({
          where: { reference },
          data: {
            status: "FAILED",
            failureReason: err instanceof PaymentProviderError ? err.message : (err as Error).message,
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
   * Driven by the monetization service (real localized price).
   */
  getPricing: publicProcedure
    .input(z.object({ country: z.string().optional(), tierKey: z.enum(["INTAKE_PDF", "ORACLE_FULL"]).default("INTAKE_PDF") }))
    .query(async ({ input }) => {
      const country = input.country ?? "FR";
      const resolved = await resolvePrice(input.tierKey, country);
      return {
        recommended: isCinetPayCountry(country) ? "CINETPAY" : (process.env.PAYMENT_PREFER_PAYPAL === "true" ? "PAYPAL" : "STRIPE"),
        // Legacy shape kept for backward compat (existing UI binding).
        prices: {
          fcfa: resolved.currencyCode === "XAF" || resolved.currencyCode === "XOF" ? resolved.amount : 0,
          eur: resolved.currencyCode === "EUR" ? resolved.amount : 0,
        },
        // New canonical localized price (preferred by Neteru UI Kit).
        localized: resolved,
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
