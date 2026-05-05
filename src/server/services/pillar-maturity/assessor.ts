import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Maturity Assessor — Evaluates pillar content against the completion contract.
 *
 * Pure functions: no side effects, no DB writes, no AI calls.
 * Loads pillars once via PillarResolver, then computes everything in memory.
 */

import { db } from "@/lib/db";
import type {
  MaturityStage,
  FieldRequirement,
  PillarMaturityContract,
  PillarAssessment,
  StrategyMaturityReport,
} from "@/lib/types/pillar-maturity";
import { MATURITY_ORDER } from "@/lib/types/pillar-maturity";
import { getContracts } from "./contracts-loader";

// ─── Field Validation ───────────────────────────────────────────────────────

/**
 * Resolve a dot-notation path within content.
 * "enemy.name" → content.enemy.name
 */
function resolvePath(content: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = content;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Check if a field requirement is satisfied by the pillar content.
 */
function isFieldSatisfied(content: Record<string, unknown>, req: FieldRequirement): boolean {
  const value = resolvePath(content, req.path);

  switch (req.validator) {
    case "non_empty":
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;

    case "min_length":
      return typeof value === "string" && value.length >= (req.validatorArg ?? 1);

    case "min_items": {
      if (!Array.isArray(value) || value.length < (req.validatorArg ?? 1)) return false;
      // Si on connaît la shape des items (ZodArray<ZodObject>), on rejette
      // les items qui ne contiennent AUCUNE des sub-keys attendues. Sans
      // ça, herosJourney/valeurs avec items {description,defis,...} (au
      // lieu de {actNumber,title,narrative}) passent et restent invisibles
      // dans l'UI.
      if (req.expectedKeys && req.expectedKeys.length > 0) {
        const validItems = value.filter((item) => {
          if (typeof item !== "object" || item === null) return false;
          const itemKeys = Object.keys(item as Record<string, unknown>);
          if (itemKeys.length === 0) return false;
          const intersection = itemKeys.filter((k) => req.expectedKeys!.includes(k));
          if (intersection.length === 0) return false;
          // Au moins une required key doit être présente si requiredKeys est fourni
          if (req.requiredKeys && req.requiredKeys.length > 0) {
            const hasAtLeastOneRequired = itemKeys.some((k) => req.requiredKeys!.includes(k));
            if (!hasAtLeastOneRequired) return false;
          }
          return true;
        });
        return validItems.length >= (req.validatorArg ?? 1);
      }
      return true;
    }

    case "nested_complete": {
      if (typeof value !== "object" || value === null) return false;
      const obj = value as Record<string, unknown>;
      return Object.values(obj).every(
        v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
    }

    case "is_number":
      return typeof value === "number" && !isNaN(value);

    case "is_object": {
      if (typeof value !== "object" || value === null) return false;
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) return false;
      // Si le contrat connaît la shape Zod attendue (expectedKeys), on
      // détecte les shapes corrompues : aucune des keys présentes ne
      // matche la shape attendue → le LLM a inventé des aliases (ex: ikigai
      // {good,love,paid,skill}) → on considère le field comme missing
      // pour forcer la régénération via Enrichir.
      if (req.expectedKeys && req.expectedKeys.length > 0) {
        const intersection = keys.filter((k) => req.expectedKeys!.includes(k));
        if (intersection.length === 0) return false;
        // Mode strict : si la moitié des keys présentes sont hors-shape, on
        // considère la shape corrompue.
        const offShape = keys.length - intersection.length;
        if (offShape > intersection.length) return false;
      }
      return true;
    }

    default:
      return false;
  }
}

// ─── Pillar Assessment ──────────────────────────────────────────────────────

/**
 * Assess a single pillar's maturity against its contract.
 */
export function assessPillar(
  pillarKey: string,
  content: Record<string, unknown> | null,
  contract?: PillarMaturityContract,
): PillarAssessment {
  const ct = contract ?? getContracts()[pillarKey.toLowerCase()];
  if (!ct || !content) {
    return {
      pillarKey,
      currentStage: "EMPTY",
      nextStage: "INTAKE",
      satisfied: [],
      missing: ct?.stages.COMPLETE.map(r => r.path) ?? [],
      derivable: ct?.stages.COMPLETE.filter(r => r.derivable).map(r => r.path) ?? [],
      needsHuman: ct?.stages.COMPLETE.filter(r => !r.derivable).map(r => r.path) ?? [],
      completionPct: 0,
      readyForGlory: false,
    };
  }

  // Check each stage from highest to lowest
  let currentStage: MaturityStage | "EMPTY" = "EMPTY";

  for (const stage of MATURITY_ORDER) {
    const requirements = ct.stages[stage];
    const allSatisfied = requirements.every(req => isFieldSatisfied(content, req));
    if (allSatisfied) {
      currentStage = stage;
    } else {
      break; // Stages are cumulative — if ENRICHED fails, COMPLETE can't pass
    }
  }

  // Compute missing fields against COMPLETE
  const completeReqs = ct.stages.COMPLETE;
  const satisfied: string[] = [];
  const missing: string[] = [];
  const derivable: string[] = [];
  const needsHuman: string[] = [];

  for (const req of completeReqs) {
    if (isFieldSatisfied(content, req)) {
      satisfied.push(req.path);
    } else {
      missing.push(req.path);
      if (req.derivable) derivable.push(req.path);
      else needsHuman.push(req.path);
    }
  }

  const completionPct = completeReqs.length > 0
    ? Math.round((satisfied.length / completeReqs.length) * 100)
    : 100;

  // Determine next stage
  let nextStage: MaturityStage | null = null;
  if (currentStage === "EMPTY") nextStage = "INTAKE";
  else if (currentStage === "INTAKE") nextStage = "ENRICHED";
  else if (currentStage === "ENRICHED") nextStage = "COMPLETE";
  // currentStage === "COMPLETE" → nextStage = null (already at max)

  return {
    pillarKey,
    currentStage,
    nextStage,
    satisfied,
    missing,
    derivable,
    needsHuman,
    completionPct,
    readyForGlory: currentStage === "COMPLETE",
  };
}

// ─── Strategy Assessment ────────────────────────────────────────────────────

/**
 * Assess all 8 pillars of a strategy in one DB query.
 */
export async function assessStrategy(strategyId: string): Promise<StrategyMaturityReport> {
  const pillars = await db.pillar.findMany({
    where: { strategyId },
    select: { key: true, content: true },
  });

  const pillarMap = new Map(pillars.map(p => [p.key.toLowerCase(), p.content as Record<string, unknown> | null]));
  const contracts = getContracts();

  const assessments: Record<string, PillarAssessment> = {};
  let minStage: MaturityStage | "EMPTY" = "COMPLETE";
  let totalMissing = 0;
  let totalDerivable = 0;
  let autoCompletable = 0;

  for (const key of [...PILLAR_STORAGE_KEYS]) {
    const content = pillarMap.get(key) ?? null;
    const contract = contracts[key];
    const assessment = assessPillar(key, content, contract);
    assessments[key] = assessment;

    // Track overall stage (minimum)
    const stageOrder = { EMPTY: 0, INTAKE: 1, ENRICHED: 2, COMPLETE: 3 };
    if (stageOrder[assessment.currentStage] < stageOrder[minStage]) {
      minStage = assessment.currentStage;
    }

    totalMissing += assessment.missing.length;
    totalDerivable += assessment.derivable.length;
    if (assessment.derivable.length > 0 && !assessment.readyForGlory) {
      autoCompletable++;
    }
  }

  return {
    strategyId,
    overallStage: minStage,
    pillars: assessments,
    gloryReady: Object.values(assessments).every(a => a.readyForGlory),
    autoCompletable,
    totalMissing,
    totalDerivable,
  };
}
