/**
 * Actor Router — Detects actor type and routes to the appropriate engine
 */

export { analyzeAdvertiser } from "./advertiser";
export { analyzeAgency } from "./agency";
export { analyzeFreelance } from "./freelance";
export { estimateProduction } from "./production-house";
export { analyzeMediaYield } from "./media-company";

import type { ActorType } from "../types";

export function detectActorType(context: {
  hasMediaBudget?: boolean;
  hasClients?: boolean;
  isIndividual?: boolean;
  hasInventory?: boolean;
  hasDeliverables?: boolean;
}): ActorType {
  if (context.hasInventory) return "MEDIA_COMPANY";
  if (context.hasDeliverables && !context.hasClients) return "PRODUCTION_HOUSE";
  if (context.isIndividual) return "FREELANCE";
  if (context.hasClients) return "AGENCY";
  return "ADVERTISER";
}
