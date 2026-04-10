/**
 * NETERU-SHARED — Directeurs de Pilier (8 gardiens dual-citizen)
 *
 * Fusion des deux systèmes précédents :
 *   - glory-tools/pillar-director.ts (class-based, riche : séquences/tools awareness)
 *   - mestor/pillar-directors.ts (function-based : cascade deps, stale detection, canExecute)
 *
 * Dual-citizen : utilisés par Mestor (évaluation) ET Artemis (validation pré-exécution).
 *
 * LLM : NON — logique purement déterministe basée sur les contrats de maturité.
 */

import { db } from "@/lib/db";
import { PillarResolver } from "@/server/services/glory-tools/pillar-resolver";
import { ALL_SEQUENCES, type GlorySequenceKey } from "@/server/services/glory-tools/sequences";
import { ALL_GLORY_TOOLS } from "@/server/services/glory-tools/registry";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { PILLAR_KEYS, getPillarDependencies, getPillarDependents } from "@/lib/types/advertis-vector";
import type { MaturityStage } from "@/lib/types/pillar-maturity";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PillarKey = "a" | "d" | "v" | "e" | "r" | "t" | "i" | "s";

export interface PillarHealthReport {
  pillarKey: PillarKey;
  maturityStage: MaturityStage | "EMPTY";
  totalFields: number;
  filledFields: number;
  completeness: number;           // 0-100
  confidence: number;
  isStale: boolean;
  criticalGaps: string[];
  derivableGaps: string[];
  needsHumanGaps: string[];
  /** Sequences that READ this pillar */
  consumedBy: GlorySequenceKey[];
  /** Sequences that WRITE to this pillar */
  enrichedBy: GlorySequenceKey[];
  /** GLORY tools that bind to this pillar */
  boundTools: string[];
  /** Piliers en amont (cascade ADVERTIS) */
  dependencies: string[];
  /** Piliers en aval */
  dependents: string[];
  readyForGlory: boolean;
}

