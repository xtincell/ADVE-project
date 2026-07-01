/**
 * Manifest — advertis-connectors.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = DIRECT_OVERTON. Exposes 7 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "advertis-connectors",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "getConnector",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "listConnectorTypes",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "ConnectorAdapter",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "MondayConnector",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "mondayConnector",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "ZohoConnector",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "DIRECT_OVERTON",
      missionStep: 4,
    },
    {
      name: "zohoConnector",
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
