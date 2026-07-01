/**
 * Manifest — budget-allocator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): THOT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 1 capability mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "budget-allocator",
  governor: "THOT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "generateBudgetPlan",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Allocates per-mission budget; without it cost gates cannot be evaluated and Thot's veto power is theoretical.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Allocates per-mission budget; without it cost gates cannot be evaluated and Thot's veto power is theoretical.",
});
