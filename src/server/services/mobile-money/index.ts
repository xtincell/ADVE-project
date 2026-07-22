/**
 * Mobile Money — Payment Integration for African Market
 * Supports Orange Money, MTN Mobile Money, Wave
 */

import { db } from "@/lib/db";
import { stableUuid } from "@/domain/schema-normalizer";
import type { PaymentMethod, PaymentOrderStatus } from "@prisma/client";

export type MobileMoneyProvider = "ORANGE" | "MTN" | "WAVE";

interface PaymentRequest {
  amount: number;
  currency: string;
  recipientPhone: string;
  recipientName: string;
  provider: MobileMoneyProvider;
  reference: string;
}

interface PaymentResponse {
  transactionRef: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  providerRef?: string;
  failureReason?: string;
}

// Provider-specific configuration
const PROVIDER_CONFIG: Record<MobileMoneyProvider, { apiUrl: string; prefix: string[] }> = {
  ORANGE: {
    apiUrl: process.env.ORANGE_MONEY_API_URL ?? "https://api.orange.com/orange-money-webpay/dev/v1",
    prefix: ["+237 6"],
  },
  MTN: {
    apiUrl: process.env.MTN_MOMO_API_URL ?? "https://sandbox.momodeveloper.mtn.com",
    prefix: ["+237 67", "+237 65"],
  },
  WAVE: {
    apiUrl: process.env.WAVE_API_URL ?? "https://api.wave.com/v1",
    prefix: ["+237"],
  },
};

/**
 * Detect provider from phone number
 */
export function detectProvider(phone: string): MobileMoneyProvider | null {
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.startsWith("+2376") && (cleaned[5] === "9" || cleaned[5] === "5" || cleaned[5] === "8")) return "ORANGE";
  if (cleaned.startsWith("+2376") && (cleaned[5] === "7" || cleaned[5] === "5" || cleaned[5] === "0")) return "MTN";
  return "WAVE"; // Default fallback
}

/**
 * Initiate a payment via Mobile Money
 */
