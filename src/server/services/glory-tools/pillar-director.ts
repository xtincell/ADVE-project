/**
 * Pillar Directors — One per ADVE-RTIS letter (8 directors)
 *
 * Architecture level: SUPERVISEUR (between Hypervisor and Orchestrator)
 *
 *   HYPERVISEUR  → decides which sequences to run
 *   ▶ DIRECTEUR DE PILIER (×8) → owns coherence of its pillar
 *     └── ORCHESTRATEUR → executes steps, resolves bindings
 *          └── OUTIL → receives context + atomic values
 *
 * Each Director:
 *   - Knows ALL atomic variables of its pillar (from Zod schema)
 *   - Knows which sequences READ from its pillar
 *   - Knows which sequences WRITE to its pillar
 *   - Validates writebacks (does the proposed change conflict with existing data?)
 *   - Tracks pillar health (completeness, freshness, confidence)
 *   - Can trigger re-scoring after modification
 *
 * Directors are stateless — they receive pillar data and strategy context,
 * perform their checks, and return verdicts. No DB writes directly.
 */

import { db } from "@/lib/db";
import { PillarResolver } from "./pillar-resolver";
import { ALL_SEQUENCES, type GlorySequenceKey } from "./sequences";
import { ALL_GLORY_TOOLS, type GloryToolDef } from "./registry";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PillarKey = "a" | "d" | "v" | "e" | "r" | "t" | "i" | "s";

export interface PillarHealthReport {
  pillarKey: PillarKey;
  /** Total atomic fields in the schema */
  totalFields: number;
  /** Fields that have non-empty values */
  filledFields: number;
  /** Completion percentage 0-100 */
  completeness: number;
  /** DB confidence score */
  confidence: number;
  /** Missing critical fields (should block downstream) */
  criticalGaps: string[];
  /** Missing optional fields (nice to have) */
  optionalGaps: string[];
  /** Sequences that READ this pillar */
  consumedBy: GlorySequenceKey[];
  /** Sequences that WRITE to this pillar */
  enrichedBy: GlorySequenceKey[];
  /** GLORY tools that bind to this pillar */
  boundTools: string[];
}

export interface WritebackVerdict {
  approved: boolean;
  /** Fields that would be overwritten (already have values) */
  overwrites: string[];
  /** Fields that would be newly populated */
  newFields: string[];
  /** Conflicts detected (proposed value contradicts existing) */
  conflicts: Array<{ field: string; existing: unknown; proposed: unknown; reason: string }>;
}

// ─── Pillar Field Maps (critical fields per pillar from Zod schemas) ─────────

const CRITICAL_FIELDS: Record<PillarKey, string[]> = {
  a: ["archetype", "noyauIdentitaire", "ikigai", "valeurs", "herosJourney", "citationFondatrice"],
  d: ["personas", "promesseMaitre", "positionnement", "tonDeVoix", "paysageConcurrentiel", "directionArtistique"],
  v: ["produitsCatalogue", "productLadder", "unitEconomics", "promesseDeValeur"],
  e: ["touchpoints", "rituels", "aarrr", "kpis"],
  r: ["globalSwot", "probabilityImpactMatrix", "mitigationPriorities"],
  t: ["triangulation", "hypothesisValidation", "tamSamSom"],
  i: ["sprint90Days", "annualCalendar", "globalBudget"],
  s: ["syntheseExecutive", "facteursClesSucces", "recommandationsPrioritaires", "axesStrategiques"],
};

const OPTIONAL_FIELDS: Record<PillarKey, string[]> = {
  a: ["prophecy", "enemy", "doctrine", "livingMythology", "equipeDirigeante", "timelineNarrative", "hierarchieCommunautaire"],
  d: ["assetsLinguistiques", "sacredObjects", "proofPoints", "symboles"],
  v: ["mvp", "proprieteIntellectuelle", "valeurMarqueTangible", "valeurClientTangible"],
  e: ["gamification", "sacredCalendar", "commandments", "ritesDePassage", "sacraments", "principesCommunautaires", "taboos"],
  r: ["microSWOTs", "riskScore"],
  t: ["marketReality", "brandMarketFitScore", "weakSignalAnalysis", "traction"],
  i: ["syntheses", "teamStructure", "brandPlatform", "copyStrategy", "bigIdea", "mediaPlan", "budgetBreakdown"],
  s: ["visionStrategique", "coherencePiliers", "kpiDashboard", "coherenceScore", "sprint90Recap"],
};

const PILLAR_LABELS: Record<PillarKey, string> = {
  a: "Authenticité",
  d: "Distinction",
  v: "Valeur",
  e: "Engagement",
  r: "Risk",
  t: "Track",
  i: "Implementation",
  s: "Stratégie",
};

// ─── Director Class ──────────────────────────────────────────────────────────

