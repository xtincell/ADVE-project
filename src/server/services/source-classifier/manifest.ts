/**
 * Manifest — Source Classifier (filtreur qualifiant).
 *
 * Reads BrandDataSource EXTRACTED rows, proposes 1→N BrandAsset DRAFTs
 * via heuristic + vision LLM + document decomposer, then persists them
 * for operator review in the Cockpit Propositions vault panel.
 *
 * Governor MESTOR — every promotion (DRAFT → CANDIDATE/SELECTED) goes
 * through the brand-vault state machine which is itself dispatched by
 * Mestor (see SELECT_BRAND_ASSET / PROMOTE_BRAND_ASSET_TO_ACTIVE).
 */

import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "source-classifier",
  governor: "MESTOR",
  version: "1.0.0",
  acceptsIntents: ["CLASSIFY_BRAND_SOURCE", "PROPOSE_VAULT_FROM_SOURCE"],
  capabilities: [
    {
      name: "classifySource",
      inputSchema: z.object({ sourceId: z.string() }),
      outputSchema: z.object({
        sourceId: z.string(),
        strategyId: z.string(),
        proposalsCount: z.number(),
      }),
      sideEffects: ["LLM_CALL"],
    },
    {
      name: "proposeBrandAssetsFromSource",
      inputSchema: z.object({ sourceId: z.string(), operatorId: z.string() }),
      outputSchema: z.object({
        brandAssetIds: z.array(z.string()),
      }),
      sideEffects: ["DB_WRITE", "LLM_CALL"],
    },
  ],
  dependencies: ["llm-gateway", "brand-vault", "asset-tagger"],
  missionContribution: "CHAIN_VIA:artemis",
  groundJustification:
    "Sans inventaire vault qualifié, Artemis ne peut pas réutiliser les actifs de marque (logo, palette, ton) pour produire des forges qui accumulent des superfans. Le filtreur transforme les sources upload brutes en BrandAssets indexés par kind + pillarSource, prêts pour réutilisation downstream.",
});
