/**
 * Sequence cost estimator (Phase 24) — deterministic, no LLM.
 *
 * Estimates the credit/$ cost of running a Glory sequence by counting the steps
 * that actually invoke an LLM (a GLORY step whose tool is LLM/HYBRID, or an
 * ARTEMIS framework step — frameworks are LLM). COMPOSE/CALC tools, SESHAT/MESTOR/
 * PILLAR/CALC/ASSET/SEQUENCE steps cost nothing. Unit cost mirrors the
 * `INVOKE_GLORY_TOOL` SLO (`src/server/governance/slos.ts`, $0.10 p95).
 *
 * Shared by the Console Oracle catalog (read-only doc) and the Cockpit sequence
 * launcher (cost shown before the operator confirms an LLM-billed run).
 */

import { getGloryTool } from "./registry";
import type { GlorySequenceDef, SequenceStepType } from "./sequences";

/** Per-LLM-invocation cost in USD — mirrors the INVOKE_GLORY_TOOL SLO. */
export const LLM_STEP_COST_USD = 0.1;

export type SequenceCostClass = "DETERMINISTIC" | "LLM";

export interface SequenceCostEstimate {
  costClass: SequenceCostClass;
  /** Number of steps that invoke an LLM. */
  llmSteps: number;
  /** Total ACTIVE steps (context for the estimate). */
  totalSteps: number;
  /** Estimated cost in USD (llmSteps × unit). 0 for fully deterministic sequences. */
  estimateUsd: number;
}

/** Does a single step actually invoke an LLM? */
export function stepInvokesLlm(type: SequenceStepType, ref: string): boolean {
  if (type === "ARTEMIS") return true; // frameworks are LLM-backed
  if (type === "GLORY") {
    const tool = getGloryTool(ref);
    return !!tool && (tool.executionType === "LLM" || tool.executionType === "HYBRID");
  }
  // SESHAT / MESTOR / PILLAR / CALC / ASSET / SEQUENCE → no direct LLM call here.
  return false;
}

/** Estimate the cost of running a sequence. Pure, deterministic. */
export function estimateSequenceCost(seq: GlorySequenceDef): SequenceCostEstimate {
  let llmSteps = 0;
  let totalSteps = 0;
  for (const step of seq.steps) {
    if (step.status !== "ACTIVE") continue;
    totalSteps++;
    if (stepInvokesLlm(step.type, step.ref)) llmSteps++;
  }
  const estimateUsd = Math.round(llmSteps * LLM_STEP_COST_USD * 100) / 100;
  return { costClass: llmSteps > 0 ? "LLM" : "DETERMINISTIC", llmSteps, totalSteps, estimateUsd };
}
