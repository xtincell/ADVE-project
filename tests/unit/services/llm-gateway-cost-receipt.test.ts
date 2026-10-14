import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn(async (_args: { data: Record<string, unknown> }) => ({ id: "cost-receipt" })));
vi.mock("@/lib/db", () => ({ db: { aICostLog: { create } } }));
import { trackCost } from "@/server/services/llm-gateway";

beforeEach(() => { create.mockClear(); });
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

  it("an unscoped invocation does not invent a brand cost", async () => {
    await trackCost({ caller: "unscoped" }, { inputTokens: 10, outputTokens: 5 },
      "gemma4:31b", undefined, "ollama");
    expect(create).not.toHaveBeenCalled();
  });
});
