/**
 * MANIPULATION_COHERENCE — gate pre-flight Mestor (ADR-0051 — anciennement ADR-0038, Phase 16-bis).
 *
 * Avant Phase 16-bis, ce gate n'existait qu'en commentaires dans
 * `phase13-oracle-tools.ts` et `sequence-executor.ts` (« gate
 * MANIPULATION_COHERENCE enforced par X »). Aucun code ne l'enforçait.
 * Il devient effectif ici.
 *
 * Rôle : refuser les Intents qui portent un `manipulationMode` étranger
 * au `Strategy.manipulationMix` déclaré côté brand. Sans ce gate, un
 * Glory tool / Ptah forge peut produire un asset en mode `entertainer`
 * alors que la brand est strictement `dealer` — drift narratif silencieux.
 *
 * Cf. docs/governance/MANIPULATION-MATRIX.md pour les 4 modes
 * (peddler / dealer / facilitator / entertainer) et la sémantique du mix.
 *
 * Sortie :
 *   - `OK` : mode dans le mix avec poids ≥ MIN_WEIGHT (0.10 par défaut).
 *   - `VETOED` : mode hors mix, ou mix non déclaré sur la stratégie.
 *   - `DOWNGRADED` : mode présent mais poids < MIN_WEIGHT (avertissement).
 *
 * Override : un Intent peut porter `overrideMixViolation: true` quand
 * l'opérateur a explicitement validé l'écart en UI (modal de confirmation).
 * L'override est tracé dans IntentEmission.payload pour audit.
 */

import { db } from "@/lib/db";

export type ManipulationMode = "peddler" | "dealer" | "facilitator" | "entertainer";

export const MANIPULATION_MODES: readonly ManipulationMode[] = [
  "peddler",
  "dealer",
  "facilitator",
  "entertainer",
] as const;

const MIN_MIX_WEIGHT = 0.1;

export interface ManipulationCoherenceInput {
  readonly strategyId: string;
  readonly mode: ManipulationMode;
  readonly overrideMixViolation?: boolean;
  readonly intentKind?: string;
}

export type ManipulationCoherenceVerdict =
  | { status: "OK"; weight: number; mix: Record<ManipulationMode, number> }
  | {
      status: "DOWNGRADED";
      weight: number;
      mix: Record<ManipulationMode, number>;
      reason: string;
    }
  | {
      status: "VETOED";
      reason: string;
      mix: Record<ManipulationMode, number> | null;
    };

/**
 * Read `Strategy.manipulationMix` and verify the requested `mode` weight.
 * Falls back to a uniform mix (0.25 each) when the field is null —
 * matches the seed convention before back-fill.
 */
export async function applyManipulationCoherenceGate(
  input: ManipulationCoherenceInput,
): Promise<ManipulationCoherenceVerdict> {
  const { strategyId, mode, overrideMixViolation, intentKind } = input;

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, manipulationMix: true },
  });

  if (!strategy) {
    return {
      status: "VETOED",
      reason: `MANIPULATION_COHERENCE: strategy ${strategyId} not found`,
      mix: null,
    };
  }

  const mix = normalizeMix(strategy.manipulationMix);
  const weight = mix[mode] ?? 0;

  if (weight === 0) {
    if (overrideMixViolation) {
      return {
        status: "DOWNGRADED",
        weight: 0,
        mix,
        reason: `MANIPULATION_COHERENCE: mode "${mode}" hors mix (operator override)${intentKind ? ` for ${intentKind}` : ""}`,
      };
    }
    return {
      status: "VETOED",
      reason: `MANIPULATION_COHERENCE: mode "${mode}" hors Strategy.manipulationMix${intentKind ? ` (${intentKind})` : ""}`,
      mix,
    };
  }

  if (weight < MIN_MIX_WEIGHT) {
    return {
      status: "DOWNGRADED",
      weight,
      mix,
      reason: `MANIPULATION_COHERENCE: mode "${mode}" poids ${weight.toFixed(2)} < seuil ${MIN_MIX_WEIGHT}`,
    };
  }

  return { status: "OK", weight, mix };
}

/**
 * Normalize raw `manipulationMix` JSON to a typed mix.
 * Null → uniform 0.25 each (seed default convention).
 * Invalid keys are dropped silently (forward-compat with future modes).
 */
export function normalizeMix(raw: unknown): Record<ManipulationMode, number> {
  const out: Record<ManipulationMode, number> = {
    peddler: 0,
    dealer: 0,
    facilitator: 0,
    entertainer: 0,
  };
  if (raw == null) {
    return { peddler: 0.25, dealer: 0.25, facilitator: 0.25, entertainer: 0.25 };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { peddler: 0.25, dealer: 0.25, facilitator: 0.25, entertainer: 0.25 };
  }
  const obj = raw as Record<string, unknown>;
  for (const m of MANIPULATION_MODES) {
    const v = obj[m];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[m] = v;
    }
  }
  return out;
}
