/**
 * Financial Brain — Full-Industry Budget System Types
 *
 * Covers ALL ecosystem actors (advertisers, agencies, freelancers, production houses, media companies),
 * all campaign types (always-on, punctual, crisis, co-branding, performance),
 * and full industry budget taxonomy (ATL/BTL/TTL/Digital + Working/Non-working + Earned/Owned/Paid).
 *
 * Every financial output is 100% deterministic — zero LLM dependency.
 */

// ─── Benchmark Metadata ─────────────────────────────────────────────────────

export interface BenchmarkSource {
  name: string;          // e.g. "Meta Ads Library Africa Q3 2025"
  date: string;          // ISO date of data collection
  confidence: number;    // 0.0-1.0
  sampleSize?: number;
  region: string;        // "CEMAC" | "ECOWAS" | "GLOBAL" | etc.
}

export interface SourcedValue<T> {
  value: T;
  source: BenchmarkSource;
  lastUpdated: string;   // ISO date
}

export const DEFAULT_SOURCE: BenchmarkSource = {
  name: "ADVE Internal Estimates",
  date: "2025-01-01",
  confidence: 0.6,
  region: "CEMAC",
};

// ─── Budget Taxonomy (5 axes) ───────────────────────────────────────────────

export type MediaType = "ATL" | "BTL" | "TTL" | "DIGITAL" | "EXPERIENTIAL";
export type WorkingType = "WORKING" | "NON_WORKING";
export type MediaOwnership = "PAID" | "OWNED" | "EARNED";
export type OperationalCategory = "MEDIA" | "PRODUCTION" | "TALENT" | "LOGISTICS" | "TECHNOLOGY" | "LEGAL" | "CONTINGENCY" | "AGENCY_FEE";
export type CampaignPhase = "STRATEGY" | "CREATION" | "PRODUCTION" | "DIFFUSION" | "MESURE";

export interface BudgetAtom {
  amount: number;
  currency: string;
  mediaType: MediaType;
  workingType: WorkingType;
  mediaOwnership: MediaOwnership;
  operationalCategory: OperationalCategory;
  campaignPhase: CampaignPhase;
}

export interface TaxonomyBreakdown {
  byMediaType: Record<MediaType, number>;
  byWorkingType: Record<WorkingType, number>;
  byMediaOwnership: Record<MediaOwnership, number>;
  byOperationalCategory: Record<OperationalCategory, number>;
  byCampaignPhase: Record<CampaignPhase, number>;
  total: number;
  currency: string;
}

// ─── Campaign Types ─────────────────────────────────────────────────────────

export type CampaignType =
  | "PRODUCT_LAUNCH"
  | "SEASONAL"
  | "PROMOTIONAL"
  | "ALWAYS_ON_CONTENT"
  | "ALWAYS_ON_PERFORMANCE"
  | "BRAND_AWARENESS"
  | "CRISIS_RESPONSE"
  | "EVENT_ACTIVATION";

export interface CampaignProfile {
  type: CampaignType;
  label: string;
  typicalDuration: { min: number; max: number };
  budgetAllocation: {
    mediaType: { atl: number; btl: number; ttl: number; digital: number; experiential: number };
    workingSplit: { working: number; nonWorking: number };
    eop: { paid: number; owned: number; earned: number };
    operational: { media: number; production: number; talent: number; logistics: number; tech: number; contingency: number; agencyFee: number };
    phase: { strategy: number; creation: number; production: number; diffusion: number; mesure: number };
  };
  kpiPrimary: string[];
  phases: Array<{ name: string; durationPct: number; budgetPct: number; objective: string }>;
}

// ─── Fee Models ─────────────────────────────────────────────────────────────

export type FeeModel =
  | "COMMISSION"       // % du media spend (8-15%)
  | "RETAINER"         // Fee mensuel fixe
  | "PROJECT"          // Fee par projet/campagne
  | "PERFORMANCE"      // % des resultats (ventes, leads)
  | "HYBRID_RC"        // Retainer + commission
  | "HYBRID_RP";       // Retainer + performance bonus

