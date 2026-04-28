/**
 * src/server/governance/pillar-readiness.ts — Single Source of Truth for
 * "is this pillar / strategy ready for X?"
 *
 * Layer 2 (governance).
 *
 * Why this file exists
 * --------------------
 * Before this module landed, "complete" was answered by 4+ different
 * mechanisms that drifted apart:
 *
 *   1. validatePillarContent() — Zod strict (binary success).
 *   2. validatePillarPartial() — Zod partial → completionPercentage.
 *   3. assessPillar()          — maturity stage (EMPTY/INTAKE/ENRICHED/COMPLETE).
 *   4. Pillar.validationStatus — DB state machine (DRAFT/VALIDATED/LOCKED).
 *   5. Ad-hoc UI maths (filledCount / SECTIONS.length).
 *
 * Concrete bug surface: Mestor partially fills a pillar → Zod-partial
 * reports 100% (only checks presence) → UI shows "complet" → user clicks
 * "Enrich Oracle" → enrichOracleNeteru proceeds, depends on a deeper
 * COMPLETE-stage path that is missing → silent failure or downstream
 * error far from the cause.
 *
 * Contract from now on
 * --------------------
 * Every consumer (UI, tRPC, sequence, intent dispatcher, scoreObject
 * caller) reads readiness through THIS module. The runtime guards in
 * `assertReadyFor*` are called at the boundaries — before
 * `enrichAllSections`, before the RTIS cascade, before exporting Oracle.
 *
 * The module returns a discriminated union explaining WHY readiness is
 * (un)reached so the UI can render an actionable blocker instead of a
 * misleading "COMPLET" label.
 */

import { db } from "@/lib/db";
import {
  PILLAR_KEYS,
  PILLAR_STORAGE_KEYS,
  type PillarKey,
  type PillarStorageKey,
  toCanonical,
  toStorage,
} from "@/domain";
import { validatePillarPartial, validatePillarContent } from "@/lib/types/pillar-schemas";
import { assessPillar } from "@/server/services/pillar-maturity/assessor";
import { getContracts } from "@/server/services/pillar-maturity/contracts-loader";
import type { PillarAssessment, MaturityStage } from "@/lib/types/pillar-maturity";
import { eventBus } from "./event-bus";

// ── Types ─────────────────────────────────────────────────────────────

export type ReadinessGate =
  | "DISPLAY_AS_COMPLETE" // can the UI label this pillar "complet"?
  | "RTIS_CASCADE" // can R/T/I/S be derived from this ADVE pillar?
  | "GLORY_SEQUENCE" // can a GLORY sequence be invoked on this pillar?
  | "ORACLE_ENRICH" // can the 21-section Oracle enrichment run?
  | "ORACLE_EXPORT"; // can the PDF/MD export be produced?

export interface PillarReadiness {
  pillarKey: PillarKey;
  /** Computed maturity stage. Authoritative. */
  stage: MaturityStage | "EMPTY";
  /** Canonical 0-100 completion derived from the COMPLETE-stage contract. */
  completionPct: number;
  /** Operator-driven validation state from the DB. */
  validationStatus: "DRAFT" | "VALIDATED" | "LOCKED";
  /** Field paths still missing for the COMPLETE stage. */
  missing: readonly string[];
  /** Among missing, those that can be auto-filled (Mestor / Artemis). */
  derivable: readonly string[];
  /** Among missing, those that require human input. */
  needsHuman: readonly string[];
  /** Per-gate verdict. */
  gates: Readonly<Record<ReadinessGate, GateVerdict>>;
  /** Stable label safe to render in the UI without ambiguity. */
  displayLabel: "Vide" | "Brouillon" | "Enrichi" | "Complet" | "Validé" | "Verrouillé";
}

export interface GateVerdict {
  ok: boolean;
  /** Reason codes the UI can use for actionable copy. */
  reasons: readonly ReadinessReason[];
}

export type ReadinessReason =
  | "STAGE_BELOW_ENRICHED"
  | "STAGE_BELOW_COMPLETE"
  | "VALIDATION_NOT_VALIDATED"
  | "VALIDATION_NOT_LOCKED"
  | "MISSING_FIELDS_NEED_HUMAN"
  | "DEPENDENCY_PILLAR_NOT_READY"
  | "ZOD_STRICT_FAILED";

