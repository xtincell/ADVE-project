/**
 * Manifest — tier-evaluator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = DIRECT_SUPERFAN. Exposes 1 capability mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "tier-evaluator",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "evaluateCreator",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    }
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
