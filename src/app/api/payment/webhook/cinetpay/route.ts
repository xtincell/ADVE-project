export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { cinetpayProvider } from "@/server/services/payment-providers/cinetpay";

// ---------------------------------------------------------------------------
// CinetPay webhook (notifyUrl) — "Aurore" v1 API notifications.
// ---------------------------------------------------------------------------
// Aurore posts a JSON body:
//   { merchantTransactionId, transactionId, notifyToken, status }
// We DON'T trust the payload blindly: we re-verify the transaction against the
// Aurore status API (authoritative, defense in depth). If that call is
// unavailable (e.g. IP allow-list not yet set during first tests) we fall back
// to the notification's own status, optionally gated by notifyToken when a
// CINETPAY_NOTIFY_TOKEN is configured — so a genuine sandbox notification is
// still honored while a spoofed one without the token is not.
//
// Legacy v2 fields (cpm_*) are still parsed so an old-format POST degrades
// gracefully instead of 400-ing.
// ---------------------------------------------------------------------------

interface CinetPayNotify {
  merchantTransactionId?: string;
  transactionId?: string;
  notifyToken?: string;
  status?: string;
  // Legacy v2 fallback fields:
  cpm_trans_id?: string;
  cpm_trans_status?: string;
  cpm_payid?: string;
}

function notifyTokenMatches(provided: string | undefined): boolean {
  const expected = process.env.CINETPAY_NOTIFY_TOKEN;
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseBody(rawBody: string, contentType: string): CinetPayNotify {
  if (contentType.includes("application/json")) {
    return JSON.parse(rawBody) as CinetPayNotify;
  }
  const params = new URLSearchParams(rawBody);
  const out: CinetPayNotify = {};
  for (const [k, v] of params.entries()) (out as Record<string, string>)[k] = v;
  return out;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const contentType = request.headers.get("content-type") ?? "";

  let payload: CinetPayNotify;
  try {
    payload = parseBody(rawBody, contentType);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reference = payload.merchantTransactionId ?? payload.cpm_trans_id;
  if (!reference) {
    return NextResponse.json({ error: "Missing merchantTransactionId" }, { status: 400 });
  }

  // Authoritative re-check against the Aurore status API. Fall back to the
  // notification payload only if that call throws.
  let isPaid: boolean;
  try {
    const verified = await cinetpayProvider.verifyPayment!(reference);
    isPaid = verified.paid;
  } catch (err) {
    console.warn(
      "[webhook/cinetpay] status re-check unavailable, falling back to payload:",
      err instanceof Error ? err.message : err,
    );
    const rawStatus = payload.status ?? payload.cpm_trans_status;
    const statusOk = rawStatus === "SUCCESS" || rawStatus === "ACCEPTED";
    // If a notify token is configured, require it; otherwise accept the status.
    isPaid = statusOk && (process.env.CINETPAY_NOTIFY_TOKEN ? notifyTokenMatches(payload.notifyToken) : true);
  }

  const providerRef = payload.transactionId ?? payload.cpm_payid ?? null;

  let intakeToken: string | null = null;
  let newlyPaid = false;
  if (isPaid) {
    // Claim atomique : PAID une SEULE fois → le fulfillment ne tourne qu'au 1er
    // passage même si CinetPay redélivre la notif (fin du double-envoi email +
    // ré-assemblage Oracle). Le cycle d'abonnement plus bas est déjà idempotent.
    const claimed = await db.intakePayment.updateMany({
      where: { reference, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), providerRef },
    });
    newlyPaid = claimed.count > 0;
    const row = await db.intakePayment.findUnique({
      where: { reference },
      select: { intakeToken: true },
    });
    if (!row) return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
    intakeToken = row.intakeToken;
  } else {
    try {
      const payment = await db.intakePayment.update({
        where: { reference },
        data: { status: "FAILED", failureReason: payload.status ?? payload.cpm_trans_status ?? "REFUSED" },
      });
      intakeToken = payment.intakeToken;
    } catch {
      return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
    }
  }

  // Fulfillment centralisé (fire-and-forget) — UNIQUEMENT au 1er passage PAID :
  // re-extraction premium + livraison ORACLE_FULL selon le tierKey payé.
  if (isPaid && newlyPaid && intakeToken) {
    const { fulfillPaidIntakeReport } = await import("@/server/services/quick-intake/paid-fulfillment");
    void fulfillPaidIntakeReport(reference);
  }

  // Cycle d'abonnement manuel : un paiement lié à une Subscription étend sa
  // période de 30 j à l'encaissement. No-op pour un paiement intake.
  if (isPaid) {
    const { applySubscriptionCycleIfPaid } = await import(
      "@/server/services/payment-providers/subscription-cycles"
    );
    await applySubscriptionCycleIfPaid(reference).catch((err) =>
      console.warn("[webhook/cinetpay] subscription cycle extension failed:", err instanceof Error ? err.message : err),
    );
  }

  return NextResponse.json({ received: true, status: isPaid ? "PAID" : "FAILED" });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/payment/webhook/cinetpay" });
}
