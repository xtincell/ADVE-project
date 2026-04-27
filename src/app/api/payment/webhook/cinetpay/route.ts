import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// CinetPay webhook (notify_url) — confirms intake paywall payments
// ---------------------------------------------------------------------------
// CinetPay sends a POST with form-urlencoded fields. We verify the HMAC
// signature passed in the `x-token` header, then re-check the transaction
// against the CinetPay v2 verification API as a defense-in-depth step.
// ---------------------------------------------------------------------------

interface CinetPayNotify {
  cpm_trans_id?: string;
  cpm_site_id?: string;
  cpm_amount?: string;
  cpm_currency?: string;
  cpm_trans_status?: string;
  cpm_payid?: string;
  cpm_payment_date?: string;
  signature?: string;
}

function verifyHmac(rawBody: string, headerSig: string | null): boolean {
  const secret = process.env.CINETPAY_SECRET_KEY ?? process.env.WEBHOOK_SECRET;
  if (!secret || !headerSig) return false;

  const provided = headerSig.startsWith("sha256=") ? headerSig.slice(7) : headerSig;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

async function verifyWithCinetPay(transactionId: string): Promise<{ accepted: boolean; raw?: unknown }> {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  if (!apiKey || !siteId) return { accepted: false };

  const response = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  });

  const data = (await response.json()) as { code?: string; data?: { status?: string } };
  return { accepted: data.code === "00" && data.data?.status === "ACCEPTED", raw: data };
}

function parseFormBody(rawBody: string): CinetPayNotify {
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
    payload = contentType.includes("application/json")
      ? (JSON.parse(rawBody) as CinetPayNotify)
      : parseFormBody(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reference = payload.cpm_trans_id;
  if (!reference) {
    return NextResponse.json({ error: "Missing cpm_trans_id" }, { status: 400 });
  }

  const headerSig = request.headers.get("x-token");
  const hmacOk = verifyHmac(rawBody, headerSig);

  const verified = await verifyWithCinetPay(reference);

  if (!hmacOk && !verified.accepted) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  const isPaid = verified.accepted || payload.cpm_trans_status === "ACCEPTED";

  try {
    await db.intakePayment.update({
      where: { reference },
      data: isPaid
        ? { status: "PAID", paidAt: new Date(), providerRef: payload.cpm_payid ?? null }
        : { status: "FAILED", failureReason: payload.cpm_trans_status ?? "REFUSED" },
    });
  } catch {
    return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
  }

  return NextResponse.json({ received: true, status: isPaid ? "PAID" : "FAILED" });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/payment/webhook/cinetpay" });
}
