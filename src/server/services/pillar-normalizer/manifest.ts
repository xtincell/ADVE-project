/**
 * Manifest — pillar-normalizer (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = CHAIN_VIA:pillar-gateway.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "pillar-normalizer",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "default",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "CHAIN_VIA:pillar-gateway",
      missionStep: 1,
    },
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
