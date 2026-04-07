/**
 * GLORY Hypervisor — Top-level decision maker
 *
 * Architecture level: HYPERVISEUR (above Pillar Directors)
 *
 *   ▶ HYPERVISEUR (this file) → analyzes strategy state, decides what to run
 *     └── 8× DIRECTEUR DE PILIER → validates pillar health
 *          └── SUPERVISEUR → maintains sequence coherence
 *               └── ORCHESTRATEUR → executes steps
 *                    └── OUTIL → atomic operation
 *
 * The Hypervisor:
 *   - Reads the current ADVE-RTIS vector + pillar health
 *   - Identifies which sequences should run next
 *   - Prioritizes based on pillar gaps, strategy phase, and business needs
 *   - Coordinates with PillarDirectors for pre/post validation
 *   - Can be triggered automatically (First Value Protocol) or manually
 */

import { db } from "@/lib/db";
import { assessAllPillarsHealth, type PillarHealthReport } from "./pillar-director";
import { ALL_SEQUENCES, type GlorySequenceKey, type GlorySequenceDef } from "./sequences";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrategyPhase = "QUICK_INTAKE" | "BOOT" | "ACTIVE" | "GROWTH";

export interface HypervisorRecommendation {
  sequenceKey: GlorySequenceKey;
  priority: number; // 1 = highest
  reason: string;
  pillarGaps: string[];
  estimatedSteps: number;
  aiSteps: number; // How many steps need LLM
}

export interface HypervisorPlan {
  strategyId: string;
  phase: StrategyPhase;
  compositeScore: number;
  pillarHealth: PillarHealthReport[];
  recommendations: HypervisorRecommendation[];
  /** Sequences already completed (all steps have GloryOutputs) */
  completedSequences: GlorySequenceKey[];
  /** Total estimated AI calls if all recommendations are executed */
  totalAiCalls: number;
}

// ─── Phase Detection ─────────────────────────────────────────────────────────

function detectPhase(composite: number, pillarCount: number): StrategyPhase {
  if (pillarCount < 4) return "QUICK_INTAKE";
  if (composite < 50) return "BOOT";
  if (composite < 120) return "ACTIVE";
  return "GROWTH";
}

// ─── Sequence Priority Rules ─────────────────────────────────────────────────

/**
 * Phase-based priority weights for sequence families.
 * Higher weight = more important in that phase.
 */
const PHASE_WEIGHTS: Record<StrategyPhase, Record<string, number>> = {
  QUICK_INTAKE: { PILLAR: 10, PRODUCTION: 1, STRATEGIC: 2, OPERATIONAL: 1 },
  BOOT:         { PILLAR: 8,  PRODUCTION: 3, STRATEGIC: 5, OPERATIONAL: 2 },
  ACTIVE:       { PILLAR: 3,  PRODUCTION: 8, STRATEGIC: 6, OPERATIONAL: 5 },
  GROWTH:       { PILLAR: 2,  PRODUCTION: 6, STRATEGIC: 8, OPERATIONAL: 7 },
};

/**
 * Pillar sequence execution order — foundational pillars first.
 * A/D must be done before V/E, which must be done before R/T/I/S.
 */
const PILLAR_SEQUENCE_ORDER: Record<string, number> = {
  "MANIFESTE-A": 1,
  "BRANDBOOK-D": 2,
  "OFFRE-V": 3,
  "PLAYBOOK-E": 4,
  "AUDIT-R": 5,
  "ETUDE-T": 6,
  "BRAINSTORM-I": 7,
  "ROADMAP-S": 8,
};

// ─── Main Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze strategy state and recommend which sequences to run next.
 * This is the brain of the system — called by the pipeline orchestrator
 * or manually by the operator.
 */
