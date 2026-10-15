import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  call: vi.fn(), sdk: vi.fn(), write: vi.fn(),
  intake: vi.fn(), pillars: vi.fn(), metadata: vi.fn(), cost: vi.fn(),
  strategy: vi.fn(), strategyOrThrow: vi.fn(),
}));
vi.mock("@/server/services/llm-gateway", async importOriginal => ({
  ...await importOriginal<typeof import("@/server/services/llm-gateway")>(), callLLM: h.call,
}));
vi.mock("ai", () => ({ generateText: h.sdk }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "forbidden-direct-sdk") }));
vi.mock("@/lib/db", () => ({ db: {
  quickIntake: { findUnique: h.intake },
  pillar: { findMany: h.pillars, update: h.metadata },
  strategy: { findUnique: h.strategy, findUniqueOrThrow: h.strategyOrThrow },
  aICostLog: { create: h.cost },
} }));
vi.mock("@/server/services/pillar-gateway", () => ({ writePillar: h.write }));
vi.mock("@/server/services/glory-tools", () => ({}));
vi.mock("@/server/services/guidelines-renderer", () => ({}));
vi.mock("@/server/services/seshat-bridge", () => ({}));
vi.mock("@/server/mcp/_shared/strategy-activity", () => ({}));

import { tools } from "@/server/mcp/creative";
import { inferNeedsHumanFields } from "@/server/services/quick-intake/infer-needs-human-fields";

const intake = { id: "intake-fixture", convertedToId: "brand-fixture", companyName: "Atelier",
  sector: "artisanat", country: null, businessModel: null, positioning: null,
  rawText: "Un atelier déclaré", responses: {} };
const guardian = tools.find(t => t.name === "brand_guardian_check")!;
const check = () => guardian.handler({ strategyId: "brand-fixture", content: "Texte à relire", contentType: "text" });
beforeEach(() => {
  vi.clearAllMocks();
  h.sdk.mockRejectedValue(new Error("Direct SDK forbidden in this test; no network"));
  h.call.mockReset().mockResolvedValue({ text: '{"verdict":"AJUSTEMENTS_MINEURS"}', usage: { inputTokens: 12, outputTokens: 8 } });
  h.intake.mockReset().mockResolvedValue(intake);
  h.pillars.mockReset().mockResolvedValue([]);
  h.write.mockReset().mockResolvedValue({ success: true });
  h.metadata.mockResolvedValue({}); h.cost.mockResolvedValue({});
  h.strategy.mockResolvedValue({ name: "Atelier", pillars: [], businessContext: null, advertis_vector: null });
  h.strategyOrThrow.mockResolvedValue({ name: "Atelier", pillars: [] });
});
afterEach(() => vi.useRealTimers());

describe("legacy creative calls use the existing manager", () => {
  it("keeps the tool result and brand scope without a private model or duplicate cost entry", async () => {
    await expect(check()).resolves.toMatchObject({ brand: "Atelier", analysis: { verdict: "AJUSTEMENTS_MINEURS" } });
    expect(h.call).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      strategyId: "brand-fixture", caller: "mcp:creative:struct", purpose: "agent", maxOutputTokens: 4096,
    }));
    expect(h.call.mock.calls[0]![0]).not.toHaveProperty("model");
    expect(h.cost).not.toHaveBeenCalled(); expect(h.sdk).not.toHaveBeenCalled();
  });
  it("refuses non-JSON text rather than presenting it as a structured creative verdict", async () => {
    h.call.mockResolvedValue({ text: "Texte brut conservé", usage: {} });
    await expect(check()).rejects.toThrow("LLM output failed Zod validation after 1 attempts");
    expect(h.call).toHaveBeenCalledOnce(); expect(h.cost).not.toHaveBeenCalled();
  });
  it("propagates the manager refusal and never tries a direct provider", async () => {
    h.call.mockRejectedValue(new Error("Budget fixture refused"));
    await expect(check()).rejects.toThrow("Budget fixture refused");
    expect(h.sdk).not.toHaveBeenCalled(); expect(h.cost).not.toHaveBeenCalled();
  });
});

