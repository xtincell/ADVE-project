/**
 * Campaign Tracker — Public API (Phase 19, ADR-0052).
 *
 * Service orchestrateur cross-Neteru gouverné par MESTOR.
 * Implémente les 6 capabilities Vague 1 (Cluster A + B) — voir manifest.ts.
 *
 * L2 Instrumental strict — lecture composée sur L1, écriture additive sur
 * colonnes neuves Phase 19. N'altère JAMAIS L1 Operational
 * (cf. ADR-0052 §2.5 garantie de découplage).
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

// Manifest (consommé par registry.ts gouvernance)
export { manifest } from "./manifest";

// Capability state (primitive #1 ADR-0052 §2.5)
export {
  CLUSTER_CAPABILITIES,
  CLUSTER_BY_SLUG,
  getClusterCapability,
  isReady,
  isAvailable,
  DEFERRED_AWAITING_DEPS,
  type ClusterCapability,
  type ClusterCapabilityState,
  type ClusterLifecycle,
} from "./capability-state";

// Cluster A — Trajectoire & altitude
export {
  snapshotTrajectoryPreLive,
  checkFuelBurnRate,
  pauseFlameOut,
} from "./trajectory";

// Cluster B — Cohérence narrative
export {
  checkBigIdeaCoherence,
  recomputeCulturalDebt,
  // Pure helpers exposés pour tests + futurs Glory tools.
  tokenize,
  jaccardSimilarity,
  intersectionSize,
  manifestoBeliefsHit,
} from "./coherence";

export { evaluateMythArcCohesion } from "./myth-arc";

// Cluster C — Superfan economy (Vague 2)
export {
  recomputeSuperfanAttribution,
  measureDevotionStickinessCohort,
  captureSuperfansFromCampaign,
} from "./superfan-economy";

// Cluster D — Signaux faibles & culture (Vague 2)
export {
  evaluateOvertonReadiness,
  measureOvertonShift,
  ingestMcpContextToCampaign,
} from "./signals-culture";

// DTOs + erreurs structurées
export type {
  TierBrandSnapshot,
  ManipulationMixSnapshot,
  CultIndexSnapshot,
  FuelBurnState,
  FuelBurnRateResult,
  SnapshotPreLiveOutput,
  BigIdeaCoherenceResult,
  MythArcCohesionPair,
  MythArcCohesionResult,
  CulturalDebtResult,
  // Vague 2
  DevotionLadderTier,
  DevotionTransition,
  SuperfanAttributionByAction,
  SuperfanAttributionResult,
  StickinessCohortResult,
  OvertonReadiness,
  OvertonReadinessResult,
  OvertonShiftResult,
  McpContextIngestResult,
} from "./types";

export {
  StageSequencingViolationError,
  ManipulationDriftError,
  MissingSnapshotError,
  DeferredAwaitingDepsError,
} from "./types";
