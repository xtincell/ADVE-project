/**
 * Ptah governance — gates pre-flight Mestor (manipulation coherence + pillar source).
 *
 * Cf. PANTHEON.md §2.5 + MANIPULATION-MATRIX.md §4.3.
 */

import { db } from "@/lib/db";
import type { ForgeBrief, ManipulationMode } from "./types";
import { MANIPULATION_MODES } from "./types";

export class ManipulationCoherenceError extends Error {
  readonly reason = "MIX_VIOLATION";
  constructor(
    public readonly mode: ManipulationMode,
    public readonly mixValue: number,
    public readonly threshold: number,
  ) {
    super(
      `Manipulation mode "${mode}" not in Strategy mix (mixValue=${mixValue} < threshold=${threshold}). Override via overrideMixViolation=true if intentional.`,
    );
    this.name = "ManipulationCoherenceError";
  }
}

export class PillarSourceMissingError extends Error {
  readonly reason = "PILLAR_SOURCE_MISSING";
  constructor() {
    super(
      "GenerativeTask requires pillarSource (one of A/D/V/E/R/T/I/S) — refus à création.",
    );
    this.name = "PillarSourceMissingError";
  }
}

const DEFAULT_MIX_THRESHOLD = 0.05;

/**
 * Vérifie cohérence manipulation mode vs Strategy.manipulationMix.
 *
 * Lecture du mix : `Strategy.manipulationMix` est un Json `{peddler, dealer, facilitator, entertainer}`.
 * Si le champ n'existe pas (Strategy pré-Phase 9), on retourne mix uniforme (0.25 chacun).
 */
export async function checkManipulationCoherence(
  strategyId: string,
  brief: ForgeBrief,
  override = false,
): Promise<void> {
  if (override) return;
  if (!isValidManipulationMode(brief.manipulationMode)) {
    throw new ManipulationCoherenceError(brief.manipulationMode, 0, DEFAULT_MIX_THRESHOLD);
  }

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { manipulationMix: true },
  });

  // Strategies pré-Phase 9 sans manipulationMix : on tolère (mix uniforme implicite).
  // Une fois la migration Strategy.manipulationMix back-fillée, le check sera strict.
  if (!strategy?.manipulationMix) return;

  const mix = strategy.manipulationMix as Record<string, number>;
  const mixValue = mix[brief.manipulationMode] ?? 0;

  if (mixValue < DEFAULT_MIX_THRESHOLD) {
    throw new ManipulationCoherenceError(
      brief.manipulationMode,
      mixValue,
      DEFAULT_MIX_THRESHOLD,
    );
  }
}

export function isValidManipulationMode(value: string): value is ManipulationMode {
  return (MANIPULATION_MODES as readonly string[]).includes(value);
}

/**
 * Vérifie pillarSource présent dans le brief — refus à création si absent.
 * Le Zod du manifest garde l'enum, mais on double-check côté service.
 */
export function ensurePillarSource(brief: ForgeBrief): void {
  if (!brief.pillarSource) {
    throw new PillarSourceMissingError();
  }
}
