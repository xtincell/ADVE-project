/**
 * Manifest — playbook-capitalization (cross-brand learning loop).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const PromotionPatternSchema = z.object({
  transition: z.string(),
  sectorSlug: z.string(),
  sampleSize: z.number().int(),
  antecedents: z.array(z.object({
    intentKind: z.string(),
    support: z.number(),
    lift: z.number(),
  })),
  toolsRecurring: z.array(z.object({ tool: z.string(), support: z.number() })),
  medianDaysToTransition: z.number(),
});

export const manifest = defineManifest({
  service: "playbook-capitalization",
  governor: "SESHAT",
  version: "1.0.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "aggregatePromotionPatterns",
      inputSchema: z.object({
        sectorSlug: z.string(),
        fromTier: z.string(),
        toTier: z.string(),
      }),
      outputSchema: PromotionPatternSchema.nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
    {
      name: "suggestNextActions",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.array(z.object({
        intentKind: z.string(),
        rationale: z.string(),
        expectedLiftToPromote: z.number(),
        expectedDaysSavings: z.number(),
      })),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "CHAIN_VIA:mestor",
      missionStep: 3,
    },
    {
      name: "getSectorPlaybook",
      inputSchema: z.object({ sectorSlug: z.string() }),
      outputSchema: z.object({
        sectorSlug: z.string(),
        patterns: z.array(PromotionPatternSchema),
      }),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_BOTH",
      missionStep: 4,
    },
  ],
  dependencies: ["sector-intelligence", "seshat"],
  docs: {
    summary: "Aggregates successful PROMOTE_* patterns per sector to feed Mestor predictive suggestions for any new brand.",
  },
});
