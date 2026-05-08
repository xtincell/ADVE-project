/**
 * useOracleStream — React hook subscribing to Oracle progress events (Phase 21 F-F / ADR-0073)
 *
 * Connecte au SSE endpoint `/api/notifications/stream` (déjà routé par userId
 * via NSP broker, ADR-0025) et filtre les events sur `strategyId`.
 *
 * Maintient :
 *   - sectionsState   : Map<sectionId, { phase, lastEvent }>
 *                       phase ∈ "idle" | "generating" | "completed" | "failed"
 *   - assemblerState  : { phase, scope, total, completed, failed, currentSectionId, lastEvent }
 *   - log             : array de lignes texte temps-réel (UI console)
 *   - error           : string | null (parse / connexion errors)
 *
 * Le hook peut être instancié sans `strategyId` (pas de connexion établie).
 * Reset propre quand `strategyId` change.
 *
 * Cf. ADR-0072 (events) + ADR-0073 (UI consumer).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { OracleStreamEvent } from "@/server/services/nsp";

export type OracleSectionPhase = "idle" | "generating" | "completed" | "failed";

export interface OracleSectionStreamState {
  phase: OracleSectionPhase;
  sectionId: number;
  sectionTitle?: string;
  runner?: { kind: "GLORY_SEQUENCE" | "GLORY_TOOL" | "FRAMEWORK"; ref: string };
  mode?: "FRESH" | "REGEN" | "RETRY";
  confidence?: number | null;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  attempts?: number;
  startedAt?: string;
  /** Timestamp client du dernier event reçu pour cette section. */
  lastUpdatedAt: number;
}

export type AssemblerPhase =
  | "idle"
  | "running"
  | "complete"
  | "partial"
  | "empty";

export interface OracleAssemblerStreamState {
  phase: AssemblerPhase;
  scope?: string;
  total?: number;
  completed?: number;
  failed?: number;
  pending?: number;
  currentSectionId?: number;
  overallStatus?: "COMPLETE" | "PARTIAL" | "EMPTY";
  succeeded?: number;
  durationMs?: number;
  startedAt?: string;
}

export interface UseOracleStreamResult {
  /** Map keyed by sectionId. */
  sectionsState: ReadonlyMap<number, OracleSectionStreamState>;
  /** Aggregate assembler state. */
  assemblerState: OracleAssemblerStreamState;
  /** Texte temps-réel pour la console UI (ordre d'arrivée préservé). */
  log: ReadonlyArray<{ at: number; level: "info" | "ok" | "fail"; text: string }>;
  /** Error message (parse / network) — null when healthy. */
  error: string | null;
  /** True quand au moins une connexion SSE est ouverte pour cette session. */
  isStreaming: boolean;
  /** Reset client-side state (ne ferme pas la connexion SSE). */
  clearLog: () => void;
}

const MAX_LOG_LINES = 500;

