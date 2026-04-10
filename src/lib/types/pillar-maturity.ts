/**
 * Pillar Maturity Contract — Types
 *
 * Central contract that ALL layers reference:
 *   - Zod schemas respect it (fields tagged by stage)
 *   - Glory registry is validated against it (all bindings resolvable at COMPLETE)
 *   - Structural scorer uses it (validates the RIGHT fields, not just a count)
 *   - Sequence executor gates on it (no Glory without sufficient maturity)
 *   - Auto-filler targets it (fills toward the next stage)
 *
 * Three maturity stages:
 *   INTAKE    → minimum viable after Quick Intake (allows RTIS cascade)
 *   ENRICHED  → after RTIS cascade enriches ADVE + generates RTIS (allows recos)
 *   COMPLETE  → all Glory-required atomics filled (allows sequences)
 */

// ─── Maturity Stages ────────────────────────────────────────────────────────

export type MaturityStage = "INTAKE" | "ENRICHED" | "COMPLETE";

export const MATURITY_ORDER: MaturityStage[] = ["INTAKE", "ENRICHED", "COMPLETE"];

// ─── Field Requirements ─────────────────────────────────────────────────────

export type FieldValidator =
  | "non_empty"          // value is not null/undefined/empty string/empty array
  | "min_length"         // string.length >= validatorArg
  | "min_items"          // array.length >= validatorArg
  | "nested_complete"    // all sub-fields of the object are non-empty
  | "is_number"          // typeof value === "number" && !isNaN
  | "is_object";         // typeof value === "object" && value !== null && Object.keys > 0

export type DerivationSource =
  | "calculation"        // pure math from other fields (e.g. ltvCacRatio = ltv / cac)
  | "cross_pillar"       // derived from another pillar's content
  | "rtis_cascade"       // filled by the RTIS cascade process
  | "ai_generation";     // requires a targeted Claude call

export interface FieldRequirement {
  /** Dot-notation path within pillar content: "enemy.name", "tonDeVoix.personnalite" */
  path: string;
  /** How to validate that this field is "filled" */
  validator: FieldValidator;
  /** Argument for min_length / min_items validators */
  validatorArg?: number;
  /** Can this field be auto-filled without human input? */
  derivable: boolean;
  /** How to auto-fill if derivable */
  derivationSource?: DerivationSource;
  /** Human-readable description of what this field should contain */
  description?: string;
}

// ─── Pillar Contract ────────────────────────────────────────────────────────

export interface PillarMaturityContract {
  pillarKey: string;
  /** Requirements by stage — each stage includes all previous stage requirements */
  stages: Record<MaturityStage, FieldRequirement[]>;
}

// ─── Assessment Results ─────────────────────────────────────────────────────

export interface PillarAssessment {
  pillarKey: string;
  /** Highest stage where ALL requirements are satisfied */
  currentStage: MaturityStage | "EMPTY";
  /** Target stage (next after current, or COMPLETE if already there) */
  nextStage: MaturityStage | null;
  /** Paths that pass their validator */
  satisfied: string[];
  /** Paths that fail their validator (for the COMPLETE stage) */
  missing: string[];
  /** Among missing, which can be auto-filled */
  derivable: string[];
  /** Among missing, which require human input */
  needsHuman: string[];
  /** Percentage of COMPLETE requirements satisfied */
  completionPct: number;
  /** True when currentStage === "COMPLETE" */
  readyForGlory: boolean;
}

export interface StrategyMaturityReport {
  strategyId: string;
  /** The minimum maturity across all 8 pillars */
  overallStage: MaturityStage | "EMPTY";
  /** Per-pillar assessment */
  pillars: Record<string, PillarAssessment>;
  /** True when ALL pillars are COMPLETE */
  gloryReady: boolean;
  /** How many pillars could advance via auto-fill */
  autoCompletable: number;
  /** Total missing fields across all pillars */
  totalMissing: number;
  /** Total derivable fields across all pillars */
  totalDerivable: number;
}

// ─── Binding Validation ─────────────────────────────────────────────────────

export interface BindingValidationEntry {
  toolSlug: string;
  inputField: string;
  bindingPath: string | null;
  /** True if the binding path resolves to a field in the pillar schema */
  schemaValid: boolean;
  /** True if the binding path is covered by the COMPLETE stage contract */
  contractCovered: boolean;
  /** Classification of the input field */
  classification: "pillar_bound" | "sequence_context" | "unbound";
}

export interface BindingValidationReport {
  totalTools: number;
  totalInputFields: number;
  pillarBound: number;
  sequenceContext: number;
  unbound: number;
  coveragePct: number;
  /** Paths that are bound but point to non-existent schema fields */
  orphanBindings: Array<{ toolSlug: string; field: string; path: string }>;
  /** Input fields with no binding that SHOULD have one */
  missingBindings: Array<{ toolSlug: string; field: string; suggestedPath: string | null }>;
  entries: BindingValidationEntry[];
}

// ─── Auto-Fill Results ──────────────────────────────────────────────────────

export interface AutoFillResult {
  pillarKey: string;
  targetStage: MaturityStage;
  /** Fields that were successfully filled */
  filled: string[];
  /** Fields that failed to fill (with reason) */
  failed: Array<{ path: string; reason: string }>;
  /** Fields that need human input */
  needsHuman: string[];
  /** The maturity stage after filling */
  newStage: MaturityStage | "EMPTY";
  /** Duration of the fill operation */
  durationMs: number;
}
