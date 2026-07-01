/**
 * Manifest — financial-engine.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): THOT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 3 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "financial-engine",
  governor: "THOT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "getFinancialContext",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Core billing logic; without it UPgraders cannot invoice and the OS becomes unsustainable.",
    },
    {
      name: "getCountryContext",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Core billing logic; without it UPgraders cannot invoice and the OS becomes unsustainable.",
    },
    {
      name: "getFinancialContextWithDB",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Core billing logic; without it UPgraders cannot invoice and the OS becomes unsustainable.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Core billing logic; without it UPgraders cannot invoice and the OS becomes unsustainable.",
});
