/**
 * Manifest — ecosystem-engine.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = DIRECT_BOTH. Exposes 6 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "ecosystem-engine",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "getEcosystemMetrics",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "getOperatorHealth",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "getEcosystemOverview",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "compareStrategies",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "getSectorInsights",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "detectCrossBrandOpportunities",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    }
  ],
  dependencies: [],
  missionContribution: "DIRECT_BOTH",
  missionStep: 4,
});
