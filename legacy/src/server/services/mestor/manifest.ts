/**
 * Manifest — Mestor (decision dispatcher).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "mestor",
  governor: "MESTOR",
  version: "2.0.0",
  // Mestor's own concrete capabilities. Cross-service kinds (RANK_PEERS,
  // JEHUTY_*, EXPORT_ORACLE…) are routed by Mestor but accepted by their
  // owning services — see the registry and intent-kinds catalog.
  acceptsIntents: [
    "FILL_ADVE",
    "RUN_RTIS_CASCADE",
    "BUILD_PLAN",
    "LIFT_INTAKE_TO_STRATEGY",
    "CORRECT_INTENT",
  ],
  emits: [
    "FILL_ADVE",
    "RUN_RTIS_CASCADE",
    "GENERATE_RECOMMENDATIONS",
    "EXPORT_ORACLE",
  ],
  capabilities: [
    {
      name: "emitIntent",
      inputSchema: z.object({ kind: z.string() }).passthrough(),
      outputSchema: z.object({
        intentId: z.string(),
        status: z.enum(["OK", "VETOED", "DOWNGRADED", "FAILED", "QUEUED"]),
      }),
      sideEffects: ["DB_WRITE", "EVENT_EMIT", "LLM_CALL"],
      qualityTier: "S",
      latencyBudgetMs: 30000,
    },
  ],
  dependencies: ["artemis", "seshat", "financial-brain", "llm-gateway"],
  docs: {
    summary:
      "Single typed entry point for any business mutation. Persists intent + result to IntentEmission, dispatches to Artemis, consults Seshat (read-only) + Thot (veto/downgrade).",
  },
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 1,
});
