/**
 * @upgraders/loyalty-extension — demo plugin.
 *
 * Adds a `COMPUTE_LOYALTY_SCORE` Intent that computes a brand's loyalty
 * score from SuperfanProfile + DevotionSnapshot tables.
 *
 * Demonstrates the plugin sandbox: DB_READ on whitelisted tables only,
 * no LLM, no external API, emits one declared event.
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import type { PluginManifest } from "@/server/governance/plugin-sandbox";

export const manifest: PluginManifest = {
  ...defineManifest({
    service: "loyalty-extension",
    governor: "INFRASTRUCTURE",
    version: "0.1.0",
    acceptsIntents: ["COMPUTE_LOYALTY_SCORE"],
    emits: ["loyalty.score.computed"],
    capabilities: [
      {
        name: "computeLoyaltyScore",
        inputSchema: z.object({ strategyId: z.string() }),
        outputSchema: z.object({
          loyaltyScore: z.number().min(0).max(100),
          ambassadorRatio: z.number().min(0).max(1),
          devotionAvg: z.number().min(0).max(1),
        }),
        sideEffects: ["DB_READ", "EVENT_EMIT"],
        idempotent: true,
        missionContribution: "DIRECT_SUPERFAN",
        missionStep: 3,
      },
    ],
    dependencies: [],
    missionContribution: "DIRECT_SUPERFAN",
    missionStep: 3,
  }),
  // PluginManifest extensions
  tablesAccessed: ["superfanProfile", "devotionSnapshot"],
  externalDomains: [],
};
