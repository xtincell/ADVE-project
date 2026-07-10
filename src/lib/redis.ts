/**
 * Redis partagé — coordination multi-pod (vague B, résiduel Phase 18
 * « Cache Redis cross-pod »).
 *
 * Opt-in par `REDIS_URL` (redis:// ou rediss://). SANS elle, tout dégrade
 * honnêtement en mode single-pod (comportement historique) :
 *   - `getRedis()` → null, aucun crash, log une seule fois ;
 *   - `claimOnce()` → true (pas de concurrence inter-pods à arbitrer) ;
 *   - `publishJson()`/`subscribeJson()` → no-op.
 *
 * Trois usages servis :
 *   1. Pont pub/sub du broker NSP SSE (nsp/sse-broker.ts) — les events
 *      publiés sur un pod atteignent les abonnés SSE des autres pods ;
 *   2. Invalidation cross-pod des caches process-local (brand-node/
 *      inheritance, market-visibility) ;
 *   3. Claims CAS (SET NX EX) — ticks de cron non réentrants.
 *
 * Jamais de throw vers l'appelant : Redis est une optimisation de
 * coordination, pas une dépendance de disponibilité (ADR-0021 esprit
 * ship-without-keys).
 */

import { randomUUID } from "node:crypto";
import IORedis, { type Redis } from "ioredis";

/** Identifie ce process — sert au self-filtering pub/sub et aux claims. */
export const INSTANCE_ID = randomUUID();

type GlobalRedis = {
  client: Redis | null;
  subscriber: Redis | null;
  loggedUnavailable: boolean;
  handlers: Map<string, Set<(payload: unknown) => void>>;
};

// Next.js hot-reload safe (même pattern que src/lib/db.ts) : les connexions
// survivent au module reload en dev.
const g = globalThis as unknown as { __lafuseeRedis?: GlobalRedis };
const state: GlobalRedis = (g.__lafuseeRedis ??= {
  client: null,
  subscriber: null,
  loggedUnavailable: false,
  handlers: new Map(),
});

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function buildClient(purpose: "client" | "subscriber"): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    // L'import est statique mais la CONNEXION n'existe que si REDIS_URL est posée.
    const client = new IORedis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      retryStrategy: (times: number) => Math.min(times * 500, 5_000),
      enableOfflineQueue: false, // un Redis down ne bufferise pas en RAM
    });
    client.on("error", (err: Error) => {
      if (!state.loggedUnavailable) {
        state.loggedUnavailable = true;
        console.warn(`[redis] ${purpose} indisponible (dégradation single-pod):`, err.message);
      }
    });
    client.on("ready", () => {
      state.loggedUnavailable = false;
    });
    return client;
  } catch (err) {
    if (!state.loggedUnavailable) {
      state.loggedUnavailable = true;
      console.warn("[redis] init impossible (dégradation single-pod):", err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/** Client commandes (SET/GET/PUBLISH…). Null sans REDIS_URL. */
export function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null;
  if (!state.client) state.client = buildClient("client");
  return state.client;
}

/** Connexion dédiée au mode subscribe (contrainte ioredis). Null sans REDIS_URL. */
function getSubscriber(): Redis | null {
  if (!isRedisConfigured()) return null;
  if (!state.subscriber) {
    state.subscriber = buildClient("subscriber");
    if (state.subscriber) {
      state.subscriber.on("message", (channel: string, raw: string) => {
        const set = state.handlers.get(channel);
        if (!set || set.size === 0) return;
        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return; // message non-JSON : ignoré (jamais de throw dans le listener)
        }
        for (const handler of set) {
          try {
            handler(payload);
          } catch {
            // les erreurs de handler ne cassent pas le fan-out
          }
        }
      });
    }
  }
  return state.subscriber;
}

/**
 * Publie un payload JSON sur un channel — fire-and-forget, enveloppé avec
 * `origin: INSTANCE_ID` pour que les abonnés puissent ignorer leur propre pod.
 * No-op silencieux sans Redis.
 */
export function publishJson(channel: string, payload: Record<string, unknown>): void {
  const client = getRedis();
  if (!client) return;
  client.publish(channel, JSON.stringify({ ...payload, origin: INSTANCE_ID })).catch(() => {
    // fire-and-forget : un PUBLISH raté ne dégrade que la fraîcheur cross-pod
  });
}

/**
 * S'abonne à un channel JSON. Les messages émis par CE pod (origin ===
 * INSTANCE_ID) sont filtrés — le chemin local a déjà été servi. Retourne un
 * unsubscribe (no-op sans Redis).
 */
export function subscribeJson(channel: string, handler: (payload: Record<string, unknown>) => void): () => void {
  const sub = getSubscriber();
  if (!sub) return () => {};

  const wrapped = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const p = payload as Record<string, unknown>;
    if (p.origin === INSTANCE_ID) return;
    handler(p);
  };

  let set = state.handlers.get(channel);
  if (!set) {
    set = new Set();
    state.handlers.set(channel, set);
    sub.subscribe(channel).catch(() => {
      // subscribe raté = pas de fraîcheur cross-pod ; le TTL local reste le filet
    });
  }
  set.add(wrapped);

  return () => {
    const current = state.handlers.get(channel);
    if (!current) return;
    current.delete(wrapped);
    if (current.size === 0) {
      state.handlers.delete(channel);
      sub.unsubscribe(channel).catch(() => {});
    }
  };
}

/**
 * Claim CAS — `SET key INSTANCE_ID NX EX ttl`. True si CE pod obtient le
 * claim. SANS Redis : true (single-pod, rien à arbitrer — comportement
 * historique préservé). Un Redis configuré mais injoignable → true aussi
 * (on préfère un double-run improbable à un cron gelé).
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;
  try {
    const res = await client.set(key, INSTANCE_ID, "EX", ttlSeconds, "NX");
    return res === "OK";
  } catch {
    return true;
  }
}

/** Relâche un claim si (et seulement si) ce pod le détient encore. Atomique (Lua). */
export async function releaseClaim(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1,
      key,
      INSTANCE_ID,
    );
  } catch {
    // le TTL fera le ménage
  }
}

/** Ferme les connexions (tests / arrêt propre pm2). */
export async function closeRedis(): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  if (state.client) tasks.push(state.client.quit().catch(() => {}));
  if (state.subscriber) tasks.push(state.subscriber.quit().catch(() => {}));
  state.client = null;
  state.subscriber = null;
  state.handlers.clear();
  await Promise.all(tasks);
}
