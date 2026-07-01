/**
 * Manifest — pipeline-orchestrator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = CHAIN_VIA:artemis. Exposes 5 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "pipeline-orchestrator",
  governor: "ARTEMIS",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "executeFirstValueProtocol",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "handlePostScoring",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "executePendingProcesses",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "schedulerAutoTrigger",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    },
    {
      name: "checkPipelineContention",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:artemis",
      missionStep: 2,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:artemis",
  missionStep: 2,
});
