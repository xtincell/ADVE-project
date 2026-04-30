/**
 * ARTEMIS — Commandant (Executor)
 *
 * Receives Intents from Mestor and dispatches to the right tool:
 *   - Notoria missions
 *   - Glory sequences
 *   - Artemis frameworks
 *   - Seshat indexer
 *
 * NOTE: distinct from `src/server/services/mestor/commandant.ts` which is
 * Mestor's decision-maker (state-of-mind, recommendations, insights).
 * This Artemis commandant is the EXECUTION head.
 *
 * Phase 0 (passthrough): each intent routes to the existing direct calls
 * without behavior change. Subsequent phases enrich each branch with
 * Thot validation, Seshat indexing side-effects, etc.
 */

import type {
  Intent,
  IntentResult,
} from "@/server/services/mestor/intents";

// ── Public API ────────────────────────────────────────────────────────

export async function execute(intent: Intent): Promise<IntentResult> {
  const startedAt = new Date().toISOString();
  const base = {
    intentKind: intent.kind,
    strategyId: intent.strategyId,
    startedAt,
  };

  try {
    switch (intent.kind) {
      case "FILL_ADVE":
        return wrap({ ...base, ...(await fillAdve(intent)) });

      case "ENRICH_R_FROM_ADVE":
        return wrap({ ...base, ...(await enrichR(intent)) });

      case "ENRICH_T_FROM_ADVE_R_SESHAT":
        return wrap({ ...base, ...(await enrichT(intent)) });

      case "PROPOSE_ADVE_UPDATE_FROM_RT":
        return wrap({ ...base, ...(await proposeAdveUpdate(intent)) });

      case "GENERATE_I_ACTIONS":
        return wrap({ ...base, ...(await generateIActions(intent)) });

      case "SYNTHESIZE_S":
        return wrap({ ...base, ...(await synthesizeS(intent)) });

      case "PRODUCE_DELIVERABLE":
        return wrap({ ...base, ...(await produceDeliverable(intent)) });

      case "INDEX_BRAND_CONTEXT":
        return wrap({ ...base, ...(await indexBrandContext(intent)) });

      case "PROCESS_SESHAT_SIGNAL":
        return wrap({ ...base, ...(await processSeshatSignal(intent)) });

      case "RUN_ORACLE_FRAMEWORK":
        return wrap({ ...base, ...(await runOracleFramework(intent)) });

      case "UPDATE_MODEL_POLICY":
        return wrap({ ...base, ...(await updateModelPolicy(intent)) });

      // ── Phase 9 — Ptah Forge (ADR-0009) ──────────────────────────
      case "PTAH_MATERIALIZE_BRIEF":
        return wrap({ ...base, ...(await ptahMaterialize(intent)) });

      case "PTAH_RECONCILE_TASK":
        return wrap({ ...base, ...(await ptahReconcile(intent)) });

      case "PTAH_REGENERATE_FADING_ASSET":
        return wrap({ ...base, ...(await ptahRegenerate(intent)) });
    }
  } catch (err) {
    return {
      ...base,
      status: "FAILED",
      summary: err instanceof Error ? err.message : String(err),
      completedAt: new Date().toISOString(),
    };
  }
}

function wrap(
  partial: Omit<IntentResult, "completedAt">,
): IntentResult {
  return { ...partial, completedAt: new Date().toISOString() };
}

// ── FILL_ADVE — phase-aware Notoria mission selection ─────────────────

