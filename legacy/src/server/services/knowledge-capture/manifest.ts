/**
 * Manifest — knowledge-capture.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = DIRECT_OVERTON. Exposes 3 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "knowledge-capture",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "captureEvent",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "capturePillarChange",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "captureSignalOutcome",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    }
  ],
  dependencies: [],
  missionContribution: "DIRECT_OVERTON",
  missionStep: 4,
});
