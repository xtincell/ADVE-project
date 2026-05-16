/**
 * Campaign Tracker — Types & errors (Phase 19, ADR-0052).
 *
 * Layer 1 — pas d'IO, pas de Prisma, pas de mestor. Pure DTO.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

// ─────────────────────────────────────────────────────────────────────────
// Cluster A — Trajectoire & altitude
// ─────────────────────────────────────────────────────────────────────────

/**
 * Snapshot immutable figé au passage READY_TO_LAUNCH → LIVE. Persisté dans
 * Campaign.tierBrandSnapshot (Json). Contrat strict pour anti-drift sur
 * format Json (test `tests/unit/governance/campaign-tracker-snapshot-immutability.test.ts`).
 */
export interface TierBrandSnapshot {
  readonly tier: string; // BrandClassification : ZOMBIE | FRAGILE | ORDINAIRE | FORTE | CULTE | ICONE
  readonly compositeScore: number;
  readonly byPillar: Readonly<Record<string, number>>; // {a: 75, d: 60, ...}
  readonly snapshotAt: string; // ISO 8601
}

export interface ManipulationMixSnapshot {
  readonly primary: "peddler" | "dealer" | "facilitator" | "entertainer";
  readonly allowed: readonly ("peddler" | "dealer" | "facilitator" | "entertainer")[];
  readonly rationale: string | null;
  readonly snapshotAt: string;
}

/**
 * Cult Index snapshot null-honest (cf. ADR-0046 — pas de fallback magic).
 * `null` est une valeur valide qui signifie "pas encore mesuré" — n'invente pas.
 */
export interface CultIndexSnapshot {
  readonly score: number;
  readonly tier: string; // DevotionLadderTier
  readonly snapshotAt: string;
}

export type FuelBurnState = "ALLOWED" | "WARN_AT_BURN_RATE" | "DENIED";

export interface FuelBurnRateResult {
  readonly state: FuelBurnState;
  /** Ratio budget consommé / budget total (0..1+). */
  readonly burnRatio: number;
  /** Ratio progression temps / durée totale campagne (0..1). */
  readonly timeRatio: number;
  /** Pacing revenue mesuré vs target (0..N). null si insuffisant telemetry. */
  readonly revenuePacing: number | null;
  /** Recommandation textuelle pour l'opérateur. */
  readonly recommendation: string;
  /** True si on est dans une regret-window (J+3/J+7/J+14) avec dérive >30%. */
  readonly regretWindowFlag: boolean;
}

