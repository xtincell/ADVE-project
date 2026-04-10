/**
 * @deprecated Use @/server/services/neteru-shared/hyperviseur instead.
 * This file exists for backward compatibility.
 */
export {
  // Sequence recommendation API
  analyzeAndRecommend,
  getNextSequences,
  shouldExecuteSequence,
  type HypervisorRecommendation,
  type HypervisorPlan,
  type StrategyPhase,
  // Orchestration API
  buildPlan,
  executePlan,
  executeNextStep,
  resolveHumanStep,
  persistPlan,
  loadPlan,
  resumePlan,
  type OrchestrationPlan,
  type OrchestrationStep,
  type StepAgent,
} from "@/server/services/neteru-shared/hyperviseur";
