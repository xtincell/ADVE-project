/**
 * NSP SSE broker — in-memory pubsub keyed by userId.
 *
 * Ship-able sans Redis : single-instance Node.js process. Pour multi-instance
 * (Vercel ou cluster), on remplace `listeners` par Redis pubsub via le même
 * contrat (publish/subscribe). Voir ADR-0025.
 */

import type { NspEvent, NspListener } from "./event-types";

const listeners = new Map<string, Set<NspListener>>();

export function subscribe(userId: string, listener: NspListener): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);

  return () => {
    const current = listeners.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(userId);
  };
}

export function publish(userId: string, event: NspEvent): number {
  const set = listeners.get(userId);
  if (!set || set.size === 0) return 0;

  let delivered = 0;
  for (const listener of set) {
    try {
      listener(event);
      delivered++;
    } catch {
      // Listener errors are swallowed to keep fan-out resilient.
      // Errors land in error-vault via the listener's own try/catch.
    }
  }
  return delivered;
}

export function listenerCount(userId: string): number {
  return listeners.get(userId)?.size ?? 0;
}

export function activeUserCount(): number {
  return listeners.size;
}

export function clearAll(): void {
  listeners.clear();
}
