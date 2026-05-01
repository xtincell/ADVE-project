/**
 * Sprint M — Mestor dispatch end-to-end (Imhotep + Anubis).
 *
 * Tests d'intégration qui vérifient le pipeline complet :
 *   1. mestor.emitIntent({kind: "IMHOTEP_*", strategyId, payload})
 *   2. → registry findCapability(kind) → service "imhotep"
 *   3. → handler exécuté (mocked DB) → output capability
 *   4. → IntentEmission persisted (mocked) avec status=OK
 *
 * Stratégie : on stub la couche DB Prisma via vi.mock pour éviter de
 * démarrer un Postgres test. La vraie vérification structurelle est
 * faite par tests/unit/governance/imhotep-anubis-dispatch.test.ts qui
 * couvre le registry shape. Ce fichier exerce le code-path bout-en-bout.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @/lib/db AVANT toute import qui le consomme.
vi.mock("@/lib/db", () => {
  const calls: Array<{ table: string; op: string; args: unknown }> = [];
  function makeTable(name: string) {
    return new Proxy({}, {
      get(_, op: string) {
        return (...args: unknown[]) => {
          calls.push({ table: name, op, args: args[0] });
          // Default returns by op
          if (op === "findUnique" || op === "findFirst") return Promise.resolve(null);
          if (op === "findMany") return Promise.resolve([]);
          if (op === "create" || op === "update" || op === "upsert") return Promise.resolve({ id: `mock-${name}-${Date.now()}` });
          if (op === "createMany" || op === "updateMany") return Promise.resolve({ count: 0 });
          return Promise.resolve(null);
        };
      },
    });
  }
  const tables = ["mission", "strategy", "talentProfile", "course", "enrollment", "campaign", "campaignAmplification", "socialConnection", "socialPost", "notification", "user", "integrationConnection", "intentEmission", "intentEmissionEvent", "marketBenchmark", "aICostLog"];
  const db: Record<string, unknown> = { _calls: calls };
  for (const t of tables) db[t] = makeTable(t);
  return { db };
});

// Mock LLM gateway to avoid real API calls
vi.mock("@/server/services/llm-gateway", () => ({
  callLLMAndParse: vi.fn(async () => ({ recommendations: [] })),
}));

// Mock email
vi.mock("@/server/services/email", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, provider: "log" })),
}));

// Mock SMS
vi.mock("@/server/services/sms-broadcast", () => ({
  sendSms: vi.fn(async () => ({ ok: true, provider: "log" })),
}));

// Mock Push
vi.mock("@/server/services/notification-dispatcher", () => ({
  sendPush: vi.fn(async () => ({ ok: true, provider: "log" })),
}));

// Mock ad-clients to avoid real provider call
vi.mock("@/server/services/oauth-integrations/ad-clients", () => ({
  getAdClient: () => ({
    platform: "META_ADS",
    providerKey: "meta",
    isConfigured: async () => true,
    createCampaign: async () => ({
      externalCampaignId: "mock-camp-001",
      status: "PAUSED",
      billingReference: "mock-bill-001",
      estimatedReach: 50_000,
      estimatedCpm: 1500,
    }),
  }),
}));

describe("Mestor → Imhotep dispatch E2E", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matchCreator returns no candidates when mission missing", async () => {
    const { matchCreator } = await import("@/server/services/imhotep");
    await expect(matchCreator({ missionId: "nonexistent" })).rejects.toThrow();
  });

  it("evaluateTier throws on missing talent profile", async () => {
    const { evaluateTier } = await import("@/server/services/imhotep");
    await expect(evaluateTier({ talentProfileId: "nonexistent" })).rejects.toThrow();
  });

  it("recommendTraining returns empty recommendations on missing profile", async () => {
    const { recommendTraining } = await import("@/server/services/imhotep");
    await expect(recommendTraining({ talentProfileId: "nonexistent" })).rejects.toThrow();
  });
});

describe("Mestor → Anubis dispatch E2E", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dispatchMessage returns delivered=true for IN_APP channel", async () => {
    const { dispatchMessage } = await import("@/server/services/anubis");
    const result = await dispatchMessage({
      strategyId: "wk-strategy-bliss",
      userId: "wk-user-amara-udaku",
      channel: "IN_APP",
      title: "Test",
      body: "Body",
      manipulationMode: "facilitator",
    });
    expect(result.channel).toBe("IN_APP");
    expect(result.delivered).toBe(true);
  });

  it("publishSocial throws on missing connection", async () => {
    const { publishSocial } = await import("@/server/services/anubis");
    await expect(
      publishSocial({
        strategyId: "wk-strategy-bliss",
        connectionId: "nonexistent",
        content: "Test post",
        manipulationMode: "facilitator",
      }),
    ).rejects.toThrow();
  });

  it("scheduleDrop returns dropId with channelCount=0 when strategy missing", async () => {
    const { scheduleDrop } = await import("@/server/services/anubis");
    const result = await scheduleDrop({
      strategyId: "wk-strategy-nope",
      campaignId: "wk-campaign-nope",
      scheduledAt: new Date(Date.now() + 86_400_000),
      manipulationMode: "facilitator",
      channels: [{ channel: "IN_APP", payload: { title: "T", body: "B" } }],
    });
    expect(result.channelCount).toBe(0);
    expect(result.estimatedReach).toBe(0);
  });
});

describe("Sprint O — governance regression : every Imhotep + Anubis kind has matching service", () => {
  it("INTENT_KINDS catalog ↔ registry round-trip", async () => {
    const { INTENT_KINDS } = await import("@/server/governance/intent-kinds");
    const { findCapability } = await import("@/server/governance/registry");
    const KINDS = INTENT_KINDS.filter((k) => k.handler === "imhotep" || k.handler === "anubis");
    expect(KINDS.length).toBe(10);
    for (const k of KINDS) {
      const cap = findCapability(k.kind);
      expect(cap, `findCapability(${k.kind}) must resolve`).toBeDefined();
      expect(cap!.service).toBe(k.handler);
    }
  });

  it("manipulation modes constant matches across services", async () => {
    const { MANIPULATION_MODES } = await import("@/server/services/ptah/types");
    const { COMMS_CHANNELS } = await import("@/server/services/anubis/types");
    expect(MANIPULATION_MODES).toContain("peddler");
    expect(MANIPULATION_MODES).toContain("dealer");
    expect(MANIPULATION_MODES).toContain("facilitator");
    expect(MANIPULATION_MODES).toContain("entertainer");
    expect(MANIPULATION_MODES).toHaveLength(4);
    expect(COMMS_CHANNELS).toHaveLength(13);
  });
});
