export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { cinetpayProvider } from "@/server/services/payment-providers/cinetpay";

// Notifications are only signals. Payment authority is the authenticated status
// API, bound to the receipt saved at initialization. Raw proof is never persisted.
const notification = z.object({
  merchant_transaction_id: z.string().min(1), transaction_id: z.string().min(1), notify_token: z.string().min(1),
});
const receipt = z.object({
  merchant_transaction_id: z.string().min(1), transaction_id: z.string().min(1), status: z.string().min(1),
  amount: z.number().optional(), currency: z.string().optional(),
});
function matchesProof(token: string, hash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(createHash("sha256").update(token).digest(), Buffer.from(hash, "hex"));
}

async function finishCycle(reference: string) {
  try {
    const { applySubscriptionCycleIfPaid } = await import("@/server/services/payment-providers/subscription-cycles");
    await applySubscriptionCycleIfPaid(reference);
    return NextResponse.json({ received: true, status: "PAID" });
  } catch {
    console.warn("[webhook/cinetpay] subscription cycle extension unavailable");
    return NextResponse.json({ error: "Cycle reconciliation unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    body = request.headers.get("content-type")?.includes("application/json")
      ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  const parsed = notification.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  const payload = parsed.data;
  const reference = payload.merchant_transaction_id;
  const payment = await db.intakePayment.findUnique({ where: { reference } });
  if (!payment || payment.provider !== "CINETPAY") return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
  // Pre-proof legacy rows are retained, never auto-promoted from an unbound signal.
  if (!payment.notificationTokenHash || !payment.providerRef) {
    return NextResponse.json({ error: "Payment reconciliation required" }, { status: 503 });
  }
  if (!matchesProof(payload.notify_token, payment.notificationTokenHash) || payload.transaction_id !== payment.providerRef) {
    return NextResponse.json({ error: "Invalid notification proof" }, { status: 401 });
  }
  if (payment.status === "PAID") return finishCycle(reference);

  let verified;
  try { verified = await cinetpayProvider.verifyPayment!(reference); }
  catch {
    // No provider text/token/body in logs. 503 permits a later authenticated retry.
    console.warn("[webhook/cinetpay] authoritative status unavailable");
    return NextResponse.json({ error: "Verification unavailable" }, { status: 503 });
  }
  const authoritative = receipt.safeParse(verified.raw);
  if (!authoritative.success) return NextResponse.json({ error: "Invalid payment receipt" }, { status: 503 });
  const data = authoritative.data;
  if (data.merchant_transaction_id !== reference || data.transaction_id !== payment.providerRef
    || (data.amount !== undefined && data.amount !== payment.amount)
    || (data.currency !== undefined && data.currency !== payment.currency)) {
    return NextResponse.json({ error: "Payment receipt mismatch" }, { status: 409 });
  }
  const paid = verified.paid && data.status === "SUCCESS";
  if (verified.paid !== (data.status === "SUCCESS")) return NextResponse.json({ error: "Inconsistent payment receipt" }, { status: 503 });
  if (!paid) {
    if (data.status === "FAILED" || data.status === "EXPIRED") {
      await db.intakePayment.updateMany({
        where: { reference, status: { not: "PAID" }, provider: "CINETPAY" },
        data: { status: "FAILED", failureReason: data.status },
      });
    } else if (!["PENDING", "INITIATED", "OK"].includes(data.status)) {
      return NextResponse.json({ error: "Status unavailable" }, { status: 503 });
    }
    const current = await db.intakePayment.findUniqueOrThrow({ where: { reference }, select: { status: true } });
    return NextResponse.json({ received: true, status: current.status });
  }

  const claimed = await db.intakePayment.updateMany({
    where: { reference, status: { not: "PAID" }, provider: "CINETPAY" },
    data: { status: "PAID", paidAt: new Date(), failureReason: null },
  });
  if (claimed.count > 0 && payment.intakeToken) {
    const { fulfillPaidIntakeReport } = await import("@/server/services/quick-intake/paid-fulfillment");
    void fulfillPaidIntakeReport(reference);
  }
  return finishCycle(reference);
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/payment/webhook/cinetpay" });
}
