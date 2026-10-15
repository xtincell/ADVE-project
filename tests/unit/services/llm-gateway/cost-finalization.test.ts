import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), generate: vi.fn(), stream: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  aICostLog: { create: mocks.create }, modelPolicy: { findUnique: vi.fn(async () => null) },
} }));
vi.mock("@/server/services/ai-cost-tracker", async (original) => ({
  ...await original<typeof import("@/server/services/ai-cost-tracker")>(),
  checkBudget: vi.fn(async () => ({ allowed: true, utilization: 0, alertLevel: "none" })),
}));
vi.mock("ai", async (original) => ({
  ...await original<typeof import("ai")>(),
  generateText: (...args: unknown[]) => mocks.generate(...args),
  streamText: (...args: unknown[]) => mocks.stream(...args),
}));
import { callLLM, _resetProvidersForTest } from "@/server/services/llm-gateway";
import { streamChatText } from "@/server/services/llm-gateway/streaming";
import * as rate from "@/server/services/llm-gateway/rate-policy";

const input = { system: "s", prompt: "Une réponse", caller: "receipt-fixture", strategyId: "brand-a" };
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
function delayedReceipt() {
  let release!: () => void;
  const pending = new Promise<{ id: string }>((resolve) => {
    release = () => resolve({ id: "receipt" });
  });
  return { pending, release };
}

beforeEach(() => {
  vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://127.0.0.1:8646/v1");
  vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "fixture-only");
  vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai"); vi.stubEnv("HEADROOM_DISABLED", "1");
  _resetProvidersForTest({ openai: { available: true }, anthropic: { available: false },
    ollama: { available: false }, openrouter: { available: false } });
  mocks.create.mockReset().mockResolvedValue({ id: "receipt" });
  mocks.generate.mockReset().mockResolvedValue({ text: "Reçu", usage: { inputTokens: 10, outputTokens: 5 } });
  mocks.stream.mockReset().mockImplementation(() => ({
    textStream: new ReadableStream<string>({ start(c) { c.enqueue("Reçu"); c.close(); } }),
    text: Promise.resolve("Reçu"), usage: Promise.resolve({ inputTokens: 10, outputTokens: 5 }),
  }));
  vi.spyOn(rate, "acquireSlot").mockResolvedValue("fixture-slot");
  vi.spyOn(rate, "releaseSlot").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); _resetProvidersForTest(); });

describe("existing Gateway cost receipt finalization", () => {
  it("does not resolve a scoped call before its existing ledger write settles", async () => {
    const receipt = delayedReceipt();
    mocks.create.mockReturnValue(receipt.pending);
    let returned = false;
    const result = callLLM(input).then((r) => { returned = true; return r; });
    try {
      // Bound cold imports separately from the controlled ledger barrier.
      await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce(), { timeout: 5_000 });
      await turn();
      expect(returned).toBe(false);
    } finally {
      receipt.release();
      await result;
    }
    expect((await result).text).toBe("Reçu");
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it("does not finalize a scoped stream before its existing ledger write settles", async () => {
    const receipt = delayedReceipt();
    mocks.create.mockReturnValue(receipt.pending);
    const stream = await streamChatText({ ...input, messages: [{ role: "user", content: input.prompt }] });
    let returned = false;
    const finished = stream.finished.then((r) => { returned = true; return r; });
    try {
      await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce(), { timeout: 5_000 });
      await turn();
      expect(returned).toBe(false);
      expect(rate.releaseSlot).toHaveBeenCalledOnce();
    } finally {
      receipt.release();
      await finished;
    }
    expect((await finished).text).toBe("Reçu");
    expect(rate.releaseSlot).toHaveBeenCalledOnce();
    expect(mocks.stream).toHaveBeenCalledOnce();
  });

  it("does not regenerate or lose a model answer when the cost write fails", async () => {
    mocks.create.mockRejectedValue(new Error("receipt unavailable"));
    expect((await callLLM(input)).text).toBe("Reçu");
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it("does not invent a brand receipt for an unscoped call", async () => {
    expect((await callLLM({ ...input, strategyId: undefined })).text).toBe("Reçu");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.generate).toHaveBeenCalledOnce();
  });
});
