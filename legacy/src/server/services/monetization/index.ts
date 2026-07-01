/**
 * monetization — Operations sub-system (Ground Tier).
 *
 * Mission contribution: GROUND_INFRASTRUCTURE.
 *   "Without market-localized pricing, UPgraders cannot convert intakes
 *    in their target market — no retainer = no business sustainability =
 *    no brand reaches its apogee. Pricing is the gating mechanism that
 *    makes the cult-forming machine economically viable."
 *
 * Public API:
 *   - PRICING_TIERS, getTier — tier catalog
 *   - resolvePrice / resolveAllTiers / buildTierGrid — market-aware pricing
 *   - all amounts derived from country-registry + env-configured baseline
 *
 * No customer-facing surface references the standard market by name.
 */

export {
  PRICING_TIERS,
  TIER_ORDER,
  getTier,
  type PricingTierDefinition,
  type PricingTierKey,
} from "./pricing-tiers";

export {
  resolvePrice,
  resolveAllTiers,
  buildTierGrid,
  type ResolvedPrice,
  type TierWithPrice,
} from "./compute-price";
