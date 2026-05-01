/**
 * Manifest — media-activation-engine (Phase 8.1, ADR-0011 §8).
 *
 * Co-gouverné Anubis × Thot. Reconcile metrics réels post-launch +
 * webhooks Meta/Google/TikTok/X.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "media-activation-engine",
  governor: "ANUBIS",
  version: "1.0.0",
  acceptsIntents: ["RECORD_COST"],
  emits: ["AD_CAMPAIGN_METRIC_SYNC"],
  capabilities: [
    {
      name: "syncCampaignMetrics",
      inputSchema: z.object({ amplificationId: z.string() }),
      outputSchema: z.object({
        amplificationId: z.string(),
        platform: z.string(),
        delta: z.object({ impressions: z.number(), clicks: z.number(), conversions: z.number(), spend: z.number() }),
        total: z.object({ impressions: z.number(), clicks: z.number(), conversions: z.number(), spend: z.number() }),
        newSuperfans: z.number(),
      }),
      sideEffects: ["DB_WRITE", "DB_READ", "EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 8000,
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
  ],
  dependencies: ["anubis", "oauth-integrations", "financial-brain"],
  docs: {
    summary:
      "Reconcile post-launch metrics (impressions/clicks/conversions/spend) depuis Meta/Google/TikTok/X vers CampaignAmplification + MediaPerformanceSync. Pull via cron + push via webhook.",
  },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 4,
});
