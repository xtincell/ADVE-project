/**
 * Manifest — guidelines-renderer.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = CHAIN_VIA:notoria. Exposes 5 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "guidelines-renderer",
  governor: "ARTEMIS",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "generate",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:notoria",
      missionStep: 2,
    },
    {
      name: "generateGuidelines",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:notoria",
      missionStep: 2,
    },
    {
      name: "exportHtml",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:notoria",
      missionStep: 2,
    },
    {
      name: "exportPdf",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:notoria",
      missionStep: 2,
    },
    {
      name: "getShareableLink",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "CHAIN_VIA:notoria",
      missionStep: 2,
    }
  ],
  dependencies: [],
  missionContribution: "CHAIN_VIA:notoria",
  missionStep: 2,
});
