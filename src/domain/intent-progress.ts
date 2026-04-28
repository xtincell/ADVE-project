/**
 * src/domain/intent-progress.ts — IntentPhase + IntentProgressEvent.
 *
 * Layer 0. Pure module.
 *
 * The shape that NSP (Neteru Streaming Protocol — Phase 5) will stream to
 * the client. Defined now in domain so manifests/services/UI can type-import
 * it without circular deps the moment Phase 5 lands.
 */

import { z } from "zod";

export const INTENT_PHASES = [
  "PROPOSED",     // Mestor received intent, awaiting deliberation.
  "DELIBERATED",  // Mestor decided plan.
  "DISPATCHED",   // Artemis received plan.
  "EXECUTING",    // Artemis running tools/frameworks (may stream sub-steps).
  "OBSERVED",     // Seshat indexed/measured the result.
  "COMPLETED",
  "FAILED",
  "VETOED",       // Thot or Mestor refused.
  "DOWNGRADED",   // Budget/capacity tightened the plan.
] as const;

export type IntentPhase = (typeof INTENT_PHASES)[number];

export const IntentPhaseSchema = z.enum(INTENT_PHASES);

export const GOVERNORS = [
  "MESTOR",
  "ARTEMIS",
  "SESHAT",
  "THOT",
  "INFRASTRUCTURE",
] as const;

export type Governor = (typeof GOVERNORS)[number];

export const GovernorSchema = z.enum(GOVERNORS);

export interface IntentProgressEvent {
  intentId: string;
  kind: string;
  phase: IntentPhase;
  governor: Governor;
  step?: { name: string; index: number; total: number };
  partial?: {
    sectionKey?: string;
    tokens?: string;
    sectionsCompleted?: readonly string[];
  };
  estimatedSecondsRemaining?: number;
  costSoFarUsd?: number;
  message?: string;
  emittedAt: Date;
}

export const IntentProgressEventSchema = z.object({
  intentId: z.string(),
  kind: z.string(),
  phase: IntentPhaseSchema,
  governor: GovernorSchema,
  step: z
    .object({
      name: z.string(),
      index: z.number().int().min(0),
      total: z.number().int().min(1),
    })
    .optional(),
  partial: z
    .object({
      sectionKey: z.string().optional(),
      tokens: z.string().optional(),
      sectionsCompleted: z.array(z.string()).readonly().optional(),
    })
    .optional(),
  estimatedSecondsRemaining: z.number().min(0).optional(),
  costSoFarUsd: z.number().min(0).optional(),
  message: z.string().optional(),
  emittedAt: z.date(),
});

/** Terminal phases close the NSP stream. */
export const TERMINAL_PHASES: readonly IntentPhase[] = [
  "COMPLETED",
  "FAILED",
  "VETOED",
];

export const isTerminal = (p: IntentPhase): boolean =>
  TERMINAL_PHASES.includes(p);
