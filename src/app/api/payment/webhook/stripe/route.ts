import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Stripe webhook — confirms intake paywall payments
// ---------------------------------------------------------------------------
// Stripe sends events with a `stripe-signature` header containing a timestamp
// and one or more v1 HMAC-SHA256 signatures over `${ts}.${rawBody}`, signed
// with STRIPE_WEBHOOK_SECRET. We only act on `checkout.session.completed`.
// ---------------------------------------------------------------------------

interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession };
}

interface StripeCheckoutSession {
  id: string;
  client_reference_id?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  payment_intent?: string | null;
}

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60; // Stripe default

function verifyStripeSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = header.split(",").map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith("t="));
  const sigParts = parts.filter((p) => p.startsWith("v1="));
  if (!tsPart || sigParts.length === 0) return false;

  const ts = Number(tsPart.slice(2));
  if (!Number.isFinite(ts)) return false;

  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > SIGNATURE_TOLERANCE_SECONDS) return false;

  const signedPayload = `${ts}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  for (const sig of sigParts) {
    const provided = sig.slice(3);
    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(provided, "hex"),
          Buffer.from(expected, "hex")
        )
      ) {
        return true;
      }
    } catch {
      // Length mismatch — try next signature
    }
  }
  return false;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // We only care about successful checkout completions.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object;
  const reference = session.client_reference_id;
  if (!reference) {
    return NextResponse.json({ error: "Missing client_reference_id" }, { status: 400 });
  }

  const paid = session.payment_status === "paid";

  try {
    await db.intakePayment.update({
      where: { reference },
      data: paid
        ? {
            status: "PAID",
            paidAt: new Date(),
            providerRef: session.payment_intent ?? session.id,
          }
        : {
            status: "FAILED",
            failureReason: session.payment_status ?? "unpaid",
          },
    });
  } catch {
    return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
  }

  return NextResponse.json({ received: true, status: paid ? "PAID" : "FAILED" });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/payment/webhook/stripe" });
}
