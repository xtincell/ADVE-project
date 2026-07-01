/**
 * Manifest — Quick Intake (public rev-9 intake → strategy bootstrap).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "quick-intake",
  governor: "MESTOR",
  version: "9.1.0",
  acceptsIntents: ["RUN_QUICK_INTAKE", "LEGACY_QUICK_INTAKE_REGENERATE_ANALYSIS"],
  emits: ["LIFT_INTAKE_TO_STRATEGY"],
  capabilities: [
    {
      name: "start",
      inputSchema: z.object({
        country: z.string().optional(),
        sector: z.string().optional(),
        operatorId: z.string().optional(),
      }).passthrough(),
      outputSchema: z.object({
        token: z.string(),
        intakeId: z.string(),
      }).passthrough(),
      sideEffects: ["DB_WRITE"],
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "advance",
      inputSchema: z.object({
        token: z.string().min(1),
        responses: z.record(z.string(), z.unknown()),
      }).passthrough(),
      outputSchema: z.object({
        nextQuestion: z.unknown().nullable(),
        completionPct: z.number(),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "complete",
      inputSchema: z.object({
        token: z.string().min(1),
      }),
      outputSchema: z.object({
        strategyId: z.string().optional(),
        liftEligible: z.boolean(),
        diagnostic: z.unknown(),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      latencyBudgetMs: 60000,
      missionContribution: "DIRECT_SUPERFAN",
    },
    {
      name: "regenerateAnalysis",
      inputSchema: z.object({
        token: z.string().min(1),
        force: z.boolean().optional(),
      }),
      outputSchema: z.object({
        regenerated: z.boolean(),
        diagnostic: z.unknown().optional(),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
      latencyBudgetMs: 60000,
      missionContribution: "DIRECT_BOTH",
    },
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
      missionContribution: "DIRECT_SUPERFAN",
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