// ── Single-pillar evaluator ───────────────────────────────────────────

interface RawPillar {
  key: string;
  content: unknown;
  validationStatus: string | null;
}

export function evaluatePillarReadiness(
  pillar: RawPillar | null,
  pillarKey: PillarKey,
): PillarReadiness {
  const content = (pillar?.content ?? {}) as Record<string, unknown>;
  const validationStatus = (pillar?.validationStatus ?? "DRAFT") as PillarReadiness["validationStatus"];

  // The contracts-loader resolves dynamically against the GLORY registry.
  // In test / plugin-sandbox bundles the registry import may fail — we
  // degrade to "no contract", which yields stage=EMPTY and missing=[].
  // The downstream gates still produce safe (defensive) verdicts.
  let contract: ReturnType<typeof getContracts>[string] | undefined;
  try {
    contract = getContracts()[toStorage(pillarKey)];
  } catch {
    contract = undefined;
  }

  let assessment: PillarAssessment;
  if (!pillar) {
    assessment = {
      pillarKey: toStorage(pillarKey),
      currentStage: "EMPTY",
      nextStage: "INTAKE",
      satisfied: [],
      missing: contract?.stages.COMPLETE.map((r) => r.path) ?? [],
      derivable: contract?.stages.COMPLETE.filter((r) => r.derivable).map((r) => r.path) ?? [],
      needsHuman: contract?.stages.COMPLETE.filter((r) => !r.derivable).map((r) => r.path) ?? [],
      completionPct: 0,
      readyForGlory: false,
    };
  } else {
    try {
      assessment = assessPillar(pillarKey, content, contract);
    } catch {
      // Same defensive degradation: assessor needs the registry under
      // some code paths.
      assessment = {
        pillarKey: toStorage(pillarKey),
        currentStage: "EMPTY",
        nextStage: "INTAKE",
        satisfied: [],
        missing: [],
        derivable: [],
        needsHuman: [],
        completionPct: 0,
        readyForGlory: false,
      };
    }
  }

  const stage = assessment.currentStage;

  // ── Gate verdicts ──
  const gates: Record<ReadinessGate, GateVerdict> = {
    DISPLAY_AS_COMPLETE: verdict(
      stage === "COMPLETE",
      stage === "COMPLETE" ? [] : ["STAGE_BELOW_COMPLETE"],
    ),
    RTIS_CASCADE: verdict(
      stage === "ENRICHED" || stage === "COMPLETE",
      stage === "EMPTY" || stage === "INTAKE" ? ["STAGE_BELOW_ENRICHED"] : [],
    ),
    GLORY_SEQUENCE: verdict(
      stage === "COMPLETE" && validationStatus !== "DRAFT",
      [
        ...(stage !== "COMPLETE" ? (["STAGE_BELOW_COMPLETE"] as const) : []),
        ...(validationStatus === "DRAFT" ? (["VALIDATION_NOT_VALIDATED"] as const) : []),
      ],
    ),
    ORACLE_ENRICH: verdict(
      stage === "ENRICHED" || stage === "COMPLETE",
      stage === "EMPTY" || stage === "INTAKE" ? ["STAGE_BELOW_ENRICHED"] : [],
    ),
    ORACLE_EXPORT: verdict(
      validationStatus === "VALIDATED" || validationStatus === "LOCKED",
      validationStatus === "DRAFT" ? ["VALIDATION_NOT_VALIDATED"] : [],
    ),
  };

  return {
    pillarKey,
    stage,
    completionPct: Math.round(assessment.completionPct),
    validationStatus,
    missing: assessment.missing,
    derivable: assessment.derivable,
    needsHuman: assessment.needsHuman,
    gates,
    displayLabel: pickDisplayLabel(stage, validationStatus),
  };
}

function verdict(ok: boolean, reasons: readonly ReadinessReason[]): GateVerdict {
  return { ok, reasons };
}

