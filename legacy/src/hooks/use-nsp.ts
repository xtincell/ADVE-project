/**
 * useNsp — React hook subscribing to a server-side Intent stream.
 *
 * Connects to /api/nsp via SSE for the given intentId, parses NspEnvelope
 * messages, and exposes the latest progress event + a terminal flag.
 *
 * Usage:
 *
 *   const { event, phase, isStreaming, isTerminal } = useNsp(intentId);
 *
 * Tier 3.1 of the residual debt — wires NSP into LLM-driven pages.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { IntentProgressEvent, IntentPhase } from "@/domain";

type NspEnvelope =
  | { type: "PROGRESS"; event: IntentProgressEvent }
  | { type: "HEARTBEAT"; emittedAt: string }
  | { type: "RESUME"; lastEmittedAt: string }
  | { type: "CLOSE"; reason: IntentPhase };

const TERMINAL_PHASES: ReadonlySet<IntentPhase> = new Set([
  "COMPLETED",
  "FAILED",
  "VETOED",
  "DOWNGRADED",
] as const);

export interface UseNspResult {
  /** Latest progress event seen for this intent, or null. */
  event: IntentProgressEvent | null;
  /** Convenience accessor over event.phase. */
  phase: IntentPhase | null;
  /** True until a terminal phase is observed or the stream closes. */
  isStreaming: boolean;
  /** True once the stream reaches a terminal phase. */
  isTerminal: boolean;
  /** Last error message (network or parse) — null when healthy. */
  error: string | null;
  /** Cancel the stream early (also triggers a server-side VETOED status). */
  cancel: () => Promise<void>;
}

export function useNsp(intentId: string | null | undefined): UseNspResult {
  const [event, setEvent] = useState<IntentProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!intentId) return;
    setEvent(null);
    setError(null);
    setTerminal(false);

    const url = `/api/nsp?intentId=${encodeURIComponent(intentId)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("message", (msg) => {
      try {
        const env = JSON.parse(msg.data) as NspEnvelope;
        if (env.type === "PROGRESS") {
          setEvent(env.event);
          if (TERMINAL_PHASES.has(env.event.phase)) {
            setTerminal(true);
            source.close();
          }
        } else if (env.type === "CLOSE") {
          setTerminal(true);
          source.close();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "parse error");
      }
    });

    source.addEventListener("error", () => {
      // EventSource auto-reconnects on transient errors; surface only persistent ones.
      if (source.readyState === EventSource.CLOSED) {
        setError("connection closed");
      }
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [intentId]);

  const cancel = async () => {
    if (!intentId) return;
    try {
      await fetch(`/api/nsp?intentId=${encodeURIComponent(intentId)}`, { method: "DELETE" });
    } catch {
      /* best-effort */
    }
    sourceRef.current?.close();
    setTerminal(true);
  };

  return {
    event,
    phase: event?.phase ?? null,
    isStreaming: !!intentId && !terminal,
    isTerminal: terminal,
    error,
    cancel,
  };
}
