/**
 * NSP SSE broker — pubsub keyed by userId.
 *
 * Fan-out local in-memory (single-pod, historique) + pont Redis pub/sub
 * OPT-IN (`REDIS_URL`, vague B) pour le multi-pod : un event publié sur le
 * pod A est relayé aux abonnés SSE des pods B/C via le channel `nsp:events`.
 * Self-filtering par INSTANCE_ID (le pod émetteur a déjà servi ses abonnés
 * locaux — jamais de double livraison). Sans Redis : comportement historique
 * inchangé. Voir ADR-0025.
 */

import { subscribeJson, publishJson, isRedisConfigured } from "@/lib/redis";
import type { NspEvent, NspListener } from "./event-types";

const listeners = new Map<string, Set<NspListener>>();

const NSP_CHANNEL = "nsp:events";
let bridgeStarted = false;

/** Livraison locale pure (abonnés de CE pod). */
function deliverLocal(userId: string, event: NspEvent): number {
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

/** Démarre (une fois) l'écoute des events relayés par les autres pods. */
function ensureBridge(): void {
  if (bridgeStarted || !isRedisConfigured()) return;
  bridgeStarted = true;
  subscribeJson(NSP_CHANNEL, (payload) => {
    const userId = payload.userId;
    const event = payload.event;
    if (typeof userId !== "string" || !event || typeof event !== "object") return;
    deliverLocal(userId, event as NspEvent);
  });
}

export function subscribe(userId: string, listener: NspListener): () => void {
  ensureBridge();
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

/**
 * Publie un event : abonnés locaux immédiatement + relay Redis vers les
 * autres pods (fire-and-forget). Retourne le nombre de livraisons LOCALES —
 * 0 ne veut pas dire « personne » en multi-pod, seulement « personne ici ».
 */
export function publish(userId: string, event: NspEvent): number {
  ensureBridge();
  const delivered = deliverLocal(userId, event);
  publishJson(NSP_CHANNEL, { userId, event });
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
