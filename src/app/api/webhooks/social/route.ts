import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import * as feedbackLoop from "@/server/services/feedback-loop";
import * as knowledgeCapture from "@/server/services/knowledge-capture";

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
    const payload = (await request.json()) as SocialWebhookPayload;

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
      return NextResponse.json({ received: true, matched: false });
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

    return NextResponse.json({
      received: true,
      matched: true,
      strategyId: matchedStrategyId,
      platform: payload.platform,
      event: payload.event,
    });
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