async function fillAdve(
  intent: Extract<Intent, { kind: "FILL_ADVE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { generateBatch } = await import("@/server/services/notoria/engine");

  // Phase-aware Notoria mission selection
  const missionType =
    intent.phase === "INTAKE"
      ? "ADVE_INTAKE_PARTIAL"
      : intent.phase === "BOOT"
        ? "ADVE_BOOT_FILL"
        : "ADVE_UPDATE";

  const batch = await generateBatch({
    strategyId: intent.strategyId,
    missionType,
    targetPillars: ["a", "d", "v", "e"],
  });

  // Spawned downstream intents:
  //   - INDEX_BRAND_CONTEXT (always — Seshat indexing async)
  //   - PRODUCE_DELIVERABLE × 4 PILLAR sequences (only at INTAKE for previews)
  const spawned: Intent[] = [
    {
      kind: "INDEX_BRAND_CONTEXT",
      strategyId: intent.strategyId,
      scope: intent.phase === "INTAKE" ? "INTAKE_ONLY" : "FULL",
    },
  ];

  if (intent.phase === "INTAKE") {
    for (const target of ["MANIFESTE-A", "BRANDBOOK-D", "OFFRE-V", "PLAYBOOK-E"]) {
      spawned.push({
        kind: "PRODUCE_DELIVERABLE",
        strategyId: intent.strategyId,
        target,
        depth: "PREVIEW",
      });
    }
  }

  return {
    status: "OK",
    summary: `FILL_ADVE × ${intent.phase}: batch ${batch.batchId}, ${batch.totalRecos} recos`,
    tool: `notoria:${missionType}`,
    output: batch,
    spawnedIntents: spawned,
  };
}

// ── ENRICH_R_FROM_ADVE — Mestor RTIS cascade ─────────────────────────

async function enrichR(
  intent: Extract<Intent, { kind: "ENRICH_R_FROM_ADVE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { actualizePillar } = await import(
    "@/server/services/mestor/rtis-cascade"
  );
  // rtis-cascade compares pillarKey to "R"/"T"/"I"/"S" (uppercase) internally.
  const result = await actualizePillar(intent.strategyId, "R" as never);
  return {
    status: result.error ? "FAILED" : "OK",
    summary: result.error
      ? `R cascade failed: ${result.error}`
      : `R enriched (maturity ${result.maturityStage ?? "n/a"}, ${result.maturityCompletionPct ?? 0}%)`,
    tool: "mestor:rtis-cascade.R",
    output: result,
    reason: result.error,
  };
}

// ── ENRICH_T_FROM_ADVE_R_SESHAT ─────────────────────────────────────

async function enrichT(
  intent: Extract<Intent, { kind: "ENRICH_T_FROM_ADVE_R_SESHAT" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { actualizePillar } = await import(
    "@/server/services/mestor/rtis-cascade"
  );
  const result = await actualizePillar(intent.strategyId, "T" as never);
  return {
    status: result.error ? "FAILED" : "OK",
    summary: result.error
      ? `T cascade failed: ${result.error}`
      : `T enriched (maturity ${result.maturityStage ?? "n/a"}, ${result.maturityCompletionPct ?? 0}%)`,
    tool: "mestor:rtis-cascade.T",
    output: result,
    reason: result.error,
  };
}

// ── PROPOSE_ADVE_UPDATE_FROM_RT — Notoria ADVE_UPDATE ────────────────

async function proposeAdveUpdate(
  intent: Extract<Intent, { kind: "PROPOSE_ADVE_UPDATE_FROM_RT" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { generateBatch } = await import("@/server/services/notoria/engine");
  const batch = await generateBatch({
    strategyId: intent.strategyId,
    missionType: "ADVE_UPDATE",
    targetPillars: ["a", "d", "v", "e"],
  });
  return {
    status: "OK",
    summary: `ADVE update proposed (trigger=${intent.trigger}): ${batch.totalRecos} recos`,
    tool: "notoria:ADVE_UPDATE",
    output: batch,
  };
}

// ── GENERATE_I_ACTIONS — pre-flight Thot, then Notoria I_GENERATION ──

async function generateIActions(
  intent: Extract<Intent, { kind: "GENERATE_I_ACTIONS" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  // Thot pre-flight (stub returns OK in Phase 0)
  const { validateExecution } = await import(
    "@/server/services/financial-brain/capacity"
  );
  const validation = await validateExecution(intent, intent.params?.budgetMax ?? 0);
  if (!validation.ok) {
    return {
      status: validation.downgrade ? "DOWNGRADED" : "VETOED",
      summary: `Thot ${validation.downgrade ? "downgraded" : "vetoed"} GENERATE_I_ACTIONS: ${validation.reason}`,
      reason: validation.reason,
    };
  }

  const { generateBatch } = await import("@/server/services/notoria/engine");
  const batch = await generateBatch({
    strategyId: intent.strategyId,
    missionType: "I_GENERATION",
  });

  // Post-process: distill recos into structured BrandAction rows.
  // Notoria stays the generator; Artemis owns this structuring step.
  let actionsCreated = 0;
  let actionsSkipped = 0;
  try {
    const { extractBrandActionsFromRecos } = await import("./i-action-extractor");
    const extract = await extractBrandActionsFromRecos(intent.strategyId, {
      batchId: batch.batchId,
    });
    actionsCreated = extract.actionsCreated;
    actionsSkipped = extract.actionsSkipped;
  } catch (err) {
    console.warn(
      "[artemis.commandant] BrandAction extraction failed (non-blocking):",
      err instanceof Error ? err.message : err,
    );
  }

  return {
    status: "OK",
    summary: `I actions generated: ${batch.totalRecos} recos → ${actionsCreated} BrandAction rows (skipped: ${actionsSkipped})`,
    tool: "notoria:I_GENERATION",
    output: { ...batch, actionsCreated, actionsSkipped },
  };
}

// ── SYNTHESIZE_S — pulls selected BrandActions when available ────────

async function synthesizeS(
  intent: Extract<Intent, { kind: "SYNTHESIZE_S" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  // Read selected BrandActions to ground the synthesis in real planned moves.
  const { db } = await import("@/lib/db");
  const selectedActions = await db.brandAction.findMany({
    where: {
      strategyId: intent.strategyId,
      OR: [
        { selected: true },
        ...(intent.selectedActionIds && intent.selectedActionIds.length > 0
          ? [{ id: { in: intent.selectedActionIds } }]
          : []),
      ],
    },
    take: 50,
    orderBy: { priority: "asc" },
  });

  const { generateBatch } = await import("@/server/services/notoria/engine");
  const batch = await generateBatch({
    strategyId: intent.strategyId,
    missionType: "S_SYNTHESIS",
  });

  return {
    status: "OK",
    summary: `S synthesized from ${selectedActions.length} selected actions: ${batch.totalRecos} recos`,
    tool: "notoria:S_SYNTHESIS",
    output: { batch, selectedActionsCount: selectedActions.length },
  };
}

// ── PRODUCE_DELIVERABLE — Glory sequence (PILLAR family) ─────────────

async function produceDeliverable(
  intent: Extract<Intent, { kind: "PRODUCE_DELIVERABLE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { executeSequence } = await import(
      "@/server/services/glory-tools/sequence-executor"
    );
    // Pass depth through so PILLAR sequences can run a lightweight teaser
    // post-intake (only the lead step) vs. full execution post-paywall.
    const result = await executeSequence(
      intent.target as never,
      intent.strategyId,
      {},
      undefined,
      { depth: intent.depth === "PREVIEW" ? "PREVIEW" : "FULL" },
    );
    return {
      status: "OK",
      summary: `Deliverable ${intent.target} (${intent.depth}) executed`,
      tool: `glory-sequence:${intent.target}`,
      output: result,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Sequence ${intent.target} failed`,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── INDEX_BRAND_CONTEXT — Seshat async indexer ───────────────────────

async function indexBrandContext(
  intent: Extract<Intent, { kind: "INDEX_BRAND_CONTEXT" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { indexBrandContext: runIndex } = await import(
      "@/server/services/seshat/context-store"
    );
    const result = await runIndex(intent.strategyId, intent.scope);
    return {
      status: "OK",
      summary: `Brand context indexed: ${result.totalNodes} nodes (${intent.scope}) in ${result.durationMs}ms`,
      tool: "seshat:indexer",
      output: result,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Brand context indexing failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: "seshat:indexer",
    };
  }
}

// ── RUN_ORACLE_FRAMEWORK — governed path with full audit trail ───────

async function runOracleFramework(
  intent: Extract<Intent, { kind: "RUN_ORACLE_FRAMEWORK" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { executeFramework } = await import("@/server/services/artemis");
    const result = await executeFramework(
      intent.frameworkSlug,
      intent.strategyId,
      intent.input,
    );
    return {
      status: "OK",
      summary: `Framework ${intent.frameworkSlug} executed (score=${result.score ?? "?"})`,
      tool: `artemis:framework:${intent.frameworkSlug}`,
      output: result,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Framework ${intent.frameworkSlug} failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: `artemis:framework:${intent.frameworkSlug}`,
    };
  }
}

// ── PROCESS_SESHAT_SIGNAL ────────────────────────────────────────────

async function processSeshatSignal(
  intent: Extract<Intent, { kind: "PROCESS_SESHAT_SIGNAL" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  // Default policy: HIGH/CRITICAL signals trigger an ADVE update proposal
  if (intent.signal.severity === "HIGH" || intent.signal.severity === "CRITICAL") {
    return {
      status: "OK",
      summary: `Seshat signal ${intent.signal.kind} (${intent.signal.severity}) — spawning ADVE update`,
      tool: "artemis:signal-router",
      spawnedIntents: [
        {
          kind: "PROPOSE_ADVE_UPDATE_FROM_RT",
          strategyId: intent.strategyId,
          trigger: "SIGNAL",
        },
      ],
    };
  }
  return {
    status: "OK",
    summary: `Seshat signal ${intent.signal.kind} (${intent.signal.severity}) — logged, no action`,
    tool: "artemis:signal-router",
  };
}

// ── UPDATE_MODEL_POLICY — governed mutation of the LLM Gateway policy ──

async function updateModelPolicy(
  intent: Extract<Intent, { kind: "UPDATE_MODEL_POLICY" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { updatePolicy } = await import("@/server/services/model-policy");
  const result = await updatePolicy({
    purpose: intent.purpose,
    anthropicModel: intent.anthropicModel,
    ollamaModel: intent.ollamaModel,
    allowOllamaSubstitution: intent.allowOllamaSubstitution,
    pipelineVersion: intent.pipelineVersion,
    notes: intent.notes ?? null,
    updatedBy: intent.updatedBy,
  });
  return {
    status: "OK",
    summary: `model-policy[${intent.purpose}] updated → anthropic=${result.anthropicModel} ollama=${result.ollamaModel ?? "—"} sub=${result.allowOllamaSubstitution} pipeline=${result.pipelineVersion} v${result.version}`,
    tool: "model-policy",
    output: result,
  };
}

// ── Phase 9 — PTAH_MATERIALIZE_BRIEF ────────────────────────────────────

async function ptahMaterialize(
  intent: Extract<Intent, { kind: "PTAH_MATERIALIZE_BRIEF" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { materializeBrief } = await import("@/server/services/ptah");
  const intentId = `intent-ptah-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await materializeBrief(
    {
      strategyId: intent.strategyId,
      sourceIntentId: intent.sourceIntentId,
      brief: intent.brief,
      overrideMixViolation: intent.overrideMixViolation,
    },
    { operatorId: intent.operatorId, intentId },
  );
  return {
    status: "OK",
    summary: `Ptah ${intent.brief.forgeSpec.kind} forge created → task=${result.taskId} provider=${result.provider} model=${result.providerModel} estCost=$${result.estimatedCostUsd.toFixed(3)}`,
    tool: "ptah",
    output: result,
    estimatedCost: { amount: result.estimatedCostUsd, currency: "USD" },
  };
}

// ── PTAH_RECONCILE_TASK (compensating intent — webhook arrived) ─────────

async function ptahReconcile(
  intent: Extract<Intent, { kind: "PTAH_RECONCILE_TASK" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { reconcileTask } = await import("@/server/services/ptah");
  const result = await reconcileTask(intent.taskId, intent.webhookPayload);
  return {
    status: "OK",
    summary: `Ptah task ${intent.taskId} reconciled — ${result.assetVersionIds.length} asset(s) created realCost=$${result.realisedCostUsd.toFixed(3)}`,
    tool: "ptah",
    output: result,
    estimatedCost: { amount: result.realisedCostUsd, currency: "USD" },
  };
}

// ── PTAH_REGENERATE_FADING_ASSET (Sentinel Loi 4 régime apogée) ─────────

async function ptahRegenerate(
  intent: Extract<Intent, { kind: "PTAH_REGENERATE_FADING_ASSET" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { regenerateFadingAsset } = await import("@/server/services/ptah");
  const intentId = `intent-ptah-regen-${Date.now()}`;
  const result = await regenerateFadingAsset(
    { strategyId: intent.strategyId, assetVersionId: intent.assetVersionId },
    { operatorId: intent.operatorId, intentId },
  );
  return {
    status: "OK",
    summary: `Ptah regenerate fading asset → task=${result.taskId}`,
    tool: "ptah",
    output: result,
  };
}
