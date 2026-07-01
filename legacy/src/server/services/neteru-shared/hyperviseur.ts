/**
 * NETERU-SHARED — Hyperviseur (planificateur dual-citizen)
 *
 * Fusion of:
 *   - mestor/hyperviseur.ts → Orchestration (plan, execute, persist)
 *   - glory-tools/hypervisor.ts → Sequence recommendation (analyze, prioritize)
 *
 * This file is the SINGLE entry point for all orchestration concerns.
 * No circular imports — code lives here or in mestor/hyperviseur.ts.
 */

// ── Orchestration API (from mestor/hyperviseur.ts) ───────────────────────────
// Plan building, step execution, persistence, human resolution.
// Canonical implementation stays in mestor/hyperviseur.ts — it's the swarm's orchestrator.

export {
  buildPlan,
  executeNextStep,
  executePlan,
  resolveHumanStep,
  persistPlan,
  loadPlan,
  resumePlan,
  type OrchestrationPlan,
  type OrchestrationStep,
  type StepAgent,
} from "@/server/services/mestor/hyperviseur";

// ── Sequence Recommendation API ─────────────────────────────────────────────
// Canonical code lives HERE (not in glory-tools/ to avoid circular shim deps).

import { db } from "@/lib/db";
import { assessAllPillarsHealth, type PillarHealthReport } from "./pillar-directors";
import { ALL_SEQUENCES, type GlorySequenceKey } from "@/server/services/glory-tools/sequences";
import { assessStrategy } from "@/server/services/pillar-maturity/assessor";

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrategyPhase = "QUICK_INTAKE" | "BOOT" | "ACTIVE" | "GROWTH";

export interface HypervisorRecommendation {
  sequenceKey: GlorySequenceKey;
  priority: number;
  reason: string;
  pillarGaps: string[];
  estimatedSteps: number;
  aiSteps: number;
}

export interface HypervisorPlan {
  strategyId: string;
  phase: StrategyPhase;
  compositeScore: number;
  pillarHealth: PillarHealthReport[];
  recommendations: HypervisorRecommendation[];
  completedSequences: GlorySequenceKey[];
  totalAiCalls: number;
}

// ─── Phase Detection ─────────────────────────────────────────────────────────

function detectPhase(composite: number, pillarCount: number, maturityOverallStage?: string): StrategyPhase {
  if (maturityOverallStage) {
    switch (maturityOverallStage) {
      case "EMPTY": return "QUICK_INTAKE";
      case "INTAKE": return pillarCount >= 4 ? "BOOT" : "QUICK_INTAKE";
      case "ENRICHED": return "ACTIVE";
      case "COMPLETE": return "GROWTH";
    }
  }
  if (pillarCount < 4) return "QUICK_INTAKE";
  if (composite < 50) return "BOOT";
  if (composite < 120) return "ACTIVE";
  return "GROWTH";
}

// ─── Priority Weights ────────────────────────────────────────────────────────

const PHASE_WEIGHTS: Record<StrategyPhase, Record<string, number>> = {
  QUICK_INTAKE: { PILLAR: 10, PRODUCTION: 1, STRATEGIC: 2, OPERATIONAL: 1 },
  BOOT:         { PILLAR: 8,  PRODUCTION: 3, STRATEGIC: 5, OPERATIONAL: 2 },
  ACTIVE:       { PILLAR: 3,  PRODUCTION: 8, STRATEGIC: 6, OPERATIONAL: 5 },
  GROWTH:       { PILLAR: 2,  PRODUCTION: 6, STRATEGIC: 8, OPERATIONAL: 7 },
};

const PILLAR_SEQUENCE_ORDER: Record<string, number> = {
  "MANIFESTE-A": 1, "BRANDBOOK-D": 2, "OFFRE-V": 3, "PLAYBOOK-E": 4,
  "AUDIT-R": 5, "ETUDE-T": 6, "BRAINSTORM-I": 7, "ROADMAP-S": 8,
};

// ─── Main Analysis ───────────────────────────────────────────────────────────

export async function analyzeAndRecommend(strategyId: string): Promise<HypervisorPlan> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: { gloryOutputs: { select: { toolSlug: true } } },
  });

  if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

  const vec = (strategy.advertis_vector as Record<string, number>) ?? {};
  const composite = vec.composite ?? 0;

  const pillarHealth = await assessAllPillarsHealth(strategyId);
  const filledPillars = pillarHealth.filter((h) => h.completeness > 20).length;

  let maturityStage: string | undefined;
  try {
    const maturityReport = await assessStrategy(strategyId);
    maturityStage = maturityReport.overallStage;
  } catch { /* fallback to composite-based */ }

  const phase = detectPhase(composite, filledPillars, maturityStage);

  const executedSlugs = new Set(strategy.gloryOutputs.map((g) => g.toolSlug));
  const completedSequences: GlorySequenceKey[] = [];
  for (const seq of ALL_SEQUENCES) {
    const glorySteps = seq.steps.filter((s) => s.type === "GLORY" && s.status === "ACTIVE");
    if (glorySteps.length > 0 && glorySteps.every((s) => executedSlugs.has(s.ref))) {
      completedSequences.push(seq.key);
    }
  }
  const completedSet = new Set(completedSequences);

  const recommendations: HypervisorRecommendation[] = [];

  for (const seq of ALL_SEQUENCES) {
    if (completedSet.has(seq.key)) continue;

    let priority = 0;
    const reasons: string[] = [];
    const gaps: string[] = [];

    const familyWeight = PHASE_WEIGHTS[phase][seq.family] ?? 1;
    priority += familyWeight * 10;

    if (seq.pillar) {
      const health = pillarHealth.find((h) => h.pillarKey === seq.pillar);
      if (health) {
        priority += health.criticalGaps.length * 5;
        gaps.push(...health.criticalGaps);
        if (health.completeness < 30) {
          reasons.push(`Pilier ${seq.pillar!.toUpperCase()} critique (${health.completeness}% complet)`);
        }
      }
    }

    const pillarOrder = PILLAR_SEQUENCE_ORDER[seq.key];
    if (pillarOrder) {
      priority += (9 - pillarOrder) * 10;
      if (pillarOrder > 2 && !completedSet.has("MANIFESTE-A") && !completedSet.has("BRANDBOOK-D")) {
        priority -= 50;
        reasons.push("Prérequis A/D non complétés");
      }
      if (pillarOrder > 4 && !completedSet.has("OFFRE-V") && !completedSet.has("PLAYBOOK-E")) {
        priority -= 30;
        reasons.push("Prérequis V/E non complétés");
      }
    }

    if (composite < 50 && seq.family === "PILLAR") {
      priority += 20;
      reasons.push("Score composite faible — priorité aux fondations");
    }

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

  recommendations.sort((a, b) => b.priority - a.priority);

  return {
    strategyId,
    phase,
    compositeScore: composite,
    pillarHealth,
    recommendations,
    completedSequences,
    totalAiCalls: recommendations.reduce((sum, r) => sum + r.aiSteps, 0),
  };
}

export async function getNextSequences(
  strategyId: string,
  limit = 5,
): Promise<HypervisorRecommendation[]> {
  const plan = await analyzeAndRecommend(strategyId);
  return plan.recommendations.slice(0, limit);
}

export async function shouldExecuteSequence(
  strategyId: string,
  sequenceKey: GlorySequenceKey,
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
