/**
 * Manifest — team-allocator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 6 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "team-allocator",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "getLoadByCreator",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    },
    {
      name: "getCreatorLoads",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    },
    {
      name: "detectBottlenecks",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    },
    {
      name: "suggestAllocation",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    },
    {
      name: "getCapacityReport",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    },
    {
      name: "getStaffingRecommendationsPublic",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Composes optimal teams per mission; required for complex multi-creator missions.",
});
