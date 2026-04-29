/**
 * Manifest — Staleness Propagator (cascade invalidation).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "staleness-propagator",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  capabilities: [
    {
      name: "propagateFromPillar",
      inputSchema: z.object({ strategyId: z.string(), pillarKey: z.string() }),
      outputSchema: z.object({ markedStale: z.array(z.string()) }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
    },
  ],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 3,
});
