/**
 * CinetPay provider — Mobile Money + cards for African markets (Orange/MTN/Wave).
 */
import type { PaymentInitInput, PaymentInitResult, PaymentProvider } from "./types";
import { PaymentProviderError } from "./types";

export const cinetpayProvider: PaymentProvider = {
  id: "CINETPAY",

  isConfigured() {
    return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
  },

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const apiKey = process.env.CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    if (!apiKey || !siteId) {
      throw new PaymentProviderError("CINETPAY", input.reference, "CINETPAY_API_KEY + CINETPAY_SITE_ID required");
    }

    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: input.reference,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
        customer_name: input.customer.name ?? "Client",
        customer_email: input.customer.email,
        channels: "ALL", // Mobile Money + Card
        metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      }),
    });

    const data = await response.json() as { code?: string; data?: { payment_url?: string; payment_token?: string }; message?: string };
    if (data.code !== "201" || !data.data?.payment_url) {
      throw new PaymentProviderError("CINETPAY", input.reference, data.message ?? "init failed");
    }
    return { paymentUrl: data.data.payment_url, providerRef: data.data.payment_token };
  },
};
