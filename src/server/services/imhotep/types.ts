/**
 * Imhotep — Crew Programs (Ground #6) — full activation Phase 14 (ADR-0019).
 *
 * Sage humain égyptien déifié — architecte, scribe, médecin. Master of Crew Programs.
 *
 * Imhotep est un **orchestrateur** qui wrappe les services satellites existants
 * (matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router)
 * sous une gouvernance unifiée Mestor → Imhotep → satellite.
 *
 * Cf. PANTHEON.md §2.6 ; ADR-0010 (pré-réserve) ; ADR-0017 (Superseded) ; ADR-0019 (full).
 */

// ─── draftCrewProgram payload (back-compat Phase 13) ─────────────────────────

export interface ImhotepDraftCrewProgramPayload {
  strategyId: string;
  /** Optionnel : context business pour personnaliser le draft. */
  sector?: string;
}

/**
 * Output du draftCrewProgram. **Nom conservé** pour back-compat avec Phase 13
 * (commandant.ts utilise `.status` et `.adrRefs`). En Phase 14+ le status par
 * défaut est "DRAFT" ; "DORMANT_PRE_RESERVED" est conservé pour rétro-compat
 * dans les tests qui n'ont pas encore été migrés.
 */
export interface ImhotepCrewProgramPlaceholder {
  /** Texte humain résumant le programme crew. */
  placeholder: string;
  /** "DRAFT" en Phase 14+ (full activation), "DORMANT_PRE_RESERVED" reste valide pour back-compat. */
  status: "DRAFT" | "DORMANT_PRE_RESERVED";
  /** Lien ADRs. */
  adrRefs: readonly string[];
  /** Date d'émission. */
  scaffoldedAt: string;
  /** [Phase 14+] Roles requis détectés. */
  rolesRequired?: readonly string[];
  /** [Phase 14+] Budget estimé en USD. */
  estimatedBudgetUsd?: number;
}

// ─── matchTalentToMission ───────────────────────────────────────────────────

export interface ImhotepMatchTalentToMissionPayload {
  missionId: string;
  /** Override match score min threshold (default: 0.6). */
  minMatchScore?: number;
  /** Limit candidates returned (default: 5). */
  limit?: number;
}

export interface ImhotepMatchedCandidate {
  talentProfileId: string;
  userId: string;
  displayName: string;
  tier: string;
  matchScore: number;
  matchReasons: readonly string[];
}

export interface ImhotepMatchTalentToMissionResult {
  missionId: string;
  candidates: readonly ImhotepMatchedCandidate[];
  /** Hint Imhotep : recommended top-of-list talent. */
  recommendedTalentProfileId: string | null;
}

// ─── assembleCrew ───────────────────────────────────────────────────────────

export interface ImhotepAssembleCrewPayload {
  missionId: string;
  /** Roles à pourvoir. Si vide, déduit du Mission.briefData. */
  rolesRequired?: readonly string[];
  /** Budget cap pour ce crew (optional — Thot vérifie aussi). */
  budgetCapUsd?: number;
}

export interface ImhotepCrewMember {
  role: string;
  userId: string;
  displayName: string;
  tier: string;
  currentUtilization: number;
  matchScore: number;
}

export interface ImhotepAssembledCrew {
  missionId: string;
  members: readonly ImhotepCrewMember[];
  estimatedCostUsd: number;
  unfilled: readonly { role: string; reason: string }[];
}

// ─── evaluateTier ───────────────────────────────────────────────────────────

export interface ImhotepEvaluateTierPayload {
  talentProfileId: string;
}

export interface ImhotepTierEvaluation {
  talentProfileId: string;
  currentTier: string;
  recommendedTier: string;
  action: "PROMOTE" | "DEMOTE" | "HOLD";
  criteria: Record<string, number>;
  rationale: string;
}

// ─── enrollFormation ────────────────────────────────────────────────────────

export interface ImhotepEnrollFormationPayload {
  userId: string;
  courseId: string;
}

export interface ImhotepEnrollmentResult {
  enrollmentId: string;
  status: "ENROLLED" | "ALREADY_ENROLLED" | "WAITLISTED";
  startedAt: string;
}

// ─── certifyTalent ──────────────────────────────────────────────────────────

export interface ImhotepCertifyTalentPayload {
  talentProfileId: string;
  certificationName: string;
  category: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ImhotepCertificationResult {
  certificationId: string;
  talentProfileId: string;
  name: string;
  issuedAt: string;
}

// ─── qcDeliverable ──────────────────────────────────────────────────────────

export interface ImhotepQcDeliverablePayload {
  deliverableId: string;
  /** Bypass routing — assign explicitly. */
  reviewerId?: string;
}

export interface ImhotepQcResult {
  deliverableId: string;
  /** "AUTOMATED" | "ASSIGNED" | "ESCALATED". */
  routedTo: string;
  reviewId: string | null;
  /** Si routedTo=AUTOMATED, score immédiat. */
  automatedScore?: number;
}

// ─── recommendFormation ─────────────────────────────────────────────────────

export interface ImhotepRecommendFormationPayload {
  userId: string;
  /** Skill gap identifié (input optional — sinon Imhotep déduit via talent-engine). */
  skillGap?: string;
}

export interface ImhotepRecommendedCourse {
  courseId: string;
  title: string;
  rationale: string;
  estimatedDurationMin: number;
}

export interface ImhotepFormationRecommendation {
  userId: string;
  recommendedCourses: readonly ImhotepRecommendedCourse[];
}
