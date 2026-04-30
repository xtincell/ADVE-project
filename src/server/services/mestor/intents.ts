/**
 * MESTOR — Intent Contract
 *
 * The single typed entry point for any work that affects pillars,
 * recommendations, deliverables, or strategy state.
 *
 * Architecture (NETERU quartet):
 *   trigger → mestor.emitIntent(intent) → artemis.commandant.execute(intent)
 *           ├─ consults Seshat for context (read-only)
 *           └─ consults Thot for capacity (veto/downgrade if needed)
 *
 * Intent kinds map 1:1 to the user-visible orchestration verbs.
 * The dispatcher (artemis/commandant.ts) decides which underlying tool
 * (Notoria mission, Glory sequence, Artemis framework) implements each kind.
 *
 * No tool is called directly from outside this module. Callers emit Intents.
 */

import type { PillarKey } from "@/lib/types/advertis-vector";

// ── Phase enum ────────────────────────────────────────────────────────

export type StrategyLifecyclePhase =
  | "INTAKE"      // Public quick-intake, ADVE only, no R/T
  | "BOOT"        // Post-paywall, full 8-pillar onboarding
  | "OPERATING"   // Running brand, R+T cycles, deliverables
  | "GROWTH";     // Mature brand, optimization phase

// ── Action parameters for I generation ────────────────────────────────

export interface ActionParams {
  /** Optional touchpoint hint — limits I generation to this channel family */
  touchpoint?: "DIGITAL" | "ATL" | "BTL" | "TTL" | "OWNED" | "EARNED";
  /** AARRR pirate metrics intent */
  aarrrIntent?: "ACQUISITION" | "ACTIVATION" | "RETENTION" | "REFERRAL" | "REVENUE";
  /** Persona slug to filter actions */
  persona?: string;
  /** Optional SKU / product line filter */
  sku?: string;
  /** Budget envelope hint (Thot may downgrade). null = no constraint */
  budgetMax?: number | null;
  /** Locality scope */
  locality?: string;
  /** Time window */
  timing?: { start?: string; end?: string };
}

// ── Intent (typed union) ──────────────────────────────────────────────

export type Intent =
  // ── ADVE filling, by phase ──
  | {
      kind: "FILL_ADVE";
      phase: StrategyLifecyclePhase;
      strategyId: string;
      sources?: {
        responses?: Record<string, Record<string, unknown>>;
        extractedValues?: Record<string, Record<string, unknown>>;
      };
    }
  // ── R/T cascade ──
  | { kind: "ENRICH_R_FROM_ADVE"; strategyId: string }
  | { kind: "ENRICH_T_FROM_ADVE_R_SESHAT"; strategyId: string; seshatRefs?: string[] }
  // ── Bidirectional update from R+T discoveries ──
  | {
      kind: "PROPOSE_ADVE_UPDATE_FROM_RT";
      strategyId: string;
      trigger: "DRIFT" | "MANUAL" | "SIGNAL" | "FEEDBACK";
    }
  // ── I generation (structured actions) ──
  | { kind: "GENERATE_I_ACTIONS"; strategyId: string; params?: ActionParams }
  // ── S synthesis from selected actions ──
  | { kind: "SYNTHESIZE_S"; strategyId: string; selectedActionIds?: string[] }
  // ── Deliverable production (PILLAR sequences) ──
  | {
      kind: "PRODUCE_DELIVERABLE";
      strategyId: string;
      target: string; // GlorySequenceKey — kept loose to avoid cross-import cycles
      depth: "PREVIEW" | "FULL";
    }
  // ── Seshat indexing (post-intake/boot) ──
  | {
      kind: "INDEX_BRAND_CONTEXT";
      strategyId: string;
      scope: "INTAKE_ONLY" | "FULL";
    }
  // ── External signal (Tarsis) → re-evaluate ──
  | {
      kind: "PROCESS_SESHAT_SIGNAL";
      strategyId: string;
      signal: { kind: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; payload: unknown };
    }
  // ── Oracle framework run via the governed path (audit trail + Seshat ctx) ──
  | {
      kind: "RUN_ORACLE_FRAMEWORK";
      strategyId: string;
      frameworkSlug: string;
      input: Record<string, unknown>;
    }
  // ── Governance — LLM model-policy update (non-strategy-scoped) ──
  // strategyId is the sentinel "(governance)" for system-wide intents so
  // the IntentEmission table key stays a non-null string.
  | {
      kind: "UPDATE_MODEL_POLICY";
      strategyId: string;
      purpose: "final-report" | "agent" | "intermediate" | "intake-followup" | "extraction";
      anthropicModel: string;
      ollamaModel: string | null;
      allowOllamaSubstitution: boolean;
      pipelineVersion?: "V1" | "V2" | "V3";
      notes?: string | null;
      updatedBy: string | null;
    }
  // ── Ptah Forge (Phase 9, ADR-0009) — matérialisation des briefs Artemis ──
  | {
      kind: "PTAH_MATERIALIZE_BRIEF";
      strategyId: string;
      operatorId: string;
      sourceIntentId: string;
      brief: {
        briefText: string;
        forgeSpec: {
          kind: "image" | "video" | "audio" | "icon" | "refine" | "transform" | "classify" | "stock" | "design";
          providerHint?: "magnific" | "adobe" | "figma" | "canva";
          modelHint?: string;
          parameters: Record<string, unknown>;
        };
        // Canonical uppercase PillarKey (from src/domain/pillars.ts), pas la variante storage lowercase.
        pillarSource: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
        manipulationMode: "peddler" | "dealer" | "facilitator" | "entertainer";
      };
      overrideMixViolation?: boolean;
    }
  | {
      kind: "PTAH_RECONCILE_TASK";
      strategyId: string;
      taskId: string;
      webhookPayload: unknown;
    }
  | {
      kind: "PTAH_REGENERATE_FADING_ASSET";
      strategyId: string;
      operatorId: string;
      assetVersionId: string;
    };

