/**
 * Thot — Atomized composite action-costing : types (ADR-0093, child of ADR-0087).
 *
 * Une action (séance photo, spot radio, activation…) = N atomes de coût, chaque
 * atome résolu par marché (ZoneIndex) et/ou par prestataire (ProviderCostRate).
 * L'estimateur est 100% déterministe (zéro LLM — cf. financial-brain/types.ts).
 *
 * Ces unions miroir des enums Prisma restent pures (aucun import @prisma/client)
 * pour que le moteur de calcul soit testable sans DB. Le test
 * `action-costing-enums.test.ts` verrouille la parité avec les enums Prisma.
 */

export type CostDriver =
  | "LABOR"
  | "EQUIPMENT_RENTAL"
  | "LOCATION"
  | "TRAVEL"
  | "PER_DIEM"
  | "CONSUMABLES"
  | "POST_PRODUCTION"
  | "LICENSE"
  | "MEDIA_SPACE"
  | "LOGISTICS"
  | "AGENCY_MARGIN"
  | "CONTINGENCY"
  | "TAX";

export type CostUnit =
  | "HOUR"
  | "DAY"
  | "HALF_DAY"
  | "UNIT"
  | "FLAT"
  | "PERCENT"
  | "KM"
  | "SQUARE_METER"
  | "IMPRESSION";

export type CostRateBasis = "MARKET_INDEX" | "PROVIDER_RATE" | "BENCHMARK" | "FIXED";

export type ZoneIndexFamily =
  | "COST_OF_LIVING"
  | "FOREX"
  | "MACRO"
  | "TJM"
  | "MARKETING_BUDGETS"
  | "MOBILE_MONEY_FEES"
  | "TAXES";

export type QualityTier = "BASIC" | "STANDARD" | "PREMIUM";

/** Un atome de coût dans une définition de catalogue (pure data, source du seed). */
export interface CatalogComponent {
  driver: CostDriver;
  label: string;
  /** Quantité d'unités (heures, jours, pièces). Défaut 1. */
  quantity?: number;
  unit?: CostUnit;
  /** Source de résolution du taux. Défaut FIXED. */
  rateBasis?: CostRateBasis;
  /** Clé dans la source de taux (ZoneIndex.key / MarketBenchmark.metric / rôle prestataire). */
  rateKey?: string;
  indexFamily?: ZoneIndexFamily;
  /** Taux unitaire indicatif @ baseZone/baseCurrency (DATA, pas code-literal — ADR-0087). */
  baseRate?: number;
  optional?: boolean;
  notes?: string;
}

/** Un archétype d'action catalogué (pure data, source du seed). */
export interface CatalogTemplate {
  actionKey: string;
  label: string;
  category: string;
  family?: string;
  unitOfWork?: string;
  description?: string;
  defaultDurationHours?: number;
  baseZoneCode?: string;
  baseCurrency?: string;
  defaultMarginPct?: number;
  defaultContingencyPct?: number;
  tags?: string[];
  source?: string;
  components: CatalogComponent[];
}

/** Override opérateur par atome (toggle / quantité / durée). */
export interface ComponentOverride {
  quantity?: number;
  disabled?: boolean;
}

/** Entrée de l'estimation. `zoneCode` obligatoire (ADR-0087 §2 — thot.calc.* prend zoneCode). */
export interface EstimateInput {
  zoneCode: string;
  qualityTier?: QualityTier;
  providerId?: string;
  marginPct?: number;
  contingencyPct?: number;
  taxRatePct?: number;
  /** Keyed by component label (stable au sein d'un template). */
  componentOverrides?: Record<string, ComponentOverride>;
}

/** Composant résolu prêt pour le calcul pur (taux unitaire effectif déjà résolu). */
export interface ResolvedComponent {
  driver: CostDriver;
  label: string;
  quantity: number;
  unit: CostUnit;
  rateBasis: CostRateBasis;
  /** Taux unitaire effectif en devise du template (avant zone/quality multipliers). */
  unitRate: number;
  /** true → le taux est en termes baseZone et doit être scalé par le zoneMultiplier. */
  zoneAdjustable: boolean;
  resolvedFrom: string;
  optional: boolean;
}

/** Contexte de marché résolu (pur — pas de DB). */
export interface ComputeContext {
  zoneCode: string;
  baseZoneCode: string;
  currency: string;
  /** Multiplicateur cost-of-living de zoneCode relatif au baseZone (1.0 = identique). */
  zoneMultiplier: number;
  /** Taux de TVA de la zone (0..1). */
  taxRatePct: number;
  usedFallback: boolean;
  fallbackChain: string[];
}

export interface EstimateLineItem {
  driver: CostDriver;
  label: string;
  quantity: number;
  unit: CostUnit;
  /** Taux unitaire effectif après multiplicateurs zone + qualité. */
  unitRate: number;
  zoneMultiplier: number;
  qualityMultiplier: number;
  amount: number;
  rateBasis: CostRateBasis;
  resolvedFrom: string;
}

/** Résultat aligné sur ThotCalcResult (ADR-0087 §2) enrichi des atomes. */
export interface ActionCostEstimateResult {
  templateKey: string;
  zoneCode: string;
  providerId?: string;
  qualityTier: QualityTier;
  currency: string;
  subtotalHt: number;
  marginPct: number;
  marginAmount: number;
  contingencyPct: number;
  contingencyAmount: number;
  taxRatePct: number;
  taxAmount: number;
  totalHt: number;
  totalTtc: number;
  /** = totalTtc (ThotCalcResult.amount). */
  amount: number;
  formula: string;
  breakdown: Record<string, number>;
  lineItems: EstimateLineItem[];
  usedFallback: boolean;
  fallbackChain: string[];
  computedAt: string;
}
