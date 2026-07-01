/**
 * Manifest — oracle-section (ARTEMIS).
 *
 * Cycle de vie des 35 sections Oracle (OracleSection, ADR-0068) : génération
 * individuelle gouvernée (GENERATE_ORACLE_SECTION, ADR-0070) + assembleur
 * manual-first qui émet N× ce kind (ASSEMBLE_ORACLE, ADR-0071).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "oracle-section",
  governor: "ARTEMIS",
  version: "1.0.0",
  acceptsIntents: ["GENERATE_ORACLE_SECTION", "ASSEMBLE_ORACLE"],
  capabilities: [
    {
      name: "generateOracleSection",
      inputSchema: z
        .object({ strategyId: z.string(), sectionId: z.number(), mode: z.string().optional() })
        .passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["LLM_CALL", "DB_WRITE", "EVENT_EMIT"],
      qualityTier: "A",
    },
    {
      name: "assembleOracle",
      inputSchema: z.object({ strategyId: z.string() }).passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE", "EVENT_EMIT"],
    },
  ],
  dependencies: [],
  missionContribution: "DIRECT_BOTH",
});
