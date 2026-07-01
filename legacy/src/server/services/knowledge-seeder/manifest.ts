/**
 * Manifest — knowledge-seeder.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): SESHAT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 3 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "knowledge-seeder",
  governor: "SESHAT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "seedInitialKnowledge",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Seeds the initial knowledge graph; without it Seshat has no observation history to compute drift.",
    },
    {
      name: "seedSectorBenchmarks",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Seeds the initial knowledge graph; without it Seshat has no observation history to compute drift.",
    },
    {
      name: "seedExpertise",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Seeds the initial knowledge graph; without it Seshat has no observation history to compute drift.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Seeds the initial knowledge graph; without it Seshat has no observation history to compute drift.",
});
