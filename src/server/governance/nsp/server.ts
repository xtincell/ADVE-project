/**
 * src/server/governance/nsp/server.ts — Neteru Streaming Protocol — server.
 *
 * Layer 2. Thin SSE/long-poll server keyed on intentId.
 *
 * - Subscribes to the in-process EventBus filtered by intentId.
 * - Persists every IntentProgressEvent to the IntentEmissionEvent table so
 *   the client can resume after a reconnect (lastEmittedAt cursor).
 * - Heartbeat every 15s to defeat proxy buffering on commodity infra.
 *
 * Streaming wire format: SSE — each event is a UTF-8 JSON of NspEnvelope.
 * The client re-creates IntentProgressEvent locally; resume is via
 * `?since=<ISO>` query param.
 */

import type { PrismaClient } from "@prisma/client";
import type { IntentProgressEvent } from "@/domain";
import { isTerminal } from "@/domain";
import { eventBus } from "../event-bus";
import type { NspEnvelope } from "./types";

interface SseTransport {
  write(line: string): void;
  flush?(): void;
  close(): void;
}

const HEARTBEAT_MS = 15_000;

export interface SubscribeOpts {
  intentId: string;
  transport: SseTransport;
  db: PrismaClient;
  /** ISO timestamp; events strictly after this are emitted on subscribe (resume). */
  since?: string;
}

export async function subscribeToIntent(opts: SubscribeOpts): Promise<() => void> {
  const { intentId, transport, db, since } = opts;
  const send = (env: NspEnvelope) => {
    transport.write(`data: ${JSON.stringify(env)}\n\n`);
    transport.flush?.();
  };

  // 1. Replay persisted events strictly after `since` (or all if undefined).
  const where = since
    ? { intentId, emittedAt: { gt: new Date(since) } }
    : { intentId };
  const persisted = await db.intentEmissionEvent.findMany({
    where,
    orderBy: { emittedAt: "asc" },
  });
  for (const ev of persisted) {
    send({ type: "PROGRESS", event: rowToProgress(ev, intentId) });
  }

  // If the persisted tail already terminal — close immediately.
  const last = persisted[persisted.length - 1];
  if (last && isTerminal(last.phase as never)) {
    send({ type: "CLOSE", reason: last.phase as never });
    transport.close();
    return () => undefined;
  }

  // 2. Subscribe to live progress for this intentId.
  const offProgress = eventBus.subscribe("intent.progress", async (e) => {
    if (e.intentId !== intentId) return;
    // Persist + forward.
    await db.intentEmissionEvent.create({
      data: {
        intentId: e.intentId,
        phase: e.phase,
        stepName: e.step?.name ?? null,
        stepIndex: e.step?.index ?? null,
        stepTotal: e.step?.total ?? null,
        partial: (e.partial ?? null) as never,
        costUsd: (e.costSoFarUsd ?? null) as never,
      },
    });
    send({ type: "PROGRESS", event: e });
    if (isTerminal(e.phase)) {
      send({ type: "CLOSE", reason: e.phase });
      cleanup();
    }
  });

  // 3. Heartbeat.
  const heartbeat = setInterval(() => {
    send({ type: "HEARTBEAT", emittedAt: new Date().toISOString() });
  }, HEARTBEAT_MS);

  function cleanup() {
    clearInterval(heartbeat);
    offProgress();
    transport.close();
  }

  return cleanup;
}

function rowToProgress(
  row: {
    phase: string;
    stepName: string | null;
    stepIndex: number | null;
    stepTotal: number | null;
    partial: unknown;
    costUsd: unknown;
    emittedAt: Date;
  },
  intentId: string,
): IntentProgressEvent {
  return {
    intentId,
    kind: "(replayed)",
    phase: row.phase as IntentProgressEvent["phase"],
    governor: "MESTOR",
    step:
      row.stepName && row.stepIndex !== null && row.stepTotal !== null
        ? { name: row.stepName, index: row.stepIndex, total: row.stepTotal }
        : undefined,
    partial: (row.partial ?? undefined) as IntentProgressEvent["partial"],
    costSoFarUsd:
      typeof row.costUsd === "object" && row.costUsd !== null && "toNumber" in row.costUsd
        ? (row.costUsd as { toNumber: () => number }).toNumber()
        : undefined,
    emittedAt: row.emittedAt,
  };
}