export async function initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const order = await db.paymentOrder.create({
    data: {
      amount: request.amount,
      currency: request.currency,
      method: `MOBILE_MONEY_${request.provider}` as PaymentMethod,
      status: "PROCESSING",
      recipientPhone: request.recipientPhone,
      recipientName: request.recipientName,
      transactionRef: request.reference,
    },
  });

  try {
    // Provider-specific API call
    const response = await callProviderAPI(request.provider, {
      amount: request.amount,
      currency: request.currency,
      phone: request.recipientPhone,
      reference: request.reference,
    });

    const finalStatus = response.success ? "COMPLETED" : response.pending ? "PROCESSING" : "FAILED";
    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: finalStatus as PaymentOrderStatus,
        providerRef: response.providerRef,
        failureReason: response.error,
        processedAt: response.success ? new Date() : undefined,
      },
    });

    return {
      transactionRef: order.transactionRef ?? order.id,
      status: response.success ? "COMPLETED" : response.pending ? "PENDING" : "FAILED",
      providerRef: response.providerRef,
      failureReason: response.error,
    };
  } catch (error) {
    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return {
      transactionRef: order.transactionRef ?? order.id,
      status: "FAILED",
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process a commission payout via Mobile Money
 */
export async function payCommission(commissionId: string): Promise<PaymentResponse> {
  const commission = await db.commission.findUniqueOrThrow({
    where: { id: commissionId },
    include: { talent: true },
  });

  if (commission.status !== "PENDING") {
    throw new Error(`Commission ${commissionId} n'est pas en attente (status: ${commission.status})`);
  }

  // Destination payout = TalentProfile.payoutPhone (E.164). Le stub
  // historique utilisait l'EMAIL comme téléphone — refus explicite désormais.
  const phone = commission.talent.payoutPhone?.trim() ?? "";
  if (!phone) {
    throw new Error(
      `Talent ${commission.talent.displayName} sans payoutPhone — renseigner le numéro mobile money sur son profil avant le payout.`,
    );
  }

  const provider = detectProvider(phone) ?? "ORANGE";

  const result = await initiatePayment({
    amount: commission.netAmount,
    currency: commission.currency,
    recipientPhone: phone,
    recipientName: commission.talent.displayName,
    provider,
    reference: `COM-${commissionId}`,
  });

  if (result.status === "COMPLETED") {
    await db.commission.update({
      where: { id: commissionId },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  return result;
}

/**
 * Handle webhook callback from Mobile Money provider
 */
export async function handleWebhook(
  provider: MobileMoneyProvider,
  payload: Record<string, unknown>
): Promise<{ processed: boolean; orderId?: string }> {
  const transactionRef = (payload.reference ?? payload.externalId ?? payload.transactionId) as string;
  if (!transactionRef) return { processed: false };

  const order = await db.paymentOrder.findFirst({
    where: {
      OR: [{ transactionRef }, { providerRef: transactionRef }],
    },
  });

  if (!order) return { processed: false };

  const status = interpretProviderStatus(provider, payload);

  await db.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: status as PaymentOrderStatus,
      providerRef: (payload.providerRef ?? payload.financialTransactionId) as string,
      processedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  return { processed: true, orderId: order.id };
}

// Private helpers — VRAIS clients HTTP par provider (Vague 5).
//
// Doctrine « ne stub rien » : sans credentials, on retourne un échec EXPLICITE
// DEFERRED_AWAITING_CREDENTIALS (pattern ADR-0021/0075) — jamais un succès
// simulé. Le stub historique marquait des commissions PAID sans transfert réel.

interface ProviderCallResult {
  success: boolean;
  providerRef?: string;
  error?: string;
  /** true si l'ordre est accepté côté provider mais confirmé par webhook. */
  pending?: boolean;
}

async function callProviderAPI(
  provider: MobileMoneyProvider,
  params: { amount: number; currency: string; phone: string; reference: string },
): Promise<ProviderCallResult> {
  switch (provider) {
    case "WAVE":
      return callWavePayout(params);
    case "MTN":
      return callMtnDisbursement(params);
    case "ORANGE":
      return callOrangeTransfer(params);
  }
}

/**
 * Wave Payout API — POST /v1/payout (Bearer WAVE_API_KEY).
 * Réponse synchrone : { id, status: "succeeded" | "processing" | ... }.
 */
async function callWavePayout(params: {
  amount: number; currency: string; phone: string; reference: string;
}): Promise<ProviderCallResult> {
  const apiKey = process.env.WAVE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "DEFERRED_AWAITING_CREDENTIALS: WAVE_API_KEY absent — payout Wave non armé." };
  }
  const base = (process.env.WAVE_API_URL ?? PROVIDER_CONFIG.WAVE.apiUrl).replace(/\/$/, "");
  const res = await fetch(`${base}/payout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.reference,
    },
    body: JSON.stringify({
      currency: params.currency,
      receive_amount: String(params.amount),
      mobile: params.phone,
      client_reference: params.reference,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; status?: string; message?: string; code?: string };
  if (!res.ok) {
    return { success: false, error: `Wave ${res.status}: ${data.message ?? data.code ?? "payout refusé"}` };
  }
  const ok = data.status === "succeeded";
  return {
    success: ok,
    pending: !ok && data.status === "processing",
    providerRef: data.id,
    error: ok || data.status === "processing" ? undefined : `Wave status: ${data.status}`,
  };
}

/**
 * MTN MoMo Disbursements — token client_credentials puis POST /transfer
 * (X-Reference-Id UUID, confirmation asynchrone via GET /transfer/{id}).
 */
async function callMtnDisbursement(params: {
  amount: number; currency: string; phone: string; reference: string;
}): Promise<ProviderCallResult> {
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const apiUser = process.env.MTN_MOMO_API_USER;
  const apiKey = process.env.MTN_MOMO_API_KEY;
  if (!subscriptionKey || !apiUser || !apiKey) {
    return {
      success: false,
      error: "DEFERRED_AWAITING_CREDENTIALS: MTN_MOMO_SUBSCRIPTION_KEY / MTN_MOMO_API_USER / MTN_MOMO_API_KEY absents — disbursement MTN non armé.",
    };
  }
  const base = (process.env.MTN_MOMO_API_URL ?? PROVIDER_CONFIG.MTN.apiUrl).replace(/\/$/, "");
  const env = process.env.MTN_MOMO_TARGET_ENV ?? "sandbox";

  // 1. Token disbursement (client_credentials basic auth apiUser:apiKey)
  const tokenRes = await fetch(`${base}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  });
  const token = ((await tokenRes.json().catch(() => ({}))) as { access_token?: string }).access_token;
  if (!tokenRes.ok || !token) {
    return { success: false, error: `MTN token ${tokenRes.status}: authentification disbursement refusée` };
  }

  // 2. Transfer — l'X-Reference-Id devient notre providerRef de polling.
  // Idempotence (audit adversarial 2026-07-22) : DÉTERMINISTE depuis `params.reference`
  // (unique par commission, `COM-<id>`). Un random à chaque retry (ancien
  // `crypto.randomUUID()`) faisait que MTN ne dédupliquait PAS → double-décaissement
  // réel sur re-tentative. Parité avec Wave (`Idempotency-Key: params.reference`).
  const referenceId = stableUuid(params.reference);
  const msisdn = params.phone.replace(/[^0-9]/g, "");
  const res = await fetch(`${base}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": env,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: env === "sandbox" ? "EUR" : params.currency,
      externalId: params.reference,
      payee: { partyIdType: "MSISDN", partyId: msisdn },
      payerMessage: "Commission La Fusee",
      payeeNote: params.reference,
    }),
  });
  if (res.status !== 202) {
    const errBody = await res.text().catch(() => "");
    return { success: false, error: `MTN transfer ${res.status}: ${errBody.slice(0, 200) || "refusé"}` };
  }
  // 202 Accepted — confirmation asynchrone (webhook/poll). On marque pending.
  return { success: false, pending: true, providerRef: referenceId };
}

/**
 * Orange Money — token OAuth client_credentials puis transfert via l'API
 * partenaire configurée (ORANGE_MONEY_TRANSFER_PATH, défaut cashins 1.0.2).
 * Les contrats Orange varient par pays : l'endpoint exact est configurable.
 */
async function callOrangeTransfer(params: {
  amount: number; currency: string; phone: string; reference: string;
}): Promise<ProviderCallResult> {
  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "DEFERRED_AWAITING_CREDENTIALS: ORANGE_CLIENT_ID / ORANGE_CLIENT_SECRET absents — transfert Orange Money non armé.",
    };
  }
  const tokenRes = await fetch("https://api.orange.com/oauth/v3/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const token = ((await tokenRes.json().catch(() => ({}))) as { access_token?: string }).access_token;
  if (!tokenRes.ok || !token) {
    return { success: false, error: `Orange token ${tokenRes.status}: authentification refusée` };
  }

  const base = (process.env.ORANGE_MONEY_API_URL ?? PROVIDER_CONFIG.ORANGE.apiUrl).replace(/\/$/, "");
  const path = process.env.ORANGE_MONEY_TRANSFER_PATH ?? "/omcoreapis/1.0.2/mp/pay";
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_key: params.phone.replace(/[^0-9]/g, ""),
      amount: String(params.amount),
      currency: params.currency,
      reference: params.reference,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; transactionId?: string; message?: string };
  if (!res.ok) {
    return { success: false, error: `Orange ${res.status}: ${data.message ?? "transfert refusé"}` };
  }
  const ok = (data.status ?? "").toUpperCase() === "SUCCESS" || (data.status ?? "").toUpperCase() === "SUCCESSFUL";
  return {
    success: ok,
    pending: !ok,
    providerRef: data.transactionId,
  };
}

function interpretProviderStatus(provider: MobileMoneyProvider, payload: Record<string, unknown>): string {
  const status = (payload.status ?? payload.state) as string;
  const statusMap: Record<string, string> = {
    SUCCESS: "COMPLETED",
    SUCCESSFUL: "COMPLETED",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    REJECTED: "FAILED",
    PENDING: "PROCESSING",
    PROCESSING: "PROCESSING",
  };
  return statusMap[status?.toUpperCase()] ?? "PROCESSING";
}
