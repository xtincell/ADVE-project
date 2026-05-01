/**
 * Manifest — notification-dispatcher (Phase 8+, sub-service Anubis).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "notification-dispatcher",
  governor: "ANUBIS",
  version: "1.0.0",
  capabilities: [
    {
      name: "sendPush",
      inputSchema: z.object({
        deviceToken: z.string(),
        title: z.string(),
        body: z.string(),
        link: z.string().optional(),
        data: z.record(z.string()).optional(),
      }),
      outputSchema: z.object({
        ok: z.boolean(),
        provider: z.string(),
        externalMessageId: z.string().optional(),
        error: z.string().optional(),
      }),
      sideEffects: ["EXTERNAL_API"],
      qualityTier: "B",
      latencyBudgetMs: 3000,
      idempotent: false,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 4,
    },
  ],
  docs: { summary: "Push notifications via FCM (Android + iOS). Sub-service Anubis." },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 4,
});
