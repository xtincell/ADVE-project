/**
 * Manifest — vault-enrichment.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = CHAIN_VIA:strategy-presentation. Exposes 2 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "vault-enrichment",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "enrichFromVault",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:strategy-presentation",
      missionStep: 1,
    },
    {
      name: "enrichAllFromVault",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:strategy-presentation",
      missionStep: 1,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:strategy-presentation",
  missionStep: 1,
});
