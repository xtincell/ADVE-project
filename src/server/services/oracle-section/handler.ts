/**
 * OracleSection — Intent handler (Phase 21 F-C / ADR-0070)
 *
 * Handler du Intent kind `GENERATE_ORACLE_SECTION`. Branchement entre :
 *   - Service `oracle-section/` (lifecycle + lock optimistic, ADR-0068)
 *   - Runner dispatch (GLORY_SEQUENCE / GLORY_TOOL / FRAMEWORK)
 *   - LLM enforcement structuré côté chaque runner (ADR-0067)
 *
 * Flow :
 *   1. Resolve section meta + runner via SECTION_REGISTRY.
 *   2. Mode validation (FRESH / REGEN / RETRY) vs status courant.
 *   3. acquireGenerationLock — token + TTL 25s. Refus si déjà locked.
 *   4. Dispatch runner approprié (executeSequence / executeTool /
 *      executeFramework). Chaque runner traverse `executeStructuredLLMCall`
 *      quand outputSchema présent (F-A).
 *   5. recordGenerationSuccess avec payload + confidence.
 *   6. Sur erreur : recordGenerationFailure avec errorCode normalisé +
 *      détails structurés.
 *
 * Manual-first parity (ADR-0060) : l'Assembler global (F-D, à venir) émet
 * 35 fois ce kind ; aucun chemin de code parallèle. Test G_ASSEMBLER_PARITY
 * verrouille ça en Phase 21 F-D.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import {
  SECTION_REGISTRY,
  resolveSectionRunner,
  type SectionMeta,
  type SectionRunner,
} from "@/server/services/strategy-presentation/types";
import {
  acquireGenerationLock,
  recordGenerationSuccess,
  recordGenerationFailure,
  getSection,
} from "./index";
import {
  emitSectionStarted,
  emitSectionCompleted,
  emitSectionFailed,
} from "./stream-events";

type GenerateOracleSectionIntent = Extract<
  Intent,
  { kind: "GENERATE_ORACLE_SECTION" }
>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

const SECTION_REGISTRY_BY_NUMBER: ReadonlyMap<number, SectionMeta> = (() => {
  const map = new Map<number, SectionMeta>();
  for (const meta of SECTION_REGISTRY) {
    const n = Number(meta.number);
    if (Number.isInteger(n)) map.set(n, meta);
  }
  return map;
})();

/**
 * Entry point — dispatché par Mestor commandant case `GENERATE_ORACLE_SECTION`.
 */
