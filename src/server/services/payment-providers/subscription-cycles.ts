/**
 * Abonnements mensuels — deux rails (Vague 5 mégasprint) :
 *
 *   1. INTERNATIONAL (Stripe) : vraie souscription récurrente — Checkout en
 *      mode subscription, le webhook customer.subscription.* maintient la
 *      table Subscription. Géré par stripe-subscription.ts.
 *   2. FCFA / MOBILE MONEY (CinetPay & co) : aucun provider de la zone ne
 *      fait du recurring fiable cross-opérateurs → **cycle manuel** : chaque
 *      mois est un paiement one-shot relié à sa Subscription
 *      (IntakePayment.subscriptionId) ; l'encaissement étend
 *      currentPeriodEnd de 30 jours. Honest by design — pas de prélèvement
 *      silencieux sur du mobile money, le client re-consent chaque cycle
 *      (cohérent avec « l'ignition est un acte », Blueprint §2.1).
 *
 * Ancre d'identité : `Subscription.operatorId = User.id` — c'est la clé que
 * `checkPaidTier` interroge (tier-gate Phase 16-A).
 */

import { db } from "@/lib/db";
import type { IntakePaymentCurrency, IntakePaymentProvider } from "@prisma/client";
import { resolvePrice } from "@/server/services/monetization/compute-price";
import type { PricingTierKey } from "@/server/services/monetization/pricing-tiers";
import { getTier } from "@/server/services/monetization/pricing-tiers";
import { pickProvider, type PaymentProviderId } from "./index";
import { PaymentProviderError } from "./types";

export const MONTHLY_TIER_KEYS = [
  "COCKPIT_MONTHLY",
  "RETAINER_BASE",
  "RETAINER_PRO",
  "RETAINER_ENTERPRISE",
] as const satisfies readonly PricingTierKey[];

export type MonthlyTierKey = (typeof MONTHLY_TIER_KEYS)[number];

const CYCLE_DAYS = 30;
const CENT_CURRENCIES = new Set(["EUR", "USD", "MAD"]);

function toProviderAmount(amount: number, currency: string): number {
  return CENT_CURRENCIES.has(currency) ? Math.round(amount * 100) : Math.round(amount);
}

