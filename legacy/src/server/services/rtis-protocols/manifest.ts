/**
 * Manifest — rtis-protocols.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = CHAIN_VIA:pillar-gateway. Exposes 1 capability mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "rtis-protocols",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "executeRTISCascade",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:pillar-gateway",
      missionStep: 1,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
