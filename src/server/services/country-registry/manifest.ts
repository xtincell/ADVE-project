/**
 * Manifest — Country Registry (single source of truth for country/currency).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "country-registry",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  capabilities: [
    {
      name: "lookupCountry",
      inputSchema: z.object({ codeOrName: z.string() }),
      outputSchema: z.object({ found: z.boolean() }).passthrough(),
      sideEffects: ["DB_READ"],
      idempotent: true,
      latencyBudgetMs: 50,
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
    },
  ],
});
