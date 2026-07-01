/**
 * src/domain/lifecycle.ts — Strategy lifecycle state machine.
 *
 * Layer 0. Pure module.
 *
 * INTAKE → BOOT → OPERATING → GROWTH
 *   - INTAKE: public quick-intake, ADVE only, paywall not crossed.
 *   - BOOT: post-paywall onboarding, full 8-pillar fill.
 *   - OPERATING: running brand, R+T cycles, deliverables.
 *   - GROWTH: mature brand, optimisation phase.
 */

import { z } from "zod";

export const STRATEGY_LIFECYCLE_PHASES = [
  "INTAKE",
  "BOOT",
  "OPERATING",
  "GROWTH",
] as const;

export type StrategyLifecyclePhase = (typeof STRATEGY_LIFECYCLE_PHASES)[number];

export const StrategyLifecyclePhaseSchema = z.enum(STRATEGY_LIFECYCLE_PHASES);

const TRANSITIONS: Readonly<Record<StrategyLifecyclePhase, readonly StrategyLifecyclePhase[]>> = {
  INTAKE: ["BOOT"],
  BOOT: ["OPERATING"],
  OPERATING: ["GROWTH"],
  GROWTH: [],
};

export const canTransition = (
  from: StrategyLifecyclePhase,
  to: StrategyLifecyclePhase,
): boolean => (TRANSITIONS[from] as readonly string[]).includes(to);

export const nextPhases = (
  from: StrategyLifecyclePhase,
): readonly StrategyLifecyclePhase[] => TRANSITIONS[from];
