/**
 * ADR-0121 — résolution des credentials Apify (ADR-0075 : vault opérateur
 * prioritaire, fallback token système env, null → DEFERRED côté façades).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    externalConnector: {
      findUnique: vi.fn(),
    },
    followerSnapshot: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { db } from "@/lib/db";
import { resolveApifyCredentials, fetchPublicFollowers } from "@/server/services/anubis/social-audit";

const findUnique = db.externalConnector.findUnique as ReturnType<typeof vi.fn>;

describe("resolveApifyCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APIFY_TOKEN;
  });
  afterEach(() => {
    delete process.env.APIFY_TOKEN;
  });

  it("vault opérateur prioritaire quand contexte + connecteur ACTIVE", async () => {
    process.env.APIFY_TOKEN = "env-token";
    findUnique.mockResolvedValue({ status: "ACTIVE", config: { apiKey: "vault-token", actorId: "custom~actor" } });
    const creds = await resolveApifyCredentials("op-1");
    expect(creds).toEqual({ apiKey: "vault-token", igActorOverride: "custom~actor", origin: "VAULT" });
  });

  it("fallback env quand connecteur absent/INACTIVE (intake public : operatorId null)", async () => {
    process.env.APIFY_TOKEN = "env-token";
    findUnique.mockResolvedValue(null);
    expect(await resolveApifyCredentials("op-1")).toMatchObject({ apiKey: "env-token", origin: "ENV" });
    expect(await resolveApifyCredentials(null)).toMatchObject({ apiKey: "env-token", origin: "ENV" });
    expect(findUnique).toHaveBeenCalledTimes(1); // pas de lookup vault sans operatorId
  });

  it("ni vault ni env → null (les façades répondent DEFERRED_AWAITING_CREDENTIALS)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await resolveApifyCredentials("op-1")).toBeNull();
    expect(await resolveApifyCredentials(null)).toBeNull();
  });
});

describe("fetchPublicFollowers — dégradations honnêtes (P22-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APIFY_TOKEN;
  });
  afterEach(() => {
    delete process.env.APIFY_TOKEN;
    vi.unstubAllGlobals();
  });

  it("sans token → DEFERRED_AWAITING_CREDENTIALS (jamais de données fabriquées)", async () => {
    const result = await fetchPublicFollowers(null, [{ platform: "INSTAGRAM", handle: "marque" }]);
    expect(result.state).toBe("DEFERRED_AWAITING_CREDENTIALS");
    expect("data" in result).toBe(false);
  });

  it("échec réseau → DEGRADED, jamais LIVE (ADR-0046)", async () => {
    process.env.APIFY_TOKEN = "env-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await fetchPublicFollowers(null, [{ platform: "INSTAGRAM", handle: "marque" }]);
    expect(result.state).toBe("DEGRADED");
  });

  it("réponse Apify valide → LIVE + snapshot persisté avec strategyId", async () => {
    process.env.APIFY_TOKEN = "env-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ username: "marque", followersCount: 12450, followsCount: 10 }],
      }),
    );
    const result = await fetchPublicFollowers("strat-1", [{ platform: "INSTAGRAM", handle: "@marque" }]);
    expect(result.state).toBe("LIVE");
    if (result.state === "LIVE") {
      expect(result.data[0]).toMatchObject({ platform: "INSTAGRAM", handle: "marque", followerCount: 12450 });
    }
    expect(db.followerSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ strategyId: "strat-1", source: "APIFY" }) }),
    );
  });

  it("TikTok/Facebook skippés sans env var d'actor (pas de dépense forcée, pas de DEGRADED)", async () => {
    process.env.APIFY_TOKEN = "env-token";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ username: "marque", followersCount: 100 }],
    });
    vi.stubGlobal("fetch", fetchSpy);
    await fetchPublicFollowers(null, [
      { platform: "INSTAGRAM", handle: "marque" },
      { platform: "TIKTOK", handle: "marque" },
      { platform: "FACEBOOK", handle: "marque" },
    ]);
    // Un seul run d'actor : Instagram. TikTok/FB opt-in via APIFY_*_ACTOR_ID.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("instagram-profile-scraper");
  });
});
