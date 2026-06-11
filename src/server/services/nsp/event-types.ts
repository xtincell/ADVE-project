/**
 * NSP — Neteru Streaming Protocol — event types.
 *
 * NSP est la couche transport runtime (SSE) qui pousse les events vers le client.
 * Le modèle persistant `IntentEmissionEvent` (prisma/schema.prisma:3110) reste la
 * source de vérité auditable ; NSP n'est que l'aiguillage in-memory pour live UI.
 */

export type NotificationEvent = {
  kind: "notification";
  id: string;
  userId: string;
  type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  title: string;
  body: string;
  link?: string | null;
  createdAt: string;
};

export type IntentProgressEvent = {
  kind: "intent_progress";
  intentId: string;
  phase: string;
  stepName?: string;
  stepIndex?: number;
  stepTotal?: number;
  partial?: unknown;
};

export type McpInvocationEvent = {
  kind: "mcp_invocation";
  registryId: string;
  toolName: string;
  status: "PENDING" | "OK" | "FAILED" | "DEFERRED_AWAITING_CREDENTIALS";
  durationMs?: number;
};

/**
 * Phase 21 F-E (ADR-0072) — Oracle progress streaming.
 *
 * 6 sub-kinds discriminés. Le frontend filtre par `event.strategyId`
 * (l'opérateur reçoit tous ses events via `subscribe(userId, ...)` —
 * le routing se fait par userId, pas par channel).
 *
 * Hiérarchie naturelle : l'Assembler (F-D) émet `assembler_*`, et chaque
 * sous-Intent `GENERATE_ORACLE_SECTION` (F-C) émet `section_*` au passage.
 * Le frontend voit donc les deux niveaux interlacés.
 */

export type OracleSectionStartedEvent = {
  kind: "oracle_section_started";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  runner: { kind: "GLORY_SEQUENCE" | "GLORY_TOOL" | "FRAMEWORK" | "PURE_MAPPER"; ref: string };
  mode: "FRESH" | "REGEN" | "RETRY";
  startedAt: string;
};

export type OracleSectionCompletedEvent = {
  kind: "oracle_section_completed";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  confidence: number | null;
  durationMs: number;
  version: number;
};

export type OracleSectionFailedEvent = {
  kind: "oracle_section_failed";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  errorCode: string;
  errorMessage: string;
  attempts?: number;
  durationMs: number;
};

export type OracleAssemblerStartedEvent = {
  kind: "oracle_assembler_started";
  strategyId: string;
  scope: string;
  total: number;
  startedAt: string;
};

export type OracleAssemblerProgressEvent = {
  kind: "oracle_assembler_progress";
  strategyId: string;
  scope: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  currentSectionId?: number;
};

export type OracleAssemblerDoneEvent = {
  kind: "oracle_assembler_done";
  strategyId: string;
  scope: string;
  overallStatus: "COMPLETE" | "PARTIAL" | "EMPTY";
  total: number;
  succeeded: number;
  failed: number;
  durationMs: number;
};

export type OracleStreamEvent =
  | OracleSectionStartedEvent
  | OracleSectionCompletedEvent
  | OracleSectionFailedEvent
  | OracleAssemblerStartedEvent
  | OracleAssemblerProgressEvent
  | OracleAssemblerDoneEvent;

/**
 * Intake progressive streaming (NEFER session 2026-05-12).
 *
 * Le parcours commercial-critique Intake → Score → Result a un wait ~70s sur
 * `quickIntake.complete()` (4 LLM calls parallèles extract + narrative split +
 * brand-level eval). NSP streaming expose 5 jalons progressifs pour que le
 * founder voie son diagnostic se construire au lieu d'un spinner monolithique.
 *
 * Hiérarchie naturelle :
 *   intake_started      — complete() démarré
 *   intake_extracted    — 4 piliers ADVE extraits + écrits (rapide, ~10s)
 *   intake_scored       — composite ADVE /100 calculé (~12s total)
 *   intake_narrative_done — narrative report ADVE+RTIS produit (~50s total)
 *   intake_completed    — brand-level + financial-capacity persistés (~70s total)
 *
 * Le frontend filtre par `intakeToken` (pas par userId — l'intake est anonyme
 * jusqu'au paywall). Le routing NSP-level reste par userId, mais ici on a un
 * system user pour les intakes pré-conversion. La page result se subscribe
 * via le pattern `subscribeAnonymous(intakeToken, ...)` du sse-broker.
 */