function pickDisplayLabel(
  stage: MaturityStage | "EMPTY",
  validation: "DRAFT" | "VALIDATED" | "LOCKED",
): PillarReadiness["displayLabel"] {
  if (validation === "LOCKED") return "Verrouillé";
  if (validation === "VALIDATED") return "Validé";
  switch (stage) {
    case "EMPTY":
      return "Vide";
    case "INTAKE":
      return "Brouillon";
    case "ENRICHED":
      return "Enrichi";
    case "COMPLETE":
      return "Complet";
  }
}

// ── Strategy-wide evaluator ───────────────────────────────────────────

export interface StrategyReadiness {
  strategyId: string;
  byPillar: Readonly<Record<PillarKey, PillarReadiness>>;
  /** Aggregated gates — true iff EVERY pillar passes. */
  gates: Readonly<Record<ReadinessGate, GateVerdict>>;
  blockers: readonly StrategyBlocker[];
}

export interface StrategyBlocker {
  pillarKey: PillarKey;
  gate: ReadinessGate;
  reasons: readonly ReadinessReason[];
  missingFields: readonly string[];
}

export async function getStrategyReadiness(strategyId: string): Promise<StrategyReadiness> {
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true, validationStatus: true },
  });

  const byPillar: Record<PillarKey, PillarReadiness> = {} as never;
  for (const k of PILLAR_KEYS) {
    const dbRow = pillars.find((p) => p.key.toUpperCase() === k);
    byPillar[k] = evaluatePillarReadiness(
      dbRow ? { key: dbRow.key, content: dbRow.content, validationStatus: dbRow.validationStatus } : null,
      k,
    );
  }

  // Aggregate gates: a strategy gate is OK iff every relevant pillar's gate is OK.
  const gates: Record<ReadinessGate, GateVerdict> = {
    DISPLAY_AS_COMPLETE: aggregate(byPillar, "DISPLAY_AS_COMPLETE"),
    RTIS_CASCADE: aggregateAdve(byPillar, "RTIS_CASCADE"), // only ADVE pillars feed the cascade
    GLORY_SEQUENCE: aggregate(byPillar, "GLORY_SEQUENCE"),
    ORACLE_ENRICH: aggregateAdve(byPillar, "ORACLE_ENRICH"),
    ORACLE_EXPORT: aggregate(byPillar, "ORACLE_EXPORT"),
  };

  const blockers: StrategyBlocker[] = [];
  for (const k of PILLAR_KEYS) {
    for (const gate of Object.keys(byPillar[k].gates) as ReadinessGate[]) {
      const v = byPillar[k].gates[gate];
      if (!v.ok) {
        blockers.push({
          pillarKey: k,
          gate,
          reasons: v.reasons,
          missingFields: byPillar[k].needsHuman,
        });
      }
    }
  }

  return { strategyId, byPillar, gates, blockers };
}

function aggregate(
  byPillar: Record<PillarKey, PillarReadiness>,
  gate: ReadinessGate,
): GateVerdict {
  const failing: ReadinessReason[] = [];
  let ok = true;
  for (const k of PILLAR_KEYS) {
    if (!byPillar[k].gates[gate].ok) {
      ok = false;
      failing.push(...byPillar[k].gates[gate].reasons);
    }
  }
  return { ok, reasons: [...new Set(failing)] };
}

function aggregateAdve(
  byPillar: Record<PillarKey, PillarReadiness>,
  gate: ReadinessGate,
): GateVerdict {
  const failing: ReadinessReason[] = [];
  let ok = true;
  for (const k of ["A", "D", "V", "E"] as const) {
    if (!byPillar[k].gates[gate].ok) {
      ok = false;
      failing.push(...byPillar[k].gates[gate].reasons);
    }
  }
  return { ok, reasons: [...new Set(failing)] };
}

// ── Runtime guards ────────────────────────────────────────────────────

export class ReadinessVetoError extends Error {
  readonly gate: ReadinessGate;
  readonly blockers: readonly StrategyBlocker[];

  constructor(gate: ReadinessGate, blockers: readonly StrategyBlocker[], strategyId: string) {
    const summary = blockers
      .slice(0, 5)
      .map((b) => `${b.pillarKey}(${b.reasons.join("|")})`)
      .join(", ");
    super(
      `[readiness/${gate}] strategy ${strategyId} not ready — ${blockers.length} blocker(s): ${summary}${
        blockers.length > 5 ? "…" : ""
      }`,
    );
    this.name = "ReadinessVetoError";
    this.gate = gate;
    this.blockers = blockers;
  }
}

