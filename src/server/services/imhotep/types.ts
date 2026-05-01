/**
 * Imhotep types — Crew Programs governance (Phase 7+ activation).
 *
 * 6ème Neter, ADR-0010. Sous-système APOGEE = Crew Programs (Ground Tier).
 * Téléologie : matching basé sur devotion-potential, pas CV.
 */

import type { ManipulationMode } from "@/server/services/ptah/types";

export type ImhotepKind =
  | "IMHOTEP_MATCH_CREATOR"
  | "IMHOTEP_COMPOSE_TEAM"
  | "IMHOTEP_EVALUATE_TIER"
  | "IMHOTEP_ROUTE_QC"
  | "IMHOTEP_RECOMMEND_TRAINING";

export const IMHOTEP_KINDS: readonly ImhotepKind[] = [
  "IMHOTEP_MATCH_CREATOR",
  "IMHOTEP_COMPOSE_TEAM",
  "IMHOTEP_EVALUATE_TIER",
  "IMHOTEP_ROUTE_QC",
  "IMHOTEP_RECOMMEND_TRAINING",
] as const;

/**
 * MatchCreatorInput — un brief mission (skill-bucket + secteur + mode requis)
 * et la stratégie cible (mix manipulation porté par la marque).
 */
export interface MatchCreatorInput {
  missionId: string;
  /** Optional override of the candidate pool size (default 5). */
  topN?: number;
}

export interface MatchCandidate {
  talentProfileId: string;
  userId: string;
  displayName: string;
  tier: string;
  /** Score 0-100 — composite skill + devotion-potential + manipulation fit. */
  matchScore: number;
  /** Devotion footprint reused from `TalentProfile.driverSpecialties.devotionFootprint`. */
  devotionInSector: number;
  /** Whether the candidate excels in the manipulation mode required. */
  manipulationFit: boolean;
  reasons: readonly string[];
}

export interface MatchCreatorResult {
  missionId: string;
  candidates: readonly MatchCandidate[];
  rationale: string;
}

/**
 * ComposeTeamInput — campagne ou mission composée nécessitant plusieurs profils.
 */
export interface ComposeTeamInput {
  campaignId?: string;
  missionId?: string;
  buckets: readonly string[];
  manipulationModes: readonly ManipulationMode[];
}

export interface TeamSlot {
  bucket: string;
  manipulationMode: ManipulationMode;
  candidate: MatchCandidate;
}

export interface ComposeTeamResult {
  composition: readonly TeamSlot[];
  /** Aggregate composition score (avg of slot match scores). */
  cohesionScore: number;
  warnings: readonly string[];
}

/**
 * EvaluateTierInput — évaluation tier promotion (APPRENTI → COMPAGNON → MAITRE).
 */
export interface EvaluateTierInput {
  talentProfileId: string;
}

export interface EvaluateTierResult {
  talentProfileId: string;
  currentTier: string;
  recommendedTier: string;
  /** True if the recommendation is a promotion (vs same/no-change). */
  promote: boolean;
  reasons: readonly string[];
  metrics: {
    avgScore: number;
    firstPassRate: number;
    totalMissions: number;
  };
}

/**
 * RouteQcInput — route un deliverable vers le bon reviewer (peer/fixer/client).
 */
export interface RouteQcInput {
  deliverableId: string;
  /** Optional hint on review type — Imhotep can override. */
  preferredType?: "PEER" | "FIXER" | "CLIENT";
}

export interface RouteQcResult {
  deliverableId: string;
  reviewerId: string;
  reviewType: "PEER" | "FIXER" | "CLIENT";
  rationale: string;
}

/**
 * RecommendTrainingInput — détecte les manques de formation à partir des
 * reviews / qc_router scores faibles, propose un cours de l'Académie.
 */
export interface RecommendTrainingInput {
  talentProfileId: string;
}

export interface TrainingRecommendation {
  courseId: string;
  courseTitle: string;
  pillarFocus: string | null;
  reason: string;
  expectedScoreLift: number;
}

export interface RecommendTrainingResult {
  talentProfileId: string;
  recommendations: readonly TrainingRecommendation[];
}
