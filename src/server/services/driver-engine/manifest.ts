/**
 * Manifest — driver-engine (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = DIRECT_SUPERFAN.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "driver-engine",
  governor: "ARTEMIS",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "default",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 2,
    },
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 2,
});