export interface SnapshotPreLiveOutput {
  readonly campaignId: string;
  readonly tierBrandSnapshot: TierBrandSnapshot | null;
  readonly bigIdeaSnapshotBrandAssetId: string | null;
  readonly manifestoSnapshotBrandAssetId: string | null;
  readonly bigIdeaSnapshotContent: unknown | null;
  readonly manifestoSnapshotContent: unknown | null;
  readonly manipulationMixSnapshot: ManipulationMixSnapshot | null;
  readonly cultIndexSnapshotPre: CultIndexSnapshot | null;
  /** Codes warnings non-blocking (ex: cluster en PARTIAL state, snapshot manquant). */
  readonly warnings: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Cluster B — Cohérence narrative
// ─────────────────────────────────────────────────────────────────────────

export interface BigIdeaCoherenceResult {
  readonly campaignActionId: string;
  /** Score 0..1 — 0 = totalement détourné, 1 = parfait alignement. */
  readonly score: number;
  /** Heuristique appliquée : MVP = lexical, PRODUCTION = llm. */
  readonly method: "lexical" | "llm";
  /** Détails opt-in pour debug UI. */
  readonly diagnostic: {
    readonly bigIdeaTokens: number;
    readonly actionTokens: number;
    readonly intersectionTokens: number;
    readonly manifestoBeliefsHit: number;
  } | null;
  /** True si manipulationModeApplied dévie du mix stratégique snapshot. */
  readonly manipulationDrift: boolean;
  /** Rationale LLM (PRODUCTION mode only). null en lexical mode. ADR-0052-B §1. */
  readonly rationale: string | null;
  /** Red flags détectés par LLM. ADR-0052-B §1. */
  readonly redFlags: readonly string[];
  /** Signaux d'alignement positifs détectés par LLM. ADR-0052-B §1. */
  readonly alignmentSignals: readonly string[];
}

export interface MythArcCohesionPair {
  readonly campaignNId: string;
  readonly campaignPriorId: string;
  /** Score 0..1 similarité narrative entre N et N-1. */
  readonly similarity: number;
  /** True si chapitre N développe (vs contredit ou ignore) chapitre N-1. */
  readonly continuityFlag: boolean;
}

export interface MythArcCohesionResult {
  readonly strategyId: string;
  readonly pairs: readonly MythArcCohesionPair[];
  /** Score moyen de continuité narrative globale. null si <2 campagnes. */
  readonly globalContinuityScore: number | null;
  /** Codes de dégradation si nécessaires (cf. capability-state). */
  readonly degradationCodes: readonly string[];
}

export interface CulturalDebtResult {
  readonly campaignId: string;
  /** Score 0..1 — 0 = parfait alignement Manifesto, 1 = totalement détourné. */
  readonly culturalDebtScore: number;
  /** Mean des bigIdeaCoherenceScore non-null sur les CampaignAction. */
  readonly meanCoherenceScore: number | null;
  /** Nombre d'actions échantillonnées. */
  readonly actionsSampled: number;
  readonly degradationCodes: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Errors structurées
// ─────────────────────────────────────────────────────────────────────────

export class StageSequencingViolationError extends Error {
  readonly code = "STAGE_SEQUENCING_VIOLATION" as const;
  constructor(
    public readonly campaignId: string,
    public readonly missingStages: readonly string[],
  ) {
    super(`Cascade ADVERTIS skip: campaign ${campaignId} requires upstream stages [${missingStages.join(", ")}]`);
  }
}

export class ManipulationDriftError extends Error {
  readonly code = "MANIPULATION_DRIFT" as const;
  constructor(
    public readonly campaignActionId: string,
    public readonly applied: string,
    public readonly allowed: readonly string[],
  ) {
    super(
      `CampaignAction ${campaignActionId} applied mode "${applied}" but mix allows [${allowed.join(", ")}]`,
    );
  }
}

export class MissingSnapshotError extends Error {
  readonly code = "MISSING_SNAPSHOT" as const;
  constructor(
    public readonly campaignId: string,
    public readonly snapshotKind: "bigIdea" | "manifesto" | "manipulationMix" | "tierBrand",
  ) {
    super(`Campaign ${campaignId} missing required ${snapshotKind} snapshot`);
  }
}

export class DeferredAwaitingDepsError extends Error {
  readonly code = "DEFERRED_AWAITING_DEPS" as const;
  constructor(
    public readonly clusterSlug: string,
    public readonly missingDeps: readonly string[],
  ) {
    super(`Cluster ${clusterSlug} STUB — awaiting deps: [${missingDeps.join(", ")}]`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 2 — Cluster C — Superfan economy
// ─────────────────────────────────────────────────────────────────────────

export type DevotionLadderTier =
  | "APPRENTI"
  | "PRATIQUANT"
  | "INITIE"
  | "FIDELE"
  | "EVANGELISTE";

export interface DevotionTransition {
  readonly from: DevotionLadderTier;
  readonly to: DevotionLadderTier;
  readonly count: number;
}

export interface SuperfanAttributionByAction {
  readonly campaignActionId: string;
  /** Évangélistes attribués à cette action (modèle paramétrique). */
  readonly evangelistsProduced: number;
  /** Future LTV attribué horizon 24 mois. */
  readonly futureLtvAttribution: number;
  /** Confidence interval [lower, upper]. null si telemetry insuffisante. */
  readonly confidenceInterval: readonly [number, number] | null;
}

export interface SuperfanAttributionResult {
  readonly campaignId: string;
  readonly byAction: readonly SuperfanAttributionByAction[];
  readonly totalEvangelistsProduced: number;
  readonly totalFutureLtvAttribution: number;
  readonly degradationCodes: readonly string[];
}

export interface StickinessCohortResult {
  readonly campaignId: string;
  /** Cohort initiale = évangélistes au moment du POST_CAMPAIGN. */
  readonly initialCohortSize: number;
  readonly cohortAtJ30: number | null;
  readonly cohortAtJ90: number | null;
  readonly cohortAtJ180: number | null;
  /** retentionRate = cohortAtJ_X / initialCohortSize. */
  readonly retentionRateJ30: number | null;
  readonly retentionRateJ90: number | null;
  readonly retentionRateJ180: number | null;
  readonly degradationCodes: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 2 — Cluster D — Signaux faibles & culture
// ─────────────────────────────────────────────────────────────────────────

export type OvertonReadiness = "READY" | "TOO_EARLY" | "TOO_LATE";

export interface OvertonReadinessResult {
  readonly strategyId: string;
  readonly campaignId: string;
  readonly readiness: OvertonReadiness;
  /** Reasoning textuel pour l'opérateur. */
  readonly reasoning: string;
  /**
   * Score 0..1 de proximité à la fenêtre culturelle (1 = pile dans la fenêtre).
   *
   * **Phase 23 (ADR-0078) — nullable** : `null` quand la mesure est en
   * INSUFFICIENT_DATA (sector axis absent, hypothesis manquante, etc.). Le
   * consumer renders an honest degraded UI rather than reading a fabricated 0
   * or median (no-magic-fallback, ADR-0046). Pattern P22-2.
   */
  readonly proximityScore: number | null;
  readonly degradationCodes: readonly string[];
}

export interface OvertonShiftResult {
  readonly campaignId: string;
  /**
   * Score signed : positif = on a déplacé l'axe dans le sens de l'hypothèse,
   * négatif = on a poussé inverse.
   *
   * **Phase 23 (ADR-0078) — nullable** : `null` quand la mesure est en
   * INSUFFICIENT_DATA (manifest absent, sector axis missing, etc.). Same rule
   * as `proximityScore` above — no fabricated 0 (P22-2, ADR-0046).
   */
  readonly overtonShiftScore: number | null;
  /** Vocabulary tokens qui sont apparus dans le secteur post-LIVE. */
  readonly emergingTokens: readonly string[];
  /** Sentiment delta sectoriel. `null` si la mesure n'est pas calculable. */
  readonly sentimentDelta: number | null;
  readonly degradationCodes: readonly string[];
}

export interface McpContextIngestResult {
  readonly campaignContextIngestId: string;
  readonly piiVerdict: "CLEAN" | "PII_DETECTED_REJECTED" | "PII_REDACTED";
  readonly stored: boolean;
  readonly rejectionReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 3 — Cluster E — Boucles d'apprentissage
// ─────────────────────────────────────────────────────────────────────────

/**
 * Proposition Operator-Amend-Pillar produite par RECONCILE_CAMPAIGN_TO_ORACLE.
 * L'opérateur valide manuellement avant émission de l'Intent
 * `OPERATOR_AMEND_PILLAR` (ADR-0023). Pas de mutation automatique.
 */
export interface OperatorAmendPillarProposal {
  readonly pillarKey: "a" | "d" | "v" | "e"; // ADVE only (RTIS dérivés type-level constraint, ADR-0023)
  readonly fieldPath: string; // ex: "messieFondateur" ou "preuvesAuthenticite"
  readonly currentValue: unknown;
  readonly proposedValue: unknown;
  readonly mode: "PATCH_DIRECT" | "LLM_REPHRASE" | "STRATEGIC_REWRITE";
  readonly rationale: string;
  /** Sections Oracle impactées (lecture composée — strategy-presentation). */
  readonly impactedOracleSections: readonly string[];
}

export interface CampaignToOracleReconciliationResult {
  readonly campaignId: string;
  readonly proposals: readonly OperatorAmendPillarProposal[];
  readonly degradationCodes: readonly string[];
}

export interface VariableBibleEnrichmentProposal {
  /** ex: "claim Y performe sur audience Z dans contexte W". */
  readonly summary: string;
  /** ex: "BIBLE_D" | "BIBLE_V" — bible cible. */
  readonly bibleScope: "BIBLE_A" | "BIBLE_D" | "BIBLE_V" | "BIBLE_E";
  /** ex: { audienceSegment: "ZOMER_URBAINS", claim: "..." }. */
  readonly entry: Record<string, unknown>;
  /** Confiance 0..1. */
  readonly confidence: number;
  readonly evidenceCampaignActionIds: readonly string[];
}

export interface CrewPerformanceScore {
  readonly campaignTeamMemberId: string;
  readonly userId: string;
  /** Score par dimension 0..100 (12 dimensions canoniques — variable-bible Imhotep). */
  readonly byDimension: Readonly<Record<string, number>>;
  /** Score composite 0..100. */
  readonly composite: number;
  /** Tier promotion proposé : PROMOTE | HOLD | DEMOTE. */
  readonly tierRecommendation: "PROMOTE" | "HOLD" | "DEMOTE";
  /** Recommandations formation (skill gaps). */
  readonly recommendedCourses: readonly string[];
}

export interface SequencePromotionProposal {
  readonly sequenceKey: string;
  readonly currentLifecycle: "DRAFT" | "STABLE" | "DEPRECATED";
  readonly proposedLifecycle: "DRAFT" | "STABLE";
  readonly campaignSuccessSignals: {
    readonly tierDelta: number;
    readonly cultIndexDelta: number | null;
    readonly altitudeRegression: boolean;
    readonly timesReused: number;
  };
  readonly recommendation: "PROMOTE_NOW" | "WAIT_FOR_MORE_REUSES" | "REFUSE_INSUFFICIENT_SIGNALS";
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 3 — Cluster F — Économie agence
// ─────────────────────────────────────────────────────────────────────────

export interface ActivityTypeMargin {
  /** ATL | BTL | TTL (canonique ActionCategory enum). */
  readonly category: "ATL" | "BTL" | "TTL";
  readonly subType: string | null;
  readonly periodStart: string; // ISO date
  readonly periodEnd: string;
  readonly market: string | null; // ISO-2 country code
  /** Marge moyenne sur le bucket k-anonymisé (k≥5). */
  readonly meanMargin: number;
  /** Variance pour info. */
  readonly variance: number;
  /** Tenants count agrégés (k-anonymity check : k>=5 obligatoire). */
  readonly tenantBucketSize: number;
  readonly degradationCodes: readonly string[];
}

export interface AgencyMarginsResult {
  readonly margins: readonly ActivityTypeMargin[];
  readonly degradationCodes: readonly string[];
}

export interface ResourceSaturationForecast {
  readonly weekStart: string; // ISO date
  /** 0..1 — fraction des heures crew prévues vs disponibles. */
  readonly saturationRatio: number;
  /** Goulots détectés : {role, hoursOver, missionIds[]}. */
  readonly bottlenecks: ReadonlyArray<{
    readonly role: string;
    readonly hoursOver: number;
    readonly missionIds: readonly string[];
  }>;
  /** True si > 0.85 (bloquant signature nouveau deal). */
  readonly blocking: boolean;
}

export interface ResourceSaturationResult {
  readonly forecast: readonly ResourceSaturationForecast[];
  readonly degradationCodes: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 3 — Cluster G — Souveraineté opérationnelle
// ─────────────────────────────────────────────────────────────────────────

export interface ComplianceCheckResult {
  readonly campaignFieldOpId: string;
  readonly country: string | null; // ISO-2 country code
  /** Règles sectorielles applicables (ARPP, CONAC, ASA, etc.). */
  readonly applicableRules: readonly string[];
  /** Flags bloquants (must-fix avant go-live). */
  readonly blockingFlags: ReadonlyArray<{
    readonly rule: string;
    readonly reason: string;
  }>;
  /** Flags non-bloquants (warning). */
  readonly warningFlags: ReadonlyArray<{
    readonly rule: string;
    readonly reason: string;
  }>;
  readonly degradationCodes: readonly string[];
}

export interface CredentialsChainSnapshotResult {
  readonly campaignId: string;
  readonly snapshotAt: string; // ISO timestamp
  /** ExternalConnector.id[] utilisés au moment LIVE. */
  readonly connectorIds: readonly string[];
  /** Audit hash (intent log hash-chain ref). */
  readonly auditHash: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 19 Vague 3 — Cluster H — Negative space audit
// ─────────────────────────────────────────────────────────────────────────

export type NegativeSpaceCategory =
  | "BRAND_OBLIGATION_UNCOVERED"
  | "LADDER_RUNG_ORPHAN"
  | "TACTICAL_ACTIVATION_MISSING"
  | "CHANNEL_FIT_GAP"
  | "ORACLE_RECONCILIATION_PARTIAL"
  | "DORMANT_TOOL_HINT";

export interface NegativeSpaceFinding {
  readonly category: NegativeSpaceCategory;
  readonly severity: "INFO" | "WARNING" | "CRITICAL";
  readonly description: string;
  /** Recommendation actionnable pour combler le gap. */
  readonly recommendation: string;
  /** Réfs Prisma concernées (campaignId, campaignActionId, etc.). */
  readonly relatedEntityIds: readonly string[];
}

export interface NegativeSpaceAuditResult {
  readonly campaignId: string;
  readonly findings: readonly NegativeSpaceFinding[];
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly degradationCodes: readonly string[];
}