export async function generateOracleSectionHandler(
  intent: GenerateOracleSectionIntent,
): Promise<HandlerResult> {
  const { strategyId, sectionId, mode, operatorId } = intent;
  const startTime = Date.now();

  // ── 1. Resolve section meta + runner ────────────────────────────────
  const meta = SECTION_REGISTRY_BY_NUMBER.get(sectionId);
  if (!meta) {
    return {
      status: "FAILED",
      summary: `Section §${sectionId} introuvable dans SECTION_REGISTRY.`,
      reason: "SECTION_NOT_FOUND",
    };
  }
  const runner = resolveSectionRunner(meta);
  if (!runner) {
    return {
      status: "FAILED",
      summary: `Section §${sectionId} (${meta.id}) n'a pas de runner défini (ni runner explicite ni sequenceKey legacy).`,
      reason: "RUNNER_NOT_DEFINED",
    };
  }

  // ── 2. Mode vs current status validation ────────────────────────────
  const current = await getSection(strategyId, sectionId);
  if (!current) {
    return {
      status: "FAILED",
      summary: `OracleSection §${sectionId} non seedée pour la Strategy ${strategyId}. Appelle getSectionsForStrategy d'abord (lazy seed) ou seedSectionsForStrategy.`,
      reason: "SECTION_ROW_MISSING",
    };
  }

  const modeValidation = validateModeAgainstStatus(mode, current.status);
  if (!modeValidation.ok) {
    return {
      status: "VETOED",
      summary: modeValidation.summary,
      reason: modeValidation.reason,
    };
  }

  // ── 3. Acquire generation lock ──────────────────────────────────────
  const lockResult = await acquireGenerationLock(strategyId, sectionId);
  if (!lockResult.ok || !lockResult.lockToken) {
    return {
      status: "VETOED",
      summary: `Section §${sectionId} (${meta.id}) — lock indisponible: ${lockResult.reason ?? "INTERNAL_ERROR"}.`,
      reason: lockResult.reason ?? "LOCK_ACQUIRE_FAILED",
    };
  }
  const lockToken = lockResult.lockToken;

  // F-E (ADR-0072) — Stream STARTED. Best-effort, ne casse pas la generation.
  emitSectionStarted({
    userId: operatorId,
    strategyId,
    sectionId,
    sectionTitle: meta.title,
    runner: { kind: runner.kind, ref: runner.ref },
    mode,
  });

  // ── 4. Dispatch runner ──────────────────────────────────────────────
  let runnerOutput: { payload: unknown; confidence: number | null };
  try {
    runnerOutput = await dispatchRunner(runner, strategyId, meta);
  } catch (err) {
    const errorBody = normalizeError(err);
    await recordGenerationFailure(strategyId, sectionId, lockToken, errorBody);
    const durationMs = Date.now() - startTime;
    emitSectionFailed({
      userId: operatorId,
      strategyId,
      sectionId,
      sectionTitle: meta.title,
      errorCode: errorBody.errorCode,
      errorMessage: errorBody.errorMessage,
      attempts: errorBody.attempts,
      durationMs,
    });
    return {
      status: "FAILED",
      summary: `Section §${sectionId} (${meta.id}) — runner failed: ${errorBody.errorMessage}`,
      reason: errorBody.errorCode,
      output: errorBody,
    };
  }

  // ── 5. Persist success ──────────────────────────────────────────────
  const persistResult = await recordGenerationSuccess(
    strategyId,
    sectionId,
    lockToken,
    runnerOutput.payload,
    runnerOutput.confidence,
  );
  if (!persistResult.ok) {
    const durationMs = Date.now() - startTime;
    emitSectionFailed({
      userId: operatorId,
      strategyId,
      sectionId,
      sectionTitle: meta.title,
      errorCode: persistResult.reason ?? "PERSIST_REFUSED",
      errorMessage: `Persist refused (${persistResult.reason ?? "INTERNAL_ERROR"}).`,
      durationMs,
    });
    return {
      status: "FAILED",
      summary: `Section §${sectionId} (${meta.id}) — persist refused (${persistResult.reason ?? "INTERNAL_ERROR"}).`,
      reason: persistResult.reason ?? "PERSIST_REFUSED",
    };
  }

  const durationMs = Date.now() - startTime;
  emitSectionCompleted({
    userId: operatorId,
    strategyId,
    sectionId,
    sectionTitle: meta.title,
    confidence: runnerOutput.confidence,
    durationMs,
    version: persistResult.section?.version ?? 1,
  });

  return {
    status: "OK",
    summary: `Section §${sectionId} (${meta.id}) générée [runner: ${runner.kind}/${runner.ref}, confidence: ${runnerOutput.confidence?.toFixed(2) ?? "n/a"}].`,
    output: {
      sectionId,
      sectionTitle: meta.title,
      runner: { kind: runner.kind, ref: runner.ref },
      confidence: runnerOutput.confidence,
      version: persistResult.section?.version,
      durationMs,
    },
  };
}

// ── Internals ───────────────────────────────────────────────────────

interface ModeValidation {
  ok: boolean;
  summary: string;
  reason?: string;
}

function validateModeAgainstStatus(
  mode: GenerateOracleSectionIntent["mode"],
  status: string,
): ModeValidation {
  if (status === "GENERATING") {
    return {
      ok: false,
      summary: `Section déjà en cours de génération (status=GENERATING). Attendre la complétion ou expirer le lock.`,
      reason: "ALREADY_GENERATING",
    };
  }
  if (mode === "FRESH" && status === "COMPLETE") {
    return {
      ok: false,
      summary: `Mode FRESH refusé : section déjà COMPLETE. Utilise REGEN pour ré-générer ou RETRY pour reprendre après échec.`,
      reason: "FRESH_BLOCKED_BY_COMPLETE",
    };
  }
  if (mode === "RETRY" && status !== "FAILED" && status !== "STALE") {
    return {
      ok: false,
      summary: `Mode RETRY n'est valide que sur status FAILED ou STALE (current: ${status}).`,
      reason: "RETRY_BLOCKED_WRONG_STATUS",
    };
  }
  return { ok: true, summary: "" };
}

