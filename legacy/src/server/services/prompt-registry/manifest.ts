/**
 * Manifest — prompt-registry.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 5 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "prompt-registry",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "getActivePrompt",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
    },
    {
      name: "createPromptVersion",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
    },
    {
      name: "listVersions",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
    },
    {
      name: "rollbackToVersion",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
    },
    {
      name: "getRegistryStats",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
});
