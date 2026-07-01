/**
 * Manifest — feedback-processor.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = CHAIN_VIA:feedback-loop. Exposes 1 capability mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "feedback-processor",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "processFeedback",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:feedback-loop",
      missionStep: 3,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:feedback-loop",
  missionStep: 3,
});