export async function analyzeAndRecommend(strategyId: string): Promise<HypervisorPlan> {
  // Load strategy + vector
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { gloryOutputs: { select: { toolSlug: true } } },
  });

  if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

  const vec = (strategy.advertis_vector as Record<string, number>) ?? {};
  const composite = vec.composite ?? 0;

  // Assess all pillar health
  const pillarHealth = await assessAllPillarsHealth(strategyId);
  const filledPillars = pillarHealth.filter((h) => h.completeness > 20).length;
  const phase = detectPhase(composite, filledPillars);

  // Find completed sequences (all GLORY steps have outputs)
  const executedSlugs = new Set(strategy.gloryOutputs.map((g) => g.toolSlug));
  const completedSequences: GlorySequenceKey[] = [];
  for (const seq of ALL_SEQUENCES) {
    const glorySteps = seq.steps.filter((s) => s.type === "GLORY" && s.status === "ACTIVE");
    if (glorySteps.length > 0 && glorySteps.every((s) => executedSlugs.has(s.ref))) {
      completedSequences.push(seq.key);
    }
  }
  const completedSet = new Set(completedSequences);

  // Score and rank sequences
  const recommendations: HypervisorRecommendation[] = [];

  for (const seq of ALL_SEQUENCES) {
    // Skip completed sequences
    if (completedSet.has(seq.key)) continue;

    let priority = 0;
    const reasons: string[] = [];
    const gaps: string[] = [];

    // Family weight
    const familyWeight = PHASE_WEIGHTS[phase][seq.family] ?? 1;
    priority += familyWeight * 10;

    // Pillar gap bonus — sequences that fill critical gaps get boosted
    if (seq.pillar) {
      const health = pillarHealth.find((h) => h.pillarKey === seq.pillar);
      if (health) {
        // More gaps = higher priority
        const gapBonus = health.criticalGaps.length * 5;
        priority += gapBonus;
        gaps.push(...health.criticalGaps);

        if (health.completeness < 30) {
          reasons.push(`Pilier ${seq.pillar!.toUpperCase()} critique (${health.completeness}% complet)`);
        }
      }
    }

    // Pillar order bonus for PILLAR family — A/D before V/E before R/T/I/S
    const pillarOrder = PILLAR_SEQUENCE_ORDER[seq.key];
    if (pillarOrder) {
      // Earlier pillars get higher priority (inverted: 1→80, 8→10)
      priority += (9 - pillarOrder) * 10;

      // Check prerequisites: don't recommend V/E if A/D not done
      if (pillarOrder > 2 && !completedSet.has("MANIFESTE-A") && !completedSet.has("BRANDBOOK-D")) {
        priority -= 50; // Deprioritize — prerequisites not met
        reasons.push("Prérequis A/D non complétés");
      }
      if (pillarOrder > 4 && !completedSet.has("OFFRE-V") && !completedSet.has("PLAYBOOK-E")) {
        priority -= 30;
        reasons.push("Prérequis V/E non complétés");
      }
    }

    // Low composite score = focus on pillar sequences
    if (composite < 50 && seq.family === "PILLAR") {
      priority += 20;
      reasons.push("Score composite faible — priorité aux fondations");
    }

    // Count steps
    const activeSteps = seq.steps.filter((s) => s.status === "ACTIVE");
    const aiSteps = seq.steps.filter((s) => s.type === "GLORY" || s.type === "ARTEMIS" || s.type === "MESTOR").length;

    if (reasons.length === 0) {
      reasons.push(`Séquence ${seq.family} — ${seq.name}`);
    }

    recommendations.push({
      sequenceKey: seq.key,
      priority,
      reason: reasons.join(" | "),
      pillarGaps: gaps,
      estimatedSteps: activeSteps.length,
      aiSteps,
    });
  }

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  const totalAiCalls = recommendations.reduce((sum, r) => sum + r.aiSteps, 0);

  return {
    strategyId,
    phase,
    compositeScore: composite,
    pillarHealth,
    recommendations,
    completedSequences,
    totalAiCalls,
  };
}

/**
 * Get the top N recommended sequences to run next.
 * Used by First Value Protocol and cockpit quick actions.
 */
export async function getNextSequences(
  strategyId: string,
  limit = 5
): Promise<HypervisorRecommendation[]> {
  const plan = await analyzeAndRecommend(strategyId);
  return plan.recommendations.slice(0, limit);
}

/**
 * Check if a specific sequence should be executed given current state.
 * Returns { should: boolean, reason: string }.
 */
export async function shouldExecuteSequence(
  strategyId: string,
  sequenceKey: GlorySequenceKey
): Promise<{ should: boolean; reason: string }> {
  const plan = await analyzeAndRecommend(strategyId);

  if (plan.completedSequences.includes(sequenceKey)) {
    return { should: false, reason: "Séquence déjà complétée" };
  }

  const rec = plan.recommendations.find((r) => r.sequenceKey === sequenceKey);
  if (!rec) {
    return { should: false, reason: "Séquence non trouvée dans les recommandations" };
  }

  if (rec.priority < 0) {
    return { should: false, reason: rec.reason };
  }

  return { should: true, reason: rec.reason };
}