export class PillarDirector {
  readonly key: PillarKey;
  readonly label: string;

  constructor(key: PillarKey) {
    this.key = key;
    this.label = PILLAR_LABELS[key];
  }

  /**
   * Assess the health of this pillar — completeness, gaps, dependencies.
   */
  async assessHealth(strategyId: string): Promise<PillarHealthReport> {
    const resolver = await PillarResolver.forStrategy(strategyId);
    const content = resolver.getPillarContent(this.key) ?? {};
    const confidence = resolver.getConfidence(this.key);

    const critical = CRITICAL_FIELDS[this.key];
    const optional = OPTIONAL_FIELDS[this.key];

    const criticalGaps = critical.filter((f) => !hasValue(content[f]));
    const optionalGaps = optional.filter((f) => !hasValue(content[f]));

    const totalFields = critical.length + optional.length;
    const filledFields = totalFields - criticalGaps.length - optionalGaps.length;

    // Find sequences that consume this pillar (have PILLAR steps for this key)
    const consumedBy = ALL_SEQUENCES
      .filter((s) => s.steps.some((st) => st.type === "PILLAR" && st.ref === this.key))
      .map((s) => s.key);

    // Find sequences whose pillar field matches this key
    const enrichedBy = ALL_SEQUENCES
      .filter((s) => s.pillar === this.key)
      .map((s) => s.key);

    // Find tools that bind to this pillar
    const boundTools = ALL_GLORY_TOOLS
      .filter((t) => t.pillarBindings && Object.values(t.pillarBindings).some((path) => path?.startsWith(`${this.key}.`)))
      .map((t) => t.slug);

    return {
      pillarKey: this.key,
      totalFields,
      filledFields,
      completeness: Math.round((filledFields / totalFields) * 100),
      confidence,
      criticalGaps,
      optionalGaps,
      consumedBy,
      enrichedBy,
      boundTools,
    };
  }

  /**
   * Validate a proposed writeback to this pillar.
   * Returns whether the writeback is safe + details on overwrites/conflicts.
   */
  validateWriteback(
    currentContent: Record<string, unknown>,
    proposedChanges: Record<string, unknown>
  ): WritebackVerdict {
    const overwrites: string[] = [];
    const newFields: string[] = [];
    const conflicts: WritebackVerdict["conflicts"] = [];

    for (const [field, proposedValue] of Object.entries(proposedChanges)) {
      const existingValue = currentContent[field];

      if (!hasValue(existingValue)) {
        // New field — always safe
        newFields.push(field);
      } else {
        // Overwrite — check for conflicts
        overwrites.push(field);

        // Detect type mismatch (array vs string, etc.)
        if (typeof existingValue !== typeof proposedValue) {
          conflicts.push({
            field,
            existing: existingValue,
            proposed: proposedValue,
            reason: `Type mismatch: existing is ${typeof existingValue}, proposed is ${typeof proposedValue}`,
          });
        }
      }
    }

    return {
      approved: conflicts.length === 0,
      overwrites,
      newFields,
      conflicts,
    };
  }

  /**
   * Get all atomic variable paths available in this pillar.
   * Useful for documentation and UI.
   */
  getAtomicPaths(): string[] {
    return [
      ...CRITICAL_FIELDS[this.key].map((f) => `${this.key}.${f}`),
      ...OPTIONAL_FIELDS[this.key].map((f) => `${this.key}.${f}`),
    ];
  }

  /**
   * Get critical fields that are empty — these block downstream tools.
   */
  async getCriticalGaps(strategyId: string): Promise<string[]> {
    const health = await this.assessHealth(strategyId);
    return health.criticalGaps;
  }
}

// ─── Director Factory ────────────────────────────────────────────────────────

/** All 8 directors, one per pillar */
export const PILLAR_DIRECTORS: Record<PillarKey, PillarDirector> = {
  a: new PillarDirector("a"),
  d: new PillarDirector("d"),
  v: new PillarDirector("v"),
  e: new PillarDirector("e"),
  r: new PillarDirector("r"),
  t: new PillarDirector("t"),
  i: new PillarDirector("i"),
  s: new PillarDirector("s"),
};

export function getDirector(key: PillarKey): PillarDirector {
  return PILLAR_DIRECTORS[key];
}

/**
 * Full health report across all 8 pillars.
 */
export async function assessAllPillarsHealth(strategyId: string): Promise<PillarHealthReport[]> {
  const reports: PillarHealthReport[] = [];
  for (const key of Object.keys(PILLAR_DIRECTORS) as PillarKey[]) {
    reports.push(await PILLAR_DIRECTORS[key].assessHealth(strategyId));
  }
  return reports;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string" && val.trim() === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  if (typeof val === "object" && Object.keys(val as object).length === 0) return false;
  return true;
}
