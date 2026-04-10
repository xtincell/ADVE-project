// ============================================================================
// MODULE M03 — Glory Tools
// @deprecated — GLORY tools have moved to @/server/services/artemis/tools
// This file is a backward-compatibility shim. Import from artemis instead.
// ============================================================================

// ─── Artemis Tools (moved in Phase 3) ───────────────────────────────────────

// Registry
export {
  ALL_GLORY_TOOLS,
  getGloryTool,
  getToolsByLayer,
  getToolsByPillar,
  getToolsByDriver,
  getToolsByExecutionType,
  getBrandPipeline,
} from "@/server/services/artemis/tools/registry";
export type {
  GloryLayer,
  GloryExecutionType,
  GloryToolStatus,
  GloryToolDef,
} from "@/server/services/artemis/tools/registry";

// Sequences
export {
  ALL_SEQUENCES,
  getSequence,
  getSequencesByFamily,
  getSequencesByPillar,
  getSequencesForTool,
  getAllPlannedSteps,
  getUniquePlannedSlugs,
  getSequenceGloryTools,
} from "@/server/services/artemis/tools/sequences";
export type {
  SequenceStepType,
  GlorySequenceFamily,
  GlorySequenceKey,
  SequenceStep,
  GlorySequenceDef,
} from "@/server/services/artemis/tools/sequences";

// Sequence Executor
export {
  executeSequence,
  executeSequenceBatch,
  executeAllPillarSequences,
  scanSequence,
  scanAllSequences,
} from "@/server/services/artemis/tools/sequence-executor";
export type {
  SequenceContext,
  StepResult,
  SequenceResult,
  SequenceProgressCallback,
  PreflightReport,
} from "@/server/services/artemis/tools/sequence-executor";

// Pillar Resolver
export { PillarResolver } from "@/server/services/artemis/tools/pillar-resolver";
export type { PillarData, ResolvedBindings } from "@/server/services/artemis/tools/pillar-resolver";

// Deliverable Compiler
export {
  compileDeliverable,
  listCompilableDeliverables,
  exportDeliverable,
} from "@/server/services/artemis/tools/deliverable-compiler";
export type {
  DeliverableFormat,
  DeliverableManifest,
  DeliverableSection,
} from "@/server/services/artemis/tools/deliverable-compiler";

// Engine (executeTool, executeBrandPipeline, etc.)
export {
  executeTool,
  executeBrandPipeline,
  getToolHistory,
  suggestTools,
} from "@/server/services/artemis/tools/engine";

// ─── Files that remain in glory-tools (not moved) ───────────────────────────

// Pillar Director (already a shim → neteru-shared)
export {
  PillarDirector,
  PILLAR_DIRECTORS,
  getDirector,
  assessAllPillarsHealth,
} from "./pillar-director";
export type {
  PillarKey,
  PillarHealthReport,
  WritebackVerdict,
} from "./pillar-director";

// Hypervisor (already a shim → neteru-shared/hyperviseur)
export {
  // Sequence recommendations
  analyzeAndRecommend,
  getNextSequences,
  shouldExecuteSequence,
  // Orchestration
  buildPlan,
  executePlan,
  executeNextStep,
  resolveHumanStep,
  persistPlan,
  loadPlan,
  resumePlan,
} from "./hypervisor";
export type {
  HypervisorRecommendation,
  HypervisorPlan,
  OrchestrationPlan,
  OrchestrationStep,
  StrategyPhase,
  StepAgent,
} from "./hypervisor";

// Sequence Queue
export { buildQueue, getReadySequences, getCompletedSequences } from "./sequence-queue";
export type { QueueItemStatus, QueueItem } from "./sequence-queue";

// Auto-Complete
export { autoCompleteGaps } from "./auto-complete";
export type { AutoCompleteResult } from "./auto-complete";
