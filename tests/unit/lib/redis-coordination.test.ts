/**
 * Vague B — coordination multi-pod Redis (résiduel Phase 18 « Cache Redis
 * cross-pod »). Deux contrats verrouillés :
 *   1. SANS REDIS_URL : dégradation single-pod honnête — aucun crash, claims
 *      accordés, pub/sub no-op, broker NSP local inchangé ;
 *   2. AVEC Redis (mocké) : self-filtering par INSTANCE_ID — un pod n'écoute
 *      jamais ses propres messages (pas de double livraison NSP).
 * Zéro réseau : ioredis est mocké.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock ioredis AVANT l'import du module sous test. Chaque `new IORedis()`
// partage le même bus in-memory du mock (simule un Redis unique).
const published: Array<{ channel: string; message: string }> = [];
const channelHandlers = new Map<string, Array<(channel: string, message: string) => void>>();

vi.mock("ioredis", () => {
  class FakeRedis {
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    on(event: string, cb: (...args: unknown[]) => void) {
      const arr = this.listeners.get(event) ?? [];
      arr.push(cb);
      this.listeners.set(event, arr);
      if (event === "message") {
        // Enregistre ce client comme subscriber global du fake bus.
        for (const [ch, handlers] of channelHandlers) {
          void ch;
          handlers.push(cb as (channel: string, message: string) => void);
        }
        channelHandlers.set("__all__", [
          ...(channelHandlers.get("__all__") ?? []),
          cb as (channel: string, message: string) => void,
        ]);
      }
      return this;
    }
    async subscribe(_channel: string) {
      return 1;
    }
    async unsubscribe(_channel: string) {
      return 1;
    }
    async publish(channel: string, message: string) {
      published.push({ channel, message });
      for (const cb of channelHandlers.get("__all__") ?? []) cb(channel, message);
      return 1;
    }
    async set(_key: string, _value: string, ..._args: unknown[]) {
      return "OK";
    }
    async eval() {
      return 1;
    }
    async quit() {
      return "OK";
    }
  }
  return { default: FakeRedis, Redis: FakeRedis };
});

const savedRedisUrl = process.env.REDIS_URL;

async function freshImports() {
  vi.resetModules();
  // globalThis singleton du module doit repartir à zéro entre les scénarios.
  delete (globalThis as Record<string, unknown>).__lafuseeRedis;
  const redis = await import("@/lib/redis");
  const broker = await import("@/server/services/nsp/sse-broker");
  return { redis, broker };
}

beforeEach(() => {
  published.length = 0;
  channelHandlers.clear();
});

afterEach(() => {
  if (savedRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = savedRedisUrl;
});

describe("sans REDIS_URL — dégradation single-pod honnête", () => {
  it("getRedis null, claim toujours accordé, pub/sub no-op, jamais de throw", async () => {
    delete process.env.REDIS_URL;
    const { redis } = await freshImports();

    expect(redis.isRedisConfigured()).toBe(false);
    expect(redis.getRedis()).toBeNull();
    await expect(redis.claimOnce("cron:test:tick", 60)).resolves.toBe(true);
    await expect(redis.claimOnce("cron:test:tick", 60)).resolves.toBe(true); // pas d'arbitrage single-pod
    expect(() => redis.publishJson("chan", { a: 1 })).not.toThrow();
    const unsub = redis.subscribeJson("chan", () => {});
    expect(() => unsub()).not.toThrow();
    await expect(redis.releaseClaim("cron:test:tick")).resolves.toBeUndefined();
    expect(published).toHaveLength(0);
  });

  it("broker NSP : fan-out local inchangé (comportement historique)", async () => {
    delete process.env.REDIS_URL;
    const { broker } = await freshImports();

    const received: unknown[] = [];
    const unsub = broker.subscribe("user-1", (e) => received.push(e));
    const delivered = broker.publish("user-1", {
      kind: "notification",
      id: "n1",
      userId: "user-1",
      type: "TEST",
      priority: "NORMAL",
      title: "t",
      body: "b",
      createdAt: new Date(0).toISOString(),
    });
    expect(delivered).toBe(1);
    expect(received).toHaveLength(1);
    unsub();
    broker.clearAll();
  });
});

describe("avec Redis (mocké) — pont multi-pod", () => {
  it("claimOnce SET NX : accordé quand Redis répond OK", async () => {
    process.env.REDIS_URL = "redis://fake:6379";
    const { redis } = await freshImports();
    await expect(redis.claimOnce("cron:scheduler:tick", 240)).resolves.toBe(true);
  });

  it("publish NSP relaye sur le channel nsp:events avec origin=INSTANCE_ID", async () => {
    process.env.REDIS_URL = "redis://fake:6379";
    const { redis, broker } = await freshImports();

    broker.subscribe("user-1", () => {});
    broker.publish("user-1", {
      kind: "notification",
      id: "n1",
      userId: "user-1",
      type: "TEST",
      priority: "NORMAL",
      title: "t",
      body: "b",
      createdAt: new Date(0).toISOString(),
    });
    // flush micro-tâches du publish fire-and-forget
    await new Promise((r) => setTimeout(r, 0));

    const nsp = published.filter((p) => p.channel === "nsp:events");
    expect(nsp).toHaveLength(1);
    const envelope = JSON.parse(nsp[0]!.message) as Record<string, unknown>;
    expect(envelope.origin).toBe(redis.INSTANCE_ID);
    expect(envelope.userId).toBe("user-1");
    broker.clearAll();
  });

  it("self-filtering : un message avec origin=CE pod n'est PAS re-livré localement", async () => {
    process.env.REDIS_URL = "redis://fake:6379";
    const { redis, broker } = await freshImports();

    const received: unknown[] = [];
    broker.subscribe("user-1", (e) => received.push(e));
    const delivered = broker.publish("user-1", {
      kind: "notification",
      id: "n1",
      userId: "user-1",
      type: "TEST",
      priority: "NORMAL",
      title: "t",
      body: "b",
      createdAt: new Date(0).toISOString(),
    });
    await new Promise((r) => setTimeout(r, 0));

    // 1 livraison locale directe — le round-trip Redis (origin = self) est filtré.
    expect(delivered).toBe(1);
    expect(received).toHaveLength(1);
    void redis;
    broker.clearAll();
  });

  it("un message d'un AUTRE pod est livré aux abonnés locaux", async () => {
    process.env.REDIS_URL = "redis://fake:6379";
    const { broker } = await freshImports();

    const received: unknown[] = [];
    broker.subscribe("user-2", (e) => received.push(e));

    // Simule un pod distant : PUBLISH brut sur le fake bus avec un autre origin.
    const remote = {
      origin: "autre-pod-uuid",
      userId: "user-2",
      event: { kind: "notification", id: "n2", userId: "user-2", type: "T", priority: "NORMAL", title: "x", body: "y", createdAt: new Date(0).toISOString() },
    };
    for (const cb of channelHandlers.get("__all__") ?? []) {
      cb("nsp:events", JSON.stringify(remote));
    }

    expect(received).toHaveLength(1);
    expect((received[0] as { id: string }).id).toBe("n2");
    broker.clearAll();
  });
});

describe("invalidations cross-pod des caches", () => {
  it("market-visibility : invalidateMarketVisibility diffuse sur son channel", async () => {
    process.env.REDIS_URL = "redis://fake:6379";
    await freshImports();
    const mv = await import("@/server/services/market-visibility");
    mv.invalidateMarketVisibility();
    await new Promise((r) => setTimeout(r, 0));
    expect(published.some((p) => p.channel === "cache:market-visibility:invalidate")).toBe(true);
  });

  it("market-visibility sans Redis : invalidation locale sans throw ni publish", async () => {
    delete process.env.REDIS_URL;
    await freshImports();
    const mv = await import("@/server/services/market-visibility");
    expect(() => mv.invalidateMarketVisibility()).not.toThrow();
    expect(published).toHaveLength(0);
  });
});
