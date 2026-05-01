/**
 * Sprint C — Anubis event emission + Thot RECORD_COST helper.
 *
 * Helpers utilisés par les capabilities pour émettre les événements
 * déclarés dans manifest.emits et tracer le coût réalisé via Thot.
 *
 * Note : on n'utilise PAS mestor.emitIntent ici (éviterait dispatch
 * récursif). On persist directement IntentEmissionEvent + AICostLog.
 */

import { db } from "@/lib/db";
import { eventBus } from "@/server/governance/event-bus";

export type AnubisEventName =
  | "MESSAGE_DISPATCHED"
  | "AD_CAMPAIGN_LAUNCHED"
  | "SOCIAL_POST_PUBLISHED"
  | "BROADCAST_SENT";

/**
 * Persiste un IntentEmissionEvent stub pour l'observabilité Seshat.
 * Si l'intentId est null (pas de Mestor parent), skip.
 */
export async function emitAnubisEvent(
  intentId: string | null | undefined,
  name: AnubisEventName,
  partial: Record<string, unknown>,
): Promise<void> {
  // Sprint N — publish on the in-process event bus (NSP server subscribers
  // listen on `intent.progress` and forward to clients via SSE).
  if (intentId) {
    eventBus.publish("intent.progress", {
      intentId,
      phase: "OBSERVED",
      stepName: name.toLowerCase(),
      partial: { event: name, ...partial },
      emittedAt: new Date(),
    } as never);
    try {
      await db.intentEmissionEvent.create({
        data: {
          intentId,
          phase: "OBSERVED",
          stepName: name.toLowerCase(),
          partial: { event: name, ...partial } as never,
        },
      });
    } catch {
      // Best-effort — don't fail the handler if event log misses.
    }
  }
}

/**
 * Trace coût réalisé via AICostLog (canal Thot pour audit + budget).
 */
export async function recordAnubisCost(
  context: string,
  costUsd: number,
  strategyId?: string,
  userId?: string,
): Promise<void> {
  if (costUsd <= 0) return;
  try {
    await db.aICostLog.create({
      data: {
        model: "anubis-comms",
        provider: "anubis",
        inputTokens: 0,
        outputTokens: 0,
        cost: costUsd,
        currency: "USD",
        context,
        strategyId,
        userId,
      },
    });
  } catch {
    // Best-effort.
  }
}
