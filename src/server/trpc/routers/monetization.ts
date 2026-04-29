/**
 * monetization router — exposes pricing and tier resolution to the UI.
 *
 * Public routes (no auth) since intake landing must show prices before
 * the user signs up.
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  buildTierGrid,
  resolvePrice,
  TIER_ORDER,
  type PricingTierKey,
} from "@/server/services/monetization";

const TierEnum = z.enum(TIER_ORDER as unknown as [string, ...string[]]);

const DEFAULT_FUNNEL: readonly PricingTierKey[] = [
  "INTAKE_PDF",
  "ORACLE_FULL",
  "COCKPIT_MONTHLY",
  "RETAINER_BASE",
  "RETAINER_PRO",
];

export const monetizationRouter = createTRPCRouter({
  /** Resolve a single tier's price for a country. */
  getPrice: publicProcedure
    .input(z.object({
      tierKey: TierEnum,
      countryCode: z.string().min(2).max(80).default("FR"),
    }))
    .query(async ({ input }) => {
      return resolvePrice(input.tierKey as PricingTierKey, input.countryCode);
    }),

  /** Build the full tier grid (default funnel) for a country. */
  getTierGrid: publicProcedure
    .input(z.object({
      countryCode: z.string().min(2).max(80).default("FR"),
      tierKeys: z.array(TierEnum).optional(),
    }))
    .query(async ({ input }) => {
      const tierKeys = (input.tierKeys ?? DEFAULT_FUNNEL) as readonly PricingTierKey[];
      return buildTierGrid(input.countryCode, tierKeys);
    }),
});
