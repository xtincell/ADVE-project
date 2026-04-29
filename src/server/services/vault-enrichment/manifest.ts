/**
 * Manifest — vault-enrichment (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = CHAIN_VIA:strategy-presentation.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "vault-enrichment",
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
      missionContribution: "CHAIN_VIA:strategy-presentation",
      missionStep: 1,
    },
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:strategy-presentation",
  missionStep: 1,
});
