/**
 * Mobile Money — Payment Integration for African Market
 * Supports Orange Money, MTN Mobile Money, Wave
 */

import { db } from "@/lib/db";

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
      method: `MOBILE_MONEY_${request.provider}` as never,
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

    await db.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: response.success ? "COMPLETED" : "FAILED",
        providerRef: response.providerRef,
        failureReason: response.error,
        processedAt: response.success ? new Date() : undefined,
      },
    });

    return {
      transactionRef: order.transactionRef ?? order.id,
      status: response.success ? "COMPLETED" : "FAILED",
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

  // Get talent's phone from their user profile
  const talentUser = await db.user.findUnique({ where: { id: commission.talentId } });
  const phone = talentUser?.email ?? ""; // In production, we'd have a phone field

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
      status: status as never,
      providerRef: (payload.providerRef ?? payload.financialTransactionId) as string,
      processedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  return { processed: true, orderId: order.id };
}

// Private helpers

async function callProviderAPI(
  provider: MobileMoneyProvider,
  params: { amount: number; currency: string; phone: string; reference: string }
): Promise<{ success: boolean; providerRef?: string; error?: string }> {
  // In production, this would make actual API calls
  // For now, simulate success
  const config = PROVIDER_CONFIG[provider];
  return {
    success: true,
    providerRef: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