/**
 * Throws ReadinessVetoError if the strategy cannot pass `gate`.
 *
 * Side-effect: emits an `intent.vetoed` event on the bus *before* throwing
 * so observers (NSP, the UI, Seshat) learn about the veto in the same
 * lifecycle as a budget veto from Thot.
 *
 * Call this from EVERY entry point that performs work depending on
 * pillar maturity:
 *   - enrichAllSections / enrichAllSectionsNeteru
 *   - exportOracleAsPdf / exportOracleAsMarkdown
 *   - artemis sequence executor
 *   - rtis cascade trigger
 *   - any router's `.mutation` that mutates downstream pillars (R/T/I/S)
 */
export async function assertReadyFor(
  strategyId: string,
  gate: ReadinessGate,
  intentId?: string,
): Promise<StrategyReadiness> {
  const readiness = await getStrategyReadiness(strategyId);
  const verdictForGate = readiness.gates[gate];
  if (verdictForGate.ok) return readiness;

  // Filter blockers to the requested gate so the error message is focused.
  const relevant = readiness.blockers.filter((b) => b.gate === gate);
  if (intentId) {
    eventBus.publish("intent.vetoed", {
      intentId,
      reason: `readiness:${gate}:${verdictForGate.reasons.join("|")}`,
    });
  }
  throw new ReadinessVetoError(gate, relevant, strategyId);
}

// ── Strict-Zod cross-check (invariant guard) ──────────────────────────

/**
 * Returns true iff the four legacy completeness signals AGREE with the
 * canonical readiness for the given gate. Used by the integration test
 * `tests/integration/pillar-readiness-invariant.test.ts` to keep the
 * legacy callsites honest as they are migrated.
 *
 * Disagreement = bug. Either the canonical evaluator misses a case, or
 * a legacy site is computing readiness wrong.
 */
export function consistencyCheck(
  pillar: RawPillar,
  pillarKey: PillarKey,
): {
  consistent: boolean;
  canonical: PillarReadiness;
  legacy: {
    zodStrictSucceeds: boolean;
    zodPartialPct: number;
    zodPartialClaimsComplete: boolean;
  };
  divergences: readonly string[];
} {
  void PILLAR_STORAGE_KEYS; // hint for tooling — module owns the canonical surface
  void toCanonical;
  const canonical = evaluatePillarReadiness(pillar, pillarKey);
  const content = (pillar.content ?? {}) as Record<string, unknown>;
  const zodStrict = validatePillarContent(pillarKey, content);
  const zodPartial = validatePillarPartial(pillarKey, content);

  const divergences: string[] = [];

  // Invariant 1: Zod-strict success ⇒ canonical stage MUST be COMPLETE
  // (Zod stricter than ENRICHED is the strongest signal we have.)
  if (zodStrict.success && canonical.stage !== "COMPLETE") {
    divergences.push(
      `zod-strict says complete but canonical stage=${canonical.stage}`,
    );
  }

  // Invariant 2: zodPartialPct ≥ 95% should imply canonical >= ENRICHED.
  if (zodPartial.completionPercentage >= 95 && canonical.stage === "EMPTY") {
    divergences.push(
      `zod-partial ${zodPartial.completionPercentage}% but canonical stage=EMPTY`,
    );
  }

  // Invariant 3: canonical stage = COMPLETE ⇒ Zod-partial MUST be 100.
  if (canonical.stage === "COMPLETE" && zodPartial.completionPercentage < 100) {
    divergences.push(
      `canonical=COMPLETE but zod-partial only ${zodPartial.completionPercentage}%`,
    );
  }

  return {
    consistent: divergences.length === 0,
    canonical,
    legacy: {
      zodStrictSucceeds: zodStrict.success,
      zodPartialPct: zodPartial.completionPercentage,
      zodPartialClaimsComplete: zodPartial.completionPercentage === 100,
    },
    divergences,
  };
}
