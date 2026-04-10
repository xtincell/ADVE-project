/**
 * NETERU-SHARED — Modules partagés entre Mestor et Artemis
 *
 * Les Directeurs de Pilier et l'Hyperviseur sont dual-citizen :
 *   - Mestor les utilise pour évaluer et planifier
 *   - Artemis les utilise pour valider et séquencer
 */

// Pillar Directors (8 gardiens)
export {
  PillarDirector,
  PILLAR_DIRECTORS,
  getDirector,
  assessAllPillarsHealth,
  assessAllDirectors,
  assessDirector,
  canExecuteSequence,
  type PillarKey,
  type PillarHealthReport,
  type WritebackVerdict,
} from "./pillar-directors";

// Hyperviseur (planificateur + recommandations)
export {
  // Orchestration (Mestor side)
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
  type StrategyPhase,
  // Recommendations (Artemis side)
  analyzeAndRecommend,
  getNextSequences,
  shouldExecuteSequence,
  type HypervisorRecommendation,
  type HypervisorPlan,
} from "./hyperviseur";
