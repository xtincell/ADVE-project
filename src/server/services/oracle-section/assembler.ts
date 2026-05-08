/**
 * Oracle Assembler — Manual-first orchestrator (Phase 21 F-D / ADR-0071)
 *
 * Boucle sur `GENERATE_ORACLE_SECTION` × N pour matérialiser un sous-ensemble
 * (ou la totalité) des 35 sections Oracle.
 *
 * **Invariant manual-first parity** (ADR-0060) :
 *
 *   Ce handler n'appelle JAMAIS directement `executeStructuredLLMCall`,
 *   `executeSequence`, `executeFramework`, `executeTool`, `callLLM`.
 *   Il émet uniquement `mestor.emitIntent({ kind: "GENERATE_ORACLE_SECTION", ... })`.
 *   Le test bloquant `assembler-uses-manual-path.test.ts` enforce.
 *
 * **Garanties** :
 *
 *   1. Resilient — un échec individuel (FAILED, VETOED, lock conflict) ne
 *      remonte pas. L'orchestrator continue avec les autres sections.
 *   2. Status global — `COMPLETE` si zéro FAILED, `PARTIAL` si ≥1 FAILED,
 *      `EMPTY` si scope vide.
 *   3. Sequential pour cette première vague (F-D MVP). Parallélisme
 *      bornée + topoSort dépendances viendra avec F-D-suite.
 *   4. Mode per-section auto-détecté depuis status courant :
 *        PENDING → FRESH, COMPLETE → REGEN, FAILED/STALE → RETRY.
 *
 * Cf. ADR-0071, mégasprint Phase 21 F-D.
 */

import type { Intent, IntentResult } from "@/server/services/mestor/intents";
import {
  getSectionsForStrategy,
  type OracleSectionRow,
} from "./index";
import {
  emitAssemblerStarted,
  emitAssemblerProgress,
  emitAssemblerDone,
} from "./stream-events";

type AssembleOracleIntent = Extract<Intent, { kind: "ASSEMBLE_ORACLE" }>;

type HandlerResult = Pick<
  IntentResult,
  "status" | "summary" | "tool" | "output" | "reason" | "estimatedCost"
>;

interface SectionRunSummary {
  sectionId: number;
  status: "OK" | "FAILED" | "VETOED" | "ERRORED";
  reason?: string;
  attempts?: number;
}

/**
 * Entry point — dispatché par Mestor commandant case `ASSEMBLE_ORACLE`.
 */
