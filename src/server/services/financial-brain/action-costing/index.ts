/**
 * Thot — Atomized composite action-costing (ADR-0093, child of ADR-0087).
 * Public surface of the action-costing submodule.
 */

export * from "./types";
export { ACTION_COST_CATALOG, CATALOG_BY_KEY } from "./catalog";
export {
  computeActionCost,
  estimateActionCostFromDb,
  resolveCatalogComponentsFixed,
  QUALITY_MULTIPLIER,
  QUALITY_SENSITIVE_DRIVERS,
  DEFAULT_TAX_RATE,
} from "./estimator";
export {
  resolveZoneIndex,
  resolveAcrossChain,
  neighborsOf,
  ECONOMIC_NEIGHBORS,
} from "./zone-index";
export { resolveProviderRate, convertRateUnit } from "./provider-rate";
export {
  estimateAndPersistActionCost,
  upsertZoneIndex,
  upsertProviderRate,
} from "./handler";
export { ZONE_INDEX_SEED, NEIGHBOR_MAP_SEED } from "./seed-data";
