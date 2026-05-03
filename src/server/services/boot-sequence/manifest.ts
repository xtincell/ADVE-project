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
      name: "getState",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        currentPhase: z.string(),
        completedPhases: z.array(z.string()),
      }).passthrough().nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Boot state read pour UI cockpit — sans cela aucune visibilité sur l'avancement du bootstrap post-paywall.",
    },
    {
      name: "start",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        currentPhase: z.string(),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Initialisation explicite du boot — pose marker de début pour tracking durée + trigger des events FILL_ADVE/RUN_RTIS_CASCADE.",
    },
    {
      name: "advance",
      inputSchema: z.object({
        strategyId: z.string().min(1),
        phase: z.string().min(1),
      }).passthrough(),
      outputSchema: z.object({
        currentPhase: z.string(),
        completedPhases: z.array(z.string()),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Progression phase par phase — découple le bootstrap en steps observables au lieu d'un blob 5min sans signal intermédiaire.",
    },
    {
      name: "complete",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        completedAt: z.date(),
        durationMs: z.number().int().nonnegative(),
      }).passthrough(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Marker de fin + emission event qui trigger l'arrival au cockpit + email founder onboarding.",
    },
    {
      name: "boot",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({ phasesCompleted: z.array(z.string()) }),
      sideEffects: ["DB_WRITE", "LLM_CALL", "EVENT_EMIT"],
      latencyBudgetMs: 300000,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Wrapper end-to-end (start → all advance → complete) pour callers qui n'ont pas besoin de phase-by-phase.",
    },
  ],
  dependencies: ["mestor", "artemis", "pillar-gateway"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without bootstrap, no brand can enter the OS — Operations of the platform itself.",
});