export interface WritebackVerdict {
  /** Canonical field (class version used "approved") */
  approved: boolean;
  /** Alias for backward compat with mestor consumers */
  get allowed(): boolean;
  overwrites: string[];
  newFields: string[];
  conflicts: Array<{ field: string; existing: unknown; proposed: unknown; reason: string }>;
  reason?: string;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const PILLAR_LABELS: Record<PillarKey, string> = {
  a: "Authenticité", d: "Distinction", v: "Valeur", e: "Engagement",
  r: "Risk", t: "Track", i: "Implementation", s: "Stratégie",
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
   * Assess the health of this pillar — unified report with all fields.
   */
  async assessHealth(strategyId: string): Promise<PillarHealthReport> {
    const resolver = await PillarResolver.forStrategy(strategyId);
    const content = resolver.getPillarContent(this.key) ?? {};
    const confidence = resolver.getConfidence(this.key);
    const contract = getContract(this.key);
    const assessment = assessPillar(this.key, content as Record<string, unknown>, contract ?? undefined);

    // Stale detection
    const pillar = await db.pillar.findUnique({
      where: { strategyId_key: { strategyId, key: this.key } },
      select: { staleAt: true },
    });

    // Sequence/tool awareness
    const consumedBy = ALL_SEQUENCES
      .filter((s) => s.steps.some((st) => st.type === "PILLAR" && st.ref === this.key))
      .map((s) => s.key);

    const enrichedBy = ALL_SEQUENCES
      .filter((s) => s.pillar === this.key)
      .map((s) => s.key);

    const boundTools = ALL_GLORY_TOOLS
      .filter((t) => t.pillarBindings && Object.values(t.pillarBindings).some((path) => path?.startsWith(`${this.key}.`)))
      .map((t) => t.slug);

    return {
      pillarKey: this.key,
      maturityStage: assessment.currentStage,
      totalFields: assessment.satisfied.length + assessment.missing.length,
      filledFields: assessment.satisfied.length,
      completeness: assessment.completionPct,
      confidence,
      isStale: pillar?.staleAt !== null && pillar?.staleAt !== undefined,
      criticalGaps: assessment.missing.filter((p: string) => !assessment.derivable.includes(p)),
      derivableGaps: assessment.derivable,
      needsHumanGaps: assessment.needsHuman ?? [],
      consumedBy,
      enrichedBy,
      boundTools,
      dependencies: getPillarDependencies(this.key),
      dependents: getPillarDependents(this.key),
      readyForGlory: assessment.readyForGlory,
    };
  }

  /**
   * Validate a proposed writeback — unified verdict.
   */
  validateWriteback(
    currentContent: Record<string, unknown>,
    proposedChanges: Record<string, unknown>,
    authorSystem: string = "OPERATOR",
  ): WritebackVerdict {
    const overwrites: string[] = [];
    const newFields: string[] = [];
    const conflicts: WritebackVerdict["conflicts"] = [];

    for (const [field, proposedValue] of Object.entries(proposedChanges)) {
      if (proposedValue === undefined || proposedValue === null) continue;

      const existingValue = currentContent[field];

      if (!hasValue(existingValue)) {
        newFields.push(field);
      } else {
        overwrites.push(field);

        const existingType = Array.isArray(existingValue) ? "array" : typeof existingValue;
        const proposedType = Array.isArray(proposedValue) ? "array" : typeof proposedValue;

        if (existingType !== proposedType) {
          conflicts.push({
            field,
            existing: existingValue,
            proposed: proposedValue,
            reason: `Type mismatch: existing=${existingType}, proposed=${proposedType}`,
          });
        }
      }
    }

    const hasConflicts = conflicts.length > 0;
    const isAISystem = authorSystem !== "OPERATOR";
    const overwritesHumanData = isAISystem && overwrites.length > 0;

    return {
      approved: !hasConflicts,
      get allowed() { return this.approved; },
      overwrites,
      newFields,
      conflicts,
      reason: hasConflicts
        ? `${conflicts.length} conflit(s) de type détecté(s)`
        : overwritesHumanData
          ? `${overwrites.length} champ(s) existant(s) seront marqués AI_PROPOSED`
          : undefined,
    };
  }

  getAtomicPaths(): string[] {
    const contract = getContract(this.key);
    if (!contract) return [];
    return contract.stages.COMPLETE.map((r: { path: string }) => `${this.key}.${r.path}`);
  }

  async getCriticalGaps(strategyId: string): Promise<string[]> {
    const health = await this.assessHealth(strategyId);
    return health.criticalGaps;
  }
}

// ─── Director Factory ────────────────────────────────────────────────────────

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

// ─── Batch Assessment (class-based, via PillarResolver) ─────────────────────

export async function assessAllPillarsHealth(strategyId: string): Promise<PillarHealthReport[]> {
  const reports: PillarHealthReport[] = [];
  for (const key of Object.keys(PILLAR_DIRECTORS) as PillarKey[]) {
    reports.push(await PILLAR_DIRECTORS[key].assessHealth(strategyId));
  }
  return reports;
}

// ─── Legacy function-based API (compat with mestor/hyperviseur.ts) ──────────

/**
 * Assess a single pillar from raw data (no PillarResolver needed).
 * Used by mestor/hyperviseur.ts which does its own DB query.
 */
export function assessDirector(
  pillarKey: string,
  content: Record<string, unknown> | null,
  confidence: number,
  staleAt: Date | null,
): PillarHealthReport {
  const contract = getContract(pillarKey);
  const assessment = assessPillar(pillarKey, content, contract ?? undefined);
  const key = pillarKey as PillarKey;

  const consumedBy = ALL_SEQUENCES
    .filter((s) => s.steps.some((st) => st.type === "PILLAR" && st.ref === key))
    .map((s) => s.key);

  const enrichedBy = ALL_SEQUENCES
    .filter((s) => s.pillar === key)
    .map((s) => s.key);

  const boundTools = ALL_GLORY_TOOLS
    .filter((t) => t.pillarBindings && Object.values(t.pillarBindings).some((path) => path?.startsWith(`${key}.`)))
    .map((t) => t.slug);

  return {
    pillarKey: key,
    maturityStage: assessment.currentStage,
    totalFields: assessment.satisfied.length + assessment.missing.length,
    filledFields: assessment.satisfied.length,
    completeness: assessment.completionPct,
    confidence,
    isStale: staleAt !== null,
    criticalGaps: assessment.missing.filter((p: string) => !assessment.derivable.includes(p)),
    derivableGaps: assessment.derivable,
    needsHumanGaps: assessment.needsHuman ?? [],
    consumedBy,
    enrichedBy,
    boundTools,
    dependencies: getPillarDependencies(key),
    dependents: getPillarDependents(key),
    readyForGlory: assessment.readyForGlory,
  };
}

/**
 * Assess all 8 directors via direct DB query (no PillarResolver).
 * Used by mestor/hyperviseur.ts.
 */
export async function assessAllDirectors(strategyId: string): Promise<PillarHealthReport[]> {
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true, confidence: true, staleAt: true },
  });

  const pillarMap = new Map(pillars.map(p => [p.key, p]));
  const reports: PillarHealthReport[] = [];

  for (const key of PILLAR_KEYS) {
    const pillar = pillarMap.get(key);
    reports.push(assessDirector(
      key,
      (pillar?.content ?? null) as Record<string, unknown> | null,
      pillar?.confidence ?? 0,
      pillar?.staleAt ?? null,
    ));
  }

  return reports;
}

/**
 * Check if a specific sequence can execute based on pillar director gates.
 */
export function canExecuteSequence(
  sequenceRequiredPillars: PillarKey[],
  pillarHealth: PillarHealthReport[],
  requireComplete: boolean = false,
): { allowed: boolean; blockedBy: string[] } {
  const blocked: string[] = [];

  for (const key of sequenceRequiredPillars) {
    const health = pillarHealth.find(h => h.pillarKey === key);
    if (!health) {
      blocked.push(`${key}: pilier introuvable`);
      continue;
    }
    if (requireComplete && !health.readyForGlory) {
      blocked.push(`${key}: maturity ${health.maturityStage}, COMPLETE requis`);
    } else if (health.completeness < 20) {
      blocked.push(`${key}: complétude ${health.completeness}% trop basse (min 20%)`);
    }
    if (health.isStale) {
      blocked.push(`${key}: marqué stale — actualiser d'abord`);
    }
  }

  return { allowed: blocked.length === 0, blockedBy: blocked };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string" && val.trim() === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  if (typeof val === "object" && Object.keys(val as object).length === 0) return false;
  return true;
}
