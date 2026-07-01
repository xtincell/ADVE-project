/**
 * Manifest — founder-psychology (mechanizes founder = first superfan).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const CultIndexSchema = z.object({
  score: z.number().int().min(0).max(100),
  engagement: z.number().min(0).max(25),
  ownership: z.number().min(0).max(25),
  recruitment: z.number().min(0).max(25),
  internalization: z.number().min(0).max(25),
  tier: z.enum(["SPECTATEUR", "INTERESSE", "PARTICIPANT", "ENGAGE", "AMBASSADEUR", "EVANGELISTE"]),
});

export const manifest = defineManifest({
  service: "founder-psychology",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [],
  emits: ["MAINTAIN_APOGEE", "EXPAND_TO_ADJACENT_SECTOR"],
  capabilities: [
    {
      name: "computeFounderCultIndex",
      inputSchema: z.object({ founderId: z.string(), strategyId: z.string() }),
      outputSchema: CultIndexSchema,
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "composeWeeklyDigest",
      inputSchema: z.object({ founderId: z.string(), strategyId: z.string() }),
      outputSchema: z.object({
        founderId: z.string(),
        strategyId: z.string(),
        weekOf: z.string(),
        cultIndex: CultIndexSchema,
        sections: z.array(z.object({
          heading: z.string(),
          body: z.string(),
          sentiment: z.enum(["celebrate", "alert", "neutral"]),
        })),
        callToActionIntent: z.string().optional(),
      }),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "recordMilestone",
      inputSchema: z.object({
        strategyId: z.string(),
        fromTier: z.string(),
        toTier: z.string(),
        observedAt: z.date(),
      }),
      outputSchema: z.void(),
      sideEffects: ["DB_WRITE"],
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
  ],
  dependencies: ["devotion-engine"],
  docs: {
    summary: "Mechanizes the founder's transformation into the brand's first evangelist via cult index, weekly ritual digest, and milestone celebrations.",
  },
});
