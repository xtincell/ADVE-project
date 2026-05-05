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

      case "INDEX_BRAND_SOURCE":
        return wrap({ ...base, ...(await indexBrandSource(intent)) });

      case "CLASSIFY_BRAND_SOURCE":
        return wrap({ ...base, ...(await classifyBrandSource(intent)) });

      case "PROPOSE_VAULT_FROM_SOURCE":
        return wrap({ ...base, ...(await proposeVaultFromSource(intent)) });

      case "INGEST_MARKET_STUDY":
        return wrap({ ...base, ...(await ingestMarketStudyHandler(intent)) });

      case "RE_EXTRACT_MARKET_STUDY":
        return wrap({ ...base, ...(await reExtractMarketStudyHandler(intent)) });

      case "FETCH_EXTERNAL_FEED":
        return wrap({ ...base, ...(await fetchExternalFeedHandler(intent)) });

      case "PROCESS_SESHAT_SIGNAL":
        return wrap({ ...base, ...(await processSeshatSignal(intent)) });

      case "RUN_ORACLE_SEQUENCE":
        return wrap({ ...base, ...(await runOracleSequence(intent)) });

      case "PROMOTE_SEQUENCE_LIFECYCLE":
        return wrap({ ...base, ...(await promoteSequenceLifecycle(intent)) });

      case "UPDATE_MODEL_POLICY":
        return wrap({ ...base, ...(await updateModelPolicy(intent)) });

      // ── Phase 9 — Ptah Forge (ADR-0009) ──────────────────────────
      case "PTAH_MATERIALIZE_BRIEF":
        return wrap({ ...base, ...(await ptahMaterialize(intent)) });

      case "PTAH_RECONCILE_TASK":
        return wrap({ ...base, ...(await ptahReconcile(intent)) });

      case "PTAH_REGENERATE_FADING_ASSET":
        return wrap({ ...base, ...(await ptahRegenerate(intent)) });

      // ── Phase 14 — Imhotep full activation (ADR-0019, supersedes ADR-0017) ──
      case "IMHOTEP_DRAFT_CREW_PROGRAM":
        return wrap({ ...base, ...(await imhotepDraftCrewProgram(intent)) });

      case "IMHOTEP_MATCH_TALENT_TO_MISSION":
        return wrap({ ...base, ...(await imhotepMatchTalent(intent)) });

      case "IMHOTEP_ASSEMBLE_CREW":
        return wrap({ ...base, ...(await imhotepAssembleCrew(intent)) });

      case "IMHOTEP_EVALUATE_TIER":
        return wrap({ ...base, ...(await imhotepEvaluateTier(intent)) });

      case "IMHOTEP_ENROLL_FORMATION":
        return wrap({ ...base, ...(await imhotepEnrollFormation(intent)) });

      case "IMHOTEP_CERTIFY_TALENT":
        return wrap({ ...base, ...(await imhotepCertifyTalent(intent)) });

      case "IMHOTEP_QC_DELIVERABLE":
        return wrap({ ...base, ...(await imhotepQcDeliverable(intent)) });

      case "IMHOTEP_RECOMMEND_FORMATION":
        return wrap({ ...base, ...(await imhotepRecommendFormation(intent)) });

      // ── Phase 15 — Anubis full activation (ADR-0020, supersedes ADR-0018) ──
      case "ANUBIS_DRAFT_COMMS_PLAN":
        return wrap({ ...base, ...(await anubisDraftCommsPlan(intent)) });

      case "ANUBIS_BROADCAST_MESSAGE":
        return wrap({ ...base, ...(await anubisBroadcast(intent)) });

      case "ANUBIS_BUY_AD_INVENTORY":
        return wrap({ ...base, ...(await anubisBuyAdInventory(intent)) });

      case "ANUBIS_SEGMENT_AUDIENCE":
        return wrap({ ...base, ...(await anubisSegmentAudience(intent)) });

      case "ANUBIS_TRACK_DELIVERY":
        return wrap({ ...base, ...(await anubisTrackDelivery(intent)) });

      case "ANUBIS_REGISTER_CREDENTIAL":
        return wrap({ ...base, ...(await anubisRegisterCredential(intent)) });

      case "ANUBIS_REVOKE_CREDENTIAL":
        return wrap({ ...base, ...(await anubisRevokeCredential(intent)) });

      case "ANUBIS_TEST_CHANNEL":
        return wrap({ ...base, ...(await anubisTestChannel(intent)) });

      case "ANUBIS_SCHEDULE_BROADCAST":
        return wrap({ ...base, ...(await anubisScheduleBroadcast(intent)) });

      case "ANUBIS_CANCEL_BROADCAST":
        return wrap({ ...base, ...(await anubisCancelBroadcast(intent)) });

      case "ANUBIS_FETCH_DELIVERY_REPORT":
        return wrap({ ...base, ...(await anubisFetchDeliveryReport(intent)) });

      // ── ADR-0023 — Operator amend ADVE pillar ─────────────────────
      case "OPERATOR_AMEND_PILLAR": {
        const { operatorAmendPillar } = await import(
          "@/server/services/mestor/operator-amend"
        );
        return wrap({ ...base, ...(await operatorAmendPillar(intent)) });
      }

      // ── ADR-0028 — Strategy archive 2-phase ───────────────────────
      case "OPERATOR_ARCHIVE_STRATEGY": {
        const { archiveStrategyHandler } = await import(
          "@/server/services/strategy-archive"
        );
        return wrap({ ...base, ...(await archiveStrategyHandler(intent)) });
      }
      case "OPERATOR_RESTORE_STRATEGY": {
        const { restoreStrategyHandler } = await import(
          "@/server/services/strategy-archive"
        );
        return wrap({ ...base, ...(await restoreStrategyHandler(intent)) });
      }
      case "OPERATOR_PURGE_ARCHIVED_STRATEGY": {
        const { purgeArchivedStrategyHandler } = await import(
          "@/server/services/strategy-archive"
        );
        return wrap({ ...base, ...(await purgeArchivedStrategyHandler(intent)) });
      }

      // ── ADR-0033 — atomic purge + re-ingest of an intake-origin source ──
      case "INTAKE_SOURCE_PURGE_AND_REINGEST": {
        const { purgeAndReingestHandler } = await import(
          "@/server/services/quick-intake/purge-and-reingest"
        );
        return wrap({ ...base, ...(await purgeAndReingestHandler(intent)) });
      }

      // ── Phase 17b (ADR-0050 — anciennement ADR-0037) — Deliverable Forge output-first composition ──
      // Mode PREVIEW : résout DAG + scan vault + estime coût (read-only).
      // Le dispatch full async (status=DISPATCHED) viendra avec le router
      // tRPC commit 4 ou ultérieur.
      case "COMPOSE_DELIVERABLE": {
        const { composeDeliverable } = await import(
          "@/server/services/deliverable-orchestrator"
        );
        const result = await composeDeliverable({
          strategyId: intent.strategyId,
          operatorId: intent.operatorId,
          targetKind: intent.targetKind,
          campaignId: intent.campaignId,
          overrideManipulationMode: intent.overrideManipulationMode,
          previewOnly: intent.previewOnly,
        });
        return wrap({
          ...base,
          status: result.status === "MISSING_PRECONDITIONS" ? "VETOED" : "OK",
          summary: result.summary,
        });
      }
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