interface NormalizedError {
  errorCode: string;
  errorMessage: string;
  attempts?: number;
  zodIssues?: unknown;
}

function normalizeError(err: unknown): NormalizedError {
  if (err && typeof err === "object" && "name" in err) {
    const e = err as { name: string; message?: string; attempts?: number; history?: unknown };
    if (e.name === "LLMStructuredCallError") {
      return {
        errorCode: "ZOD_VALIDATION_FAILED",
        errorMessage: e.message ?? "LLM Zod validation failed after retry.",
        attempts: e.attempts,
        zodIssues: e.history,
      };
    }
    if (e.name === "LLMValidationError") {
      return {
        errorCode: "ZOD_VALIDATION_FAILED",
        errorMessage: e.message ?? "LLM output failed Zod validation.",
        zodIssues: (err as { issues?: unknown }).issues,
      };
    }
  }
  return {
    errorCode: "RUNNER_FAILED",
    errorMessage: err instanceof Error ? err.message : String(err),
  };
}

/**
 * Dispatch runner par kind. Le contrat de retour est `{ payload, confidence }`
 * — chaque branche extrait la confidence du retour spécifique au runner.
 *
 * Pour cette première vague (F-C) :
 *   - GLORY_SEQUENCE → `executeSequence(key, strategyId, {})`
 *   - FRAMEWORK      → `executeFramework(slug, strategyId, {})`
 *   - GLORY_TOOL     → `executeTool(slug, strategyId, {})`
 *
 * `inputs` per-runner restent vides ici — chaque runner charge son propre
 * contexte via `loadStrategyContext()` interne. Plus tard (F-D) l'orchestrator
 * injectera des inputs explicites issus de sections amont (DAG dependsOn).
 */
