/**
 * @lafusee/sdk — public types.
 *
 * Stable surface contract. Any breaking change requires semver-major.
 */

export type PillarKey = "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";

export type BrandTier = "ZOMBIE" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

export type StrategyLifecyclePhase = "INTAKE" | "BOOT" | "OPERATING" | "GROWTH";

export type Brain = "MESTOR" | "ARTEMIS" | "SESHAT" | "THOT" | "INFRASTRUCTURE";

export type SideEffect = "DB_WRITE" | "DB_READ" | "LLM_CALL" | "EXTERNAL_API" | "EVENT_EMIT" | "FILE_WRITE";

export type IntentStatus = "PROPOSED" | "DELIBERATED" | "DISPATCHED" | "EXECUTING" | "OK" | "VETOED" | "DOWNGRADED" | "FAILED" | "PENDING";

export interface PricingTier {
  key: string;
  label: string;
  amountSpu: number;
  billing: "ONE_TIME" | "MONTHLY";
  inclusions: string[];
}

export interface ResolvedPrice {
  tier: string;
  tierLabel: string;
  amount: number;
  currencyCode: string;
  display: string;
  billing: "ONE_TIME" | "MONTHLY";
}

export interface IntentEmission {
  id: string;
  intentKind: string;
  strategyId: string;
  status: IntentStatus;
  governor: Brain;
  emittedAt: string;
  completedAt?: string;
  costUsd?: number;
}

export interface StrategySummary {
  id: string;
  name: string;
  countryCode?: string;
  tier?: BrandTier;
  composite?: number;
  lifecyclePhase?: StrategyLifecyclePhase;
}
