/**
 * Manifest — prompt-registry (auto-scaffolded). Refine schemas + capabilities to match real exports.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = GROUND_INFRASTRUCTURE.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "prompt-registry",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "default",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      missionContribution: "GROUND_INFRASTRUCTURE",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without versioned prompt registry, LLM calls are non-replayable and Mestor delibérations cannot be audited.",
});
