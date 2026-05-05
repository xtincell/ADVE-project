import type { PillarKey } from "@/lib/types/advertis-vector";

import { ADVE_STORAGE_KEYS, PILLAR_STORAGE_KEYS } from "@/domain";
// ── Mission Types ──────────────────────────────────────────────────

export type MissionType =
  | "ADVE_INTAKE"          // Console wizard → fill all ADVE fields
  | "ADVE_INTAKE_PARTIAL"  // Public intake → partial ADVE from raw responses (no R+T required)
  | "ADVE_BOOT_FILL"       // Post-paywall boot sequence → fill ADVE (R+T optional)
  | "ADVE_UPDATE"          // R+T feedback → enrich/correct ADVE (REQUIRES R+T)
  | "I_GENERATION"         // Innovation catalog (granular)
  | "S_SYNTHESIS"          // Strategy + roadmap (granular)
  | "SESHAT_OBSERVATION";  // External signal → editorialized reco

export const MISSION_TYPES = [
  "ADVE_INTAKE",
  "ADVE_INTAKE_PARTIAL",
  "ADVE_BOOT_FILL",
  "ADVE_UPDATE",
  "I_GENERATION",
  "S_SYNTHESIS",
  "SESHAT_OBSERVATION",
] as const;

// ── Recommendation Enums ──────────────────────────────────────────

export type RecoStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "APPLIED"
  | "REVERTED"
  | "EXPIRED";

export type RecoUrgency = "NOW" | "SOON" | "LATER";
export type RecoImpact = "LOW" | "MEDIUM" | "HIGH";
export type RecoOperation = "SET" | "ADD" | "MODIFY" | "REMOVE" | "EXTEND";

export type RecoSource =
  | "R"
  | "T"
  | "R+T"
  | "VAULT"
  | "INTAKE"
  | "CROSS_PILLAR"
  | "SESHAT";

export type ApplyPolicy = "auto" | "suggest" | "requires_review";

export type CompletionLevel = "INCOMPLET" | "COMPLET" | "FULL";

export type RecoAgent =
  | "MESTOR"
  | "ARTEMIS"
  | "GLORY_TOOL"
  | "VAULT"
  | "HUMAN";

// ── Engine Input/Output ───────────────────────────────────────────

export interface GenerateBatchInput {
  strategyId: string;
  missionType: MissionType;
  /** For ADVE_UPDATE: subset of target pillars (default: all ADVE) */
  targetPillars?: PillarKey[];
  /** For SESHAT_OBSERVATION: raw observation text */
  seshatObservation?: string;
}

export interface GenerateBatchResult {
  batchId: string;
  totalRecos: number;
  recosByPillar: Record<string, number>;
  errors: Array<{ pillarKey: string; error: string }>;
  /** Recos auto-applied (confidence >= 0.7 + non-destructive + auto policy) */
  autoApplied: number;
}

// ── Resolved Operations (for Gateway) ─────────────────────────────

export interface ResolvedRecoOperation {
  field: string;
  operation: RecoOperation;
  proposedValue: unknown;
  targetMatch?: { key: string; value: string };
  /** For post-apply tracking */
  recoId: string;
}

// ── Pipeline ──────────────────────────────────────────────────────

export type PipelineStageStatus =
  | "LOCKED"
  | "READY"
  | "IN_PROGRESS"
  | "REVIEW"
  | "COMPLETED";

export interface PipelineStage {
  stage: number;
  missionType: MissionType;
  status: PipelineStageStatus;
  batchId?: string | null;
  pendingRecos: number;
  completedRecos: number;
}

export interface PipelineStatus {
  strategyId: string;
  /** 0=not started, 1=ADVE, 2=I, 3=S, 4=complete */
  currentStage: number;
  stages: PipelineStage[];
  startedAt?: string;
}

/** Stored in Strategy.notoriaPipeline JSON field */
export interface PipelineState {
  currentStage: number;
  stages: Array<{
    stage: number;
    missionType: MissionType;
    batchId: string | null;
    status: PipelineStageStatus;
  }>;
  startedAt: string;
}

// ── KPIs (GOVERNANCE-NETERU) ──────────────────────────────────────

export interface NotoriaKPIs {
  acceptanceRate: number;
  revertRate: number;
  avgTimeToApproveMs: number;
  confidenceDistribution: Array<{ bucket: string; count: number }>;
  urgencyDistribution: Record<RecoUrgency, number>;
  recosBySource: Partial<Record<RecoSource, number>>;
  recosByMission: Partial<Record<MissionType, number>>;
}

// ── Quality Gate Result ───────────────────────────────────────────

export interface QualityGateResult {
  applyPolicy: ApplyPolicy;
  blocked: boolean;
  blockReason?: string;
  financialWarnings?: string[];
}

// ── Parsed LLM Reco (pre-persistence) ─────────────────────────────

export interface RawLLMReco {
  field: string;
  operation?: RecoOperation;
  currentSummary?: string;
  proposedValue: unknown;
  targetIndex?: number;
  targetMatch?: { key: string; value: string };
  justification: string;
  source: RecoSource;
  impact: RecoImpact;
  confidence?: number;
  advantages?: string[];
  disadvantages?: string[];
  urgency?: RecoUrgency;
  sectionGroup?: string;
}

// ── Mission Source/Target Config ───────────────────────────────────

export const MISSION_CONFIG: Record<
  MissionType,
  { sourcePillars: PillarKey[]; targetPillars: PillarKey[] }
> = {
  ADVE_INTAKE: {
    sourcePillars: [],
    targetPillars: [...ADVE_STORAGE_KEYS],
  },
  ADVE_INTAKE_PARTIAL: {
    // Public intake: no pillar reads required, lives off responses + extractedValues
    sourcePillars: [],
    targetPillars: [...ADVE_STORAGE_KEYS],
  },
  ADVE_BOOT_FILL: {
    // Post-paywall boot: ADVE pillars exist (from intake), may consult R+T if present
    sourcePillars: [...ADVE_STORAGE_KEYS],
    targetPillars: [...ADVE_STORAGE_KEYS],
  },
  ADVE_UPDATE: {
    sourcePillars: ["r", "t"],
    targetPillars: [...ADVE_STORAGE_KEYS],
  },
  I_GENERATION: {
    sourcePillars: ["a", "d", "v", "e", "r", "t"],
    targetPillars: ["i"],
  },
  S_SYNTHESIS: {
    sourcePillars: ["a", "d", "v", "e", "r", "t", "i"],
    targetPillars: ["s"],
  },
  SESHAT_OBSERVATION: {
    sourcePillars: [...PILLAR_STORAGE_KEYS],
    targetPillars: ["a", "d", "v", "e", "i", "s"],
  },
};
