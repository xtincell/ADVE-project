/**
 * Manifest — mobile-money.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 4 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "mobile-money",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "detectProvider",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Payment rails (Orange/MTN/Wave) for the African market; without it founders cannot pay UPgraders nor creators get paid.",
    },
    {
      name: "initiatePayment",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Payment rails (Orange/MTN/Wave) for the African market; without it founders cannot pay UPgraders nor creators get paid.",
    },
    {
      name: "payCommission",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Payment rails (Orange/MTN/Wave) for the African market; without it founders cannot pay UPgraders nor creators get paid.",
    },
    {
      name: "handleWebhook",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Payment rails (Orange/MTN/Wave) for the African market; without it founders cannot pay UPgraders nor creators get paid.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Payment rails (Orange/MTN/Wave) for the African market; without it founders cannot pay UPgraders nor creators get paid.",
});
