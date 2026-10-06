import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), model: vi.fn((name: string) => ({ name })) }));
vi.mock("ai", () => ({ generateText: mocks.generate }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => mocks.model }));
vi.mock("@/server/services/model-policy", () => ({ resolvePolicy: async () => ({ anthropicModel: "text-model", ollamaModel: "text-only", allowOllamaSubstitution: true }) }));
vi.mock("@/server/services/llm-gateway/headroom", () => ({ applyHeadroom: async (system: string, prompt: string) => ({ system, prompt, applied: false }) }));
vi.mock("@/server/services/llm-gateway/rate-policy", () => ({ acquireSlot: async () => "fixture-slot", releaseSlot: vi.fn() }));
import { callLLM, _resetProvidersForTest } from "@/server/services/llm-gateway";
const images = [{ mediaType: "image/jpeg" as const, bytes: new Uint8Array([255, 216, 255, 0]) }];
describe("explicit vision route through the real Gateway", () => {
  beforeEach(() => {
    vi.stubEnv("LLM_VISION_PROVIDER", "openrouter"); vi.stubEnv("LLM_VISION_MODEL", "fixture-vision");
    vi.stubEnv("OPENROUTER_MODEL", "text-only");
    _resetProvidersForTest({ openrouter: { available: true }, ollama: { available: true }, anthropic: { available: true } });
    vi.clearAllMocks(); mocks.generate.mockResolvedValue({ text: "observed", usage: { inputTokens: 10, outputTokens: 2 } });
  });
  afterEach(() => { vi.unstubAllEnvs(); _resetProvidersForTest(); });
  it("sends the actual bytes and pins the vision model instead of the global text model", async () => {
    await callLLM({ system: "fixture", prompt: "Observe", caller: "test:vision", images });
    expect(mocks.model).toHaveBeenCalledWith("fixture-vision");
    const call = mocks.generate.mock.calls[0]![0];
    expect(call.prompt).toBeUndefined();
    expect(call.messages[0].content).toEqual([{ type: "text", text: "Observe" }, { type: "image", image: images[0]!.bytes, mediaType: "image/jpeg" }]);
  });
  it("does not fall back to a text model or another provider after a vision failure", async () => {
    mocks.generate.mockRejectedValue(new Error("429 fixture unavailable"));
    await expect(callLLM({ system: "fixture", prompt: "Observe", caller: "test:vision", images })).rejects.toThrow("429");
    expect(mocks.model.mock.calls.map(c => c[0])).toEqual(["fixture-vision"]);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it("rejects missing vision configuration before contacting any text provider", async () => {
    vi.stubEnv("LLM_VISION_PROVIDER", "");
    await expect(callLLM({ system: "fixture", prompt: "Observe", caller: "test:vision", images })).rejects.toThrow("non configuré");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
