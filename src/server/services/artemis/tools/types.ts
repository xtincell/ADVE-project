/**
 * Type definitions shared across registry, sequences, and phase-specific
 * tool/sequence modules.
 *
 * Extracted to break import cycles introduced when Phase 13/14/15 phase
 * modules imported `GloryToolDef`/`GlorySequenceDef` from `./registry` /
 * `./sequences` while those re-exported the phase arrays. Same pattern for
 * `sequences.ts` ↔ `phase13-oracle-sequences.ts`.
 *
 * `registry.ts` and `sequences.ts` re-export every type from here for
 * back-compat with external callers.
 */

// ─── Tools — registry-side types ────────────────────────────────────────────

export type GloryLayer = "CR" | "DC" | "HYBRID" | "BRAND";

/** How the tool executes:
 * - LLM: AI call needed (creative generation or subjective judgment)
 * - COMPOSE: Template + pillar data → formatted output (no AI)
 * - CALC: Math/formulas on numeric values (no AI, no templates)
 */
export type GloryExecutionType = "LLM" | "COMPOSE" | "CALC";

export type GloryToolStatus = "ACTIVE" | "PLANNED";

/**
 * Maps a tool's inputField to a pillar path.
 * Path format: "pillarKey.fieldPath" using dot notation.
 */
export type PillarPath = `${"a" | "d" | "v" | "e" | "r" | "t" | "i" | "s"}.${string}`;

/**
 * Brief-to-forge declaration — Phase 9 / ADR-0009.
 *
 * Quand un Glory tool produit un brief qui doit être matérialisé en asset
 * concret par Ptah (image / vidéo / audio / icône / refine / transform / etc.),
 * il déclare son forgeOutput. Le sequence-executor détecte ce field et chaîne
 * automatiquement vers `mestor.emitIntent({ kind: "PTAH_MATERIALIZE_BRIEF" })`
 * — chaque GenerativeTask hérite du sourceIntentId Glory tool (lineage hash-chain).
 *
 * Sans forgeOutput : tool brief-only (output texte consommé tel quel).
 */
export interface GloryToolForgeOutput {
  forgeKind:
    | "image"
    | "video"
    | "audio"
    | "icon"
    | "refine"
    | "transform"
    | "classify"
    | "stock"
    | "design";
  providerHint?: "magnific" | "adobe" | "figma" | "canva";
  modelHint?: string;
  manipulationProfile?: ("peddler" | "dealer" | "facilitator" | "entertainer")[];
  briefTextPath?: string;
  defaultPillarSource?: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
}

export interface GloryToolDef {
  slug: string;
  name: string;
  layer: GloryLayer;
  order: number;
  executionType: GloryExecutionType;
  pillarKeys: string[];
  requiredDrivers: string[];
  dependencies: string[];
  description: string;
  inputFields: string[];
  pillarBindings: Partial<Record<string, PillarPath>>;
  outputFormat: string;
  promptTemplate: string;
  status: GloryToolStatus;
  forgeOutput?: GloryToolForgeOutput;
}

// ─── Sequences — sequences-side types ───────────────────────────────────────

export type SequenceStepType =
  | "GLORY"
  | "ARTEMIS"
  | "SESHAT"
  | "MESTOR"
  | "PILLAR"
  | "CALC"
  | "SEQUENCE"
  | "ASSET";

export type GlorySequenceFamily =
  | "PILLAR"
  | "PRODUCTION"
  | "STRATEGIC"
  | "OPERATIONAL"
  // Phase 13 (B3, ADR-0014) — Oracle 35-section sprint
  | "ORACLE_BIG4"
  | "ORACLE_DISTINCTIVE"
  | "ORACLE_DORMANT";

export type GlorySequenceKey =
  // Pillar (8)
  | "MANIFESTE-A" | "BRANDBOOK-D" | "OFFRE-V" | "PLAYBOOK-E"
  | "AUDIT-R" | "ETUDE-T" | "BRAINSTORM-I" | "ROADMAP-S"
  // Crystallisation (2) — T0.5
  | "POSITIONING" | "PERSONA-MAP"
  // Identity (4) — T1
  | "BRAND" | "NAMING" | "MESSAGING" | "BRAND-AUDIT"
  // Production (10) — T2
  | "KV" | "SPOT-VIDEO" | "SPOT-RADIO" | "PRINT-AD" | "OOH"
  | "SOCIAL-POST" | "STORY-ARC" | "WEB-COPY" | "PACKAGING"
  | "ADS-META-CARROUSEL"
  // Planification (2) — T2.5
  | "MEDIA-PLAN" | "CONTENT-CALENDAR"
  // Campaign (5) — T3
  | "CAMPAIGN-360" | "CAMPAIGN-SINGLE" | "LAUNCH" | "REBRAND" | "PITCH"
  // Strategy (2) — T4
  | "ANNUAL-PLAN" | "QUARTERLY-REVIEW"
  // Operational (8) — T5
  | "OPS" | "GUARD" | "EVAL" | "INFLUENCE"
  | "COST-SERVICE" | "COST-CAMPAIGN" | "PROFITABILITY" | "RETAINER-REPORT"
  // Creative Frameworks
  | "CHARACTER-LSI"
  | "MASCOTTE"
  // Phase 13 (B3, ADR-0014) — Oracle 35-section production
  // Big4 baseline (7)
  | "MCK-7S" | "BCG-PORTFOLIO" | "BAIN-NPS"
  | "DELOITTE-GREENHOUSE" | "MCK-3H" | "BCG-PALETTE" | "DELOITTE-BUDGET"
  // Distinctifs (5)
  | "CULT-INDEX" | "MANIP-MATRIX" | "DEVOTION-LADDER"
  | "OVERTON-DISTINCTIVE" | "TARSIS-WEAK"
  // Dormantes (2) — handlers stubs Oracle-only (B9, ADR-0017/0018)
  | "IMHOTEP-CREW" | "ANUBIS-COMMS";

export interface SequenceStep {
  type: SequenceStepType;
  /** Slug of the tool/framework/query to invoke */
  ref: string;
  /** Human-readable step name */
  name: string;
  /** Which output keys feed into subsequent steps */
  outputKeys: string[];
  /** ACTIVE = exists and works. PLANNED = to be built. */
  status: "ACTIVE" | "PLANNED";
}

/** Prerequisite for the skill tree combo system */
export type SequencePrerequisite =
  | { type: "SEQUENCE"; key: GlorySequenceKey; status: "ACCEPTED" }
  | { type: "SEQUENCE_ANY"; tier: number; count: number; status: "ACCEPTED" }
  | { type: "PILLAR"; key: string; maturity: "ENRICHED" | "COMPLETE" };

export interface GlorySequenceDef {
  key: GlorySequenceKey;
  family: GlorySequenceFamily;
  name: string;
  description: string;
  /** For pillar sequences: which ADVE-RTIS letter */
  pillar?: string;
  /** Ordered steps — heterogeneous types */
  steps: SequenceStep[];
  /** Whether any step uses AI (LLM). False = pure COMPOSE/CALC/data */
  aiPowered: boolean;
  /** True if the sequence has been refined and validated */
  refined: boolean;
  /** Skill tree tier (0=foundation, 1=identity, 2=production, 3=campaign, 4=strategy, 5=operations) */
  tier: number;
  /** Prerequisites that must be ACCEPTED before this sequence can execute */
  requires: SequencePrerequisite[];
}
