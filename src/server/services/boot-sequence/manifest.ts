/**
 * Manifest — Boot Sequence (post-paywall full ADVE-RTIS bootstrap).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "boot-sequence",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: ["RUN_BOOT_SEQUENCE"],
  emits: ["FILL_ADVE", "RUN_RTIS_CASCADE"],
  capabilities: [
    {
      name: "boot",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.object({ phasesCompleted: z.array(z.string()) }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
    },
  ],
  dependencies: ["mestor", "artemis", "pillar-gateway"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without bootstrap, no brand can enter the OS — Operations of the platform itself.",
});
