import { MARKET_SCALE_LABELS, MarketScaleSchema } from "./market-scale";

/** Scope declared for this brand. Client headquarters belong to the CRM. */
export function brandMarketScope(strategy: {
  countryCode?: string | null;
  marketScale?: unknown;
  businessContext?: unknown;
}) {
  const raw = strategy.businessContext;
  const region =
    typeof raw === "object" &&
    raw !== null &&
    "marketRegion" in raw &&
    typeof raw.marketRegion === "string"
      ? raw.marketRegion.trim()
      : "";
  const scale = MarketScaleSchema.safeParse(strategy.marketScale);
  return {
    countryCode: strategy.countryCode ?? null,
    region: region || null,
    scaleLabel: scale.success ? MARKET_SCALE_LABELS[scale.data] : null,
  };
}
