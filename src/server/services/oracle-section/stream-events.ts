/**
 * Oracle stream events — emitters canoniques (Phase 21 F-E / ADR-0072)
 *
 * Wrappers typés autour de `nsp.publish(userId, event)`. **Best-effort** :
 * jamais throw — un échec NSP ne doit pas casser une génération qui a
 * réussi côté DB. Le persistant `OracleSection` reste la source de vérité ;
 * NSP n'est qu'un aiguillage temps-réel pour l'UI.
 *
 * Les 6 sub-kinds discriminés couvrent :
 *   - section_started   — acquisition lock + dispatch runner amorcé
 *   - section_completed — payload validé Zod + persisté
 *   - section_failed    — runner a échoué après retry (ZOD_VALIDATION_FAILED, RUNNER_FAILED, ...)
 *   - assembler_started — orchestrator démarre (scope + total)
 *   - assembler_progress — un slot avance (completed/failed/pending counts)
 *   - assembler_done    — orchestrator termine (overallStatus + summary)
 *
 * Hiérarchie naturelle : l'Assembler émet `assembler_*` ; chaque sous-Intent
 * `GENERATE_ORACLE_SECTION` émet `section_*` au passage. Le frontend voit
 * les deux niveaux interlacés sans configuration supplémentaire.
 */

import { publish } from "@/server/services/nsp";
import type {
  OracleSectionStartedEvent,
  OracleSectionCompletedEvent,
  OracleSectionFailedEvent,
  OracleAssemblerStartedEvent,
  OracleAssemblerProgressEvent,
  OracleAssemblerDoneEvent,
} from "@/server/services/nsp";

interface BaseEmitArgs {
  userId: string;
  strategyId: string;
}

export function emitSectionStarted(
  args: BaseEmitArgs &
    Pick<OracleSectionStartedEvent, "sectionId" | "sectionTitle" | "runner" | "mode">,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_section_started",
      strategyId: args.strategyId,
      sectionId: args.sectionId,
      sectionTitle: args.sectionTitle,
      runner: args.runner,
      mode: args.mode,
      startedAt: new Date().toISOString(),
    }),
  );
}

export function emitSectionCompleted(
  args: BaseEmitArgs &
    Pick<
      OracleSectionCompletedEvent,
      "sectionId" | "sectionTitle" | "confidence" | "durationMs" | "version"
    >,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_section_completed",
      strategyId: args.strategyId,
      sectionId: args.sectionId,
      sectionTitle: args.sectionTitle,
      confidence: args.confidence,
      durationMs: args.durationMs,
      version: args.version,
    }),
  );
}

export function emitSectionFailed(
  args: BaseEmitArgs &
    Pick<
      OracleSectionFailedEvent,
      "sectionId" | "sectionTitle" | "errorCode" | "errorMessage" | "attempts" | "durationMs"
    >,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_section_failed",
      strategyId: args.strategyId,
      sectionId: args.sectionId,
      sectionTitle: args.sectionTitle,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      attempts: args.attempts,
      durationMs: args.durationMs,
    }),
  );
}

export function emitAssemblerStarted(
  args: BaseEmitArgs & Pick<OracleAssemblerStartedEvent, "scope" | "total">,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_assembler_started",
      strategyId: args.strategyId,
      scope: args.scope,
      total: args.total,
      startedAt: new Date().toISOString(),
    }),
  );
}

export function emitAssemblerProgress(
  args: BaseEmitArgs &
    Pick<
      OracleAssemblerProgressEvent,
      "scope" | "total" | "completed" | "failed" | "pending" | "currentSectionId"
    >,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_assembler_progress",
      strategyId: args.strategyId,
      scope: args.scope,
      total: args.total,
      completed: args.completed,
      failed: args.failed,
      pending: args.pending,
      currentSectionId: args.currentSectionId,
    }),
  );
}

export function emitAssemblerDone(
  args: BaseEmitArgs &
    Pick<
      OracleAssemblerDoneEvent,
      "scope" | "overallStatus" | "total" | "succeeded" | "failed" | "durationMs"
    >,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "oracle_assembler_done",
      strategyId: args.strategyId,
      scope: args.scope,
      overallStatus: args.overallStatus,
      total: args.total,
      succeeded: args.succeeded,
      failed: args.failed,
      durationMs: args.durationMs,
    }),
  );
}

// ── Internals ────────────────────────────────────────────────────────

function bestEffort(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    // Silent — ne casse jamais la génération qui a réussi côté DB.
    // Note pour debug dev : enable DEBUG_ORACLE_STREAM=1 pour logger.
    if (process.env.DEBUG_ORACLE_STREAM) {
      console.warn(
        `[oracle-stream-events] publish failed (silenced):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
