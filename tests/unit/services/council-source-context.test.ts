import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ vector: false, unavailable: false, documents: true }));
vi.mock("@/lib/db", () => ({ db: {
  pillar: {
    findMany: vi.fn(async () => [{ key: "a", content: { nom: "Nom exact" } }]),
    findFirst: vi.fn(async () => ({ content: { nom: "Nom exact" } })),
  },
  communitySnapshot: { findMany: vi.fn(async () => []) },
} }));
vi.mock("@/server/services/seshat/context-store/strategy-context", () => ({
  loadStrategyContextForFramework: vi.fn(async () => ({ lines: ["Marque réelle"] })),
}));
vi.mock("@/server/services/mestor/rtis-cascade", () => ({
  serializePillar: (_key: string, content: unknown) => JSON.stringify(content),
}));
vi.mock("@/server/services/seshat/context-store/oracle-augment", () => ({
  getOracleBrandContextByQuery: vi.fn(async () => {
    if (state.unavailable) throw new Error("document store unavailable");
    return { text: state.documents
      ? "source:note-a, certitude:DECLARED — Assertion du dirigeant."
      : "Champ précis — Nom exact.",
      usedVectorSearch: state.vector, sourceReferences: state.documents
        ? [{ sourceId: "note-a", certainty: "DECLARED" }] : [] };
  }),
}));

import { buildAssistantContext, buildExpertContext } from "@/server/services/mestor/council/context";

beforeEach(() => { state.vector = false; state.unavailable = false; state.documents = true; });

describe("the council reports the evidence it actually received", () => {
  it.each([false, true])("labels the coordinator retrieval mode accurately (vector=%s)", async (vector) => {
    state.vector = vector;
    const result = await buildAssistantContext("brand-a", "question");
    expect(result.ragUsed).toBe(true);
    expect(result.contextBlock).toContain(vector ? "recherche sémantique" : "sélection par métadonnées");
    if (!vector) expect(result.contextBlock).not.toContain("recherche sémantique");
    expect(result.contextBlock).toContain("certitude:DECLARED");
    expect(result.contextBlock).toContain("Nom exact");
    expect(result.contextBlock).toContain("non mesurée");
  });

  it("does not promote declared documents to official validation for an expert", async () => {
    const result = await buildExpertContext("brand-a", "a", "assertion");
    expect(result.sourcesSeen).toBe(true);
    expect(result.contextBlock).toContain("certitude:DECLARED");
    expect(result.contextBlock).not.toContain("documentation officielle");
    expect(result.contextBlock).toContain("validation humaine");
    expect(result.contextBlock).toContain("Nom exact");
  });

  it.each([false, true])("tracks documents separately from hybrid context (documents=%s)", async (documents) => {
    state.documents = documents;
    const result = await buildAssistantContext("brand-a", "question");
    expect(result.ragUsed).toBe(true);
    expect(result.sourcesSeen).toBe(documents);
    expect(result.contextBlock).toContain("Nom exact");
  });

  it.each(["coordinator", "expert"])("distinguishes a failed document read from absence (%s)", async (role) => {
    state.unavailable = true;
    const result = role === "coordinator"
      ? await buildAssistantContext("brand-a", "question")
      : await buildExpertContext("brand-a", "a", "question");
    expect(result.ragUsed).toBe(false);
    expect(result.sourcesSeen).toBe(false);
    expect(result.contextBlock).toContain("lecture documentaire indisponible");
    expect(result.contextBlock).not.toContain("AUCUN document");
    expect(result.contextBlock).toContain("Nom exact");
  });
});
