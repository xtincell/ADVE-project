/**
 * artemis/tools/sequence-types.ts — Glory sequence type vocabulary.
 *
 * Leaf module extracted from `sequences.ts` to break the import cycles
 * `sequences ⇄ {adops-sequences, framework-wrappers, phase13-oracle-sequences}`
 * (madge --circular). The sub-sequence files import only these (type-only,
 * erased at runtime) from here — a dependency-free leaf — instead of from
 * `sequences.ts` (which imports their sequence arrays back). `sequences.ts`
 * re-exports everything here for backward compatibility.
 */

export type SequenceStepType = "GLORY" | "ARTEMIS" | "SESHAT" | "MESTOR" | "PILLAR" | "CALC" | "SEQUENCE" | "ASSET";

export type GlorySequenceFamily =
  | "PILLAR"
  | "PRODUCTION"
  | "STRATEGIC"
  | "OPERATIONAL"
  // Phase 13 (B3, ADR-0014) — Oracle 35-section sprint
  | "ORACLE_BIG4"
  | "ORACLE_DISTINCTIVE"
  // Phase 14/15 actifs (ADR-0019 + ADR-0020 ; ex-`ORACLE_DORMANT` retiré par ADR-0045)
  | "ORACLE_NETERU_GROUND"
  // Phase 17 (ADR-0039) — Single-step wrappers autour de frameworks legacy
  // (auto-générés via wrapFrameworkAsSequence). Sequence devient l'unité
  // publique unique d'Artemis ; les 24 frameworks Artemis y sont accessibles
  // par `WRAP-FW-<slug>`.
  | "WRAP"
  // Phase 17 (ADR-0040) — Sections Oracle « dérivées » qui n'avaient aucun
  // traitement gouverné (F4 audit NEFER). 7 sequences DERIVED-* qui
  // chainent PILLAR pulls → CALC draft via mapXxx → GLORY synthesize-section.
  | "ORACLE_DERIVED";

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
  // Neteru Ground actifs (2) — sequences stubs writeback-only ; output réel
  // hors-sequence via Cockpit (Phase 14/15 actives, ADR-0019 + ADR-0020 + ADR-0045)
  | "IMHOTEP-CREW" | "ANUBIS-COMMS"
  // Phase 16 — AD/OPS Art Direction Operations (ADR-0036)
  | "ADOPS-AD-DIRECTION"
  // Phase 17 (ADR-0039) — Wrappers single-step autour des frameworks
  // legacy. Auto-générés par `wrapFrameworkAsSequence(frameworkSlug)`.
  // Format : `WRAP-FW-${frameworkSlug}` (ex: `WRAP-FW-fw-04-value-architecture`).
  | `WRAP-FW-${string}`
  // Phase 17 (ADR-0040) — 7 sections Oracle dérivées sous gouvernance
  // Artemis : PILLAR pulls → CALC draft via mapXxx → GLORY synthesize-section.
  | "DERIVED-EXEC-SUMMARY"
  | "DERIVED-PLATEFORME"
  | "DERIVED-PLAN-ACT"
  | "DERIVED-PROD-LIV"
  | "DERIVED-BUDGET"
  | "DERIVED-TIMELINE"
  | "DERIVED-CONDITIONS"
  // Phase 20 (ADR-0037 PR-I extension + NEFER §3.1) — décomposition
  // recherche marché LLM-driven cross-marques. 3 steps GLORY DELEGATE
  // (fetcher → extractor → persister). Lifecycle DRAFT — promotion
  // STABLE après 1 mois stress-test (pattern Phase 17).
  | "MARKET-RESEARCH";

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
  | { type: "PILLAR"; key: string; maturity: "ENRICHED" | "COMPLETE" }
  ;

/**
 * Phase 17 (ADR-0042) — Mode d'exécution d'une sequence. First-class
 * (remplace progressivement le flag ad-hoc `_oracleEnrichmentMode` enfoui
 * dans `SequenceContext`).
 *
 * - ENRICHMENT  : enrich Oracle, court-circuite chainGloryToPtah
 * - PRODUCTION  : production normale, chain Ptah actif
 * - FORGE       : forge à la demande (Ptah Phase 9)
 * - AUDIT       : exécution audit-only, no side-effects sur BrandVault
 * - PREVIEW     : exécution preview/intake, no chain
 *
 * Stocké dans `SequenceExecution.mode` (Prisma) en Chantier C-bis pour
 * permettre l'audit cross-mode requêtable.
 */
export type SequenceMode = "ENRICHMENT" | "PRODUCTION" | "FORGE" | "AUDIT" | "PREVIEW";

/**
 * Phase 17 (ADR-0042) — Lifecycle versioning d'une sequence.
 *
 * - DRAFT      : itération libre, prompt template peut bouger
 * - STABLE     : promu via Intent PROMOTE_SEQUENCE_LIFECYCLE, prompt hash
 *                frozen, anti-drift CI bloquante sur modifications
 * - DEPRECATED : à retirer, callers en migration
 *
 * Phase 17 cleanup v6.18.14 (2026-05-05) — alias `refined: boolean`
 * supprimé de l'interface. Les readers (glory.ts, mcp/creative/index.ts)
 * computent désormais `refined: lifecycle === "STABLE"` à la volée pour
 * préserver le contrat client.
 */
export type SequenceLifecycle = "DRAFT" | "STABLE" | "DEPRECATED";

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
  /** Skill tree tier (0=foundation, 1=identity, 2=production, 3=campaign, 4=strategy, 5=operations) */
  tier: number;
  /** Prerequisites that must be ACCEPTED before this sequence can execute */
  requires: SequencePrerequisite[];
  /**
   * Phase 17 (ADR-0042) — Lifecycle de la sequence. Default `"DRAFT"` si
   * absent (rétrocompat avec sequences non encore migrées).
   * Promotion DRAFT → STABLE → DEPRECATED via Intent
   * `PROMOTE_SEQUENCE_LIFECYCLE` gouverné par Mestor.
   */
  lifecycle?: SequenceLifecycle;
  /**
   * Phase 17 (ADR-0042) — Mode d'exécution par défaut. Default
   * `"PRODUCTION"` pour les sequences existantes (non breaking).
   * Le caller peut override via `executeSequence(..., { mode })`.
   */
  mode?: SequenceMode;
  /**
   * Phase 17 (ADR-0042) — Hash SHA-256 (16 chars) du concat des
   * `promptTemplate` des steps GLORY. Frozen pour les sequences STABLE
   * (anti-drift CI). DRAFT autorisées à dériver librement.
   * Calculé via `computeSequencePromptHash(seq)` (sequence-hash.ts).
   */
  promptHash?: string;
}
