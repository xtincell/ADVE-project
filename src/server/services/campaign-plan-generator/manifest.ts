/**
 * Manifest — campaign-plan-generator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = CHAIN_VIA:campaign-manager. Exposes 2 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "campaign-plan-generator",
  governor: "ARTEMIS",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "generatePlan",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:campaign-manager",
      missionStep: 2,
    },
    {
      name: "generateCampaignPlan",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:campaign-manager",
      missionStep: 2,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:campaign-manager",
  missionStep: 2,
});
