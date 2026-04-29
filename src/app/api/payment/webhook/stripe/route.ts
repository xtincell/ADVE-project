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
  data: { object: StripeCheckoutSession | StripeSubscription };
}

interface StripeCheckoutSession {
  id: string;
  mode?: "payment" | "subscription";
  client_reference_id?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  payment_intent?: string | null;
  subscription?: string | null;
  customer?: string | null;
  metadata?: Record<string, string> | null;
  currency?: string | null;
  amount_total?: number | null;
}

interface StripeSubscription {
  id: string;
  status: "active" | "past_due" | "canceled" | "trialing" | "unpaid" | "incomplete" | "incomplete_expired";
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  customer?: string | null;
  items?: { data?: Array<{ price?: { unit_amount?: number; currency?: string } }> };
  metadata?: Record<string, string>;
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

  // ── Handle one-time intake payments ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;

    // Subscription mode: provision the Subscription row.
    if (session.mode === "subscription" && session.subscription) {
      try {
        await db.subscription.upsert({
          where: { providerSubscriptionId: session.subscription },
          create: {
            providerSubscriptionId: session.subscription,
            tierKey: session.metadata?.tierKey ?? "UNKNOWN",
            strategyId: session.metadata?.strategyId || null,
            operatorId: session.metadata?.operatorId || null,
            status: "active",
            currency: (session.currency ?? "EUR").toUpperCase(),
            amountPerPeriod: session.amount_total ?? 0,
            providerSnapshot: JSON.parse(JSON.stringify(session)),
          },
          update: {
            status: "active",
            providerSnapshot: JSON.parse(JSON.stringify(session)),
          },
        });
      } catch (err) {
        console.error("[stripe-webhook] subscription upsert failed:", err);
      }
      return NextResponse.json({ received: true, mode: "subscription" });
    }

    // One-time payment.
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
              providerEventId: event.id,
            }
          : {
              status: "FAILED",
              failureReason: session.payment_status ?? "unpaid",
              providerEventId: event.id,
            },
      });
    } catch {
      return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
    }
    return NextResponse.json({ received: true, status: paid ? "PAID" : "FAILED" });
  }

  // ── Handle subscription lifecycle ──
  if (
    event.type === "customer.subscription.created"
    || event.type === "customer.subscription.updated"
    || event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as StripeSubscription;
    const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : null;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
    const cancelledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000) : null;
    const item = sub.items?.data?.[0];

    try {
      await db.subscription.upsert({
        where: { providerSubscriptionId: sub.id },
        create: {
          providerSubscriptionId: sub.id,
          tierKey: sub.metadata?.tierKey ?? "UNKNOWN",
          strategyId: sub.metadata?.strategyId || null,
          operatorId: sub.metadata?.operatorId || null,
          status: sub.status,
          currency: (item?.price?.currency ?? "eur").toUpperCase(),
          amountPerPeriod: item?.price?.unit_amount ?? 0,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          cancelledAt,
          providerSnapshot: JSON.parse(JSON.stringify(sub)),
        },
        update: {
          status: sub.status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          cancelledAt,
          providerSnapshot: JSON.parse(JSON.stringify(sub)),
        },
      });
    } catch (err) {
      console.error("[stripe-webhook] subscription lifecycle update failed:", err);
    }
    return NextResponse.json({ received: true, type: event.type });
  }

  return NextResponse.json({ received: true, ignored: event.type });
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/payment/webhook/stripe" });
}
