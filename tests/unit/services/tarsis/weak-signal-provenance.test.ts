import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ call: vi.fn(), create: vi.fn(), knowledge: vi.fn() }));
vi.mock("@/server/services/llm-gateway", () => ({ callLLM: mocks.call }));
vi.mock("@/lib/db", () => ({ db: { signal: { create: mocks.create }, knowledgeEntry: { create: mocks.knowledge } } }));
vi.mock("@/server/services/seshat/context-store", () => ({ searchByQuery: async () => [] }));
vi.mock("@/server/services/anubis/feed-bridge", () => ({ notifyOnFeedSignal: async () => {} }));
vi.mock("@/server/services/seshat/prediction", () => ({ recordThesis: async () => {} }));

import { analyzeWeakSignals } from "@/server/services/seshat/tarsis/weak-signal-analyzer";

const context = { sector: "food", market: "CI", keywords: [], competitors: [], brandIdentity: "SPAWT",
  positioning: "Le choix culinaire communautaire", products: "Le Palais", riskFactors: "Confiance" };
const source = { id: "input-1", title: "Un reportage local", content: "Texte réellement collecté, distinct de la lecture de marque.",
  sourceType: "NEWS", sourceUrl: "https://publisher.example/food", relevance: 0.8,
  collectedAt: "2026-11-05T10:00:00.000Z", provenanceKind: "COLLECTED" as const };
const thesis = { thesis: "Lecture prédictive", rawEvent: "Un évènement supposé", causalChain: [], impactCategory: "COMPETITIVE",
  brandImpact: "Effet possible", confidence: 0.7, urgency: "HIGH", relatedPillars: ["V"],
  supportingSignals: [{ title: "Inventé", content: "Ne constitue pas une source", link: "https://invented.example", addedConfidence: 0.2 }],
  recommendedAction: "Examiner cette piste" };

beforeEach(() => { vi.clearAllMocks(); mocks.call.mockResolvedValue({ text: JSON.stringify([thesis]) }); mocks.create.mockResolvedValue({ id: "alert-1" }); });

describe("weak-signal provenance", () => {
  it("persists actual inputs and brand snapshot, never model-proposed supporting URLs", async () => {
    await analyzeWeakSignals([source], context, "brand-a");
    const stored = mocks.create.mock.calls[0]?.[0].data.data;
    expect(stored.provenance).toMatchObject({ schema: "weak-signal-provenance-v1", kind: "INFERRED",
      inputSignals: [{ id: source.id, title: source.title, content: source.content, sourceUrl: source.sourceUrl, kind: "COLLECTED" }],
      brandContext: { brandIdentity: "SPAWT", positioning: context.positioning },
    });
    expect(stored.provenance.inputText).toContain(source.content);
    expect(JSON.stringify(stored.provenance)).not.toContain("invented.example");
    expect(mocks.knowledge.mock.calls[0]?.[0].data.data.provenance).toEqual(stored.provenance);
  });

  it("keeps inferred inputs explicit and never gives them an article URL", async () => {
    await analyzeWeakSignals([{ ...source, provenanceKind: "INFERRED" }], context, "brand-a");
    const snapshot = mocks.create.mock.calls[0]?.[0].data.data.provenance.inputSignals[0];
    expect(snapshot.kind).toBe("INFERRED");
    expect(snapshot).not.toHaveProperty("sourceUrl");
    expect(mocks.call.mock.calls[0]?.[0].prompt).toContain("INFERRED");
  });

  it("does not promote legacy inputs without provenance to collected evidence", async () => {
    await analyzeWeakSignals([{ ...source, provenanceKind: undefined, sourceUrl: "javascript:alert(1)" }], context, "brand-a");
    const snapshot = mocks.create.mock.calls[0]?.[0].data.data.provenance.inputSignals[0];
    expect(snapshot.kind).toBe("UNSPECIFIED");
    expect(snapshot).not.toHaveProperty("sourceUrl");
  });
});