// ── INDEX_BRAND_SOURCE — single source → BRAND_SOURCE chunks ─────────

async function indexBrandSource(
  intent: Extract<Intent, { kind: "INDEX_BRAND_SOURCE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { indexBrandSource: runIndex } = await import(
      "@/server/services/seshat/context-store"
    );
    const result = await runIndex(intent.sourceId);
    return {
      status: "OK",
      summary: `Brand source ${intent.sourceId} indexed: ${result.chunks} chunks in ${result.durationMs}ms`,
      tool: "seshat:indexer",
      output: result,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Brand source indexing failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: "seshat:indexer",
    };
  }
}

// ── CLASSIFY_BRAND_SOURCE — heuristic + LLM proposal generation ──────

async function classifyBrandSource(
  intent: Extract<Intent, { kind: "CLASSIFY_BRAND_SOURCE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { classifySource } = await import(
      "@/server/services/source-classifier"
    );
    const result = await classifySource(intent.sourceId);
    return {
      status: "OK",
      summary: `Source ${intent.sourceId} classified: ${result.proposals.length} proposals in ${result.durationMs}ms`,
      tool: "source-classifier:classify",
      output: { proposalsCount: result.proposals.length, durationMs: result.durationMs },
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Source classification failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: "source-classifier:classify",
    };
  }
}

