/**
 * Manifest — cult-index-engine.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = DIRECT_SUPERFAN. Exposes 9 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "cult-index-engine",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "computeCultIndex",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "getCultTier",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "calculateAndSnapshot",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "getCultIndexHistory",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "getCultIndexTrend",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "captureDevotionSnapshot",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "connectDevotionToCultIndex",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "reconcileAmbassadors",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "getCultDashboardData",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    }
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
