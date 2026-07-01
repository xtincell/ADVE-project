/**
 * useCollabDoc — Client hook for StrategyDoc collaborative documents
 * (Tier 3.2 of the residual debt).
 *
 * Wires a load/save loop against /api/collab/sync. Authority for merge
 * rules lives client-side; the server only stores opaque bytes with
 * optimistic-concurrency.
 *
 * Usage:
 *
 *   const { yState, version, save, isLoading, conflict } =
 *     useCollabDoc({ strategyId, docKind: "ORACLE_SECTION", docKey: "S3" });
 *
 *   // After local edits:
 *   await save(newYState);
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export type DocKind = "PILLAR_CONTENT" | "ORACLE_SECTION" | "MESTOR_CHAT";

export interface UseCollabDocOptions {
  readonly strategyId: string;
  readonly docKind: DocKind;
  readonly docKey: string;
  /** Poll-refresh interval (ms). Default 0 = no polling. Set ~5000 for soft real-time. */
  readonly pollIntervalMs?: number;
}

export interface UseCollabDocResult {
  yState: Uint8Array | null;
  version: number;
  lastEditor: string | null;
  updatedAt: string | null;
  isLoading: boolean;
  error: string | null;
  /** Server returned 409 — caller should re-fetch and re-apply. */
  conflict: { currentVersion: number } | null;
  refetch: () => Promise<void>;
  save: (next: Uint8Array) => Promise<{ ok: boolean; version?: number }>;
}

export function useCollabDoc(opts: UseCollabDocOptions): UseCollabDocResult {
  const [yState, setYState] = useState<Uint8Array | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ currentVersion: number } | null>(null);

  const fetchOnce = useCallback(async () => {
    const params = new URLSearchParams({
      strategyId: opts.strategyId,
      docKind: opts.docKind,
      docKey: opts.docKey,
    });
    const res = await fetch(`/api/collab/sync?${params}`);
    if (!res.ok) {
      setError(`load failed (${res.status})`);
      setIsLoading(false);
      return;
    }
    const data = (await res.json()) as {
      yState: string | null;
      version: number;
      lastEditor: string | null;
      updatedAt: string | null;
    };
    setYState(data.yState ? new Uint8Array(Buffer.from(data.yState, "base64")) : null);
    setVersion(data.version);
    setLastEditor(data.lastEditor);
    setUpdatedAt(data.updatedAt);
    setError(null);
    setIsLoading(false);
  }, [opts.strategyId, opts.docKind, opts.docKey]);

  useEffect(() => {
    void fetchOnce();
    if (!opts.pollIntervalMs) return;
    const id = setInterval(fetchOnce, opts.pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchOnce, opts.pollIntervalMs]);

  const save = useCallback(
    async (next: Uint8Array): Promise<{ ok: boolean; version?: number }> => {
      const yStateB64 = Buffer.from(next).toString("base64");
      const res = await fetch("/api/collab/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: opts.strategyId,
          docKind: opts.docKind,
          docKey: opts.docKey,
          yState: yStateB64,
          baseVersion: version,
        }),
      });
      if (res.status === 409) {
        const data = (await res.json()) as { currentVersion: number };
        setConflict({ currentVersion: data.currentVersion });
        return { ok: false };
      }
      if (!res.ok) {
        setError(`save failed (${res.status})`);
        return { ok: false };
      }
      const data = (await res.json()) as { version: number };
      setVersion(data.version);
      setYState(next);
      setConflict(null);
      return { ok: true, version: data.version };
    },
    [opts.strategyId, opts.docKind, opts.docKey, version],
  );

  return {
    yState,
    version,
    lastEditor,
    updatedAt,
    isLoading,
    error,
    conflict,
    refetch: fetchOnce,
    save,
  };
}