export async function assembleOracleHandler(
  intent: AssembleOracleIntent,
): Promise<HandlerResult> {
  const { strategyId, scope, operatorId } = intent;
  const startTime = Date.now();

  // ── 1. Charge l'état courant des 35 sections (lazy seed transparent) ──
  const sections = await getSectionsForStrategy(strategyId);

  // ── 2. Filtre par scope ────────────────────────────────────────────
  const targets = filterScope(sections, scope);
  if (targets.length === 0) {
    // F-E — assembler.STARTED suivi immédiat de DONE (scope vide).
    emitAssemblerStarted({ userId: operatorId, strategyId, scope: scopeLabel(scope), total: 0 });
    emitAssemblerDone({
      userId: operatorId,
      strategyId,
      scope: scopeLabel(scope),
      overallStatus: "EMPTY",
      total: 0,
      succeeded: 0,
      failed: 0,
      durationMs: Date.now() - startTime,
    });
    return {
      status: "OK",
      summary: `Aucune section à générer (scope=${scopeLabel(scope)}).`,
      output: { scope: scopeLabel(scope), total: 0, succeeded: 0, failed: 0, results: [] },
    };
  }

  // F-E (ADR-0072) — Stream assembler STARTED.
  emitAssemblerStarted({
    userId: operatorId,
    strategyId,
    scope: scopeLabel(scope),
    total: targets.length,
  });

  // ── 3. Pour chaque cible : émet GENERATE_ORACLE_SECTION via Mestor ──
  // Manual-first parity (ADR-0060) — c'est le seul chemin que le handler
  // emprunte. Resilient: les erreurs sont capturées par section.
  // F-E — chaque sous-Intent émet ses propres section_started/completed/failed
  // events ; l'assembler n'a besoin que de PROGRESS aggregate après chacun.
  const { emitIntent } = await import("@/server/services/mestor/intents");
  const results: SectionRunSummary[] = [];

  for (const section of targets) {
    const mode = autoDetectMode(section.status);

    // PROGRESS event juste avant de lancer la prochaine section :
    // l'UI sait quelle est la section en cours (currentSectionId).
    const completedSoFar = results.filter((r) => r.status === "OK").length;
    const failedSoFar = results.length - completedSoFar;
    emitAssemblerProgress({
      userId: operatorId,
      strategyId,
      scope: scopeLabel(scope),
      total: targets.length,
      completed: completedSoFar,
      failed: failedSoFar,
      pending: targets.length - results.length,
      currentSectionId: section.sectionId,
    });

    try {
      const subResult = await emitIntent(
        {
          kind: "GENERATE_ORACLE_SECTION",
          strategyId,
          sectionId: section.sectionId,
          mode,
          operatorId,
        },
        { caller: `oracle-assembler:${scopeLabel(scope)}` },
      );
      const summary = mapSubResult(section.sectionId, subResult);
      results.push(summary);
    } catch (err) {
      results.push({
        sectionId: section.sectionId,
        status: "ERRORED",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 4. Status global ───────────────────────────────────────────────
  const succeeded = results.filter((r) => r.status === "OK").length;
  const failed = results.length - succeeded;
  const overall = failed === 0 ? "COMPLETE" : succeeded === 0 ? "EMPTY" : "PARTIAL";
  const durationMs = Date.now() - startTime;

  // F-E — DONE event final.
  emitAssemblerDone({
    userId: operatorId,
    strategyId,
    scope: scopeLabel(scope),
    overallStatus: overall,
    total: targets.length,
    succeeded,
    failed,
    durationMs,
  });

  return {
    status: failed === 0 ? "OK" : succeeded === 0 ? "FAILED" : "OK",
    summary:
      failed === 0
        ? `${succeeded}/${targets.length} sections complétées (scope=${scopeLabel(scope)}).`
        : `${succeeded}/${targets.length} OK, ${failed} ratées (scope=${scopeLabel(scope)}, status=${overall}).`,
    output: {
      scope: scopeLabel(scope),
      total: targets.length,
      succeeded,
      failed,
      overallStatus: overall,
      durationMs,
      results,
    },
  };
}

// ── Internals ───────────────────────────────────────────────────────

function filterScope(
  sections: readonly OracleSectionRow[],
  scope: AssembleOracleIntent["scope"],
): OracleSectionRow[] {
  if (Array.isArray(scope)) {
    const set = new Set(scope as readonly number[]);
    return sections.filter((s) => set.has(s.sectionId));
  }
  switch (scope) {
    case "ALL":
      return [...sections];
    case "MISSING":
      return sections.filter((s) => s.status === "PENDING");
    case "STALE":
      return sections.filter((s) => s.status === "STALE" || s.status === "FAILED");
    default:
      return [];
  }
}

function autoDetectMode(status: string): "FRESH" | "REGEN" | "RETRY" {
  switch (status) {
    case "PENDING":
      return "FRESH";
    case "COMPLETE":
      return "REGEN";
    case "FAILED":
    case "STALE":
      return "RETRY";
    default:
      return "FRESH";
  }
}

function scopeLabel(scope: AssembleOracleIntent["scope"]): string {
  if (Array.isArray(scope)) return `explicit[${scope.length}]`;
  return String(scope);
}

function mapSubResult(
  sectionId: number,
  subResult: { status?: string; reason?: string },
): SectionRunSummary {
  if (subResult.status === "OK") {
    return { sectionId, status: "OK" };
  }
  if (subResult.status === "VETOED") {
    return { sectionId, status: "VETOED", reason: subResult.reason };
  }
  return {
    sectionId,
    status: "FAILED",
    reason: subResult.reason,
  };
}
