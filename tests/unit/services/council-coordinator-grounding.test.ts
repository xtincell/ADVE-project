import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sourcesSeen: false,
  ragUsed: true,
  contextBlock: "Champ précis — Nom exact.",
  stream: vi.fn(async () => ({ fixtureGateway: true })),
  structured: vi.fn(),
}));
vi.mock("@/server/services/mestor/council/context", () => ({
  buildAssistantContext: vi.fn(async () => ({
    contextBlock: state.contextBlock, ragUsed: state.ragUsed, sourcesSeen: state.sourcesSeen,
  })),
  buildExpertContext: vi.fn(async () => ({ contextBlock: "Expert", ragUsed: false, sourcesSeen: false })),
}));
vi.mock("@/server/services/llm-gateway", () => ({ isTextLLMAvailable: () => true }));
vi.mock("@/server/services/llm-gateway/streaming", () => ({ streamChatText: state.stream }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: state.structured }));
vi.mock("@/server/services/neteru-shared/pillar-directors", () => ({ assessAllPillarsHealth: vi.fn(async () => []) }));

import { askCouncilStream, deliberate } from "@/server/services/mestor/council";

function notice(system: string): string { return system.split("\n\n").at(-1)!; }

beforeEach(() => {
  state.sourcesSeen = false; state.ragUsed = true; state.contextBlock = "Champ précis — Nom exact.";
  state.stream.mockClear(); state.structured.mockReset();
});

describe("coordinator document presence — real orchestration, fixture gateways", () => {
  it("keeps human turns and stored history while qualifying generated history as unvalidated data", async () => {
    const history = [{ role: "user" as const, content: "Ma priorité reste le Palais." },
      { role: "assistant" as const, content: "La bêta a 50 utilisateurs et 80 % de rétention." }];
    const before = structuredClone(history);
    await askCouncilStream({ strategyId: "brand-a", question: "Quelle preuve actuelle ?", history });
    const request = (state.stream.mock.calls[0] as unknown as [{ messages: Array<{ role: string; content: string }> }])[0];
    expect(request.messages[0]).toEqual(history[0]);
    expect(request.messages[1]!.role).toBe("user");
    expect(request.messages[1]!.content).toContain("sortie générée non validée");
    expect(request.messages[1]!.content).toContain(history[1]!.content);
    expect(request.messages[2]).toEqual({ role: "user", content: "Quelle preuve actuelle ?" });
    expect(history).toEqual(before);
  });
  it("describes this actual simple reply separately from the available expert mode", async () => {
    await askCouncilStream({ strategyId: "brand-a", question: "Qui répond ?", history: [] });
    const system = (state.stream.mock.calls[0] as unknown as [{ system: string }])[0].system;
    expect(system).toContain("aucun des quatre experts n'a été consulté pour ce tour");
    expect(system).toContain("analyse approfondie facultative");
    expect(system).toContain("pas au contenu du dossier de marque");
    expect(state.structured).not.toHaveBeenCalled();
  });
  it("does not certify old editorial traction claims as measured outcomes", async () => {
    state.contextBlock = "Pilier T : 1 200 inscrits déclarés. Observation du quiz : 21 historiques sans questionnaire.";
    await askCouncilStream({ strategyId: "brand-a", question: "Quiz ?", history: [] });
    const system = (state.stream.mock.calls[0] as unknown as [{ system: string }])[0].system;
    expect(notice(system)).toContain("déclarations");
    expect(notice(system)).toContain("objectifs");
    expect(notice(system)).toContain("populations");
    expect(notice(system)).toContain("N'invente aucun statut OFFICIAL");
    expect(system).toContain("21 historiques sans questionnaire");
  });
  it("does not call precise fields documentary excerpts in the streamed chat", async () => {
    await askCouncilStream({ strategyId: "brand-a", question: "Question", history: [] });
    const system = (state.stream.mock.calls[0] as unknown as [{ system: string }])[0].system;
    expect(system).toContain("Nom exact");
    expect(notice(system)).not.toContain("Des extraits de la documentation");
    expect(notice(system)).toContain("Aucun extrait documentaire");
  });

  it("preserves a failed read without inventing an absence of indexed documents", async () => {
    state.ragUsed = false;
    state.contextBlock = "[Documentation] lecture documentaire indisponible";
    await askCouncilStream({ strategyId: "brand-a", question: "Question", history: [] });
    const system = (state.stream.mock.calls[0] as unknown as [{ system: string }])[0].system;
    expect(system).toContain("lecture documentaire indisponible");
    expect(notice(system)).not.toContain("aucun document indexé");
    expect(notice(system)).not.toContain("recherche sémantique indisponible");
  });

  it("requires citations with status without inferring approval or deployment", async () => {
    state.sourcesSeen = true;
    state.contextBlock = "source:note-a, certitude:DECLARED";
    await askCouncilStream({ strategyId: "brand-a", question: "Question", history: [] });
    const system = (state.stream.mock.calls[0] as unknown as [{ system: string }])[0].system;
    expect(notice(system)).toContain("son statut");
    expect(notice(system)).toContain("validation humaine");
    expect(notice(system)).toContain("capacité déployée");
  });

  it("applies the same rule to deliberation while preserving hybrid contribution metrics", async () => {
    state.structured.mockImplementation(async ({ caller }: { caller: string }) => {
      if (caller === "mestor:council:draft") return { data: { position: "Position", arguments: ["A", "B"], risks: [] } };
      throw new Error("fixture expert unavailable");
    });
    const result = await deliberate({ strategyId: "brand-a", topic: "Question" });
    const request = state.structured.mock.calls.find(([input]) => input.caller === "mestor:council:draft")![0];
    expect(notice(request.system)).not.toContain("Des extraits de la documentation");
    expect(notice(request.system)).toContain("Aucun extrait documentaire");
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.grounding.ragUsed).toBe(true);
  });
});