export type IntakeStartedEvent = {
  kind: "intake_started";
  intakeToken: string;
  companyName: string;
  startedAt: string;
};

export type IntakeExtractedEvent = {
  kind: "intake_extracted";
  intakeToken: string;
  /** Piliers effectivement remplis (a/d/v/e). Si tous : ["a","d","v","e"]. */
  filledPillars: string[];
  durationMs: number;
};

export type IntakeScoredEvent = {
  kind: "intake_scored";
  intakeToken: string;
  /** Composite ADVE /100 (somme des 4 piliers /25). */
  compositeScore: number;
  /** Classification de base threshold (peut être overridée par brand-level). */
  classification: string;
  /** Scores par pilier (a/d/v/e) sur /25 chacun. */
  scoresByPillar: { a: number; d: number; v: number; e: number };
  durationMs: number;
};

export type IntakeNarrativeDoneEvent = {
  kind: "intake_narrative_done";
  intakeToken: string;
  /** Le narrative est-il complet (ADVE + RTIS) ou partiel (ADVE seul) ? */
  hasRtis: boolean;
  durationMs: number;
};

export type IntakeCompletedEvent = {
  kind: "intake_completed";
  intakeToken: string;
  /** Classification finale (peut différer si brand-level override). */
  finalClassification: string;
  /** Brand level si LLM evaluator a réussi, null sinon. */
  brandLevel: "LATENT" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE" | null;
  /** strategyId créée pour la conversion future via activateBrand. */
  strategyId: string;
  durationMs: number;
};

export type IntakeFailedEvent = {
  kind: "intake_failed";
  intakeToken: string;
  errorCode: string;
  errorMessage: string;
  durationMs: number;
};

export type IntakeStreamEvent =
  | IntakeStartedEvent
  | IntakeExtractedEvent
  | IntakeScoredEvent
  | IntakeNarrativeDoneEvent
  | IntakeCompletedEvent
  | IntakeFailedEvent;

/**
 * Attribution calibration streaming (Phase 23 Epic 6 Story 6.1, ADR-0081 + ADR-0072).
 *
 * `RUN_ATTRIBUTION_CALIBRATION` runs the pure-TS logistic regression against
 * real campaign history. It is fast (no LLM) but the operator must see it move,
 * not face a frozen screen during the fetch + fit. Three discriminated sub-kinds
 * mirror the oracle assembler pattern :
 *   calibration_started  — handler accepted the payload (mode + scope)
 *   calibration_progress — a stage advanced (fetch → fit → evaluate)
 *   calibration_done     — snapshot produced (or INSUFFICIENT_DATA)
 *
 * Emitted bestEffort (never throws) — the IntentEmission snapshot is the source
 * of truth, NSP is only the real-time aiguillage for the CalibrationReviewPanel.
 */
export type CalibrationStartedEvent = {
  kind: "calibration_started";
  strategyId: string;
  mode: "AUTO" | "MANUAL_COEFFICIENTS";
  campaignCount: number;
  startedAt: string;
};

export type CalibrationProgressEvent = {
  kind: "calibration_progress";
  strategyId: string;
  /** Stage du pipeline calibration. */
  stage: "FETCHING" | "FITTING" | "EVALUATING";
};

export type CalibrationDoneEvent = {
  kind: "calibration_done";
  strategyId: string;
  state: "OK" | "INSUFFICIENT_DATA";
  /** Présents seulement quand state === "OK". */
  rocAuc?: number;
  rmse?: number;
  sampleSize?: number;
  durationMs: number;
};

export type CalibrationStreamEvent =
  | CalibrationStartedEvent
  | CalibrationProgressEvent
  | CalibrationDoneEvent;

export type NspEvent =
  | NotificationEvent
  | IntentProgressEvent
  | McpInvocationEvent
  | OracleStreamEvent
  | IntakeStreamEvent
  | CalibrationStreamEvent;

export type NspListener = (event: NspEvent) => void;
