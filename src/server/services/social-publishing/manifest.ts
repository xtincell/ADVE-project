/**
 * Manifest — social-publishing (Phase 8+, sub-service Anubis).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "social-publishing",
  governor: "ANUBIS",
  version: "1.0.0",
  capabilities: [
    {
      name: "publishToSocial",
      inputSchema: z.object({
        operatorId: z.string(),
        platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER", "YOUTUBE"]),
        accountId: z.string(),
        content: z.string(),
        mediaUrl: z.string().optional(),
        scheduledAt: z.coerce.date().optional(),
      }),
      outputSchema: z.object({
        ok: z.boolean(),
        externalPostId: z.string().optional(),
        error: z.string().optional(),
        scheduled: z.boolean(),
      }),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 5000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
  ],
  dependencies: ["oauth-integrations"],
  docs: { summary: "Social publishing (IG/FB/TT/LI/X/YT). Sub-service Anubis (ADR-0011 §8)." },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 4,
});
