/**
 * Manifest — Strategy Presentation (Oracle 21 sections + enrichment + export).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "strategy-presentation",
  governor: "ARTEMIS",
  version: "5.2.0",
  acceptsIntents: ["EXPORT_ORACLE"],
  emits: ["ORACLE_SECTION_COMPLETED", "ORACLE_SNAPSHOT_TAKEN"],
  capabilities: [
    {
      name: "exportOracleAsPdf",
      inputSchema: z.object({
        strategyId: z.string(),
        snapshotId: z.string().optional(),
      }),
      outputSchema: z.object({ pdfPath: z.string() }),
      sideEffects: ["FILE_WRITE", "DB_READ"],
      qualityTier: "B",
      latencyBudgetMs: 45000,
      preconditions: ["ORACLE_EXPORT"],
    },
    {
      name: "exportOracleAsMarkdown",
      inputSchema: z.object({ strategyId: z.string() }),
      outputSchema: z.object({ markdown: z.string() }),
      sideEffects: ["DB_READ"],
      qualityTier: "C",
      idempotent: true,
      preconditions: ["ORACLE_EXPORT"],
    },
    {
      name: "assemblePresentation",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        sections: z.array(z.unknown()),
        completenessPct: z.number(),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      qualityTier: "A",
      missionContribution: "CHAIN_VIA:pillar-gateway",
    },
    {
      name: "getShareToken",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        token: z.string(),
        url: z.string().url(),
      }),
      sideEffects: ["DB_WRITE"],
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "resolveShareToken",
      inputSchema: z.object({ token: z.string().min(1) }),
      outputSchema: z.string().nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "DIRECT_OVERTON",
    },
    {
      name: "checkCompleteness",
      inputSchema: z.object({ strategyId: z.string().min(1) }),
      outputSchema: z.object({
        completenessPct: z.number().min(0).max(100),
        missingSections: z.array(z.string()),
      }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Pré-vérification avant export PDF — sans cela l'opérateur exporte un Oracle incomplet et le client perçoit le livrable comme bâclé.",
    },
  ],
  dependencies: ["llm-gateway", "advertis-scorer"],
  missionContribution: "CHAIN_VIA:pillar-gateway",
  missionStep: 2,
});
