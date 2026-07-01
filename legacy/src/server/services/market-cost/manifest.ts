/**
 * Manifest — market-cost (THOT).
 *
 * Base de coûts marché historisés par (pays, secteur, métrique, période)
 * — MarketCostSnapshot (ADR-0099). Déterministe, zéro LLM ; alimente
 * l'estimation économique runtime Thot.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "market-cost",
  governor: "THOT",
  version: "1.0.0",
  acceptsIntents: ["UPSERT_MARKET_COST_SNAPSHOT"],
  capabilities: [
    {
      name: "upsertMarketCost",
      inputSchema: z
        .object({
          countryCode: z.string(),
          sector: z.string(),
          metric: z.string(),
          period: z.string(),
        })
        .passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_WRITE"],
      idempotent: true,
    },
    {
      name: "getMarketCost",
      inputSchema: z
        .object({ countryCode: z.string(), sector: z.string(), metric: z.string() })
        .passthrough(),
      outputSchema: z.unknown(),
      sideEffects: ["DB_READ"],
      idempotent: true,
    },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Base de coûts marché historisés (ADR-0099) — infra économique runtime Thot, déterministe (zéro LLM). Alimente l'estimation de coûts d'action ; aucune génération de marque.",
});
