/**
 * Manifest — media-plan (INFRASTRUCTURE).
 *
 * Plan média ATL/BTL/TTL (ADR-0107) : lignes prévues + réalisé post-buy,
 * PCA (plan-vs-actual) déterministe. Alimente la mesure de campagne.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "media-plan",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_MEDIA_PLAN_CREATE",
    "LEGACY_MEDIA_PLAN_ADD_LINE",
    "LEGACY_MEDIA_PLAN_RECORD_ACTUALS",
  ],
  capabilities: [
    { name: "createMediaPlan", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "addMediaPlanLine", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "recordLineActuals", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "getMediaPlanPca", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listMediaPlans", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: ["campaign-manager"],
  missionContribution: "CHAIN_VIA:campaign-tracker",
});
