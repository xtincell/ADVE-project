import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MobileMoneyPayload {
  provider: "orange_money" | "mtn_mobile_money" | "wave";
  transactionId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: "success" | "failed" | "pending";
  reference: string; // Our internal reference (commissionId or membershipId)
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Webhook signature secrets (per-provider)
// ---------------------------------------------------------------------------

const PROVIDER_SECRETS: Record<string, string | undefined> = {
  orange_money: process.env.WEBHOOK_SECRET_ORANGE_MONEY,
  mtn_mobile_money: process.env.WEBHOOK_SECRET_MTN,
  wave: process.env.WEBHOOK_SECRET_WAVE,
};

// Fallback shared secret for dev/staging
const SHARED_SECRET = process.env.WEBHOOK_SECRET ?? "dev-webhook-secret";

// ---------------------------------------------------------------------------
// HMAC signature verification
// ---------------------------------------------------------------------------

function verifySignature(
  rawBody: string,
  signature: string,
  provider: string
): boolean {
  const secret = PROVIDER_SECRETS[provider] ?? SHARED_SECRET;
  if (!secret) return false;

  // Support both "sha256=<hex>" and plain "<hex>" formats
  const providedHex = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedHex, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST — Mobile Money webhook callback
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: MobileMoneyPayload;
  try {
    payload = JSON.parse(rawBody) as MobileMoneyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify webhook signature
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  if (!verifySignature(rawBody, signature, payload.provider)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    // Handle non-success statuses
    if (payload.status === "pending") {
      console.log(
        `[mobile-money] Pending payment: ${payload.transactionId} (${payload.provider})`
      );
      return NextResponse.json({ received: true, status: "pending" });
    }

    if (payload.status === "failed") {
      console.warn(
        `[mobile-money] Failed payment: ${payload.transactionId} (${payload.provider})`
      );

      // If the reference is a commission, mark it as failed
      if (payload.reference.startsWith("commission-")) {
        const commissionId = payload.reference.replace("commission-", "");
        await db.commission.update({
          where: { id: commissionId },
          data: { status: "PENDING" },
        }).catch(() => {
          // Commission may not exist yet
        });
      }

      return NextResponse.json({ received: true, status: "failed" });
    }

    // --- SUCCESS path ---
    const reference = payload.reference;

    // Commission payment
    if (reference.startsWith("commission-")) {
      const commissionId = reference.replace("commission-", "");

      await db.commission.update({
        where: { id: commissionId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });

      // Capture knowledge event for the Knowledge Graph
      await db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          data: {
            type: "commission_paid",
            commissionId,
            provider: payload.provider,
            transactionId: payload.transactionId,
            amount: payload.amount,
            currency: payload.currency,
            paidAt: new Date().toISOString(),
          },
          sourceHash: `payment-${payload.transactionId}`,
        },
      });

      return NextResponse.json({
        received: true,
        type: "commission",
        id: commissionId,
      });
    }

    // Membership renewal payment
    if (reference.startsWith("membership-")) {
      const membershipId = reference.replace("membership-", "");

      const membership = await db.membership.findUniqueOrThrow({
        where: { id: membershipId },
      });

      // Extend membership period by 30 days from current end date
      const newEnd = new Date(membership.currentPeriodEnd);
      newEnd.setDate(newEnd.getDate() + 30);

      await db.membership.update({
        where: { id: membershipId },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: newEnd,
        },
      });

      // Capture knowledge event
      await db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          data: {
            type: "membership_renewed",
            membershipId,
            provider: payload.provider,
            transactionId: payload.transactionId,
            amount: payload.amount,
            currency: payload.currency,
            newPeriodEnd: newEnd.toISOString(),
          },
          sourceHash: `membership-${payload.transactionId}`,
        },
      });

      return NextResponse.json({
        received: true,
        type: "membership",
        id: membershipId,
      });
    }

    return NextResponse.json({ received: true, type: "unknown_reference" });
  } catch (error) {
    console.error("[mobile-money] Webhook processing error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Health check
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    status: "ok",
    providers: ["orange_money", "mtn_mobile_money", "wave"],
    endpoint: "/api/webhooks/mobile-money",
  });
}