export interface FeeCalculationInput {
  model: FeeModel;
  mediaBudget?: number;
  commissionRate?: number;
  monthlyRetainer?: number;
  durationMonths?: number;
  hoursCost?: number;
  markupPct?: number;
  revenueGenerated?: number;
  performanceRate?: number;
  performanceCap?: number;
}

export interface FeeCalculationResult {
  model: FeeModel;
  totalFee: number;
  monthlyFee: number;
  effectiveRate: number;      // Fee as % of media/project
  breakdown: Record<string, number>;
}

// ─── Budget Recommendation ──────────────────────────────────────────────────

export type RecommendationApproach =
  | "REVENUE_PERCENTAGE"
  | "CAC_TARGET"
  | "MARKET_SHARE"
  | "COMPETITIVE_PARITY"
  | "OBJECTIVE_BASED";

export interface BudgetRecommendationInput {
  sector: string;
  country: string;
  positioning: string;
  businessModel: string;
  companyStage?: "STARTUP" | "GROWTH" | "MATURITY" | "DECLINE";
  // Revenue approach
  estimatedRevenue?: number;
  declaredRevenue?: number;
  revenueTarget?: number;
  // CAC approach
  targetCustomers?: number;
  targetCac?: number;
  currentCac?: number;
  // Market share approach
  somTarget?: number;
  // Objective approach
  campaignObjective?: "AWARENESS" | "CONSIDERATION" | "CONVERSION" | "RETENTION" | "ADVOCACY";
  targetReach?: number;
  // Growth context
  growthAmbition?: number;     // 0.0-1.0 (0=maintenance, 1=hypergrowth)
  // Existing data
  currentBudget?: number;
  currentRoas?: number;
  productPrice?: number;
  ltv?: number;
  // Active channels
  channels?: string[];
}

export interface BudgetRecommendation {
  recommended: number;
  range: { min: number; max: number };
  currency: string;
  confidence: number;          // 0.0-1.0
  breakdown: {
    byApproach: Array<{
      approach: RecommendationApproach;
      amount: number;
      weight: number;
      reasoning: string;
    }>;
    byCategory: {
      workingMedia: number;
      production: number;
      talent: number;
      agencyFee: number;
      technology: number;
      contingency: number;
    };
  };
  campaignMix: CampaignMixRecommendation;
  taxonomy: TaxonomyBreakdown;
  warnings: ValidationResult[];
}

export interface CampaignMixRecommendation {
  alwaysOnPct: number;
  punctualPct: number;
  contingencyPct: number;
  alwaysOnSplit: { content: number; performance: number };
  punctualCalendar: Array<{
    month: number;
    event: string;
    budgetPct: number;
    campaignType: CampaignType;
  }>;
}

// ─── Financial Validation ───────────────────────────────────────────────────

export type ValidationSeverity = "BLOCK" | "WARN" | "INFORM";
export type ActorType = "ADVERTISER" | "AGENCY" | "FREELANCE" | "PRODUCTION_HOUSE" | "MEDIA_COMPANY" | "ALL";

export interface ValidationRule {
  id: string;
  severity: ValidationSeverity;
  applicableTo: ActorType[];
  field: string;
  description: string;
  check: (ctx: ValidationContext) => boolean;   // true = valid
  suggestion: string;
}

export interface ValidationContext {
  actorType: ActorType;
  sector?: string;
  country?: string;
  positioning?: string;
  businessModel?: string;
  companyStage?: string;
  // Advertiser
  cac?: number;
  ltv?: number;
  ltvCacRatio?: number;
  budgetCom?: number;
  caVise?: number;
  margeNette?: number;
  roiEstime?: number;
  paybackPeriod?: number;
  productPrice?: number;
  // Agency
  commissionRate?: number;
  utilization?: number;
  revenuePerHead?: number;
  mediaBudgetManaged?: number;
  totalFee?: number;
  // Freelance
  dayRate?: number;
  costRate?: number;
  billableRatio?: number;
  // Budget structure
  workingMediaPct?: number;
  alwaysOnPct?: number;
  contingencyPct?: number;
}

