import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ pillars: vi.fn(), strategy: vi.fn(), call: vi.fn(),
  batch: vi.fn(), createReco: vi.fn(), signal: vi.fn(), sources: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  knowledgeEntry: { findMany: async () => [] }, country: { findMany: async () => [] },
  pillar: { findMany: mocks.pillars }, strategy: { findUnique: mocks.strategy },
  recommendationBatch: { create: mocks.batch }, recommendation: { create: mocks.createReco },
  signal: { create: mocks.signal },
} }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: mocks.call, extractJSON: (text: string) => JSON.parse(text) }));
vi.mock("@/server/services/notoria/source-context", () => ({
  loadBrandSourceContext: mocks.sources, renderSourceContext: () => "", DEFAULT_SOURCE_BUDGET: 24_000,
}));
vi.mock("@/server/services/seshat/context-store", () => ({ findSimilarAcrossStrategies: async () => [] }));
vi.mock("@/server/services/notoria/preview-impact", () => ({ loadContentsAndWeights: async () => null, previewCandidateImpact: () => null }));
vi.mock("@/server/services/notoria/rulers", () => ({ evaluateField: () => ({ score: 50 }), computeRecoWeightedScore: () => 50, compareForReplacement: () => ({ replaceAllowed: true }) }));
vi.mock("@/server/services/notoria/gates", () => ({ applyQualityGates: () => ({ applyPolicy: "requires_review" }), validateFinancialReco: async () => ({ allowed: true }) }));
vi.mock("@/server/services/anubis/feed-bridge", () => ({ notifyOnFeedSignal: async () => {} }));

import { generateBatch } from "@/server/services/notoria/engine";

const richStrategy = () => ({ roadmap: Array.from({ length: 550 }, (_, index) => ({
  id: `campaign-${index}`, budget: index, timeframe: { start: 1, end: 3 },
  source: { id: `document-${index}`, version: 4 }, targetPersonaIds: ["persona-partner", "persona-traffic"],
})), _fieldProvenance: { roadmap: "INFERRED" } });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pillars.mockResolvedValue([
    { key: "a", content: { promesseFondamentale: "Une décision éclairée" } },
    { key: "e", content: { promesseExperience: "Une trouvaille fiable" } },
    { key: "s", content: richStrategy() },
  ]);
  mocks.strategy.mockResolvedValue(null);
  mocks.sources.mockResolvedValue({ empty: true, excerpts: [] });
  mocks.call.mockResolvedValue({ text: "[]" });
  mocks.batch.mockResolvedValue({ id: "batch-local" });
  mocks.signal.mockResolvedValue(null);
});

describe("Notoria context admission and safe failure receipts", () => {
  it("admits a rich strategy without repeating the target or losing final records and qualification", async () => {
    const result = await generateBatch({ strategyId: "brand-a", missionType: "SESHAT_OBSERVATION", targetPillars: ["a", "e", "s"], seshatObservation: "Un événement local documenté" });
    expect(result.errors).toEqual([]);
    expect(mocks.call).toHaveBeenCalledTimes(3);
    for (const [input] of mocks.call.mock.calls) {
      expect(input.prompt).toContain('"id":"campaign-549"');
      expect(input.prompt).toContain('"budget":549');
      expect(input.prompt).toContain('"version":4');
      expect(input.prompt).toContain('"statut":"INFERRED"');
      expect(input.prompt.slice(input.prompt.indexOf("Contexte source")).match(/"id":"campaign-549"/g)).toHaveLength(1);
      expect(input.prompt.match(/⟦DONNÉE⟧ PILIER A/g)).toHaveLength(1);
      expect(input.system).toContain('"proposedValue"');
    }
    expect(result.autoApplied).toBe(0);
  });

  it("preserves target identity and gives safe provider-phase errors without persisting raw provider payload", async () => {
    mocks.pillars.mockResolvedValue([{ key: "a", content: { mission: "Test" } }]);
    mocks.call.mockRejectedValue(new Error("provider sk-private-token https://secret.example/?token=private"));
    const result = await generateBatch({ strategyId: "brand-a", missionType: "SESHAT_OBSERVATION", targetPillars: ["a", "e"] });
    expect(result.batchId).toBe("");
    expect(result.errors).toEqual([
      expect.objectContaining({ pillarKey: "a", code: "MODEL_CALL_FAILED", phase: "GENERATION" }),
      expect.objectContaining({ pillarKey: "e", code: "MODEL_CALL_FAILED", phase: "GENERATION" }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/sk-private|secret.example|token=private/);
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("retains the admission guard with an explicit source-pillar error instead of chopping records", async () => {
    mocks.pillars.mockResolvedValue([{ key: "s", content: { prose: Array.from({ length: 450 }, () => "x".repeat(400)) } }]);
    const result = await generateBatch({ strategyId: "brand-a", missionType: "SESHAT_OBSERVATION", targetPillars: ["e"] });
    expect(mocks.call).not.toHaveBeenCalled();
    expect(result.errors).toEqual([expect.objectContaining({ pillarKey: "e", sourcePillar: "S", code: "CONTEXT_TOO_LARGE", phase: "CONTEXT" })]);
  });

  it.each(['{"error":"private provider response"}', 'null', '"private provider response"'])("reports invalid response envelope %s as output failure, not empty success", async (text) => {
    mocks.pillars.mockResolvedValue([{ key: "a", content: { mission: "Test" } }]);
    mocks.call.mockResolvedValue({ text });
    const result = await generateBatch({ strategyId: "brand-a", missionType: "SESHAT_OBSERVATION", targetPillars: ["a"] });
    expect(result.errors).toEqual([expect.objectContaining({ pillarKey: "a", code: "INVALID_MODEL_OUTPUT", phase: "OUTPUT" })]);
    expect(mocks.batch).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private provider response");
  });

  it("keeps successfully produced proposals pending when another target fails", async () => {
    mocks.pillars.mockResolvedValue([{ key: "a", content: { mission: "Test" } }]);
    mocks.call.mockResolvedValueOnce({ text: JSON.stringify([{ field: "mission", proposedValue: "Proposition sourcée", justification: "Observation externe à examiner", source: "SESHAT", confidence: 0.5 }]) })
      .mockRejectedValueOnce(new Error("private failure"));
    const result = await generateBatch({ strategyId: "brand-a", missionType: "SESHAT_OBSERVATION", targetPillars: ["a", "e"] });
    expect(result).toMatchObject({ totalRecos: 1, autoApplied: 0, errors: [expect.objectContaining({ pillarKey: "e" })] });
    expect(mocks.createReco.mock.calls[0]?.[0].data).toMatchObject({ status: "PENDING", applyPolicy: "requires_review", targetPillarKey: "a" });
  });
});
