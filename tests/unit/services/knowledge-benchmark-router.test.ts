import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/types", () => ({}));
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: Parameters<typeof protectedProcedure.input>[0] }) => protectedProcedure.input(inputSchema) };
});
import { knowledgeGraphRouter } from "@/server/trpc/routers/knowledge-graph";

const strategies = vi.fn();
const caller = (role: string | null = "ADMIN", operatorId: string | null = null) => knowledgeGraphRouter.createCaller({
  session: role ? { user: { id: "fixture-user", role } } : null,
  db: { strategy: { findMany: strategies }, user: { findUnique: async () => ({ operatorId }) } },
} as never);
beforeEach(() => strategies.mockReset());
const globalReads = (api: ReturnType<typeof caller>) => [
  () => api.query({ queryText: "fixture" }),
  () => api.getBenchmarks({}),
  () => api.getFrameworkRanking({}),
];

describe("knowledge benchmark API measurement semantics", () => {
  it.each(["FOUNDER", "AGENCY", "PARTNER", "CLIENT_RETAINER"])("keeps cross-brand benchmarks inaccessible to unlinked %s accounts", async role => {
    await expect(caller(role).getBenchmarks({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(strategies).not.toHaveBeenCalled();
  });

  it.each(["FOUNDER", "AGENCY", "PARTNER", "CLIENT_RETAINER", "CLIENT_STATIC", "CREATOR", "FREELANCE", "BRAND_MANAGER", "USER"])(
    "rejects all global knowledge reads for a linked %s before reading any brand", async role => {
      strategies.mockResolvedValue([]);
      for (const read of globalReads(caller(role, "operator-fixture"))) {
        await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      expect(strategies).not.toHaveBeenCalled();
    },
  );

  it.each(["ADMIN", "OPERATOR"])("keeps the canonical %s staff reads available", async role => {
    strategies.mockResolvedValue([]);
    for (const read of globalReads(caller(role, role === "OPERATOR" ? "operator-fixture" : null))) await read();
    expect(strategies).toHaveBeenCalledTimes(3);
  });

  it("does not grant global knowledge reads to an operator without a team link", async () => {
    for (const read of globalReads(caller("OPERATOR"))) await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(strategies).not.toHaveBeenCalled();
  });

  it("requires authentication and admits the existing linked-operator contract", async () => {
    await expect(caller(null).getBenchmarks({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(strategies).not.toHaveBeenCalled();
    strategies.mockResolvedValue([]);
    expect(await caller("OPERATOR", "operator-fixture").getBenchmarks({})).toMatchObject({ count: 0, avgComposite: null });
  });

  it("counts missing vectors in coverage without averaging them as zero", async () => {
    strategies.mockResolvedValue([{ advertis_vector: { composite: 0 } }, { advertis_vector: { composite: 100 } }, { advertis_vector: null }, { advertis_vector: {} }]);
    expect(await caller().getBenchmarks({})).toMatchObject({ count: 4, avgComposite: 50, coverage: { observedCount: 2, missingCount: 2, totalCount: 4 }, benchmarks: {} });
  });

  it("filters by the canonical client sector without treating unqualified sectors as other", async () => {
    strategies.mockResolvedValue([
      { client: { sector: "FOOD" }, advertis_vector: { composite: 0 } },
      { client: { sector: "Alimentation" }, advertis_vector: { composite: 100 } },
      { client: { sector: "TECH" }, advertis_vector: { composite: 200 } },
      { client: { sector: null }, advertis_vector: { composite: 180 } },
    ]);
    expect(await caller().getBenchmarks({ sector: "food" })).toMatchObject({
      count: 2, avgComposite: 50,
      scope: { sector: "food", countries: "ALL", marketScales: "ALL" },
    });
    expect(await caller().getBenchmarks({ sector: "AUTRE" })).toMatchObject({ count: 0, avgComposite: null });
  });

  it("rejects an unsupported category or unrecognized sector before reading any brand", async () => {
    await expect(caller().getBenchmarks({ category: "PRODUCT" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().getBenchmarks({ sector: "unrecognized-sector-xyz" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(strategies).not.toHaveBeenCalled();
  });

  it("does not turn blank filters into a new cohort", async () => {
    strategies.mockResolvedValue([{ advertis_vector: { composite: 0 } }]);
    expect(await caller().getBenchmarks({ sector: "  ", category: " " })).toMatchObject({
      count: 1, avgComposite: 0, scope: { sector: null, countries: "ALL", marketScales: "ALL" },
    });
  });

  it("returns independent measured axes and ignores malformed or out-of-range scores", async () => {
    strategies.mockResolvedValue([
      { advertis_vector: { composite: 200, a: 0, d: 25, v: 26 } },
      { advertis_vector: { composite: 0, a: 20, d: null, v: "10" } },
      { advertis_vector: { composite: 201, a: -1, d: Infinity, e: 5 } },
      { advertis_vector: null },
    ]);
    const result = await caller().getBenchmarks({});
    expect(result).toMatchObject({ avgComposite: 100, coverage: { observedCount: 2, missingCount: 2, totalCount: 4 },
      benchmarks: {}, pillarBenchmarks: {
        a: { average: 10, coverage: { observedCount: 2, missingCount: 2, totalCount: 4 } },
        d: { average: 25, coverage: { observedCount: 1, missingCount: 3, totalCount: 4 } },
        e: { average: 5, coverage: { observedCount: 1, missingCount: 3, totalCount: 4 } },
        v: { average: null, coverage: { observedCount: 0, missingCount: 4, totalCount: 4 } },
      },
    });
    expect(Object.keys(result.pillarBenchmarks)).toEqual(["a", "d", "v", "e", "r", "t", "i", "s"]);
    expect(result).not.toHaveProperty("strategies");
  });

  it("distinguishes an absent population from an explicitly measured zero", async () => {
    strategies.mockResolvedValue([]);
    expect(await caller().getBenchmarks({})).toMatchObject({ count: 0, avgComposite: null });
    strategies.mockResolvedValue([{ advertis_vector: { composite: 0 } }]);
    expect(await caller().getBenchmarks({})).toMatchObject({ count: 1, avgComposite: 0 });
  });

  it("ranks unknown composites last without presenting them as measured zero", async () => {
    strategies.mockResolvedValue([
      { id: "missing", name: "Missing", advertis_vector: null },
      { id: "zero", name: "Zero", advertis_vector: { composite: 0 } },
      { id: "full", name: "Full", advertis_vector: { composite: 100 } },
      { id: "invalid", name: "Invalid", advertis_vector: { composite: "90" } },
      { id: "out-of-range", name: "Out of range", advertis_vector: { composite: 201 } },
    ]);
    expect(await caller().getFrameworkRanking({})).toEqual([
      { strategyId: "full", name: "Full", composite: 100 },
      { strategyId: "zero", name: "Zero", composite: 0 },
      { strategyId: "missing", name: "Missing", composite: null },
      { strategyId: "invalid", name: "Invalid", composite: null },
      { strategyId: "out-of-range", name: "Out of range", composite: null },
    ]);
  });
});