async function dispatchRunner(
  runner: SectionRunner,
  strategyId: string,
  meta: SectionMeta,
): Promise<{ payload: unknown; confidence: number | null }> {
  if (runner.kind === "PURE_MAPPER") {
    // Phase 21.5 — 0ms LLM Pure mapping branch (ADR-0075)
    // 1. Fetch full strategy avec LE MÊME include que assemblePresentation.
    // (Bug prod 2026-07-16 : la copie locale de l'include avait drifté —
    // `communitySnapshots` absent → `mapKpisMesure` crashait « Cannot read
    // properties of undefined (reading 'map') » sur §16. Une seule source.)
    const { db } = await import("@/lib/db");
    const { PRESENTATION_INCLUDE } = await import("@/server/services/strategy-presentation");
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
      include: PRESENTATION_INCLUDE,
    });

    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found for PURE_MAPPER`);
    }

    // 2. Compute vector and classification dynamically
    const { sanitizeVector, classifyBrand, createEmptyVector } = await import("@/lib/types/advertis-vector");
    const rawVector = (strategy.pillars.find((p: any) => p.key === "vector")?.content as any) ?? createEmptyVector();
    const { vector } = sanitizeVector(rawVector);
    const classification = classifyBrand(vector.composite);

    // 3. Dynamically import and invoke the mapper
    const mappers = await import("@/server/services/strategy-presentation/section-mappers");
    const mapperFn = (mappers as Record<string, any>)[runner.ref];
    
    if (typeof mapperFn !== "function") {
      throw new Error(`PURE_MAPPER fn ${runner.ref} not found in section-mappers.ts`);
    }

    // 4. Mappers typically take (strategy, vector, classification) or just (strategy)
    let payload;
    if (runner.ref === "mapExecutiveSummary") {
      payload = mapperFn(strategy, vector, classification);
    } else {
      payload = mapperFn(strategy);
    }

    // Pure mapping is 100% confident (no LLM hallucination risk)
    return { payload, confidence: 1.0 };
  }
  // ── Composition déterministe d'abord (sections 22-35 — « Oracle sans LLM ») ──
  // Sections à composeur = COMPOSE-only (décision audit 2026-07-16) ; le runner
  // LLM ne sert plus que les sections SANS composeur, avec dégradation gracieuse
  // en cas d'échec. Les 21 sections CORE restent PURE_MAPPER au-dessus.
  const {
    hasDeterministicComposer,
    composeSectionDeterministic,
  } = await import("@/server/services/strategy-presentation/deterministic-composers");

  const runLLMRunner = async (): Promise<{ payload: unknown; confidence: number | null }> => {
    if (runner.kind === "GLORY_SEQUENCE") {
      const { executeSequence } = await import("@/server/services/artemis/tools/sequence-executor");
      type SeqKey = Parameters<typeof executeSequence>[0];
      const result = await executeSequence(
        runner.ref as SeqKey,
        strategyId,
        {},
      );
      return {
        payload: { sectionMeta: { id: meta.id, number: meta.number, title: meta.title }, runner, result },
        confidence: extractConfidenceFromSequenceResult(result),
      };
    }
    if (runner.kind === "FRAMEWORK") {
      const { executeFramework } = await import("@/server/services/artemis");
      const result = await executeFramework(runner.ref, strategyId, {});
      return {
        payload: { sectionMeta: { id: meta.id, number: meta.number, title: meta.title }, runner, result },
        confidence: extractConfidenceFromFrameworkResult(result),
      };
    }
    if (runner.kind === "GLORY_TOOL") {
      const { executeTool } = await import("@/server/services/artemis/tools/engine");
      const result = await executeTool(runner.ref, strategyId, {});
      return {
        payload: { sectionMeta: { id: meta.id, number: meta.number, title: meta.title }, runner, result },
        confidence: extractConfidenceFromToolResult(result),
      };
    }
    throw new Error(`Unknown runner kind: ${runner.kind as string}`);
  };

  // DÉCISION (audit 2026-07-16 `oracle-llm-payload-dead-end`) : les sections à
  // composeur déterministe sont COMPOSE-only. L'ancien flux payait le runner LLM,
  // rangeait son résultat dans OracleSection.payload (colonne qu'AUCUNE surface
  // ne rend) puis ÉCRASAIT le BrandAsset avec la composition déterministe — coût
  // LLM payé pour un contenu jamais livré. Cohérent ADR-0091 (Oracle 35/35 sans
  // LLM) : le composeur d'abord, le LLM seulement pour les sections sans composeur.
  if (hasDeterministicComposer(meta.id)) {
    const composed = await composeSectionDeterministic(strategyId, meta);
    if (composed) return composed;
  }

  try {
    const llmResult = await runLLMRunner();
    return llmResult;
  } catch (err) {
    if (hasDeterministicComposer(meta.id)) {
      const composed = await composeSectionDeterministic(strategyId, meta).catch(() => null);
      if (composed) {
        console.warn(
          `[oracle-section] runner ${runner.kind}/${runner.ref} failed for §${meta.number} — deterministic COMPOSE fallback engaged:`,
          err instanceof Error ? err.message : err,
        );
        return composed;
      }
    }
    throw err;
  }
}

function extractConfidenceFromSequenceResult(result: unknown): number | null {
  const r = result as { confidence?: number; metrics?: { confidence?: number } } | null;
  return typeof r?.confidence === "number"
    ? r.confidence
    : typeof r?.metrics?.confidence === "number"
      ? r.metrics.confidence
      : null;
}

function extractConfidenceFromFrameworkResult(result: { output: Record<string, unknown> | null; score: number | null }): number | null {
  const out = result.output;
  if (out && typeof out.confidence === "number") return out.confidence;
  if (typeof result.score === "number") return Math.max(0, Math.min(1, result.score / 10));
  return null;
}

function extractConfidenceFromToolResult(result: { output: Record<string, unknown> }): number | null {
  const conf = result.output?.confidence;
  return typeof conf === "number" ? conf : null;
}
