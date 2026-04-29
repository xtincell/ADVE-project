/**
 * Manifest — Quick Intake (public rev-9 intake → strategy bootstrap).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "quick-intake",
  governor: "MESTOR",
  version: "9.0.0",
  acceptsIntents: ["RUN_QUICK_INTAKE"],
  emits: ["LIFT_INTAKE_TO_STRATEGY"],
  capabilities: [
    {
      name: "runIntake",
      inputSchema: z.object({
        responses: z.record(z.string(), z.unknown()),
        files: z.array(z.unknown()).optional(),
      }),
      outputSchema: z.object({
        intakeId: z.string(),
        completionPct: z.number(),
        liftEligible: z.boolean(),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
    },
  ],
  dependencies: ["llm-gateway", "ingestion-pipeline"],
  docs: {
    summary:
      "Rev-9 public intake. When complete enough, spawns LIFT_INTAKE_TO_STRATEGY which Mestor uses to auto-create the brand Strategy + first ADVE→RTIS cascade.",
  },
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 1,
});
