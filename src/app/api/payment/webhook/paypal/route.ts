export const dynamic = "force-dynamic";
/**
 * PayPal webhook — confirms paywall payments from PayPal Orders v2.
 *
 * PayPal posts events with a verification flow that requires the webhook
 * id (PAYPAL_WEBHOOK_ID) and the OAuth token. We follow the
 * `verify-webhook-signature` REST endpoint pattern.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

function baseUrl(): string {
  return process.env.PAYPAL_ENV === "live" ? LIVE : SANDBOX;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) return null;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 };
  return data.access_token;
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("[paypal-webhook] PAYPAL_WEBHOOK_ID not set — accepting unverified events (DEV ONLY)");
    return process.env.NODE_ENV !== "production";
  }
  const token = await getAccessToken();
  if (!token) return false;

  const headers = req.headers;
  const verifyPayload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(verifyPayload),
  });
  const result = await res.json() as { verification_status?: string };
  return result.verification_status === "SUCCESS";
}

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: {
    id?: string;
    custom_id?: string;
    purchase_units?: Array<{ reference_id?: string; custom_id?: string }>;
    status?: string;
  };
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const verified = await verifySignature(req, rawBody);
  if (!verified) {
    return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
  }

  // We only act on approval / capture events.
  if (
    event.event_type !== "CHECKOUT.ORDER.APPROVED"
    && event.event_type !== "PAYMENT.CAPTURE.COMPLETED"
  ) {
    return NextResponse.json({ ok: true, ignored: event.event_type });
  }

  // Recover our reference (the `reference_id` we set on order creation = our `reference`).
  const reference =
    event.resource.purchase_units?.[0]?.reference_id
    ?? event.resource.purchase_units?.[0]?.custom_id
    ?? event.resource.custom_id
    ?? null;
  if (!reference) {
    return NextResponse.json({ error: "no reference_id on event" }, { status: 400 });
  }

  // ── CAPTURE avant livraison (fix revenue leak) ──────────────────────────
  // `CHECKOUT.ORDER.APPROVED` = l'acheteur a CONSENTI ; pour un ordre
  // `intent: "CAPTURE"` les fonds n'ont PAS bougé. L'ancien code marquait PAID
  // + livrait le PDF sur APPROVED sans jamais capturer → $0 encaissé sur chaque
  // vente PayPal. On capture d'abord ; sans capture COMPLETED, on ne livre pas.
  if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
    const orderId = event.resource.id;
    if (!orderId) {
      return NextResponse.json({ error: "no order id on APPROVED event" }, { status: 400 });
    }
    const { capturePayPalOrder } = await import("@/server/services/payment-providers/paypal");
    const cap = await capturePayPalOrder(orderId).catch(() => ({ captured: false }));
    if (!cap.captured) {
      console.warn(`[paypal-webhook] capture NOT completed for order ${orderId} (ref ${reference}) — livraison refusée`);
      return NextResponse.json({ ok: true, captured: false, order: orderId });
    }
  }

  // Fonds encaissés (APPROVED capturé, OU PAYMENT.CAPTURE.COMPLETED). Marque
  // PAID UNE seule fois : `updateMany` conditionnel `status ≠ PAID` → le
  // fulfillment + le cycle d'abonnement ne tournent qu'au 1er passage, même si
  // APPROVED-capture ET CAPTURE.COMPLETED arrivent (fin du double-fulfill sur
  // redelivery / double-événement).
  const claimed = await db.intakePayment.updateMany({
    where: { reference, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: new Date(), providerEventId: event.id },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const payment = await db.intakePayment.findUnique({
    where: { reference },
    select: { intakeToken: true },
  });
  // Fulfillment centralisé (fire-and-forget) : re-extraction premium +
  // livraison ORACLE_FULL selon le tierKey payé (audit 2026-07-16).
  if (payment?.intakeToken) {
    const { fulfillPaidIntakeReport } = await import("@/server/services/quick-intake/paid-fulfillment");
    void fulfillPaidIntakeReport(reference);
  }

  // Cycle d'abonnement manuel (Vague 5) — extension de période à l'encaissement.
  const { applySubscriptionCycleIfPaid } = await import(
    "@/server/services/payment-providers/subscription-cycles"
  );
  await applySubscriptionCycleIfPaid(reference).catch((err) =>
    console.warn("[paypal-webhook] subscription cycle extension failed:", err instanceof Error ? err.message : err),
  );

  return NextResponse.json({ ok: true, captured: true });
}
