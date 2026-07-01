/**
 * Manifest — cross-validator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = CHAIN_VIA:pillar-gateway. Exposes 2 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "cross-validator",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "validateCrossReferences",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:pillar-gateway",
      missionStep: 1,
    },
    {
      name: "getCrossRefSummary",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:pillar-gateway",
      missionStep: 1,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 1,
});