function generateCycleReference(): string {
  return `SUBCYCLE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface StartCycleInput {
  userId: string;
  userEmail: string;
  userName?: string | null;
  tierKey: MonthlyTierKey;
  countryCode: string;
  returnUrl: string;
  preferredProvider?: PaymentProviderId;
  strategyId?: string;
}

export interface StartCycleResult {
  paymentUrl: string;
  reference: string;
  provider: string;
  amount: number;
  currency: string;
  subscriptionId: string;
}

/**
 * Démarre (ou renouvelle) un cycle d'abonnement manuel : upsert de la
 * Subscription ancrée sur l'utilisateur, paiement one-shot du cycle via le
 * provider de la zone. L'activation/extension se fait à l'encaissement
 * (webhook → applySubscriptionCycleIfPaid).
 */
export async function startManualSubscriptionCycle(
  input: StartCycleInput,
): Promise<StartCycleResult> {
  const tier = getTier(input.tierKey);
  const resolved = await resolvePrice(input.tierKey, input.countryCode);
  const providerAmount = toProviderAmount(resolved.amount, resolved.currencyCode);

  // ── Subscription ancrée user (operatorId = User.id — contrat checkPaidTier).
  let subscription = await db.subscription.findFirst({
    where: { operatorId: input.userId, tierKey: input.tierKey },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    subscription = await db.subscription.create({
      data: {
        providerSubscriptionId: `manual:${generateCycleReference()}`,
        operatorId: input.userId,
        strategyId: input.strategyId ?? null,
        tierKey: input.tierKey,
        status: "unpaid",
        currency: resolved.currencyCode,
        amountPerPeriod: providerAmount,
      },
    });
  }

  const reference = generateCycleReference();

  // ── Gratuit (override de zone / compte offert) : activation immédiate. ──
  if (resolved.amount === 0) {
    await db.intakePayment.create({
      data: {
        reference,
        intakeToken: "subscription-cycle",
        amount: 0,
        currency: resolved.currencyCode as IntakePaymentCurrency,
        provider: "ADMIN_BYPASS",
        status: "PAID",
        paidAt: new Date(),
        tierKey: input.tierKey,
        subscriptionId: subscription.id,
      },
    });
    await applySubscriptionCycleIfPaid(reference);
    return {
      paymentUrl: `${input.returnUrl}?ref=${reference}&status=paid&bypass=free&kind=subscription`,
      reference,
      provider: "ADMIN_BYPASS",
      amount: 0,
      currency: resolved.currencyCode,
      subscriptionId: subscription.id,
    };
  }

  const providerImpl = pickProvider({
    countryCode: input.countryCode,
    preferred: input.preferredProvider,
  });

  await db.intakePayment.create({
    data: {
      reference,
      intakeToken: "subscription-cycle",
      amount: providerAmount,
      currency: resolved.currencyCode as IntakePaymentCurrency,
      provider: providerImpl.id as IntakePaymentProvider,
      status: providerImpl.id === "MOCK" ? "PAID" : "PENDING",
      paidAt: providerImpl.id === "MOCK" ? new Date() : null,
      tierKey: input.tierKey,
      subscriptionId: subscription.id,
    },
  });

  try {
    const result = await providerImpl.initPayment({
      reference,
      amount: providerAmount,
      currency: resolved.currencyCode,
      description: `Abonnement ${tier.label} — cycle mensuel (${CYCLE_DAYS} j)`,
      returnUrl: input.returnUrl,
      notifyUrl: `${input.returnUrl.split("/pricing")[0]}/api/payment/webhook/${providerImpl.id.toLowerCase()}`,
      customer: { name: input.userName ?? input.userEmail, email: input.userEmail },
      metadata: { tierKey: input.tierKey, subscriptionId: subscription.id, kind: "SUBSCRIPTION_CYCLE" },
    });

    // MOCK auto-confirme — étend immédiatement (dev/demo).
    if (providerImpl.id === "MOCK") {
      await applySubscriptionCycleIfPaid(reference);
    }

    return {
      paymentUrl: result.paymentUrl,
      reference,
      provider: providerImpl.id,
      amount: providerAmount,
      currency: resolved.currencyCode,
      subscriptionId: subscription.id,
    };
  } catch (err) {
    await db.intakePayment
      .update({
        where: { reference },
        data: {
          status: "FAILED",
          failureReason: err instanceof PaymentProviderError ? err.message : (err as Error).message,
        },
      })
      .catch(() => undefined);
    throw err;
  }
}

/**
 * Idempotent — appelé par les webhooks (CinetPay / PayPal / mock) après
 * passage PAID : étend la Subscription liée de CYCLE_DAYS. Sans
 * subscriptionId (paiement intake classique), no-op silencieux.
 */
export async function applySubscriptionCycleIfPaid(reference: string): Promise<void> {
  const payment = await db.intakePayment.findUnique({
    where: { reference },
    select: { status: true, subscriptionId: true, paidAt: true },
  });
  if (!payment?.subscriptionId || payment.status !== "PAID") return;

  const subscription = await db.subscription.findUnique({
    where: { id: payment.subscriptionId },
  });
  if (!subscription) return;

  const now = payment.paidAt ?? new Date();
  // Renouvellement anticipé : on étend depuis la fin de période courante si
  // elle est dans le futur (le client ne perd jamais de jours payés).
  const base =
    subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;
  const newEnd = new Date(base.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);

  // Idempotence : si la fin de période couvre déjà ce paiement (webhook
  // rejoué), l'extension a déjà été appliquée pour cette référence.
  const alreadyApplied =
    subscription.status === "active" &&
    subscription.providerSnapshot &&
    typeof subscription.providerSnapshot === "object" &&
    (subscription.providerSnapshot as Record<string, unknown>).lastCycleRef === reference;
  if (alreadyApplied) return;

  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      currentPeriodStart: subscription.currentPeriodEnd && subscription.currentPeriodEnd > now ? subscription.currentPeriodStart : now,
      currentPeriodEnd: newEnd,
      cancelAtPeriodEnd: false,
      providerSnapshot: { lastCycleRef: reference, lastCycleAt: now.toISOString() },
    },
  });
}