export function useOracleStream(strategyId: string | null | undefined): UseOracleStreamResult {
  const [sectionsState, setSectionsState] = useState<Map<number, OracleSectionStreamState>>(
    () => new Map(),
  );
  const [assemblerState, setAssemblerState] = useState<OracleAssemblerStreamState>({
    phase: "idle",
  });
  const [log, setLog] = useState<UseOracleStreamResult["log"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!strategyId) {
      setIsStreaming(false);
      return;
    }

    // Reset state on strategyId change
    setSectionsState(new Map());
    setAssemblerState({ phase: "idle" });
    setLog([]);
    setError(null);

    const source = new EventSource("/api/notifications/stream");
    sourceRef.current = source;
    setIsStreaming(true);

    const handleOracleEvent = (raw: string) => {
      let evt: OracleStreamEvent;
      try {
        evt = JSON.parse(raw) as OracleStreamEvent;
      } catch (err) {
        setError(`parse error: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      // Filter by strategyId — l'opérateur peut avoir plusieurs Strategy
      // streams via le même socket userId.
      if (evt.strategyId !== strategyId) return;

      applyEvent(evt, setSectionsState, setAssemblerState, setLog);
    };

    // Server pousse `event: <kind>\ndata: <json>\n\n` (cf. notifications/stream/route.ts).
    // EventSource laisse les `event: <kind>` dans `MessageEvent.type`. On
    // s'abonne aux 6 sub-kinds nominalement.
    const ORACLE_KINDS = [
      "oracle_section_started",
      "oracle_section_completed",
      "oracle_section_failed",
      "oracle_assembler_started",
      "oracle_assembler_progress",
      "oracle_assembler_done",
    ] as const;

    for (const kind of ORACLE_KINDS) {
      source.addEventListener(kind, (msg) => {
        handleOracleEvent((msg as MessageEvent).data);
      });
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

  const clearLog = () => setLog([]);

  return {
    sectionsState,
    assemblerState,
    log,
    error,
    isStreaming,
    clearLog,
  };
}

// ── Internals ────────────────────────────────────────────────────────

function applyEvent(
  evt: OracleStreamEvent,
  setSections: (
    fn: (prev: Map<number, OracleSectionStreamState>) => Map<number, OracleSectionStreamState>,
  ) => void,
  setAssembler: (fn: (prev: OracleAssemblerStreamState) => OracleAssemblerStreamState) => void,
  setLog: (fn: (prev: UseOracleStreamResult["log"]) => UseOracleStreamResult["log"]) => void,
): void {
  const at = Date.now();
  switch (evt.kind) {
    case "oracle_section_started":
      setSections((prev) => {
        const next = new Map(prev);
        next.set(evt.sectionId, {
          phase: "generating",
          sectionId: evt.sectionId,
          sectionTitle: evt.sectionTitle,
          runner: evt.runner,
          mode: evt.mode,
          startedAt: evt.startedAt,
          lastUpdatedAt: at,
        });
        return next;
      });
      pushLog(setLog, {
        at,
        level: "info",
        text: `§${evt.sectionId.toString().padStart(2, "0")} ${evt.sectionTitle} — GENERATING (${evt.runner.kind}/${evt.runner.ref}, mode=${evt.mode})`,
      });
      break;

    case "oracle_section_completed":
      setSections((prev) => {
        const next = new Map(prev);
        const cur = next.get(evt.sectionId);
        next.set(evt.sectionId, {
          phase: "completed",
          sectionId: evt.sectionId,
          sectionTitle: evt.sectionTitle,
          runner: cur?.runner,
          mode: cur?.mode,
          confidence: evt.confidence,
          durationMs: evt.durationMs,
          startedAt: cur?.startedAt,
          lastUpdatedAt: at,
        });
        return next;
      });
      pushLog(setLog, {
        at,
        level: "ok",
        text: `§${evt.sectionId.toString().padStart(2, "0")} ${evt.sectionTitle} — COMPLETE (${(evt.durationMs / 1000).toFixed(1)}s, conf ${evt.confidence?.toFixed(2) ?? "n/a"})`,
      });
      break;

    case "oracle_section_failed":
      setSections((prev) => {
        const next = new Map(prev);
        const cur = next.get(evt.sectionId);
        next.set(evt.sectionId, {
          phase: "failed",
          sectionId: evt.sectionId,
          sectionTitle: evt.sectionTitle,
          runner: cur?.runner,
          mode: cur?.mode,
          errorCode: evt.errorCode,
          errorMessage: evt.errorMessage,
          attempts: evt.attempts,
          durationMs: evt.durationMs,
          startedAt: cur?.startedAt,
          lastUpdatedAt: at,
        });
        return next;
      });
      pushLog(setLog, {
        at,
        level: "fail",
        text: `§${evt.sectionId.toString().padStart(2, "0")} ${evt.sectionTitle} — FAILED [${evt.errorCode}] ${evt.errorMessage}${evt.attempts ? ` (after ${evt.attempts} attempts)` : ""}`,
      });
      break;

    case "oracle_assembler_started":
      setAssembler(() => ({
        phase: "running" as AssemblerPhase,
        scope: evt.scope,
        total: evt.total,
        completed: 0,
        failed: 0,
        pending: evt.total,
        startedAt: evt.startedAt,
      }));
      pushLog(setLog, {
        at,
        level: "info",
        text: `── Assembler started (scope=${evt.scope}, total=${evt.total}) ──`,
      });
      break;

    case "oracle_assembler_progress":
      setAssembler((prev) => ({
        ...prev,
        phase: "running",
        scope: evt.scope,
        total: evt.total,
        completed: evt.completed,
        failed: evt.failed,
        pending: evt.pending,
        currentSectionId: evt.currentSectionId,
      }));
      // Progress events ne polluent pas le log (déjà tracés via section_started).
      break;

    case "oracle_assembler_done":
      setAssembler(() => ({
        phase: evt.overallStatus === "COMPLETE" ? "complete" : evt.overallStatus === "PARTIAL" ? "partial" : "empty",
        scope: evt.scope,
        total: evt.total,
        succeeded: evt.succeeded,
        failed: evt.failed,
        overallStatus: evt.overallStatus,
        durationMs: evt.durationMs,
      }));
      pushLog(setLog, {
        at,
        level: evt.failed === 0 ? "ok" : "fail",
        text: `── Assembler done : ${evt.succeeded}/${evt.total} OK, ${evt.failed} failed (${(evt.durationMs / 1000).toFixed(1)}s, status=${evt.overallStatus}) ──`,
      });
      break;
  }
}

function pushLog(
  setLog: (fn: (prev: UseOracleStreamResult["log"]) => UseOracleStreamResult["log"]) => void,
  entry: { at: number; level: "info" | "ok" | "fail"; text: string },
): void {
  setLog((prev) => {
    const next = [...prev, entry];
    if (next.length > MAX_LOG_LINES) {
      return next.slice(next.length - MAX_LOG_LINES);
    }
    return next;
  });
}
