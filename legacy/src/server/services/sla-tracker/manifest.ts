/**
 * Manifest — sla-tracker.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 7 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "sla-tracker",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "checkSla",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "getOverdueMissions",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "calculateSlaMetrics",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "sendAlert",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "checkSlaDeadlines",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "setDeadline",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    },
    {
      name: "getMissionSla",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Tracks SLOs per Intent kind; without it performance breaches go undetected.",
});
