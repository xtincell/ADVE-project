/**
 * Manifest — feedback-processor (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = CHAIN_VIA:feedback-loop.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "feedback-processor",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "default",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "CHAIN_VIA:feedback-loop",
      missionStep: 3,
    },
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:feedback-loop",
  missionStep: 3,
});
