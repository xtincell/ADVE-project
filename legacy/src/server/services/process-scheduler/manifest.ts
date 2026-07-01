/**
 * Manifest — process-scheduler.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): INFRASTRUCTURE governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 7 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "process-scheduler",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "createProcess",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "startProcess",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "pauseProcess",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "stopProcess",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "getSchedule",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "checkContention",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    },
    {
      name: "getContention",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Cron + queue infrastructure for async intents; without it sentinel intents (MAINTAIN_APOGEE, DEFEND_OVERTON) cannot fire.",
});