export interface ValidationResult {
  ruleId: string;
  severity: ValidationSeverity;
  field: string;
  message: string;
  currentValue: unknown;
  expectedRange?: { min: number; max: number };
  suggestion?: string;
}

export interface FinancialValidationReport {
  overall: "VALID" | "INVALID" | "WARNING";
  score: number;               // 0-100
  results: ValidationResult[];
  blockers: ValidationResult[];
  warnings: ValidationResult[];
  advisories: ValidationResult[];
}

// ─── Multi-Year Projection ──────────────────────────────────────────────────

export interface MultiYearInput {
  year1Budget: number;
  year1Revenue: number;
  sector: string;
  country: string;
  positioning: string;
  companyStage: "STARTUP" | "GROWTH" | "MATURITY" | "DECLINE";
  growthAmbition: number;      // 0.0-1.0
  currentCustomers?: number;
  churnRate?: number;
  cac?: number;
  ltv?: number;
  productPrice?: number;
}

export interface YearProjection {
  year: number;
  budget: number;
  revenue: number;
  customers: number;
  cac: number;
  ltv: number;
  marketShare: number;
  roas: number;
  growthRate: number;
  sCurvePosition: number;      // 0.0-1.0 on adoption curve
}

export interface MultiYearProjection {
  years: YearProjection[];
  cumulativeInvestment: number;
  cumulativeRevenue: number;
  cumulativeRoi: number;
  breakEvenYear: number | null;
  assumptions: string[];
}

// ─── Scenario Modeling ──────────────────────────────────────────────────────

export type ScenarioName = "OPTIMISTIC" | "REALISTIC" | "PESSIMISTIC";

export interface Scenario {
  name: ScenarioName;
  probability: number;         // 0.0-1.0
  projection: MultiYearProjection;
  deviations: Array<{
    parameter: string;
    value: number;
    deviation: string;         // e.g. "+30% vs realistic"
  }>;
  expectedValue: number;
}

export interface ScenarioAnalysis {
  scenarios: Scenario[];
  weightedExpectedValue: number;
  riskAdjustedBudget: number;
  sensitivityRanking: Array<{
    parameter: string;
    impact: number;            // % change in outcome per 1% change
  }>;
}

// ─── Break-Even ─────────────────────────────────────────────────────────────

export interface BreakEvenInput {
  fixedCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
  monthlyVolume?: number;
}

export interface BreakEvenAnalysis {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenMonths: number | null;
  marginOfSafety: number;
  contributionMargin: number;
  contributionMarginRatio: number;
}

// ─── Elasticity ─────────────────────────────────────────────────────────────

export interface ElasticityInput {
  currentBudget: number;
  sector: string;
  country: string;
  channels: string[];
  currentRoas?: number;
}

export interface ElasticityPoint {
  budgetLevel: number;
  budgetPct: number;           // % of current
  expectedReach: number;
  expectedConversions: number;
  expectedRevenue: number;
  expectedRoas: number;
  marginalRoas: number;
}

export interface ElasticityAnalysis {
  points: ElasticityPoint[];
  optimalBudget: number;
  diminishingReturnsThreshold: number;
  currentEfficiency: number;
}

// ─── Actor-Specific Types ───────────────────────────────────────────────────

// Advertiser
export interface AdvertiserInput {
  sector: string;
  country: string;
  positioning: string;
  businessModel: string;
  companyStage: "STARTUP" | "GROWTH" | "MATURITY" | "DECLINE";
  declaredRevenue?: number;
  revenueTarget?: number;
  declaredBudget?: number;
  productPrice?: number;
  currentCustomers?: number;
  churnRate?: number;
  channels?: string[];
}

export interface AdvertiserOutput {
  recommendedBudget: BudgetRecommendation;
  unitEconomics: {
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    margeNette: number;
    roiEstime: number;
    paybackPeriod: number;
    budgetCom: number;
    caVise: number;
  };
  campaignMix: CampaignMixRecommendation;
  taxonomy: TaxonomyBreakdown;
  multiYear: MultiYearProjection;
  scenarios: ScenarioAnalysis;
  validation: FinancialValidationReport;
}

