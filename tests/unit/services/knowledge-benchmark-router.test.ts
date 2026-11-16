import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure, adminProcedure: t.procedure, operatorProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: Parameters<typeof protectedProcedure.input>[0] }) => protectedProcedure.input(inputSchema) };
});
import { knowledgeGraphRouter } from "@/server/trpc/routers/knowledge-graph";

const strategies = vi.fn();
const caller = () => knowledgeGraphRouter.createCaller({ db: { strategy: { findMany: strategies } } } as never);
beforeEach(() => strategies.mockReset());

describe("knowledge benchmark API measurement semantics", () => {
  it("counts missing vectors in coverage without averaging them as zero", async () => {
    strategies.mockResolvedValue([{ advertis_vector: { composite: 0 } }, { advertis_vector: { composite: 100 } }, { advertis_vector: null }, { advertis_vector: {} }]);
    expect(await caller().getBenchmarks({})).toEqual({ count: 4, avgComposite: 50, coverage: { observedCount: 2, missingCount: 2, totalCount: 4 }, benchmarks: {} });
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
    ]);
    expect(await caller().getFrameworkRanking({})).toEqual([
      { strategyId: "full", name: "Full", composite: 100 },
      { strategyId: "zero", name: "Zero", composite: 0 },
      { strategyId: "missing", name: "Missing", composite: null },
      { strategyId: "invalid", name: "Invalid", composite: null },
    ]);
  });
});