// ── Intent result (returned by Artemis.commandant.execute) ───────────

export interface IntentResult {
  intentKind: Intent["kind"];
  strategyId: string;
  status: "OK" | "DOWNGRADED" | "VETOED" | "FAILED" | "QUEUED";
  /** Human-readable summary for audit trail */
  summary: string;
  /** Tool used to fulfill the intent (notoria | sequence | framework | ...) */
  tool?: string;
  /** Tool-specific output payload */
  output?: unknown;
  /** Reason if VETOED or DOWNGRADED */
  reason?: string;
  /** Downstream intent emitted as side-effect (e.g. INDEX after FILL_ADVE) */
  spawnedIntents?: Intent[];
  /** Cost estimate (Thot reconciliation) */
  estimatedCost?: { amount: number; currency: string };
  startedAt: string;
  completedAt: string;
}

// ── Audit log entry ───────────────────────────────────────────────────

export interface IntentEmissionRecord {
  id: string;
  intentKind: Intent["kind"];
  strategyId: string;
  payload: Intent;
  result: IntentResult | null;
  emittedAt: string;
  caller: string; // module that emitted (e.g. "quick-intake", "boot-sequence", "tarsis")
}

// ── Type guards ───────────────────────────────────────────────────────

export function isFillAdveIntent(
  i: Intent,
): i is Extract<Intent, { kind: "FILL_ADVE" }> {
  return i.kind === "FILL_ADVE";
}

export function isProduceDeliverableIntent(
  i: Intent,
): i is Extract<Intent, { kind: "PRODUCE_DELIVERABLE" }> {
  return i.kind === "PRODUCE_DELIVERABLE";
}

export function intentTouchesPillars(intent: Intent): PillarKey[] {
  switch (intent.kind) {
    case "FILL_ADVE":
    case "PROPOSE_ADVE_UPDATE_FROM_RT":
      return ["a", "d", "v", "e"];
    case "ENRICH_R_FROM_ADVE":
      return ["r"];
    case "ENRICH_T_FROM_ADVE_R_SESHAT":
      return ["t"];
    case "GENERATE_I_ACTIONS":
      return ["i"];
    case "SYNTHESIZE_S":
      return ["s"];
    case "PRODUCE_DELIVERABLE":
    case "INDEX_BRAND_CONTEXT":
    case "PROCESS_SESHAT_SIGNAL":
    case "RUN_ORACLE_FRAMEWORK":
    case "UPDATE_MODEL_POLICY":
    case "PTAH_MATERIALIZE_BRIEF":
    case "PTAH_RECONCILE_TASK":
    case "PTAH_REGENERATE_FADING_ASSET":
      return [];
  }
}

// ── emitIntent — single entry point ───────────────────────────────────

/**
 * Emit an intent. Mestor logs it, optionally consults Thot, then hands off
 * to Artemis.commandant.execute().
 *
 * In passthrough mode (Phase 0), the dispatcher routes to existing tools
 * with no behavior change. Subsequent phases enrich the dispatch logic.
 */
export async function emitIntent(
  intent: Intent,
  options: { caller: string } = { caller: "unknown" },
): Promise<IntentResult> {
  const startedAt = new Date().toISOString();

  // Lazy imports to avoid circular dependencies
  const { db } = await import("@/lib/db");
  const { execute } = await import("@/server/services/artemis/commandant");

  // Persist emission (best-effort — never block the dispatch)
  let emissionId: string | null = null;
  try {
    const row = await db.intentEmission.create({
      data: {
        intentKind: intent.kind,
        strategyId: intent.strategyId,
        payload: intent as never,
        caller: options.caller,
      },
    });
    emissionId = row.id;
  } catch (err) {
    console.warn(
      "[mestor.emitIntent] could not persist IntentEmission (table may not exist yet):",
      err instanceof Error ? err.message : err,
    );
  }

  // Dispatch to Artemis
  let result: IntentResult;
  try {
    result = await execute(intent);
  } catch (err) {
    result = {
      intentKind: intent.kind,
      strategyId: intent.strategyId,
      status: "FAILED",
      summary: err instanceof Error ? err.message : String(err),
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  // Update emission record with result
  if (emissionId) {
    try {
      await db.intentEmission.update({
        where: { id: emissionId },
        data: { result: result as never, completedAt: new Date() },
      });
    } catch {
      /* best-effort */
    }
  }

  // Fire-and-forget spawned intents (Artemis-decided side-effects — async indexing,
  // PILLAR sequences in preview mode, etc.). The caller's response is NOT delayed.
  if (result.spawnedIntents && result.spawnedIntents.length > 0) {
    const spawnCaller = `${options.caller}>spawn`;
    for (const child of result.spawnedIntents) {
      // Don't await — let them run in the background
      void emitIntent(child, { caller: spawnCaller }).catch((err) => {
        console.warn(
          `[mestor.emitIntent] spawned intent ${child.kind} failed:`,
          err instanceof Error ? err.message : err,
        );
      });
    }
  }

  return result;
}
