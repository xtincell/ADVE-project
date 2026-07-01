/**
 * Manifest — model-policy.
 *
 * Governs the `purpose → model` resolution registry. The Gateway reads
 * `resolvePolicy()` on every LLM call (cached 60s); writes go exclusively
 * through the `UPDATE_MODEL_POLICY` Intent, which Artemis dispatches to
 * `updatePolicy()` after the Mestor IntentEmission row is hash-chained.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const PolicyShape = z.object({
  purpose: z.enum(["final-report", "agent", "intermediate", "intake-followup", "extraction"]),
  anthropicModel: z.string().min(1),
  ollamaModel: z.string().nullable(),
  allowOllamaSubstitution: z.boolean(),
  pipelineVersion: z.enum(["V1", "V2", "V3"]).optional(),
  notes: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export const manifest = defineManifest({
  service: "model-policy",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: ["UPDATE_MODEL_POLICY"],
  emits: ["model-policy.updated"],
  capabilities: [
    {
      name: "resolvePolicy",
      inputSchema: z.object({
        purpose: z.enum(["final-report", "agent", "intermediate", "intake-followup", "extraction"]),
      }),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Without policy resolution the Gateway has no source of truth for which model serves which scenario; Sonnet would burn through budget meant for the final report.",
    },
    {
      name: "listAllPolicies",
      inputSchema: z.object({}),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Admin UI listing — required so the operator can see the canonical policy state.",
    },
    {
      name: "updatePolicy",
      inputSchema: PolicyShape,
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Mutates which model serves which purpose; must run only via UPDATE_MODEL_POLICY Intent so each change is hash-chained in IntentEmission.",
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Routing infrastructure for LLM calls — without governed policy, model selection drifts silently from strategic intent and costs balloon.",
});
