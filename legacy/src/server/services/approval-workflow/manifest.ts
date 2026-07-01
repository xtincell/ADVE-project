/**
 * Manifest — approval-workflow.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): MESTOR governance,
 * mission contribution = GROUND_INFRASTRUCTURE. Exposes 7 capabilities mirroring the public surface of `index.ts`.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "approval-workflow",
  governor: "MESTOR",
  version: "1.1.0",
  acceptsIntents: [],
  emits: [],
  capabilities: [
    {
      name: "requestApproval",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "approve",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "reject",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE"],
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "getMyPendingApprovals",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "getApprovalHistory",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "checkAdveConformity",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    },
    {
      name: "checkBriefConformity",
      inputSchema: z.object({ strategyId: z.string().optional() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "B",
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
    }
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Pre-action approval flow for high-stakes mutations; protects mission integrity.",
});
