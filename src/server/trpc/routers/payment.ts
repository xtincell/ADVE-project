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
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../init";
import { isCinetPayCountry } from "@/lib/constants/intake-options";
import crypto from "crypto";
import { resolvePrice } from "@/server/services/monetization";
import { pickProvider, PaymentProviderError, type PaymentProviderId } from "@/server/services/payment-providers";

/* lafusee:public-payment-init — IntakePayment row provides own audit trail */

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

      // ── Zero-amount bypass ──
      // If the resolved amount is 0 (due to a pricing override in the DB or a free tier),
      // we bypass the payment provider entirely and unlock the deliverable.
      if (resolved.amount === 0) {
        await ctx.db.intakePayment.create({
          data: {
            reference,
            intakeToken: input.intakeToken,
            amount: 0,
            currency: resolved.currencyCode as any,
            provider: "ADMIN_BYPASS",
            status: "PAID",
            paidAt: new Date(),
          },
        });
        return {
          paymentUrl: `${input.returnUrl}?ref=${reference}&status=paid&bypass=free`,
          reference,
          provider: "ADMIN_BYPASS" as const,
          amount: 0,
          currency: resolved.currencyCode,
        };
      }

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
   * Grille tarifaire publique localisée — alimente /pricing.
   * Déterministe : resolvePrice par pays (SPU × market-factor × FX + overrides).
   */
  getTierGrid: publicProcedure
    .input(z.object({ countryCode: z.string().min(2).max(3).default("CM") }))
    .query(async ({ input }) => {
      const { buildTierGrid } = await import("@/server/services/monetization/compute-price");
      const keys = [
        "INTAKE_FREE",
        "INTAKE_PDF",
        "ORACLE_FULL",
        "COCKPIT_MONTHLY",
        "RETAINER_BASE",
        "RETAINER_PRO",
        "RETAINER_ENTERPRISE",
      ] as const;
      const grid = await buildTierGrid(input.countryCode, keys);
      return grid.map((t) => ({
        key: t.definition.key,
        label: t.definition.label,
        summary: t.definition.summary,
        inclusions: t.definition.inclusions,
        billing: t.definition.billing,
        amount: t.price.amount,
        currencyCode: t.price.currencyCode,
      }));
    }),

  /**
   * Démarre un abonnement mensuel (Vague 5) :
   *   - Stripe (recurring natif) si devise carte internationale ou demandé ;
   *   - sinon cycle manuel FCFA/mobile money (paiement one-shot 30 j relié à
   *     la Subscription, étendue à l'encaissement par le webhook).
   * Ancre : Subscription.operatorId = User.id (contrat checkPaidTier).
   */
  initSubscription: protectedProcedure
    .input(z.object({
      tierKey: z.enum(["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]),
      countryCode: z.string().min(2).max(3).default("CM"),
      returnUrl: z.string().url(),
      provider: z.enum(["AUTO", "STRIPE", "CINETPAY", "PAYPAL"]).default("AUTO"),
      strategyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const email = user.email;
      if (!email) throw new Error("Email utilisateur requis pour souscrire.");

      const resolved = await resolvePrice(input.tierKey, input.countryCode);
      const isCardCurrency = resolved.currencyCode === "EUR" || resolved.currencyCode === "USD" || resolved.currencyCode === "MAD";
      const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
      const wantsStripe = input.provider === "STRIPE" || (input.provider === "AUTO" && isCardCurrency);

      if (wantsStripe && stripeConfigured && resolved.amount > 0) {
        const { initStripeSubscription } = await import(
          "@/server/services/payment-providers/stripe-subscription"
        );
        const reference = generateReference();
        const decimals = isCardCurrency ? 2 : 0;
        const providerAmount = decimals === 2 ? Math.round(resolved.amount * 100) : Math.round(resolved.amount);
        const result = await initStripeSubscription({
          reference,
          amountPerPeriod: providerAmount,
          currency: resolved.currencyCode,
          tierKey: input.tierKey,
          productName: `La Fusée — ${input.tierKey}`,
          returnUrl: input.returnUrl,
          customer: { email, name: user.name ?? undefined },
          operatorId: user.id,
          metadata: { tierKey: input.tierKey, operatorId: user.id },
        });
        return {
          paymentUrl: result.paymentUrl,
          reference,
          provider: "STRIPE" as const,
          mode: "RECURRING" as const,
          amount: providerAmount,
          currency: resolved.currencyCode,
        };
      }

      // ── Cycle manuel (FCFA / mobile money / Stripe absent) ──
      const { startManualSubscriptionCycle } = await import(
        "@/server/services/payment-providers/subscription-cycles"
      );
      const cycle = await startManualSubscriptionCycle({
        userId: user.id,
        userEmail: email,
        userName: user.name,
        tierKey: input.tierKey,
        countryCode: input.countryCode,
        returnUrl: input.returnUrl,
        preferredProvider: input.provider === "AUTO" ? undefined : (input.provider as PaymentProviderId),
        strategyId: input.strategyId,
      });
      return {
        paymentUrl: cycle.paymentUrl,
        reference: cycle.reference,
        provider: cycle.provider,
        mode: "MANUAL_CYCLE" as const,
        amount: cycle.amount,
        currency: cycle.currency,
      };
    }),

  /** Abonnements de l'utilisateur courant (ancre operatorId = User.id). */
  mySubscriptions: protectedProcedure.query(({ ctx }) =>
    ctx.db.subscription.findMany({
      where: { operatorId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ),

  /** Annule à fin de période (Stripe : annulation provider ; manuel : flag). */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscription.findUnique({ where: { id: input.subscriptionId } });
      if (!sub || sub.operatorId !== ctx.session.user.id) throw new Error("Souscription introuvable.");
      if (!sub.providerSubscriptionId.startsWith("manual:")) {
        const { cancelStripeSubscription } = await import(
          "@/server/services/payment-providers/stripe-subscription"
        );
        await cancelStripeSubscription(sub.providerSubscriptionId);
      }
      return ctx.db.subscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
      });
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
