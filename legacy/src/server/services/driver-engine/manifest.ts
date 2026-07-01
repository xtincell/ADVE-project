/**
 * Manifest — driver-engine.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = DIRECT_SUPERFAN. Exposes 3 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "driver-engine",
  governor: "ARTEMIS",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "generateSpecs",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 2,
    },
    {
      name: "translateBrief",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 2,
    },
    {
      name: "generateBrief",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 2,
    }
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 2,
});
