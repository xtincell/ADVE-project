/**
 * Manifest — value-report-generator.
 *
 * APOGEE classification (cf. SERVICE-MAP.md): ARTEMIS governance,
 * mission contribution = DIRECT_SUPERFAN. Handles the paid PDF deliverable
 * surface (EXPORT_RTIS_PDF).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

const generateInput = z.object({
  strategyId: z.string(),
  period: z.string(),
});

export const manifest = defineManifest({
  service: "value-report-generator",
  governor: "ARTEMIS",
  version: "1.1.0",
  acceptsIntents: ["EXPORT_RTIS_PDF"],
  emits: [],
  capabilities: [
    {
      name: "generate",
      inputSchema: generateInput,
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ", "DB_WRITE", "LLM_CALL"],
      qualityTier: "A",
      costEstimateUsd: 0.25,
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
    {
      name: "exportHtml",
      inputSchema: generateInput,
      outputSchema: z.string(),
      sideEffects: ["DB_READ"],
      qualityTier: "B",
      idempotent: true,
      missionContribution: "DIRECT_SUPERFAN",
      missionStep: 3,
    },
  ],
  dependencies: [],
  missionContribution: "DIRECT_SUPERFAN",
  missionStep: 3,
});
