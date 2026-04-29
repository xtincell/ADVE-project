/**
 * Manifest — brief-ingest (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = DIRECT_SUPERFAN.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "brief-ingest",
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
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 1,
    },
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 1,
});
