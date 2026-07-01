/**
 * Calibration stream events — emitters canoniques (Phase 23 Epic 6 Story 6.1,
 * ADR-0081 + ADR-0072).
 *
 * Wrappers typés autour de `nsp.publish(userId, event)`. **Best-effort** :
 * jamais throw — un échec NSP ne doit pas casser une calibration qui a réussi.
 * Le snapshot persisté dans l'`IntentEmission` reste la source de vérité (P22-6) ;
 * NSP n'est qu'un aiguillage temps-réel pour la `CalibrationReviewPanel` (Story 6.4).
 *
 * Mirror exact du pattern `oracle-section/stream-events.ts`.
 */

import { publish } from "@/server/services/nsp";
import type {
  CalibrationStartedEvent,
  CalibrationProgressEvent,
  CalibrationDoneEvent,
} from "@/server/services/nsp";

interface BaseEmitArgs {
  userId: string;
  strategyId: string;
}

export function emitCalibrationStarted(
  args: BaseEmitArgs & Pick<CalibrationStartedEvent, "mode" | "campaignCount">,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "calibration_started",
      strategyId: args.strategyId,
      mode: args.mode,
      campaignCount: args.campaignCount,
      startedAt: new Date().toISOString(),
    }),
  );
}

export function emitCalibrationProgress(
  args: BaseEmitArgs & Pick<CalibrationProgressEvent, "stage">,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "calibration_progress",
      strategyId: args.strategyId,
      stage: args.stage,
    }),
  );
}

export function emitCalibrationDone(
  args: BaseEmitArgs &
    Pick<CalibrationDoneEvent, "state" | "rocAuc" | "rmse" | "sampleSize" | "durationMs">,
): void {
  bestEffort(() =>
    publish(args.userId, {
      kind: "calibration_done",
      strategyId: args.strategyId,
      state: args.state,
      rocAuc: args.rocAuc,
      rmse: args.rmse,
      sampleSize: args.sampleSize,
      durationMs: args.durationMs,
    }),
  );
}

// ── Internals ────────────────────────────────────────────────────────

function bestEffort(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (process.env.DEBUG_CALIBRATION_STREAM) {
      console.warn(
        `[calibration-stream-events] publish failed (silenced):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
