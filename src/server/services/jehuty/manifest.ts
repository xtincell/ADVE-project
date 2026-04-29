/**
 * Manifest — Jehuty (cross-brand intelligence feed + curation).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "jehuty",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: ["JEHUTY_FEED_REFRESH", "JEHUTY_CURATE"],
  capabilities: [
    {
      name: "refreshFeed",
      inputSchema: z.object({
        operatorId: z.string(),
        scope: z.enum(["personal", "operator", "global"]).optional(),
      }),
      outputSchema: z.object({
        signals: z.number(),
        recos: z.number(),
        diagnostics: z.number(),
      }),
      sideEffects: ["DB_READ", "EVENT_EMIT"],
      qualityTier: "B",
      latencyBudgetMs: 2500,
      idempotent: true,
    },
    {
      name: "curate",
      inputSchema: z.object({
        action: z.enum(["pin", "dismiss", "trigger"]),
        targetId: z.string(),
      }),
      outputSchema: z.object({ ok: z.boolean() }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
    },
  ],
  dependencies: ["seshat", "notoria"],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
