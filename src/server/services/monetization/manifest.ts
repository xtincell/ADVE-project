/**
 * Manifest — monetization (market-localized pricing).
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";
import { TIER_ORDER } from "./pricing-tiers";

const TierEnum = z.enum(TIER_ORDER as unknown as [string, ...string[]]);

const ResolvedPriceSchema = z.object({
  tier: TierEnum,
  tierLabel: z.string(),
  amount: z.number().nonnegative(),
  currencyCode: z.string(),
  currencySymbol: z.string(),
  billing: z.enum(["ONE_TIME", "MONTHLY"]),
  display: z.string(),
  localizedBadge: z.string().optional(),
  internal: z.object({
    marketFactor: z.number(),
    fxRate: z.number(),
    amountSpu: z.number(),
    amountStandardCurrency: z.number(),
  }),
});

export const manifest = defineManifest({
  service: "monetization",
  governor: "THOT",
  version: "1.0.0",
  acceptsIntents: ["EXPORT_RTIS_PDF", "EXPORT_ORACLE", "ACTIVATE_RETAINER"],
  emits: [],
  capabilities: [
    {
      name: "resolvePrice",
      inputSchema: z.object({
        tierKey: TierEnum,
        countryCode: z.string().min(2).max(80),
      }),
      outputSchema: ResolvedPriceSchema,
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Pricing per market is the conversion lever; no localized price = no retainer = no sustained mission.",
    },
    {
      name: "buildTierGrid",
      inputSchema: z.object({
        countryCode: z.string().min(2).max(80),
        tierKeys: z.array(TierEnum),
      }),
      outputSchema: z.array(z.object({
        definition: z.unknown(),
        price: ResolvedPriceSchema,
      })),
      sideEffects: ["DB_READ"],
      idempotent: true,
      missionContribution: "GROUND_INFRASTRUCTURE",
      groundJustification: "Tier grid is the visible funnel: free → PDF → Oracle → Cockpit → Retainer. Without it, no upsell mechanism exists.",
    },
  ],
  dependencies: ["country-registry"],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification: "Without market-localized pricing, UPgraders cannot convert intakes — no retainer = no sustainability = no brand reaches apogee. Pricing is the economic prerequisite to the cult-forming machine.",
  docs: {
    summary: "Market-aware pricing tiers (free → PDF → Oracle → Cockpit → Retainer base/pro/enterprise). Standard market is configurable via env (default FR), customer-facing UI never references it.",
  },
});
