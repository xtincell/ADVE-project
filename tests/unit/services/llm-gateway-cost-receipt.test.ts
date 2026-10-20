import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn(async (_args: { data: Record<string, unknown> }) => ({ id: "cost-receipt" })));
const updateMany = vi.hoisted(() => vi.fn(async () => ({ count: 1 })));
vi.mock("@/lib/db", () => ({ db: { aICostLog: { create, updateMany } } }));
import { trackCost, withIntakeCostContext, bindIntakeCostStrategy } from "@/server/services/llm-gateway";

beforeEach(() => { create.mockClear(); updateMany.mockClear(); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("actual text provider and estimated cost receipt", () => {
  it("separates subscription quota from an API-priced estimate for OAuth Luna", async () => {
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "local-test-access");
    await trackCost({ strategyId: "brand-a", caller: "mestor:council:coordinator" },
      { inputTokens: 10000, outputTokens: 500 }, "gpt-5.6-luna", undefined, "openai");
    expect(create.mock.calls[0]![0].data).toMatchObject({ provider: "openai-codex-oauth",
      model: "gpt-5.6-luna", cost: 0.0026,
      context: "mestor:council:coordinator:subscription-quota:api-equivalent-estimate" });
  });
  it.each(["nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-26b-a4b-it:free"])
    ("records the catalogue's zero token estimate for %s without borrowing Sonnet pricing", async (model) => {
      await trackCost({ strategyId: "brand-a", caller: "mestor:council:coordinator" },
        { inputTokens: 37, outputTokens: 25 }, model, undefined, "openrouter");
      expect(create.mock.calls[0]![0].data).toMatchObject({
        provider: "openrouter", model, inputTokens: 37, outputTokens: 25, cost: 0,
        context: "mestor:council:coordinator:estimated-cost",
      });
    });

  it("does not bill a served Gemma answer as Anthropic Sonnet", async () => {
    await trackCost({ strategyId: "brand-a", caller: "mestor:council:coordinator" },
      { inputTokens: 10_299, outputTokens: 545 }, "gemma4:31b", undefined, "ollama");
    const data = create.mock.calls[0]![0].data;
    expect(data.provider).toBe("ollama");
    expect(data.model).toBe("gemma4:31b");
    expect(data.cost).toBeCloseTo(10_299 * 0.14 / 1e6 + 545 * 0.40 / 1e6, 10);
    expect(data.context).toBe("mestor:council:coordinator:estimated-cost");
    expect(data.cost).not.toBe(0);
  });

  it("preserves a provider-reported cost instead of replacing it with token estimates", async () => {
    await trackCost({ strategyId: "brand-a", caller: "forge" },
      { inputTokens: 10, outputTokens: 5 }, "native-model",
      { provider: "openrouter", costUsd: 0.12, estimated: false }, "openrouter");
    expect(create.mock.calls[0]![0].data).toMatchObject({
      provider: "openrouter", model: "native-model", cost: 0.12, context: "forge",
    });
  });

  it("records unassigned usage without inventing a brand", async () => {
    await trackCost({ caller: "unscoped" }, { inputTokens: 10, outputTokens: 5 },
      "gemma4:31b", undefined, "ollama");
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]![0].data).toMatchObject({
      strategyId: null, inputTokens: 10, outputTokens: 5, context: "unscoped:estimated-cost",
    });
  });
  it("keeps concurrent intake usage separate before and after each real brand is bound", async () => {
    let release!: () => void;
    const otherBound = new Promise<void>(resolve => { release = resolve; });
    await Promise.all([
      withIntakeCostContext("owned-intake-a", async () => {
        await trackCost({ caller: "extract" }, { inputTokens: 10, outputTokens: 5 }, "gemma4:31b", undefined, "ollama");
        await otherBound;
        await bindIntakeCostStrategy("brand-a");
        await trackCost({ caller: "evaluate" }, { inputTokens: 7, outputTokens: 2 }, "gemma4:31b", undefined, "ollama");
      }),
      withIntakeCostContext("owned-intake-b", async () => {
        await bindIntakeCostStrategy("brand-b");
        await trackCost({ caller: "evaluate" }, { inputTokens: 3, outputTokens: 1 }, "gemma4:31b", undefined, "ollama");
        release();
      }),
    ]);
    const rows = create.mock.calls.map(([v]) => v.data);
    expect(rows.find(r => r.context === "extract:intake[owned-intake-a]:estimated-cost")?.strategyId).toBeNull();
    expect(rows.find(r => r.context === "evaluate:intake[owned-intake-a]:estimated-cost")?.strategyId).toBe("brand-a");
    expect(rows.find(r => r.context === "evaluate:intake[owned-intake-b]:estimated-cost")?.strategyId).toBe("brand-b");
    expect(updateMany).toHaveBeenCalledWith({
      where: { strategyId: null, context: { contains: ":intake[owned-intake-a]" } }, data: { strategyId: "brand-a" },
    });
    await trackCost({ caller: "outside" }, { inputTokens: 1, outputTokens: 1 }, "gemma4:31b", undefined, "ollama");
    expect(create.mock.calls.at(-1)![0].data).toMatchObject({ strategyId: null, context: "outside:estimated-cost" });
  });

  it("retains attribution for a deferred child after its parent has returned", async () => {
    let release!: () => void, child!: Promise<void>;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await withIntakeCostContext("deferred-owned", async () => {
      await bindIntakeCostStrategy("brand-a");
      child = gate.then(() => trackCost({ caller: "deferred" }, { inputTokens: 2, outputTokens: 1 }, "gemma4:31b", undefined, "ollama"));
    });
    await withIntakeCostContext("next-owned", async () => { await bindIntakeCostStrategy("brand-b"); release(); await child; });
    expect(create.mock.calls[0]![0].data).toMatchObject({ strategyId: "brand-a", context: "deferred:intake[deferred-owned]:estimated-cost" });
  });

  it("never reassigns an already bound operation to another brand", async () => {
    await withIntakeCostContext("owned-intake", async () => {
      await bindIntakeCostStrategy("brand-a");
      await expect(bindIntakeCostStrategy("brand-b")).rejects.toThrow("INTAKE_COST_STRATEGY_MISMATCH");
    });
    expect(updateMany).toHaveBeenCalledOnce();
  });

});