// ── PROPOSE_VAULT_FROM_SOURCE — persist N BrandAsset DRAFTs from a source ──

async function proposeVaultFromSource(
  intent: Extract<Intent, { kind: "PROPOSE_VAULT_FROM_SOURCE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { proposeBrandAssetsFromSource } = await import(
      "@/server/services/source-classifier"
    );
    const result = await proposeBrandAssetsFromSource(intent.sourceId, intent.operatorId);
    return {
      status: "OK",
      summary: `Vault proposals persisted: ${result.brandAssetIds.length} BrandAsset DRAFTs from source ${intent.sourceId}`,
      tool: "source-classifier:propose",
      output: { brandAssetIds: result.brandAssetIds, durationMs: result.durationMs },
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Vault proposal generation failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: "source-classifier:propose",
    };
  }
}

// ── RUN_ORACLE_SEQUENCE — governed path with full audit trail ────────
//
// Phase 17 (ADR-0039) — Sequence devient l'unité publique unique
// d'Artemis. Tous les Oracle frameworks legacy sont accessibles via
// leur wrap `WRAP-FW-<slug>` (cf. `framework-wrappers.ts`). Ce handler
// route `RUN_ORACLE_SEQUENCE` vers `executeSequence` qui orchestre
// l'ensemble (PILLAR pulls + ARTEMIS step + GLORY synthesize + writeback).

async function runOracleSequence(
  intent: Extract<Intent, { kind: "RUN_ORACLE_SEQUENCE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { executeSequence } = await import(
      "@/server/services/artemis/tools/sequence-executor"
    );
    const result = await executeSequence(
      intent.sequenceKey as never,
      intent.strategyId,
      { _oracleEnrichmentMode: true },
    );
    const completed = result.steps.filter((s) => s.status === "SUCCESS").length;
    const total = result.steps.length;
    return {
      status: completed === total ? "OK" : completed > 0 ? "OK" : "FAILED",
      summary: `Sequence ${intent.sequenceKey} executed (${completed}/${total} steps)`,
      tool: `artemis:sequence:${intent.sequenceKey}`,
      output: { output: result.finalContext, steps: result.steps },
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: `Sequence ${intent.sequenceKey} failed`,
      reason: err instanceof Error ? err.message : String(err),
      tool: `artemis:sequence:${intent.sequenceKey}`,
    };
  }
}

// ── PROMOTE_SEQUENCE_LIFECYCLE — governance lifecycle transitions ─────
//
// Phase 17 (ADR-0042) — Promotion DRAFT → STABLE → DEPRECATED via Intent
// gouverné. Transitions valides : DRAFT→STABLE, STABLE→DEPRECATED,
// DEPRECATED→DRAFT (re-iteration). Refus DRAFT→DEPRECATED direct (force
// la promotion explicite via STABLE).
//
// Recalcule + stocke `promptHash` au moment de la promotion vers STABLE
// (anti-drift CI bloquant si le hash diverge sans nouveau Intent).
//
// Note : ce handler est un STUB qui logge la transition dans IntentEmission.
// La persistence du `lifecycle` + `promptHash` côté GlorySequenceDef requiert
// un store DB dédié (table `SequenceLifecycleState`) — Chantier D-bis.
// Pour l'instant, le contrat type-level est posé, l'audit hash chain
// fonctionne, le anti-drift CI lit `seq.lifecycle` directement depuis le
// code (sequences.ts).

