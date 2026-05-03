/**
 * Manifest — Country Registry (single source of truth for country/currency).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "country-registry",
  governor: "INFRASTRUCTURE",
  version: "1.1.0",
  capabilities: [
    {
      name: "lookupCountry",
      inputSchema: z.object({ codeOrName: z.string() }),
      outputSchema: z.object({ found: z.boolean() }).passthrough().nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      latencyBudgetMs: 50,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Lookup tolérant code ISO ou nom canonique — résout les ambiguïtés d'input founder (CIV/Côte d'Ivoire/Ivory Coast).",
    },
    {
      name: "requireCountry",
      inputSchema: z.object({ codeOrName: z.string() }),
      outputSchema: z.object({ code: z.string() }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      latencyBudgetMs: 50,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Variante throw-on-miss pour callers qui exigent un pays canonique — évite N defensive checks dans Operations + Crew.",
    },
    {
      name: "lookupCurrency",
      inputSchema: z.object({ code: z.string().min(3).max(3) }),
      outputSchema: z.object({ code: z.string() }).passthrough().nullable(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      latencyBudgetMs: 50,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Currency canonique requise pour formatAmount + monetization tier grids — sans cela les prix s'affichent sans symbole/format.",
    },
    {
      name: "listCountries",
      inputSchema: z.object({
        region: z.string().optional(),
        includeFictional: z.boolean().optional(),
      }),
      outputSchema: z.object({ countries: z.array(z.unknown()) }),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Listing pour UI dropdowns intake/quick-intake — sans cela aucun founder ne peut sélectionner son pays au démarrage.",
    },
    {
      name: "refreshCache",
      inputSchema: z.object({}),
      outputSchema: z.void(),
      sideEffects: [],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Invalidation cache après seed/update Country table — sans cela les nouveaux pays n'apparaissent pas avant restart serveur.",
    },
    {
      name: "formatAmount",
      inputSchema: z.object({
        amount: z.number(),
        currency: z.object({ code: z.string() }).passthrough(),
      }),
      outputSchema: z.string(),
      sideEffects: [],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification:
        "Format display localisé (CFA / FCFA / NGN / KES) — affichage prix cohérent à travers Cockpit/Operations.",
    },
  ],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Sectors and money flows are country-specific; without country registry, neither operates correctly in target markets.",
});
