export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import * as feedbackLoop from "@/server/services/feedback-loop";
import * as knowledgeCapture from "@/server/services/knowledge-capture";

// ---------------------------------------------------------------------------
// Webhook signature (fail-closed) — audit adversarial 2026-07-22
// ---------------------------------------------------------------------------
// Sans vérification, cette route écrivait des `Signal(SOCIAL_METRICS)` FABRIQUÉS
// (n'importe qui POSTait des métriques bidon → score/feedback-loop empoisonnés)
// et servait d'ORACLE de divulgation (la réponse révélait le strategyId lié à
// un accountId deviné). On exige désormais une signature HMAC valide.
//
// Meta/Instagram signent en `X-Hub-Signature-256: sha256=<hmac(appSecret, body)>`.
// On accepte aussi `x-webhook-signature` (autres providers). En PRODUCTION,
// aucun secret configuré ⇒ rejet (fail-closed) — jamais de constante en clair.
const SOCIAL_WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET_SOCIAL ??
  process.env.META_OAUTH_CLIENT_SECRET ??
  (process.env.NODE_ENV === "production" ? undefined : "dev-webhook-secret");

function verifySocialSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !SOCIAL_WEBHOOK_SECRET) return false;
  const providedHex = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = crypto
    .createHmac("sha256", SOCIAL_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedHex, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocialWebhookPayload {
  platform: "facebook" | "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin";
  event: "post_published" | "metrics_update" | "comment" | "mention";
  accountId: string;
  postId?: string;
  data: {
    likes?: number;
    comments?: number;
    shares?: number;
    reach?: number;
    impressions?: number;
    engagementRate?: number;
    saves?: number;
    clicks?: number;
    views?: number;
    followers?: number;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Metric extraction per platform
// ---------------------------------------------------------------------------

function extractMetrics(payload: SocialWebhookPayload) {
  const d = payload.data;

  const base = {
    platform: payload.platform,
    postId: payload.postId,
    event: payload.event,
    receivedAt: new Date().toISOString(),
  };

  switch (payload.platform) {
    case "facebook":
      return {
        ...base,
        likes: d.likes ?? 0,
        comments: d.comments ?? 0,
        shares: d.shares ?? 0,
        reach: d.reach ?? 0,
        impressions: d.impressions ?? 0,
        clicks: d.clicks ?? 0,
      };
    case "instagram":
      return {
        ...base,
        likes: d.likes ?? 0,
        comments: d.comments ?? 0,
        shares: d.shares ?? 0,
        reach: d.reach ?? 0,
        impressions: d.impressions ?? 0,
        saves: d.saves ?? 0,
      };
    case "tiktok":
      return {
        ...base,
        likes: d.likes ?? 0,
        comments: d.comments ?? 0,
        shares: d.shares ?? 0,
        views: d.views ?? 0,
        reach: d.reach ?? 0,
      };
    case "youtube":
      return {
        ...base,
        likes: d.likes ?? 0,
        comments: d.comments ?? 0,
        views: d.views ?? 0,
        shares: d.shares ?? 0,
        impressions: d.impressions ?? 0,
      };
    case "twitter":
    case "linkedin":
      return {
        ...base,
        likes: d.likes ?? 0,
        comments: d.comments ?? 0,
        shares: d.shares ?? 0,
        impressions: d.impressions ?? 0,
        clicks: d.clicks ?? 0,
        reach: d.reach ?? 0,
      };
    default:
      return { ...base, ...d };
  }
}

// ---------------------------------------------------------------------------
// POST — Social media webhook callback
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Signature OBLIGATOIRE — fail-closed (cf. bloc en tête de fichier).
    const signature =
      request.headers.get("x-hub-signature-256") ??
      request.headers.get("x-webhook-signature");
    if (!verifySocialSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: SocialWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as SocialWebhookPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Validate required fields
    if (!payload.platform || !payload.event || !payload.accountId) {
      return NextResponse.json(
        { error: "Missing required fields: platform, event, accountId" },
        { status: 400 }
      );
    }

    // Find the strategy linked to this social account via Driver constraints
    const drivers = await db.driver.findMany({
      where: { deletedAt: null },
    });

    let matchedDriver: typeof drivers[number] | null = null;
    let matchedStrategyId: string | null = null;

    for (const driver of drivers) {
      const constraints = driver.constraints as Record<string, unknown> | null;
      const connection = constraints?.socialConnection as Record<string, unknown> | null;
      if (connection?.accountId === payload.accountId) {
        matchedDriver = driver;
        matchedStrategyId = driver.strategyId;
        break;
      }
    }

    if (!matchedStrategyId) {
      // Réponse identique au cas « matché » (pas de strategyId) — plus d'oracle
      // de divulgation accountId→marque, même une fois la signature vérifiée.
      return NextResponse.json({ received: true });
    }

    // Extract platform-specific metrics
    const metrics = extractMetrics(payload);

    // Create Signal entry for metrics_update and post_published events
    if (payload.event === "metrics_update" || payload.event === "post_published") {
      await db.signal.create({
        data: {
          strategyId: matchedStrategyId,
          type: "SOCIAL_METRICS",
          data: {
            ...metrics,
            driverId: matchedDriver?.id,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Create Signal entry for engagement events (comments, mentions)
    if (payload.event === "comment" || payload.event === "mention") {
      await db.signal.create({
        data: {
          strategyId: matchedStrategyId,
          type: "SOCIAL_METRICS",
          data: {
            ...metrics,
            driverId: matchedDriver?.id,
            engagementType: payload.event,
            content: payload.data.content ?? null,
            author: payload.data.author ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Inject signal into feedback loop for score recalculation + drift detection
    // Note: feedbackLoop.processSignal takes a signalId, not inline data.
    // We skip direct feedback loop invocation here since the signal was already created above.

    // Capture as knowledge for cross-client benchmarks
    knowledgeCapture.captureEvent("MISSION_OUTCOME", {
      data: {
        source: "social_webhook",
        platform: payload.platform,
        event: payload.event,
        metrics,
      },
      sourceId: matchedStrategyId,
    }).catch((err) => { console.warn("[social-webhook] knowledge capture failed:", err instanceof Error ? err.message : err); });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[social-webhook] Processing error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Health check
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    status: "ok",
    platforms: ["facebook", "instagram", "tiktok", "youtube", "twitter", "linkedin"],
    events: ["post_published", "metrics_update", "comment", "mention"],
    endpoint: "/api/webhooks/social",
  });
}
