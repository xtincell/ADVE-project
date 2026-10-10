import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ write: vi.fn(), recalculate: vi.fn(), llm: vi.fn(), innovation: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { pillar: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: mocks.llm, extractJSON: JSON.parse }));
vi.mock("@/server/services/seshat/context-store", () => ({
  getOracleBrandContextByQuery: vi.fn(async () => null), findComparableBrands: vi.fn(async () => []),
}));
vi.mock("@/server/services/quick-intake/multi-agent-orchestrator", () => ({ generatePillarIMultiAgent: mocks.innovation }));
vi.mock("@/server/services/pillar-gateway", () => ({
  writePillarAndScore: mocks.write,
  withPillarTransaction: vi.fn(async (_id, perform) => perform({}, mocks.write)),
}));
vi.mock("@/server/services/mestor/rtis-cascade", () => ({ recalculateSynthesisInTransaction: mocks.recalculate }));
vi.mock("@/server/services/rtis-protocols/strategy", () => ({ executeProtocoleStrategy: vi.fn(async () => ({ content: { generated: true } })) }));
import { generateAndPersistRtisDraft } from "@/server/services/quick-intake/rtis-draft";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.llm.mockResolvedValue({ text: JSON.stringify({ generated: true }) });
  mocks.innovation.mockResolvedValue({ generated: true });
  mocks.write.mockImplementation(async request => ({ success: true, newContent: { ...request.operation.content, saved: request.pillarKey } }));
  mocks.recalculate.mockResolvedValue({ calculated: { content: { computedOnly: true } }, persisted: { newContent: { saved: "s" } } });
});
describe("intake returns persisted RTIS content and propagates refusals", () => {
  it("does not announce generated content as persisted after the first source write is refused", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.write.mockResolvedValueOnce({ success: false, error: "PILLAR_LOCKED", warnings: [] });
    try {
      await expect(generateAndPersistRtisDraft({ strategyId: "synthetic", companyName: "Synthetic", sector: null, market: null })).rejects.toThrow("PILLAR_LOCKED");
      expect(mocks.write).toHaveBeenCalledTimes(1);
      expect(mocks.recalculate).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });
  it("returns the saved content of all four pillars, including preserved source values", async () => {
    const result = await generateAndPersistRtisDraft({ strategyId: "synthetic", companyName: "Synthetic", sector: null, market: null });
    expect(result).toEqual({ r: { generated: true, saved: "r" }, t: { generated: true, saved: "t" },
      i: { generated: true, saved: "i" }, s: { saved: "s" } });
  });
  it("does not produce a success result when the shared plan write is refused", async () => {
    mocks.recalculate.mockRejectedValueOnce(new Error("FIELD_PROVENANCE_REFUSED"));
    await expect(generateAndPersistRtisDraft({ strategyId: "synthetic", companyName: "Synthetic", sector: null, market: null })).rejects.toThrow("FIELD_PROVENANCE_REFUSED");
  });
});