describe("activation inference uses the existing manager", () => {
  it.each([null, { ...intake, convertedToId: null }])("does not infer before conversion: %j", async value => {
    h.intake.mockResolvedValue(value);
    expect((await inferNeedsHumanFields(intake.id)).ok).toBe(false);
    expect(h.call).not.toHaveBeenCalled(); expect(h.sdk).not.toHaveBeenCalled();
    expect(h.write).not.toHaveBeenCalled();
  });
  it("keeps the manual value, qualifies only the missing proposal and delegates cost accounting", async () => {
    h.call.mockResolvedValue({ text: JSON.stringify({ a: { archetype: "Proposition ignorée", noyauIdentitaire: "Une identité proposée" } }), usage: {} });
    h.pillars.mockResolvedValue([{ id: "pillar-fixture", key: "a", content: { archetype: "Valeur déclarée" }, fieldCertainty: { "a.archetype": "DECLARED" } }]);
    const receipt = await inferNeedsHumanFields(intake.id);
    expect(receipt.error).toBeUndefined(); expect(receipt.ok).toBe(true);
    expect(h.call).toHaveBeenCalledOnce(); expect(h.sdk).not.toHaveBeenCalled(); expect(h.cost).not.toHaveBeenCalled();
    const options = h.call.mock.calls[0]![0];
    expect(options).toMatchObject({ strategyId: "brand-fixture", purpose: "extraction", maxOutputTokens: 1500, temperature: 0.4 });
    expect(options.caller).toContain("quick-intake:infer-needs-human-fields");
    expect(options.signal).toBeInstanceOf(AbortSignal); expect(options).not.toHaveProperty("model");
    expect(h.write).toHaveBeenCalledWith(expect.objectContaining({ strategyId: "brand-fixture",
      operation: expect.objectContaining({ content: expect.objectContaining({ archetype: "Valeur déclarée", noyauIdentitaire: "Une identité proposée" }) }),
      options: { targetStatus: "AI_PROPOSED" },
    }));
    expect(h.metadata.mock.calls[0]![0].data.fieldCertainty).toMatchObject({ "a.archetype": "DECLARED", "a.noyauIdentitaire": "INFERRED" });
  });
  it.each(["not JSON", "null", "42"])("refuses malformed output %s with no persistence and no validation recall", async text => {
    h.call.mockResolvedValue({ text, usage: {} });
    expect((await inferNeedsHumanFields(intake.id)).ok).toBe(false);
    expect(h.call).toHaveBeenCalledOnce(); expect(h.write).not.toHaveBeenCalled(); expect(h.metadata).not.toHaveBeenCalled();
  });
  it("returns a manager refusal without blocking the caller through an exception or writing fields", async () => {
    h.call.mockRejectedValue(new Error("Budget fixture refused"));
    await expect(inferNeedsHumanFields(intake.id)).resolves.toMatchObject({ ok: false, fieldsInferred: 0, error: "Budget fixture refused" });
    expect(h.write).not.toHaveBeenCalled(); expect(h.metadata).not.toHaveBeenCalled(); expect(h.sdk).not.toHaveBeenCalled();
  });
  it("retains the 45-second cancellation and does not retry inference", async () => {
    vi.useFakeTimers();
    h.call.mockImplementation(({ signal }: { signal: AbortSignal }) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    const result = inferNeedsHumanFields(intake.id);
    await vi.advanceTimersByTimeAsync(45_000);
    await expect(result).resolves.toMatchObject({ ok: false, fieldsInferred: 0 });
    expect(h.call).toHaveBeenCalledOnce(); expect(h.write).not.toHaveBeenCalled(); expect(h.sdk).not.toHaveBeenCalled();
  });
});
