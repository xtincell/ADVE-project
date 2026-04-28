/**
 * Manifest — Feedback Loop (mission outcomes → tier evolution + Tarsis seed).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "feedback-loop",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: ["RECORD_MISSION_OUTCOME"],
  emits: ["TIER_EVALUATION_REQUESTED", "TARSIS_SIGNAL_DETECTED"],
  capabilities: [
    {
      name: "recordOutcome",
      inputSchema: z.object({
        missionId: z.string(),
        outcome: z.string(),
        scoreDelta: z.number().optional(),
      }),
      outputSchema: z.object({ recorded: z.boolean() }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
    },
  ],
  dependencies: ["seshat"],
});
