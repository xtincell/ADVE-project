/**
 * src/server/governance/event-bus.ts — Process-scoped typed event bus.
 *
 * Layer 2. Synchronous publish, asynchronous-best-effort delivery to
 * subscribers. Subscribers MUST NOT throw — failures are caught and reported
 * to `bus.onError` (which by default logs to console). The bus is the only
 * way Seshat's observation pipeline learns about intent results.
 *
 * Why local-process: at this scale we don't need Redis pub/sub yet. When we
 * scale beyond one node we replace this implementation, the contract holds.
 */

import type { IntentProgressEvent } from "@/domain";

export interface BusEventMap {
  "intent.proposed": { intentId: string; kind: string; ctx: unknown };
  "intent.deliberated": { intentId: string; plan: unknown };
  "intent.dispatched": { intentId: string };
  "intent.executing": { intentId: string; step?: { name: string; index: number; total: number } };
  "intent.observed": { intentId: string };
  "intent.completed": { intentId: string; result: unknown; costUsd?: number };
  "intent.failed": { intentId: string; error: string };
  "intent.vetoed": { intentId: string; reason: string };
  "intent.downgraded": { intentId: string; reason: string };
  "intent.progress": IntentProgressEvent;
  "tarsis.signal-detected": { signalId: string; severity: string };
  "thot.budget-veto": { intentId: string; reason: string };
  "thot.budget-downgrade": { intentId: string; reason: string };
  "glory.tool-invoked": { slug: string; intentId: string; costUsd: number; latencyMs: number };
  "llm.token-usage": { provider: string; model: string; inputTokens: number; outputTokens: number; costUsd: number };
  // D-6 — pipeline / phase synchronisation events.
  "pipeline.stage-advanced": { strategyId: string; stage: number; missionType: string };
  "pillar.written": { strategyId: string; pillarKey: string; author: string };
  "strategy.phase-changed": {
    strategyId: string;
    from: import("@/domain").StrategyLifecyclePhase | null;
    to: import("@/domain").StrategyLifecyclePhase;
  };
}

export type BusEventName = keyof BusEventMap;
type Handler<K extends BusEventName> = (payload: BusEventMap[K]) => void | Promise<void>;

class EventBus {
  private listeners = new Map<BusEventName, Set<Handler<BusEventName>>>();
  public onError: (err: unknown, event: BusEventName) => void = (err, event) =>
    console.error(`[event-bus] handler for '${event}' threw:`, err);

  subscribe<K extends BusEventName>(event: K, handler: Handler<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<BusEventName>);
    return () => {
      set!.delete(handler as Handler<BusEventName>);
    };
  }

  subscribeOnce<K extends BusEventName>(event: K, handler: Handler<K>): void {
    const off = this.subscribe(event, async (p) => {
      off();
      await handler(p);
    });
  }

  publish<K extends BusEventName>(event: K, payload: BusEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      try {
        const r = (handler as Handler<K>)(payload);
        if (r && typeof (r as Promise<void>).catch === "function") {
          (r as Promise<void>).catch((err) => this.onError(err, event));
        }
      } catch (err) {
        this.onError(err, event);
      }
    }
  }

  /** Test helper. */
  reset(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