// Agency
export interface AgencyInput {
  agencyType: string;
  headcount: number;
  avgSalary: number;
  overheadRate: number;
  targetUtilization: number;
  clients: Array<{
    name: string;
    annualFee: number;
    feeModel: FeeModel;
    mediaBudget?: number;
    hoursAllocated: number;
  }>;
  country: string;
}

export interface AgencyCostStructure {
  totalSalaries: number;
  totalOverhead: number;
  totalCost: number;
  capacityHours: number;
  costPerHour: number;
  breakeven: number;
}

export interface AgencyOutput {
  costStructure: AgencyCostStructure;
  revenue: {
    total: number;
    byFeeModel: Record<FeeModel, number>;
    perHead: number;
  };
  profitability: {
    grossMargin: number;
    grossMarginPct: number;
    byClient: Array<{ name: string; fee: number; cost: number; margin: number; marginPct: number; verdict: string }>;
  };
  capacity: {
    totalHours: number;
    allocatedHours: number;
    utilizationRate: number;
    availableForNewBusiness: number;
  };
  validation: FinancialValidationReport;
}

// Freelance
export interface FreelanceInput {
  specialty: string;
  guildTier: string;           // APPRENTI | COMPAGNON | MAITRE | ASSOCIE
  country: string;
  monthlyFixedCosts: number;
  targetMonthlyIncome: number;
  availableHoursPerMonth: number;
  billableRatio: number;
}

export interface FreelanceOutput {
  pricing: {
    costRate: number;
    sellRate: number;
    dayRate: number;
    projectRateGuide: Record<string, { min: number; max: number }>;
  };
  capacity: {
    billableHoursPerMonth: number;
    billableHoursPerYear: number;
    maxClients: number;
  };
  profitability: {
    annualRevenue: number;
    annualCosts: number;
    annualProfit: number;
    marginPct: number;
  };
  validation: FinancialValidationReport;
}

// Production House
export type QualityTier = "BASIC" | "STANDARD" | "PREMIUM";
export type DeliverableComplexity = "SIMPLE" | "STANDARD" | "COMPLEX";

export interface Deliverable {
  type: string;
  quantity: number;
  complexity: DeliverableComplexity;
}

export interface ProjectEstimate {
  preProduction: number;
  production: number;
  postProduction: number;
  talent: number;
  logistics: number;
  markup: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  lineItems: Array<{ label: string; amount: number; category: string }>;
}

// Media Company
export interface AdInventory {
  channel: string;
  monthlyImpressions: number;
  baseCpm: number;
  premiumSlots: number;
  premiumMultiplier: number;
}

export interface YieldAnalysis {
  effectiveCpm: number;
  fillRate: number;
  potentialRevenue: number;
  actualRevenue: number;
  revenueGap: number;
  optimizations: string[];
}

// ─── Enhanced Benchmark Types ───────────────────────────────────────────────

export interface TieredProductionCost {
  basic: number;
  standard: number;
  premium: number;
  volumeDiscounts: Array<{ minQuantity: number; discountPct: number }>;
  source: BenchmarkSource;
}

export interface SeasonalFactor {
  month: number;               // 1-12
  factor: number;              // 1.0 = normal
  label?: string;              // "Ramadan", "Noel", etc.
}

export interface RevenueRatio {
  marketingPct: number;
  alwaysOnPct: number;
  mediaVsProductionSplit: number;
}

export interface FeeBenchmark {
  commissionRange: [number, number];
  dayRateRange: [number, number];
  retainerRange: [number, number];
}

// ─── Budget Tier (PPP-adjusted) ─────────────────────────────────────────────

export type BudgetTier = "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export interface BudgetTierInfo {
  tier: BudgetTier;
  normalizedBudget: number;    // PPP-adjusted
  rawBudget: number;
  pppIndex: number;
  country: string;
}
