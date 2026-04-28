"use client";

/**
 * src/hooks/use-neteru.ts — Unified Neteru hook (Phase 5).
 *
 * Consumed by the Neteru UI Kit. Subscribes to NSP for a given intentId
 * and exposes:
 *   - progress: latest IntentProgressEvent (null until first event)
 *   - history: ordered list of all events received this session
 *   - isStreaming: true while the SSE channel is open
 *   - retry / cancel actions (cancel sends DELETE to the NSP endpoint)
 *
 * The transport is SSE with long-poll fallback. On reconnect, the hook
 * sends `?since=<lastEmittedAt>` so the server resumes from the resumable
 * cursor (which is the same one persisted in IntentEmissionEvent).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { IntentProgressEvent, IntentPhase } from "@/domain";
import { isTerminal } from "@/domain";

interface UseNeteruIntentReturn {
  progress: IntentProgressEvent | null;
  history: readonly IntentProgressEvent[];
  isStreaming: boolean;
  retry: () => void;
  cancel: () => void;
}

export function useNeteruIntent(
  intentId: string | null,
  endpoint = "/api/nsp",
): UseNeteruIntentReturn {
  const [progress, setProgress] = useState<IntentProgressEvent | null>(null);
  const [history, setHistory] = useState<IntentProgressEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const lastTsRef = useRef<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);

  const open = useCallback(() => {
    if (!intentId) return;
    const url = new URL(endpoint, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("intentId", intentId);
    if (lastTsRef.current) url.searchParams.set("since", lastTsRef.current);

    const es = new EventSource(url.toString());
    sourceRef.current = es;
    setIsStreaming(true);

    es.onmessage = (msg) => {
      try {
        const env = JSON.parse(msg.data) as
          | { type: "PROGRESS"; event: IntentProgressEvent }
          | { type: "HEARTBEAT"; emittedAt: string }
          | { type: "CLOSE"; reason: IntentPhase };

        if (env.type === "PROGRESS") {
          const ev = {
            ...env.event,
            emittedAt: new Date(env.event.emittedAt),
          };
          lastTsRef.current = (
            ev.emittedAt instanceof Date ? ev.emittedAt : new Date(ev.emittedAt)
          ).toISOString();
          setProgress(ev);
          setHistory((h) => [...h, ev]);
        } else if (env.type === "CLOSE") {
          setIsStreaming(false);
          es.close();
        }
      } catch {
        // Ignore malformed payloads; SSE is forward-compatible by design.
      }
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
      retryCountRef.current += 1;
      if (retryCountRef.current < 5) {
        const backoffMs = Math.min(1000 * 2 ** retryCountRef.current, 15000);
        setTimeout(open, backoffMs);
      }
    };
  }, [intentId, endpoint]);

  useEffect(() => {
    if (!intentId) return;
    open();
    return () => {
      sourceRef.current?.close();
      setIsStreaming(false);
    };
  }, [intentId, open]);

  const retry = useCallback(() => {
    sourceRef.current?.close();
    retryCountRef.current = 0;
    open();
  }, [open]);

  const cancel = useCallback(() => {
    sourceRef.current?.close();
    setIsStreaming(false);
    if (intentId) {
      void fetch(`${endpoint}?intentId=${encodeURIComponent(intentId)}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  }, [intentId, endpoint]);

  return { progress, history, isStreaming, retry, cancel };
}

export const useNeteru = {
  intent: useNeteruIntent,
};

export const isIntentTerminal = (p: IntentPhase) => isTerminal(p);