const VALID_LIFECYCLE_TRANSITIONS: Record<string, ReadonlyArray<string>> = {
  DRAFT: ["STABLE"],
  STABLE: ["DEPRECATED", "DRAFT"], // STABLE→DRAFT autorisé pour rollback
  DEPRECATED: ["DRAFT"], // re-iteration
};

async function promoteSequenceLifecycle(
  intent: Extract<Intent, { kind: "PROMOTE_SEQUENCE_LIFECYCLE" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  const { fromLifecycle, toLifecycle, sequenceKey, justification } = intent;

  const validTargets = VALID_LIFECYCLE_TRANSITIONS[fromLifecycle];
  if (!validTargets || !validTargets.includes(toLifecycle)) {
    return {
      status: "FAILED",
      summary: `Invalid lifecycle transition for ${sequenceKey}`,
      reason: `${fromLifecycle} → ${toLifecycle} not allowed (valid: ${validTargets?.join(", ") ?? "none"})`,
      tool: `artemis:lifecycle:${sequenceKey}`,
    };
  }

  if (!justification || justification.trim().length < 10) {
    return {
      status: "FAILED",
      summary: `Lifecycle promotion requires justification`,
      reason: "Justification must be at least 10 characters (audit trail requirement)",
      tool: `artemis:lifecycle:${sequenceKey}`,
    };
  }

  // Recalcule promptHash si promotion vers STABLE.
  let newPromptHash: string | undefined;
  if (toLifecycle === "STABLE") {
    try {
      const { getSequence } = await import("@/server/services/artemis/tools/sequences");
      const { computeSequencePromptHash } = await import(
        "@/server/services/artemis/tools/sequence-hash"
      );
      const seq = getSequence(sequenceKey as never);
      if (seq) newPromptHash = computeSequencePromptHash(seq);
    } catch {
      // Sequence-hash non chargeable — non-bloquant
    }
  }

  return {
    status: "OK",
    summary: `Sequence ${sequenceKey} ${fromLifecycle} → ${toLifecycle}`,
    tool: `artemis:lifecycle:${sequenceKey}`,
    output: {
      sequenceKey,
      fromLifecycle,
      toLifecycle,
      promptHash: newPromptHash,
      justification,
      operatorId: intent.operatorId,
    },
  };
}

// ── INGEST_MARKET_STUDY / RE_EXTRACT_MARKET_STUDY (ADR-0037 PR-I) ────

async function ingestMarketStudyHandler(
  intent: Extract<Intent, { kind: "INGEST_MARKET_STUDY" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { confirmMarketStudy } = await import("@/server/services/seshat/market-study-ingestion");
    const { MarketStudyExtractionSchema } = await import("@/server/services/seshat/market-study-ingestion/types");
    const validated = MarketStudyExtractionSchema.safeParse(intent.payload.extraction);
    if (!validated.success) {
      return {
        status: "FAILED",
        summary: "INGEST_MARKET_STUDY payload schema invalid",
        reason: validated.error.message.slice(0, 200),
        tool: "seshat:market-study-ingestion",
      };
    }
    const result = await confirmMarketStudy({
      sha256: intent.payload.sha256,
      countryCode: intent.payload.countryCode,
      sector: intent.payload.sector,
      uploadedBy: intent.payload.uploadedBy,
      extraction: validated.data,
      sourceUrl: intent.payload.sourceUrl,
      strategyId: intent.strategyId === "(global)" ? undefined : intent.strategyId,
    });
    return {
      status: result.status === "OK" ? "OK" : result.status === "DUPLICATE" ? "OK" : "FAILED",
      summary: result.status === "OK"
        ? `MarketStudy ingested: ${result.entriesCreated} entries (countryCode=${result.countryCode}, sector=${result.sector})`
        : result.status === "DUPLICATE"
          ? `MarketStudy already ingested (sha256=${result.sha256.slice(0, 8)})`
          : `MarketStudy ingestion failed: ${result.error ?? "unknown"}`,
      tool: "seshat:market-study-ingestion",
      output: result as never,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: "INGEST_MARKET_STUDY runtime failure",
      reason: err instanceof Error ? err.message : String(err),
      tool: "seshat:market-study-ingestion",
    };
  }
}

async function reExtractMarketStudyHandler(
  intent: Extract<Intent, { kind: "RE_EXTRACT_MARKET_STUDY" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { reExtractMarketStudy } = await import("@/server/services/seshat/market-study-ingestion");
    const result = await reExtractMarketStudy(intent.rawEntryId);
    return {
      status: result.status === "OK" ? "OK" : "FAILED",
      summary: result.status === "OK"
        ? `MarketStudy re-extracted: ${result.entriesCreated} new entries`
        : `Re-extract failed: ${result.error ?? "unknown"}`,
      tool: "seshat:market-study-ingestion",
      output: result as never,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: "RE_EXTRACT_MARKET_STUDY runtime failure",
      reason: err instanceof Error ? err.message : String(err),
      tool: "seshat:market-study-ingestion",
    };
  }
}

async function fetchExternalFeedHandler(
  intent: Extract<Intent, { kind: "FETCH_EXTERNAL_FEED" }>,
): Promise<Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">> {
  try {
    const { fetchAndPersistFeedDigest } = await import("@/server/services/seshat/external-feeds");
    const result = await fetchAndPersistFeedDigest(intent.countryCode, intent.sector);
    return {
      status: result.status === "OK" ? "OK" : "FAILED",
      summary: result.status === "OK"
        ? `Feed digest persisted ${result.countryCode}×${result.sector}: ${result.signalsCreated} signaux + ${result.trendTrackerVarsCovered}/49 vars`
        : `Feed fetch failed: ${result.error ?? "unknown"}`,
      tool: "seshat:external-feeds",
      output: result as never,
    };
  } catch (err) {
    return {
      status: "FAILED",
      summary: "FETCH_EXTERNAL_FEED runtime failure",
      reason: err instanceof Error ? err.message : String(err),
      tool: "seshat:external-feeds",
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

// ── Phase 14 — Imhotep full activation handlers (ADR-0019, supersedes ADR-0017) ──
// 6ème Neter ACTIF. Orchestrateur des satellites matching/talent/team/tier/qc.

type HandlerResult = Omit<IntentResult, "intentKind" | "strategyId" | "startedAt" | "completedAt">;

async function imhotepDraftCrewProgram(
  intent: Extract<Intent, { kind: "IMHOTEP_DRAFT_CREW_PROGRAM" }>,
): Promise<HandlerResult> {
  const { draftCrewProgram } = await import("@/server/services/imhotep");
  const draft = await draftCrewProgram({
    strategyId: intent.strategyId,
    sector: intent.sector,
  });
  return {
    status: "OK",
    summary: `Imhotep crew program ${draft.status} — ${draft.rolesRequired?.length ?? 0} rôles requis. ADRs: ${draft.adrRefs.join(", ")}`,
    tool: "imhotep",
    output: draft,
  };
}

async function imhotepMatchTalent(
  intent: Extract<Intent, { kind: "IMHOTEP_MATCH_TALENT_TO_MISSION" }>,
): Promise<HandlerResult> {
  const { matchTalentToMission } = await import("@/server/services/imhotep");
  const result = await matchTalentToMission({
    missionId: intent.missionId,
    minMatchScore: intent.minMatchScore,
    limit: intent.limit,
  });
  return {
    status: "OK",
    summary: `Imhotep matched ${result.candidates.length} talents for mission ${intent.missionId}`,
    tool: "imhotep",
    output: result,
  };
}

async function imhotepAssembleCrew(
  intent: Extract<Intent, { kind: "IMHOTEP_ASSEMBLE_CREW" }>,
): Promise<HandlerResult> {
  const { assembleCrew } = await import("@/server/services/imhotep");
  const crew = await assembleCrew({
    missionId: intent.missionId,
    rolesRequired: intent.rolesRequired,
    budgetCapUsd: intent.budgetCapUsd,
  });
  return {
    status: crew.unfilled.length > 0 ? "DOWNGRADED" : "OK",
    summary: `Imhotep assembled crew of ${crew.members.length}/${(intent.rolesRequired?.length ?? 0) + crew.unfilled.length} for mission ${intent.missionId} (~$${crew.estimatedCostUsd})`,
    tool: "imhotep",
    output: crew,
    reason: crew.unfilled.length > 0 ? `${crew.unfilled.length} rôles non pourvus` : undefined,
  };
}

async function imhotepEvaluateTier(
  intent: Extract<Intent, { kind: "IMHOTEP_EVALUATE_TIER" }>,
): Promise<HandlerResult> {
  const { evaluateTier } = await import("@/server/services/imhotep");
  const evalResult = await evaluateTier({ talentProfileId: intent.talentProfileId });
  return {
    status: "OK",
    summary: `Imhotep tier ${evalResult.action} for talent ${intent.talentProfileId}: ${evalResult.currentTier} → ${evalResult.recommendedTier}`,
    tool: "imhotep",
    output: evalResult,
  };
}

async function imhotepEnrollFormation(
  intent: Extract<Intent, { kind: "IMHOTEP_ENROLL_FORMATION" }>,
): Promise<HandlerResult> {
  const { enrollFormation } = await import("@/server/services/imhotep");
  const result = await enrollFormation({
    userId: intent.userId,
    courseId: intent.courseId,
  });
  return {
    status: "OK",
    summary: `Imhotep formation ${result.status} for user ${intent.userId} into course ${intent.courseId}`,
    tool: "imhotep",
    output: result,
  };
}

async function imhotepCertifyTalent(
  intent: Extract<Intent, { kind: "IMHOTEP_CERTIFY_TALENT" }>,
): Promise<HandlerResult> {
  const { certifyTalent } = await import("@/server/services/imhotep");
  const result = await certifyTalent({
    talentProfileId: intent.talentProfileId,
    certificationName: intent.certificationName,
    category: intent.category,
    expiresAt: intent.expiresAt,
    metadata: intent.metadata,
  });
  return {
    status: "OK",
    summary: `Imhotep certified talent ${intent.talentProfileId}: ${intent.certificationName}`,
    tool: "imhotep",
    output: result,
  };
}

async function imhotepQcDeliverable(
  intent: Extract<Intent, { kind: "IMHOTEP_QC_DELIVERABLE" }>,
): Promise<HandlerResult> {
  const { qcDeliverable } = await import("@/server/services/imhotep");
  const result = await qcDeliverable({
    deliverableId: intent.deliverableId,
    reviewerId: intent.reviewerId,
  });
  return {
    status: result.routedTo === "ESCALATED" ? "DOWNGRADED" : "OK",
    summary: `Imhotep QC routed deliverable ${intent.deliverableId} → ${result.routedTo}${result.automatedScore !== undefined ? ` (score ${result.automatedScore})` : ""}`,
    tool: "imhotep",
    output: result,
    reason: result.routedTo === "ESCALATED" ? "no reviewer available" : undefined,
  };
}

async function imhotepRecommendFormation(
  intent: Extract<Intent, { kind: "IMHOTEP_RECOMMEND_FORMATION" }>,
): Promise<HandlerResult> {
  const { recommendFormation } = await import("@/server/services/imhotep");
  const result = await recommendFormation({
    userId: intent.userId,
    skillGap: intent.skillGap,
  });
  return {
    status: "OK",
    summary: `Imhotep recommended ${result.recommendedCourses.length} courses for user ${intent.userId}${intent.skillGap ? ` (gap: ${intent.skillGap})` : ""}`,
    tool: "imhotep",
    output: result,
  };
}

// ── Phase 15 — Anubis full activation handlers (ADR-0020, supersedes ADR-0018) ──
// 7ème Neter ACTIF. Orchestrateur broadcast / ad networks / notification center / credentials vault.
// Provider façades feature-flagged : retournent DEFERRED_AWAITING_CREDENTIALS si pas de creds (cf. ADR-0021).

async function anubisDraftCommsPlan(
  intent: Extract<Intent, { kind: "ANUBIS_DRAFT_COMMS_PLAN" }>,
): Promise<HandlerResult> {
  const { draftCommsPlan } = await import("@/server/services/anubis");
  const draft = await draftCommsPlan({
    strategyId: intent.strategyId,
    audience: intent.audience,
  });
  return {
    status: "OK",
    summary: `Anubis comms plan ${draft.status} — ${draft.channels?.length ?? 0} canaux planifiés. ADRs: ${draft.adrRefs.join(", ")}`,
    tool: "anubis",
    output: draft,
  };
}

async function anubisBroadcast(
  intent: Extract<Intent, { kind: "ANUBIS_BROADCAST_MESSAGE" }>,
): Promise<HandlerResult> {
  const { broadcastMessage } = await import("@/server/services/anubis");
  const result = await broadcastMessage({
    commsPlanId: intent.commsPlanId,
    channels: intent.channels,
    operatorId: intent.operatorId,
  });
  if (result.status === "DEFERRED_AWAITING_CREDENTIALS") {
    return {
      status: "DOWNGRADED",
      summary: `Anubis broadcast deferred for plan ${intent.commsPlanId} (${result.connectorType} credentials missing)`,
      tool: "anubis",
      output: result,
      reason: "credentials missing — configure via /console/anubis/credentials",
    };
  }
  return {
    status: "QUEUED",
    summary: `Anubis broadcast queued (${result.status}) for plan ${intent.commsPlanId} — job ${result.broadcastJobId}`,
    tool: "anubis",
    output: result,
  };
}

async function anubisBuyAdInventory(
  intent: Extract<Intent, { kind: "ANUBIS_BUY_AD_INVENTORY" }>,
): Promise<HandlerResult> {
  const { buyAdInventory } = await import("@/server/services/anubis");
  const result = await buyAdInventory({
    campaignId: intent.campaignId,
    provider: intent.provider,
    budgetUsd: intent.budgetUsd,
    adCopy: intent.adCopy,
    operatorId: intent.operatorId,
  });
  return {
    status: result.status === "DEFERRED_AWAITING_CREDENTIALS" ? "DOWNGRADED" : "OK",
    summary: `Anubis ad inventory ${result.status} on ${intent.provider} for $${intent.budgetUsd}`,
    tool: "anubis",
    output: result,
    reason: result.status === "DEFERRED_AWAITING_CREDENTIALS" ? `${intent.provider} credentials missing` : undefined,
  };
}

async function anubisSegmentAudience(
  intent: Extract<Intent, { kind: "ANUBIS_SEGMENT_AUDIENCE" }>,
): Promise<HandlerResult> {
  const { segmentAudience } = await import("@/server/services/anubis");
  const result = await segmentAudience({
    rules: intent.rules,
    operatorId: intent.operatorId,
  });
  return {
    status: "OK",
    summary: `Anubis segmented audience: ${result.estimatedCount} candidates`,
    tool: "anubis",
    output: result,
  };
}

async function anubisTrackDelivery(
  intent: Extract<Intent, { kind: "ANUBIS_TRACK_DELIVERY" }>,
): Promise<HandlerResult> {
  const { trackDelivery } = await import("@/server/services/anubis");
  const result = await trackDelivery({ broadcastJobId: intent.broadcastJobId });
  return {
    status: "OK",
    summary: `Anubis tracked delivery for job ${intent.broadcastJobId}: ${result.delivered}/${result.total} delivered`,
    tool: "anubis",
    output: result,
  };
}

async function anubisRegisterCredential(
  intent: Extract<Intent, { kind: "ANUBIS_REGISTER_CREDENTIAL" }>,
): Promise<HandlerResult> {
  const { registerCredential } = await import("@/server/services/anubis");
  const result = await registerCredential({
    operatorId: intent.operatorId,
    connectorType: intent.connectorType,
    config: intent.config,
  });
  return {
    status: "OK",
    summary: `Anubis registered credential for ${intent.connectorType} (status: ${result.status})`,
    tool: "anubis",
    output: result,
  };
}

async function anubisRevokeCredential(
  intent: Extract<Intent, { kind: "ANUBIS_REVOKE_CREDENTIAL" }>,
): Promise<HandlerResult> {
  const { revokeCredential } = await import("@/server/services/anubis");
  const result = await revokeCredential({
    operatorId: intent.operatorId,
    connectorType: intent.connectorType,
  });
  return {
    status: "OK",
    summary: `Anubis revoked credential for ${intent.connectorType}`,
    tool: "anubis",
    output: result,
  };
}

async function anubisTestChannel(
  intent: Extract<Intent, { kind: "ANUBIS_TEST_CHANNEL" }>,
): Promise<HandlerResult> {
  const { testChannel } = await import("@/server/services/anubis");
  const result = await testChannel({
    operatorId: intent.operatorId,
    connectorType: intent.connectorType,
  });
  return {
    status: result.success ? "OK" : "FAILED",
    summary: `Anubis tested channel ${intent.connectorType}: ${result.success ? "OK" : result.reason}`,
    tool: "anubis",
    output: result,
    reason: result.success ? undefined : result.reason,
  };
}

async function anubisScheduleBroadcast(
  intent: Extract<Intent, { kind: "ANUBIS_SCHEDULE_BROADCAST" }>,
): Promise<HandlerResult> {
  const { scheduleBroadcast } = await import("@/server/services/anubis");
  const result = await scheduleBroadcast({
    commsPlanId: intent.commsPlanId,
    scheduledFor: intent.scheduledFor,
  });
  return {
    status: "OK",
    summary: `Anubis scheduled broadcast for plan ${intent.commsPlanId} at ${intent.scheduledFor}`,
    tool: "anubis",
    output: result,
  };
}

async function anubisCancelBroadcast(
  intent: Extract<Intent, { kind: "ANUBIS_CANCEL_BROADCAST" }>,
): Promise<HandlerResult> {
  const { cancelBroadcast } = await import("@/server/services/anubis");
  const result = await cancelBroadcast({ broadcastJobId: intent.broadcastJobId });
  return {
    status: "OK",
    summary: `Anubis cancelled broadcast job ${intent.broadcastJobId} (was: ${result.previousStatus})`,
    tool: "anubis",
    output: result,
  };
}

async function anubisFetchDeliveryReport(
  intent: Extract<Intent, { kind: "ANUBIS_FETCH_DELIVERY_REPORT" }>,
): Promise<HandlerResult> {
  const { fetchDeliveryReport } = await import("@/server/services/anubis");
  const result = await fetchDeliveryReport({ broadcastJobId: intent.broadcastJobId });
  return {
    status: result.status === "DEFERRED_AWAITING_CREDENTIALS" ? "DOWNGRADED" : "OK",
    summary: `Anubis delivery report for ${intent.broadcastJobId}: ${result.status}`,
    tool: "anubis",
    output: result,
    reason: result.status === "DEFERRED_AWAITING_CREDENTIALS" ? "credentials missing" : undefined,
  };
}
