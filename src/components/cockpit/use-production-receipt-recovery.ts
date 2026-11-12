"use client";

import { useCallback, useEffect, useState } from "react";

type ProductionState = { status?: string | null; materialStatus?: string | null };
export type ReceiptRecovery = { phase: "VERIFYING" | "UNCONFIRMED"; deadline: number };
const RECEIPT_SEARCH_MS = 120_000;
const TERMINAL = new Set(["OK", "COMPLETED", "FILE_STORED", "FILE_ARCHIVED", "AWAITING_FILE", "BRIEF_PRODUCED", "FAILED", "VETOED", "DOWNGRADED", "DEFERRED", "EXPIRED", "CANCELLED"]);
const ACTIVE = new Set(["ASSIGNED", "PENDING", "QUEUED", "CREATED", "IN_PROGRESS", "RUNNING"]);

/** A lost HTTP response says nothing about the outcome of the durable production. */
export function isProductionTransportError(error: unknown): boolean {
  const value = error as { message?: string; name?: string; data?: { code?: string }; cause?: { code?: string; name?: string } } | null;
  // A structured server rejection is an application error, even if it mentions a timeout.
  if (value?.data?.code) return false;
  return /fetch failed|failed to fetch|network|load failed|timeout|timed out|connection|aborted/i.test(value?.message ?? "")
    || /AbortError|TimeoutError/.test([value?.name, value?.cause?.name].join(" "))
    || /UND_ERR_|ECONN|ETIMEDOUT/.test(value?.cause?.code ?? "");
}

export function shouldPollProductionReceipt(receipt: ProductionState | null | undefined, awaitingResponse: boolean): boolean {
  if (!receipt) return awaitingResponse;
  if (["FAILED", "VETOED", "DOWNGRADED", "DEFERRED", "EXPIRED", "CANCELLED"].includes(receipt.status ?? "")) return false;
  if (TERMINAL.has(receipt.materialStatus ?? "")) return false;
  if (ACTIVE.has(receipt.materialStatus ?? "")) return true;
  if (TERMINAL.has(receipt.status ?? "")) return false;
  return ACTIVE.has(receipt.status ?? "") || awaitingResponse;
}

/** Search for an unacknowledged dispatch for a bounded period, using reads only.
 * A missing receipt never grants permission to repeat the production mutation. */
export function useProductionReceiptRecovery() {
  const [pending, setPending] = useState<Record<string, ReceiptRecovery>>({});
  const watch = useCallback((key: string) => {
    setPending(previous => ({ ...previous, [key]: { phase: "VERIFYING", deadline: Date.now() + RECEIPT_SEARCH_MS } }));
  }, []);
  const resolve = useCallback((key: string) => {
    setPending(previous => {
      if (!previous[key]) return previous;
      const next = { ...previous }; delete next[key]; return next;
    });
  }, []);
  useEffect(() => {
    const deadlines = Object.values(pending).filter(item => item.phase === "VERIFYING").map(item => item.deadline);
    if (!deadlines.length) return;
    const timer = setTimeout(() => setPending(previous => Object.fromEntries(Object.entries(previous).map(([key, item]) =>
      [key, item.phase === "VERIFYING" && item.deadline <= Date.now() ? { ...item, phase: "UNCONFIRMED" as const } : item]
    ))), Math.max(0, Math.min(...deadlines) - Date.now()));
    return () => clearTimeout(timer);
  }, [pending]);
  return { pending, watch, resolve };
}

export function receiptRecoveryMessage(recovery: ReceiptRecovery): string {
  return recovery.phase === "VERIFYING"
    ? "Connexion interrompue. Vérification du reçu de production en cours ; aucune nouvelle génération n’est lancée."
    : "Le reçu n’a pas encore pu être confirmé. Vérifiez son état avant toute nouvelle demande de production.";
}
