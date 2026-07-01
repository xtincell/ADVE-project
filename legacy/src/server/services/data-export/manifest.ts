/**
 * Manifest — data-export.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 5 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "data-export",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "exportStrategy",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
    },
    {
      name: "exportClientData",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
    },
    {
      name: "exportValueReport",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
    },
    {
      name: "exportStrategyData",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
    },
    {
      name: "exportAsCsv",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Structured data export (invoices, reports, journals); required for accounting compliance.",
});
