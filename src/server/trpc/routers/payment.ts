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
            tierKey: input.tierKey,
          },
        });
        // PAID immédiat (pas de webhook) → fulfillment ici (ORACLE_FULL livré).
        void import("@/server/services/quick-intake/paid-fulfillment").then((m) =>
          m.fulfillPaidIntakeReport(reference),
        );
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
            tierKey: input.tierKey,
          },
        });
        void import("@/server/services/quick-intake/paid-fulfillment").then((m) =>
          m.fulfillPaidIntakeReport(reference),
        );
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
            tierKey: input.tierKey,
          },
        });
        void import("@/server/services/quick-intake/paid-fulfillment").then((m) =>
          m.fulfillPaidIntakeReport(reference),
        );
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
          // Tier acheté — SANS ça, le webhook ne peut pas savoir quoi livrer
          // (cause racine du gap « ORACLE_FULL payé jamais livré », audit
          // 2026-07-16 : la colonne existait, jamais peuplée).
          tierKey: input.tierKey,
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
    .query(async ({ input, ctx }) => {
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
      // Admin / god-mode accounts: 100% reduction across every paid tier
      // (the JWT callback already elevates god-mode emails to role ADMIN).
      const isAdmin = ctx.session?.user?.role === "ADMIN";
      return grid.map((t) => ({
        key: t.definition.key,
        label: t.definition.label,
        summary: t.definition.summary,
        inclusions: t.definition.inclusions,
        billing: t.definition.billing,
        amount: isAdmin ? 0 : t.price.amount,
        currencyCode: t.price.currencyCode,
        listAmount: t.price.amount,
        adminFree: isAdmin && t.price.amount > 0,
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

      // ── Admin / god-mode : 100% reduction — activate the tier free, never
      // route to a payment provider. (God-mode already bypasses paid-tier
      // gates ; we still materialize an ACTIVE Subscription so it surfaces in
      // mySubscriptions and the cockpit reads a consistent state.)
      if (user.role === "ADMIN") {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const reference = generateReference();
        await ctx.db.subscription.create({
          data: {
            providerSubscriptionId: `admin-free:${reference}`,
            strategyId: input.strategyId ?? null,
            operatorId: user.id,
            tierKey: input.tierKey,
            status: "active",
            currency: "XAF",
            amountPerPeriod: 0,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            providerSnapshot: { adminFree: true, grantedTo: email },
          },
        });
        return {
          paymentUrl: input.returnUrl,
          reference,
          provider: "ADMIN_FREE" as const,
          mode: "ADMIN_FREE" as const,
          amount: 0,
          currency: "XAF",
        };
      }

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

  // ── MANUAL PAYMENT (WhatsApp + operator validation) ──────────────────
  // Production path that bypasses the automatic providers (which need creds).
  // The user clicks "Payer", is redirected to the operator's WhatsApp, and a
  // `pending_manual` Subscription is recorded. It grants NO tier until the
  // operator validates it in the Console (status → "active"). checkPaidTier
  // only matches status ∈ {active, trialing}, so pending_manual is inert.

  /** Initialise une demande d'abonnement manuelle → lien WhatsApp + demande en Console. */
  initManualSubscription: protectedProcedure
    .input(z.object({
      tierKey: z.enum(["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]),
      countryCode: z.string().min(2).max(3).default("CM"),
      strategyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const email = user.email ?? null;
      const resolved = await resolvePrice(input.tierKey, input.countryCode);
      const amount = Math.round(resolved.amount);

      // Admin / god-mode → activate the tier free + instantly (no WhatsApp).
      if (user.role === "ADMIN") {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const reference = generateReference();
        await ctx.db.subscription.create({
          data: {
            providerSubscriptionId: `admin-free:${reference}`,
            strategyId: input.strategyId ?? null,
            operatorId: user.id,
            tierKey: input.tierKey,
            status: "active",
            currency: resolved.currencyCode,
            amountPerPeriod: 0,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            providerSnapshot: { adminFree: true, grantedTo: email },
          },
        });
        return { mode: "ADMIN_FREE" as const, whatsappUrl: null, reference, amount: 0, currency: resolved.currencyCode };
      }

      // Reuse an existing open request for this (user, tier) to keep the
      // Console queue clean — don't spawn duplicates on repeated clicks.
      const existing = await ctx.db.subscription.findFirst({
        where: { operatorId: user.id, tierKey: input.tierKey, status: "pending_manual" },
        orderBy: { createdAt: "desc" },
      });
      const reference = existing
        ? existing.providerSubscriptionId.replace(/^manual-wa:/, "")
        : generateReference();

      if (!existing) {
        await ctx.db.subscription.create({
          data: {
            providerSubscriptionId: `manual-wa:${reference}`,
            strategyId: input.strategyId ?? null,
            operatorId: user.id,
            tierKey: input.tierKey,
            status: "pending_manual",
            currency: resolved.currencyCode,
            amountPerPeriod: amount,
            providerSnapshot: {
              manualWhatsApp: true,
              countryCode: input.countryCode,
              contactEmail: email,
              contactName: user.name ?? null,
              requestedAt: new Date().toISOString(),
            },
          },
        });
      }

      const waNumber = (process.env.MANUAL_PAYMENT_WHATSAPP_NUMBER ?? "237694171799").replace(/\D/g, "");
      const message =
        `Bonjour, je souhaite m'abonner à La Fusée — formule ${input.tierKey} ` +
        `(${amount} ${resolved.currencyCode}). Email : ${email ?? "—"}. Réf : ${reference}.`;
      const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

      return { mode: "MANUAL_WHATSAPP" as const, whatsappUrl, reference, amount, currency: resolved.currencyCode };
    }),

  /** Console : file des demandes d'abonnement manuelles en attente. */
  listManualSubscriptions: adminProcedure
    .input(z.object({ status: z.enum(["pending_manual", "active", "rejected_manual", "all"]).default("pending_manual") }).optional())
    .query(({ ctx, input }) => {
      const status = input?.status ?? "pending_manual";
      return ctx.db.subscription.findMany({
        where: status === "all" ? { providerSubscriptionId: { startsWith: "manual-wa:" } } : { status },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }),

  /** Console : valide une demande manuelle → active le tier (période 30 j). */
  approveManualSubscription: adminProcedure
    .input(z.object({ subscriptionId: z.string(), periodDays: z.number().int().min(1).max(366).default(30) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscription.findUnique({ where: { id: input.subscriptionId } });
      if (!sub || sub.status !== "pending_manual") throw new Error("Demande manuelle introuvable ou déjà traitée.");
      const now = new Date();
      const periodEnd = new Date(now.getTime() + input.periodDays * 24 * 60 * 60 * 1000);
      const updated = await ctx.db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          providerSnapshot: {
            ...((sub.providerSnapshot as Record<string, unknown>) ?? {}),
            approvedBy: ctx.session.user.id,
            approvedAt: now.toISOString(),
          },
        },
      });
      const auditTrail = await import("@/server/services/audit-trail");
      auditTrail.log({
        userId: ctx.session.user.id,
        action: "UPDATE",
        entityType: "Subscription",
        entityId: sub.id,
        newValue: { status: "active", tierKey: sub.tierKey, manualApproval: true },
      }).catch(() => {});
      return updated;
    }),

  /** Console : refuse une demande manuelle. */
  rejectManualSubscription: adminProcedure
    .input(z.object({ subscriptionId: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscription.findUnique({ where: { id: input.subscriptionId } });
      if (!sub || sub.status !== "pending_manual") throw new Error("Demande manuelle introuvable ou déjà traitée.");
      return ctx.db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "rejected_manual",
          cancelledAt: new Date(),
          providerSnapshot: {
            ...((sub.providerSnapshot as Record<string, unknown>) ?? {}),
            rejectedBy: ctx.session.user.id,
            rejectedReason: input.reason ?? null,
            rejectedAt: new Date().toISOString(),
          },
        },
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
        select: { status: true, intakeToken: true, provider: true, tierKey: true },
      });
      if (!payment) {
        return { status: "NOT_FOUND" as const, paid: false, tierKey: null, oracleShareUrl: null };
      }
      // ORACLE_FULL payé : remonter le lien de la stratégie complète au payeur
      // (le fulfillment l'a activée — audit 2026-07-16, le payeur ne voyait RIEN).
      let oracleShareUrl: string | null = null;
      if (payment.status === "PAID" && payment.tierKey === "ORACLE_FULL" && payment.intakeToken) {
        try {
          const intake = await ctx.db.quickIntake.findUnique({
            where: { shareToken: payment.intakeToken },
            select: { convertedToId: true },
          });
          if (intake?.convertedToId) {
            const { getShareToken } = await import("@/server/services/strategy-presentation");
            oracleShareUrl = (await getShareToken(intake.convertedToId)).url;
          }
        } catch {
          /* best-effort — l'assemblage peut encore être en cours */
        }
      }
      return {
        status: payment.status,
        paid: payment.status === "PAID",
        intakeToken: payment.intakeToken,
        provider: payment.provider,
        tierKey: payment.tierKey,
        oracleShareUrl,
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
