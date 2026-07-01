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

// Cluster C — Superfan attribution calibration (Phase 23 Epic 4, ADR-0081)
export {
  getAttributionLineage,
  runAttribution,
  isAttributionOk,
  isAttributionInsufficient,
  ATTRIBUTION_FEATURE_KEYS,
  type AttributionResult,
  type AttributionLineageView,
  type EvangelistTransition,
  type AttributionFeatureKey,
} from "./superfan-attribution";

// Phase 23 Epic 6 — calibration declared thresholds (ADR-0081 §4) + lifecycle ladder (ADR-0080).
export { CALIBRATION_THRESHOLDS, ATTRIBUTION_MODEL_VERSION } from "./calibration";
export { LIFECYCLE_LADDER, type LifecycleLadderState } from "./lifecycle";

// Cluster D — Signaux faibles & culture (Vague 2 + tarsisBridge MVP Vague 3 promotion)
export {
  evaluateOvertonReadiness,
  measureOvertonShift,
  ingestMcpContextToCampaign,
  openTarsisCaptureForFieldOp,
  closeTarsisCaptureForFieldOp,
} from "./signals-culture";

// Cluster E — Boucles d'apprentissage (Vague 3)
export {
  reconcileCampaignToOracle,
  enrichVariableBibleFromCampaign,
  evaluateCrewPerformance,
  proposeSequencePromotionFromCampaign,
} from "./learnings";

// Cluster F — Économie agence (Vague 3)
export {
  recomputeAgencyActivityMargins,
  evaluateResourceSaturation,
} from "./agency-economics";

// Cluster G — Souveraineté opérationnelle (Vague 3)
export {
  checkCampaignFieldOpCompliance,
  snapshotCredentialsChain,
} from "./souverainete";

// Cluster H — Negative space audit (Vague 3)
export { auditCampaignNegativeSpace } from "./negative-space";

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
  // Vague 3
  OperatorAmendPillarProposal,
  CampaignToOracleReconciliationResult,
  VariableBibleEnrichmentProposal,
  CrewPerformanceScore,
  SequencePromotionProposal,
  ActivityTypeMargin,
  AgencyMarginsResult,
  ResourceSaturationForecast,
  ResourceSaturationResult,
  ComplianceCheckResult,
  CredentialsChainSnapshotResult,
  NegativeSpaceCategory,
  NegativeSpaceFinding,
  NegativeSpaceAuditResult,
} from "./types";

export {
  StageSequencingViolationError,
  ManipulationDriftError,
  MissingSnapshotError,
  DeferredAwaitingDepsError,
} from "./types";
