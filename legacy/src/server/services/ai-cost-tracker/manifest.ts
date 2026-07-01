/**
 * Manifest — ai-cost-tracker.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): THOT governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 5 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "ai-cost-tracker",
  governor: "THOT",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "calculateCost",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
    },
    {
      name: "track",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
    },
    {
      name: "getDailyCost",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
    },
    {
      name: "getMonthlyCost",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
    },
    {
      name: "checkBudget",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Tracks LLM costs per intent; without it Thot cannot apply cost gates and missions flame out unpredictably.",
});
