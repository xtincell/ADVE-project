/**
 * Manifest — asset-tagger (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = CHAIN_VIA:knowledge-aggregator.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "asset-tagger",
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
      missionContribution: "CHAIN_VIA:knowledge-aggregator",
      missionStep: 3,
    },
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:knowledge-aggregator",
  missionStep: 3,
});
