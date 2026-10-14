import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ vector: false, unavailable: false, documents: true,
  observationUnavailable: false, observations: [] as Array<Record<string, unknown>>,
  observationRead: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  pillar: {
    findMany: vi.fn(async () => [{ key: "a", content: { nom: "Nom exact" } }]),
    findFirst: vi.fn(async () => ({ content: { nom: "Nom exact" } })),
  },
  communitySnapshot: { findMany: vi.fn(async () => []) },
  signal: { findMany: vi.fn(async (query: unknown) => {
    state.observationRead(query);
    if (state.observationUnavailable) throw new Error("receipt store unavailable");
    return state.observations;
  }) },
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

beforeEach(() => {
  state.vector = false; state.unavailable = false; state.documents = true;
  state.observationUnavailable = false; state.observations = []; state.observationRead.mockClear();
});

describe("the council reports the evidence it actually received", () => {
  it("reads the actual brand receipt without the question supplying its counts", async () => {
    state.observations = [{ id: "receipt-palais", type: "EXTERNAL_METRIC",
      createdAt: new Date("2026-10-14T02:00:00Z"), data: {
        sourceLabel: "Quiz Palais", sourceVersion: "palais-6-radar-v1",
        observationId: "quiz-palais:actual", observedAt: "2026-10-14T01:58:33Z",
        metrics: [
          { metric: "Cartes à six réponses vérifiables", value: 0 },
          { metric: "Cartes sans questionnaire vérifiable", value: 21 },
          { metric: "Q6 · Ton radar · Tout le monde connaît", value: 0 },
        ],
      } }];
    const result = await buildAssistantContext("brand-a", "Que permet de conclure le quiz ?");
    expect(result.contextBlock).toContain("Cartes à six réponses vérifiables : 0");
    expect(result.contextBlock).toContain("Cartes sans questionnaire vérifiable : 21");
    expect(result.contextBlock).toContain("Q6 · Ton radar");
    expect(result.contextBlock).toContain("quiz-palais:actual");
    expect(result.contextBlock).toContain("receipt-palais");
    expect(result.contextBlock).toContain("palais-6-radar-v1");
    expect(result.contextBlock).toContain("2026-10-14T01:58:33.000Z");
    expect(result.contextBlock).toContain("2026-10-14T02:00:00.000Z");
    expect(state.observationRead).toHaveBeenCalledWith(expect.objectContaining({
      where: { strategyId: "brand-a", type: "EXTERNAL_METRIC" },
      take: 5,
    }));
  });

  it("an empty receipt selection is not a zero-valued quiz measurement", async () => {
    const result = await buildAssistantContext("brand-a", "Quiz ?");
    expect(result.contextBlock).toContain("aucune observation externe reçue");
    expect(result.contextBlock).not.toContain("Cartes à six réponses vérifiables : 0");
  });

  it.each(["a", "d", "v", "e"] as const)("the %s expert shares the actual observation and evidence rules", async (key) => {
    state.observations = [{ id: "receipt-shared", type: "EXTERNAL_METRIC",
      createdAt: new Date("2026-10-14T02:00:00Z"), data: {
        metrics: [{ metric: "Cartes sans questionnaire vérifiable", value: 21 }],
      } }];
    const result = await buildExpertContext("brand-a", key, "Quiz ?");
    expect(result.contextBlock).toContain("Cartes sans questionnaire vérifiable : 21");
    expect(result.contextBlock).toContain("receipt-shared");
    expect(result.contextBlock).toContain("Ne déduis aucune panne");
    expect(result.contextBlock).toContain("Une valeur zéro ne vaut que pour l'indicateur");
  });

  it("a failed observation read does not claim there are no receipts", async () => {
    state.observationUnavailable = true;
    const result = await buildAssistantContext("brand-a", "Quiz ?");
    expect(result.contextBlock).toContain("lecture des observations indisponible");
    expect(result.contextBlock).not.toContain("aucune observation externe reçue");
  });

  it("preserves unknown legacy provenance rather than filling today's date", async () => {
    state.observations = [{ id: "legacy", type: "EXTERNAL_METRIC",
      createdAt: new Date("2026-10-14T02:00:00Z"), data: {
        metrics: [{ metric: "Mesure héritée", value: 4 }],
      } }];
    const result = await buildAssistantContext("brand-a", "Quiz ?");
    expect(result.contextBlock).toContain("Version de source inconnue");
    expect(result.contextBlock).toContain("Date d'observation inconnue");
    expect(result.contextBlock).toContain("Référence de source inconnue");
    expect(result.contextBlock).toContain("Mesure héritée : 4");
  });
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
