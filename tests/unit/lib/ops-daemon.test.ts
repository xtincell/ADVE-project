/**
 * Vague C — daemon cron in-process. Invariants verrouillés :
 *   1. JAMAIS de tir au boot (premier pas = armement) — un redeploy ne
 *      re-déclenche ni founder-digest ni sweep mensuel ;
 *   2. Tir au franchissement de frontière (frequent 15 min, sixhourly,
 *      weekly lundi 06h UTC, monthly 1er 00h UTC) ;
 *   3. Self-fetch localhost avec Bearer CRON_SECRET ;
 *   4. Flag OPS_DAEMON : off explicite > on explicite > prod-only.
 * Zéro réseau réel : fetch stubé, Redis absent (claim toujours accordé).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { opsDaemonStep, isOpsDaemonEnabled } from "@/lib/ops-daemon";

const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["OPS_DAEMON", "CRON_SECRET", "REDIS_URL", "PORT"] as const;

let fetchCalls: Array<{ url: string; auth: string | undefined }> = [];

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  delete process.env.REDIS_URL; // claim accordé (single-pod)
  delete process.env.OPS_DAEMON;
  fetchCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      fetchCalls.push({ url: String(url), auth: headers.authorization });
      return { ok: true, status: 200 } as Response;
    }),
  );
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("opsDaemonStep — armement et frontières", () => {
  it("premier pas post-boot : arme sans tirer (même en pleine fenêtre weekly)", async () => {
    const buckets = new Map<string, string>();
    // Lundi 06:10 UTC — en pleine fenêtre weekly + frontières frequent/sixhourly.
    const fired = await opsDaemonStep(new Date(Date.UTC(2026, 6, 13, 6, 10, 0)), buckets);
    expect(fired).toEqual([]);
    expect(fetchCalls).toHaveLength(0);
  });

  it("frequent tire au franchissement du quart d'heure, une seule fois par bucket", async () => {
    const buckets = new Map<string, string>();
    await opsDaemonStep(new Date(Date.UTC(2026, 6, 10, 10, 14, 30)), buckets); // arme
    const fired1 = await opsDaemonStep(new Date(Date.UTC(2026, 6, 10, 10, 15, 5)), buckets);
    expect(fired1).toContain("frequent");
    expect(fetchCalls.some((c) => c.url.includes("/api/cron/scheduler"))).toBe(true);
    expect(fetchCalls.some((c) => c.url.includes("/api/cron/ptah-download"))).toBe(true);

    fetchCalls = [];
    const fired2 = await opsDaemonStep(new Date(Date.UTC(2026, 6, 10, 10, 15, 35)), buckets);
    expect(fired2).toEqual([]); // même bucket → pas de re-tir
    expect(fetchCalls).toHaveLength(0);
  });

  it("weekly ne tire QUE dans la fenêtre lundi 06h UTC (external-feeds porté par sixhourly)", async () => {
    const buckets = new Map<string, string>();
    await opsDaemonStep(new Date(Date.UTC(2026, 6, 12, 23, 50, 0)), buckets); // dimanche soir — arme

    // Lundi 05:59 : hors fenêtre weekly.
    let fired = await opsDaemonStep(new Date(Date.UTC(2026, 6, 13, 5, 59, 0)), buckets);
    expect(fired).not.toContain("weekly");

    // Lundi 06:00:30 : fenêtre → tire founder-digest.
    fired = await opsDaemonStep(new Date(Date.UTC(2026, 6, 13, 6, 0, 30)), buckets);
    expect(fired).toContain("weekly");
    expect(fetchCalls.some((c) => c.url.includes("/api/cron/founder-digest"))).toBe(true);
    // sixhourly (frontière 06h) embarque external-feeds — le trou « route jamais appelée » est clos.
    expect(fetchCalls.some((c) => c.url.includes("/api/cron/external-feeds"))).toBe(true);
  });

  it("monthly tire le 1er du mois 00h UTC avec ?monthly=1", async () => {
    const buckets = new Map<string, string>();
    await opsDaemonStep(new Date(Date.UTC(2026, 6, 31, 23, 59, 0)), buckets); // 31 juillet — arme
    const fired = await opsDaemonStep(new Date(Date.UTC(2026, 7, 1, 0, 0, 30)), buckets);
    expect(fired).toContain("monthly");
    expect(fetchCalls.some((c) => c.url.includes("/api/cron/ops-sweep?monthly=1"))).toBe(true);
  });

  it("self-fetch porte le Bearer CRON_SECRET et cible le PORT local", async () => {
    process.env.CRON_SECRET = "s3cret";
    process.env.PORT = "4123";
    const buckets = new Map<string, string>();
    await opsDaemonStep(new Date(Date.UTC(2026, 6, 10, 10, 14, 30)), buckets);
    await opsDaemonStep(new Date(Date.UTC(2026, 6, 10, 10, 15, 5)), buckets);
    expect(fetchCalls.length).toBeGreaterThan(0);
    expect(fetchCalls[0]!.url).toContain("http://127.0.0.1:4123/api/cron/");
    expect(fetchCalls[0]!.auth).toBe("Bearer s3cret");
  });
});

describe("isOpsDaemonEnabled — priorité des flags", () => {
  it("off explicite > tout ; on explicite > env ; défaut = prod-only", () => {
    process.env.OPS_DAEMON = "0";
    expect(isOpsDaemonEnabled()).toBe(false);
    process.env.OPS_DAEMON = "off";
    expect(isOpsDaemonEnabled()).toBe(false);
    process.env.OPS_DAEMON = "1";
    expect(isOpsDaemonEnabled()).toBe(true);
    delete process.env.OPS_DAEMON;
    vi.stubEnv("NODE_ENV", "production");
    expect(isOpsDaemonEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "test");
    expect(isOpsDaemonEnabled()).toBe(false);
  });
});
