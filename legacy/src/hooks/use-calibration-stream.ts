/**
 * useCalibrationStream — React hook subscribing to calibration progress events
 * (Phase 23 Epic 6 Story 6.4 / ADR-0081 + ADR-0072).
 *
 * Connects to the SSE endpoint `/api/notifications/stream` (already routed by
 * userId via the NSP broker, ADR-0025) and filters on `strategyId`. Mirrors
 * `use-oracle-stream.ts` but for the 3 `calibration_*` kinds — so the
 * `CalibrationReviewPanel` `role="status" aria-live="polite"` region streams
 * progress (FETCHING → FITTING → EVALUATING → done) and the operator never
 * faces a frozen screen (NFR3 + UX-DR17).
 *
 * The hook can be instantiated without `strategyId` (no connection). Resets
 * cleanly when `strategyId` changes.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { CalibrationStreamEvent } from "@/server/services/nsp";

export type CalibrationPhase = "idle" | "running" | "done";
export type CalibrationStage = "FETCHING" | "FITTING" | "EVALUATING";

export interface CalibrationStreamState {
  phase: CalibrationPhase;
  stage?: CalibrationStage;
  mode?: "AUTO" | "MANUAL_COEFFICIENTS";
  campaignCount?: number;
  /** Set on `calibration_done`. */
  doneState?: "OK" | "INSUFFICIENT_DATA";
  rocAuc?: number;
  rmse?: number;
  sampleSize?: number;
  durationMs?: number;
  /** Client timestamp of the last received event. */
  lastUpdatedAt?: number;
}

export interface UseCalibrationStreamResult {
  state: CalibrationStreamState;
  /** Real-time text lines for the aria-live region (arrival order preserved). */
  log: ReadonlyArray<{ at: number; level: "info" | "ok" | "fail"; text: string }>;
  error: string | null;
  isStreaming: boolean;
  /** Reset client-side state (does not close the SSE connection). */
  reset: () => void;
}

const STAGE_LABEL: Record<CalibrationStage, string> = {
  FETCHING: "Récupération de l'historique campagnes…",
  FITTING: "Ajustement du modèle…",
  EVALUATING: "Évaluation ROC AUC / RMSE…",
};

export function useCalibrationStream(
  strategyId: string | null | undefined,
): UseCalibrationStreamResult {
  const [state, setState] = useState<CalibrationStreamState>({ phase: "idle" });
  const [log, setLog] = useState<UseCalibrationStreamResult["log"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!strategyId) {
      setIsStreaming(false);
      return;
    }
    setState({ phase: "idle" });
    setLog([]);
    setError(null);

    const source = new EventSource("/api/notifications/stream");
    sourceRef.current = source;
    setIsStreaming(true);

    const pushLog = (level: "info" | "ok" | "fail", text: string) =>
      setLog((prev) => [...prev, { at: Date.now(), level, text }].slice(-200));

    const handle = (raw: string) => {
      let evt: CalibrationStreamEvent;
      try {
        evt = JSON.parse(raw) as CalibrationStreamEvent;
      } catch (err) {
        setError(`parse error: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      if (evt.strategyId !== strategyId) return;
      const at = Date.now();
      switch (evt.kind) {
        case "calibration_started":
          setState({
            phase: "running",
            mode: evt.mode,
            campaignCount: evt.campaignCount,
            lastUpdatedAt: at,
          });
          pushLog("info", `Calibration ${evt.mode} démarrée (${evt.campaignCount} campagnes)`);
          break;
        case "calibration_progress":
          setState((prev) => ({ ...prev, phase: "running", stage: evt.stage, lastUpdatedAt: at }));
          pushLog("info", STAGE_LABEL[evt.stage]);
          break;
        case "calibration_done":
          setState((prev) => ({
            ...prev,
            phase: "done",
            doneState: evt.state,
            rocAuc: evt.rocAuc,
            rmse: evt.rmse,
            sampleSize: evt.sampleSize,
            durationMs: evt.durationMs,
            lastUpdatedAt: at,
          }));
          pushLog(
            evt.state === "OK" ? "ok" : "fail",
            evt.state === "OK"
              ? `Calibration terminée — ROC AUC ${evt.rocAuc?.toFixed(3) ?? "n/a"} · RMSE ${evt.rmse?.toFixed(3) ?? "n/a"} (${((evt.durationMs ?? 0) / 1000).toFixed(1)}s)`
              : `Données insuffisantes — aucun snapshot produit (${((evt.durationMs ?? 0) / 1000).toFixed(1)}s)`,
          );
          break;
      }
    };

    const KINDS = ["calibration_started", "calibration_progress", "calibration_done"] as const;
    for (const kind of KINDS) {
      source.addEventListener(kind, (msg) => handle((msg as MessageEvent).data));
    }
    source.addEventListener("error", () => {
      if (source.readyState === EventSource.CLOSED) {
        setIsStreaming(false);
        setError("connection closed");
      }
    });

    return () => {
      source.close();
      sourceRef.current = null;
      setIsStreaming(false);
    };
  }, [strategyId]);

  const reset = () => {
    setState({ phase: "idle" });
    setLog([]);
  };

  return { state, log, error, isStreaming, reset };
}
