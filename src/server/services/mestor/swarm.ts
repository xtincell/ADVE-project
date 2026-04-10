/**
 * ESSAIM MESTOR — Point d'entrée unifié de la hiérarchie d'agents
 *
 * Architecture :
 *   COMMANDANT (LLM — décisions)
 *     ├── HYPERVISEUR (plan d'orchestration — déterministe)
 *     │     └── 8× DIRECTEURS DE PILIER (gates — déterministe)
 *     ├── 4× PROTOCOLES RTIS (R, T, I, S — hybride)
 *     ├── ARTEMIS (orchestre GLORY — déterministe sauf MESTOR_ASSIST)
 *     │     ├── SUPERVISEUR DE SÉQUENCE (compose livrables)
 *     │     └── ORCHESTRATEUR D'OUTILS (exécute steps)
 *     └── SESHAT (knowledge — déterministe)
 *           └── TARSIS (écoute marché — MESTOR_ASSIST)
 *
 * Ce fichier expose l'API de haut niveau de l'essaim.
 */

// ── Commandant (LLM brain) ────────────────────────────────────────────
export {
  generateADVERecommendations,
  assistGloryTool,
  generateStrategicInsights,
  runScenario,
  type CommandantDecision,
  type RecoDecision,
  type ScenarioInput,
} from "./commandant";

// ── Hyperviseur (planner) ─────────────────────────────────────────────
export {
  buildPlan,
  executeNextStep,
  executePlan,
  resolveHumanStep,
  type OrchestrationPlan,
  type OrchestrationStep,
  type StrategyPhase,
  type StepAgent,
} from "./hyperviseur";

// ── Directeurs de Pilier (guards) ─────────────────────────────────────
export {
  assessDirector,
  assessAllDirectors,
  validateWriteback,
  canExecuteSequence,
  type PillarHealthReport,
  type WritebackVerdict,
} from "./pillar-directors";

// ── Protocoles RTIS (via rtis-protocols/) ─────────────────────────────
export {
  executeRTISCascade,
  executeProtocoleRisk,
  executeProtocoleTrack,
  executeProtocoleInnovation,
  executeProtocoleStrategy,
} from "@/server/services/rtis-protocols";

// ── Convenience: Full pipeline ────────────────────────────────────────

/**
 * The main entry point for the Fixer.
 * Build a plan → execute until blocked → return status.
 *
 * Usage in tRPC router:
 *   const plan = await mestor.runPipeline(strategyId);
 *   // plan.steps shows what was done, what's waiting for human, what's next
 */
export async function runPipeline(strategyId: string) {
  const { buildPlan: build, executePlan: execute } = await import("./hyperviseur");
  const plan = await build(strategyId);
  const executedPlan = await execute(plan);

  type Step = { status: string; description: string };
  const steps = executedPlan.steps as Step[];
  const completed = steps.filter(s => s.status === "COMPLETED").length;
  const waiting = steps.filter(s => s.status === "WAITING").length;
  const failed = steps.filter(s => s.status === "FAILED").length;
  const pending = steps.filter(s => s.status === "PENDING").length;

  return {
    plan: executedPlan,
    summary: {
      phase: executedPlan.phase,
      totalSteps: steps.length,
      completed,
      waiting,
      failed,
      pending,
      isBlocked: waiting > 0,
      isComplete: pending === 0 && waiting === 0,
      needsHumanAction: waiting > 0 ? steps.find(s => s.status === "WAITING")?.description ?? null : null,
    },
  };
}
