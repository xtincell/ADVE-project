import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  search: vi.fn(), within: vi.fn(), peers: vi.fn(), brands: vi.fn(), errors: vi.fn(), stats: vi.fn(),
  capture: vi.fn(), mark: vi.fn(), batch: vi.fn(),
}));
vi.mock("@/lib/auth/types", () => ({}));
vi.mock("@/lib/db", () => ({ db: { errorEvent: { findMany: calls.errors }, strategy: { findMany: calls.brands } } }));
vi.mock("@/server/services/seshat/context-store", () => ({
  searchByQuery: calls.search, topKWithinStrategy: calls.within, findSimilarAcrossStrategies: calls.peers,
}));
vi.mock("@/server/services/error-vault", () => ({
  capture: calls.capture, markResolved: calls.mark, batchMarkResolved: calls.batch, getStats: calls.stats,
}));

import { seshatSearchRouter } from "@/server/trpc/routers/seshat-search";
import { errorVaultRouter } from "@/server/trpc/routers/error-vault";

function callers(role: string | null, operatorId: string | null = "operator-fixture") {
  const context = {
    session: role ? { user: { id: "fixture-actor", role, operatorId } } : null,
    db: { user: { findUnique: async () => ({ operatorId }) } },
  } as never;
  return { search: seshatSearchRouter.createCaller(context), errors: errorVaultRouter.createCaller(context) };
}
function privateReads(api: ReturnType<typeof callers>) {
  return [
    () => api.search.searchAcrossStrategies({ query: "fixture" }),
    () => api.search.searchWithinStrategy({ strategyId: "foreign-brand", query: "fixture" }),
    () => api.search.findPeers({ strategyId: "foreign-brand" }),
    () => api.errors.list({}),
    () => api.errors.groupBySignature({}),
    () => api.errors.oracleIncidents({}),
    () => api.errors.stats(),
  ];
}
const globalReaders = () => [calls.search, calls.within, calls.peers, calls.brands, calls.errors, calls.stats];

beforeEach(() => {
  vi.resetAllMocks();
  const node = { id: "foreign-node", strategyId: "foreign-brand", similarity: 0.9, text: "PRIVATE_FIXTURE_CONTENT", payload: { confidential: true } };
  calls.search.mockResolvedValue([node]); calls.within.mockResolvedValue([node]); calls.peers.mockResolvedValue([node]);
  calls.brands.mockResolvedValue([{ id: "foreign-brand", name: "Private fixture brand", businessContext: { private: true }, financialCapacity: { private: true }, advertis_vector: { composite: 100 } }]);
  calls.errors.mockResolvedValue([{ id: "foreign-error", signature: "fixture", code: "ORACLE-FIXTURE", strategyId: "foreign-brand",
    intentId: "foreign-intent", message: "PRIVATE_FIXTURE_ERROR", context: { confidential: true }, source: "SERVER", severity: "ERROR",
    occurrences: 1, firstSeenAt: new Date(0), lastSeenAt: new Date(0), route: "/fixture" }]);
  calls.stats.mockResolvedValue({ total: 1, unresolved: 1, bySeverity: [], bySource: [] });
  calls.capture.mockResolvedValue("own-error"); calls.mark.mockResolvedValue({ resolved: true });
});

describe("console-only private reads require a staff role as well as an operator link", () => {
  it.each(["CLIENT_RETAINER", "CLIENT_STATIC", "CREATOR", "FREELANCE", "BRAND_MANAGER", "FOUNDER", "USER", "AGENCY", "PARTNER"])(
    "rejects all seven reads for a linked %s before any private reader runs", async role => {
      for (const read of privateReads(callers(role))) await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" });
      for (const reader of globalReaders()) expect(reader).not.toHaveBeenCalled();
    },
  );
  it.each(["ADMIN", "OPERATOR"])("keeps the actual console projections available to %s", async role => {
    const api = callers(role, role === "ADMIN" ? null : "operator-fixture");
    for (const read of privateReads(api)) await expect(read()).resolves.toBeDefined();
    for (const reader of globalReaders()) expect(reader).toHaveBeenCalled();
    expect((await api.search.findPeers({ strategyId: "foreign-brand" })).peers[0]).toMatchObject({
      name: "Private fixture brand", businessContext: { private: true }, financialCapacity: { private: true },
    });
    expect((await api.errors.oracleIncidents({}))[0]?.sample.context).toEqual({ confidential: true });
  });
  it("does not admit an operator without a team link", async () => {
    for (const read of privateReads(callers("OPERATOR", null))) await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const reader of globalReaders()) expect(reader).not.toHaveBeenCalled();
  });
  it("requires authentication before any console read", async () => {
    for (const read of privateReads(callers(null))) await expect(read()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const reader of globalReaders()) expect(reader).not.toHaveBeenCalled();
  });
  it("preserves client error capture under the actual caller identity without permitting global reads", async () => {
    const api = callers("CLIENT_RETAINER", null);
    expect(await api.errors.captureClient({ message: "Own fixture error", userId: "foreign-user" } as never)).toEqual({ id: "own-error" });
    expect(calls.capture).toHaveBeenCalledWith(expect.objectContaining({ userId: "fixture-actor", message: "Own fixture error" }));
    for (const reader of globalReaders()) expect(reader).not.toHaveBeenCalled();
  });
  it("preserves administrator-only error resolution", async () => {
    await expect(callers("OPERATOR").errors.markResolved({ id: "foreign-error" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(calls.mark).not.toHaveBeenCalled();
    await expect(callers("ADMIN", null).errors.markResolved({ id: "foreign-error" })).resolves.toEqual({ resolved: true });
    expect(calls.mark).toHaveBeenCalledWith(expect.objectContaining({ resolvedById: "fixture-actor" }));
  });
});
