/**
 * Financial Brain — Full-Industry Budget System
 *
 * 100% deterministic financial engine covering:
 * - All ecosystem actors (advertisers, agencies, freelancers, production houses, media companies)
 * - All campaign types (always-on, punctual, crisis, co-branding, performance)
 * - Full budget taxonomy (ATL/BTL/TTL/Digital + Working/Non-working + Earned/Owned/Paid)
 * - 5-approach budget recommendation
 * - 40+ validation guardrails
 * - 3-year S-curve projections with scenarios
 * - Break-even and elasticity analysis
 *
 * Zero LLM dependency for financial calculations.
 */

// ─── Core Engines ───────────────────────────────────────────────────────────
export { recommendBudget } from "./recommend-budget";
export { validateFinancials, hasBlockingIssues } from "./validate-financials";
export { projectMultiYear } from "./project-multi-year";
export { scenarioModel } from "./scenario-model";
export { calculateBreakeven } from "./break-even";
export { elasticityAnalysis } from "./elasticity";

// ─── Budget Taxonomy ────────────────────────────────────────────────────────
export {
  classifyChannelSpend,
  classifyOperationalSpend,
  aggregateTaxonomy,
  generateRecommendedTaxonomy,
  CHANNEL_TAXONOMY,
  WORKING_RATIO_BY_TIER,
  EOP_SPLIT_BY_STAGE,
} from "./budget-taxonomy";

// ─── Campaign Profiles ──────────────────────────────────────────────────────
export {
  getCampaignProfile,
  getCampaignMix,
  getAlwaysOnSubsplit,
  getSeasonalCalendar,
  CAMPAIGN_PROFILES,
  CAMPAIGN_MIX_BY_STAGE,
} from "./campaign-profiles";

// ─── Fee Structures ─────────────────────────────────────────────────────────
export { calculateFee, compareFeeModels, COMMISSION_RATES } from "./fee-structures";

// ─── Actor Engines ──────────────────────────────────────────────────────────
export {
  analyzeAdvertiser,
  analyzeAgency,
  analyzeFreelance,
  estimateProduction,
  analyzeMediaYield,
  detectActorType,
} from "./actors";

// ─── Benchmarks ─────────────────────────────────────────────────────────────
export {
  getBenchmark,
  getAllBenchmarks,
  getCpm,
  getCtr,
  getCvr,
  getUnitCost,
  getBatchCost,
  getSeasonalFactor,
  getCompetitiveIntensity,
  getBudgetTier,
  getMinBudgetForTier,
  getCountryCurrency,
  getAgencyFeeBenchmark,
  getFreelanceDayRate,
  getRevenueRatio,
  getRecommendedBudgetFromRevenue,
  SOURCES,
} from "./benchmarks";

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  // Taxonomy
  BudgetAtom,
  TaxonomyBreakdown,
  MediaType,
  WorkingType,
  MediaOwnership,
  OperationalCategory,
  CampaignPhase,
  // Campaign
  CampaignType,
  CampaignProfile,
  CampaignMixRecommendation,
  // Fee
  FeeModel,
  FeeCalculationInput,
  FeeCalculationResult,
  // Budget recommendation
  BudgetRecommendation,
  BudgetRecommendationInput,
  RecommendationApproach,
  // Validation
  ValidationResult,
  FinancialValidationReport,
  ValidationSeverity,
  ValidationContext,
  ActorType,
  // Projections
  MultiYearProjection,
  YearProjection,
  MultiYearInput,
  ScenarioAnalysis,
  Scenario,
  BreakEvenAnalysis,
  BreakEvenInput,
  ElasticityAnalysis,
  ElasticityInput,
  ElasticityPoint,
  // Actor-specific
  AdvertiserInput,
  AdvertiserOutput,
  AgencyInput,
  AgencyOutput,
  FreelanceInput,
  FreelanceOutput,
  Deliverable,
  ProjectEstimate,
  QualityTier,
  YieldAnalysis,
  AdInventory,
  // Benchmarks
  SourcedValue,
  BenchmarkSource,
  BudgetTier,
  BudgetTierInfo,
  SeasonalFactor,
  RevenueRatio,
  FeeBenchmark,
} from "./types";
