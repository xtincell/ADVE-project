import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  peers: vi.fn(), rows: vi.fn(), canAccess: vi.fn(), operatorContext: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/auth/types", () => ({}));
vi.mock("@/server/services/seshat/context-store", () => ({ findSimilarAcrossStrategies: mocks.peers }));
vi.mock("@/server/services/operator-isolation", () => ({
  canAccessStrategy: mocks.canAccess, getOperatorContext: mocks.operatorContext, scopeStrategies: vi.fn(),
}));

import { strategyRouter } from "@/server/trpc/routers/strategy";

const caller = (authenticated = true) => strategyRouter.createCaller({
  session: authenticated ? { user: { id: "owner", role: "FOUNDER" } } : null,
  db: { strategy: { findMany: mocks.rows } },
} as never);
function population(values: unknown[]) {
  mocks.peers.mockResolvedValue(values.map((_value, i) => ({ strategyId: `private-peer-${i}`, similarity: 0.9 - i / 100 })));
  mocks.rows.mockResolvedValue(values.map(value => ({ advertis_vector: value === null ? null : { composite: value } })));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.operatorContext.mockResolvedValue({ userId: "owner", role: "FOUNDER", operatorId: null });
  mocks.canAccess.mockResolvedValue(true);
  population([40, 100, 160]);
});

describe("founder comparables require three valid scores before exposing a median", () => {
  it("withholds the only score even when three different peers were indexed", async () => {
    population([137, null, undefined]);
    const result = await caller().comparables({ strategyId: "owned-brand" });
    expect(result).toEqual({ peerCount: 3, medianComposite: null, topSimilarity: 0.9 });
    expect(Object.keys(result).sort()).toEqual(["medianComposite", "peerCount", "topSimilarity"]);
    expect(JSON.stringify(result)).not.toContain("private-peer");
  });

  it.each([Number.NaN, Infinity, -Infinity, -1, 201, "100", null, undefined])(
    "does not count invalid composite %s toward the anonymity threshold", async invalid => {
      population([40, 100, invalid]);
      expect(await caller().comparables({ strategyId: "owned-brand" })).toMatchObject({ peerCount: 3, medianComposite: null });
    },
  );

  it("keeps zero and the upper bound as valid scores", async () => {
    population([0, 100, 200]);
    expect(await caller().comparables({ strategyId: "owned-brand" })).toEqual({ peerCount: 3, medianComposite: 100, topSimilarity: 0.9 });
  });

  it("keeps a fully measured zero median visible", async () => {
    population([0, 0, 0]);
    expect(await caller().comparables({ strategyId: "owned-brand" })).toMatchObject({ medianComposite: 0 });
  });

  it("excludes invalid scores from a sufficiently large observed population", async () => {
    population([200, Number.NaN, 40, Infinity, 100, -1, 201]);
    expect(await caller().comparables({ strategyId: "owned-brand", topK: 10 })).toMatchObject({ peerCount: 7, medianComposite: 100 });
  });

  it("uses both central scores for an even observed population", async () => {
    population([0, 20, 100, 200]);
    expect(await caller().comparables({ strategyId: "owned-brand" })).toMatchObject({ medianComposite: 60 });
  });

  it("counts each distinct peer once and reads only the vector", async () => {
    mocks.peers.mockResolvedValue([
      { strategyId: "one", similarity: 0.9 }, { strategyId: "one", similarity: 0.8 },
      { strategyId: "two", similarity: 0.7 }, { strategyId: "three", similarity: 0.6 },
    ]);
    expect(await caller().comparables({ strategyId: "owned-brand" })).toMatchObject({ peerCount: 3, medianComposite: 100 });
    expect(mocks.rows).toHaveBeenCalledWith({ where: { id: { in: ["one", "two", "three"] } }, select: { advertis_vector: true } });
  });

  it("does not inspect scores below three distinct peers", async () => {
    population([100, 200]);
    expect(await caller().comparables({ strategyId: "owned-brand" })).toMatchObject({ peerCount: 2, medianComposite: null });
    expect(mocks.rows).not.toHaveBeenCalled();
  });

  it("rejects a foreign brand before searching peers", async () => {
    mocks.canAccess.mockResolvedValue(false);
    await expect(caller().comparables({ strategyId: "foreign-brand" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.canAccess).toHaveBeenCalledWith("foreign-brand", { userId: "owner", role: "FOUNDER", operatorId: null });
    expect(mocks.peers).not.toHaveBeenCalled();
    expect(mocks.rows).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request before consulting the brand", async () => {
    await expect(caller(false).comparables({ strategyId: "owned-brand" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.canAccess).not.toHaveBeenCalled();
    expect(mocks.peers).not.toHaveBeenCalled();
  });
});
