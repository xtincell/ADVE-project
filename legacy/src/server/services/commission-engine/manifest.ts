/**
 * Manifest — commission-engine.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): THOT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 3 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "commission-engine",
  governor: "THOT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "calculate",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Computes commission splits UPgraders/agency/creator; without it the business model collapses and missions stop being funded.",
    },
    {
      name: "calculateOperatorFee",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Computes commission splits UPgraders/agency/creator; without it the business model collapses and missions stop being funded.",
    },
    {
      name: "generatePaymentOrder",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Computes commission splits UPgraders/agency/creator; without it the business model collapses and missions stop being funded.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Computes commission splits UPgraders/agency/creator; without it the business model collapses and missions stop being funded.",
});
