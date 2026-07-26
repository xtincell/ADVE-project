/**
 * ADR-0180 — deliberate() : dégradations honnêtes, LLM mocké.
 *
 *   - 2 experts KO → la synthèse tourne quand même sur les critiques reçues ;
 *   - 4 experts KO → `deliberated: false`, le draft est livré seul ;
 *   - aucun provider → status UNAVAILABLE sans appel LLM.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const structuredMock = vi.fn();
vi.mock("@/server/services/utils/llm-structured", () => ({
  executeStructuredLLMCall: (...args: unknown[]) => structuredMock(...args),
}));

const availableMock = vi.fn(() => true);
vi.mock("@/server/services/llm-gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/llm-gateway")>();
  return { ...actual, isTextLLMAvailable: () => availableMock() };
});

vi.mock("@/server/services/mestor/council/context", () => ({
  buildAssistantContext: vi.fn(async () => ({ contextBlock: "CTX", ragUsed: false })),
  buildExpertContext: vi.fn(async () => "EXPERT CTX"),
}));

vi.mock("@/server/services/neteru-shared/pillar-directors", () => ({
  assessAllPillarsHealth: vi.fn(async () => []),
}));

import { deliberate } from "@/server/services/mestor/council";

const DRAFT = { position: "P", arguments: ["a1", "a2"], risks: [] };
const CRITIQUE = { verdict: "CHALLENGE", critiques: [], missingAngles: [], amendments: [] };
const SYNTHESIS = {
  finalPosition: "F",
  acceptedCritiques: [],
  rejectedCritiques: [],
  actionItems: [],
  dissent: [],
};

function callerOf(args: unknown[]): string {
  return (args[0] as { caller: string }).caller;
}

describe("deliberate — dégradations honnêtes", () => {
  beforeEach(() => {
    structuredMock.mockReset();
    availableMock.mockReturnValue(true);
  });

  it("aucun provider → UNAVAILABLE sans le moindre appel LLM", async () => {
    availableMock.mockReturnValue(false);
    const r = await deliberate({ strategyId: "s1", topic: "t" });
    expect(r.status).toBe("UNAVAILABLE");
    expect(structuredMock).not.toHaveBeenCalled();
  });

  it("2 experts KO → synthèse quand même, échecs rapportés par pilier", async () => {
    structuredMock.mockImplementation(async (...args: unknown[]) => {
      const caller = callerOf(args);
      if (caller === "mestor:council:draft") return { data: DRAFT };
      if (caller === "mestor:council:expert-a" || caller === "mestor:council:expert-d") {
        throw new Error("expert down");
      }
      if (caller.startsWith("mestor:council:expert-")) return { data: CRITIQUE };
      return { data: SYNTHESIS };
    });

    const r = await deliberate({ strategyId: "s1", topic: "t" });
    expect(r.status).toBe("OK");
    if (r.status !== "OK") return;
    expect(r.deliberated).toBe(true);
    expect(r.synthesis).toEqual(SYNTHESIS);
    expect(r.critiques.a).toHaveProperty("failed");
    expect(r.critiques.d).toHaveProperty("failed");
    expect(r.critiques.v).toEqual(CRITIQUE);
    expect(r.critiques.e).toEqual(CRITIQUE);
  });

  it("4 experts KO → deliberated:false, draft livré seul, pas de synthèse", async () => {
    structuredMock.mockImplementation(async (...args: unknown[]) => {
      const caller = callerOf(args);
      if (caller === "mestor:council:draft") return { data: DRAFT };
      throw new Error("all experts down");
    });

    const r = await deliberate({ strategyId: "s1", topic: "t" });
    expect(r.status).toBe("OK");
    if (r.status !== "OK") return;
    expect(r.deliberated).toBe(false);
    expect(r.synthesis).toBeNull();
    expect(r.draft).toEqual(DRAFT);
  });

  it("draft fourni par l'opérateur → pas d'appel draft, experts challengent la position fournie", async () => {
    structuredMock.mockImplementation(async (...args: unknown[]) => {
      const caller = callerOf(args);
      if (caller === "mestor:council:draft") throw new Error("ne doit pas être appelé");
      if (caller.startsWith("mestor:council:expert-")) return { data: CRITIQUE };
      return { data: SYNTHESIS };
    });

    const r = await deliberate({ strategyId: "s1", topic: "t", draft: "ma position" });
    expect(r.status).toBe("OK");
    if (r.status !== "OK") return;
    expect(r.draft.position).toBe("ma position");
    const draftCalls = structuredMock.mock.calls.filter(
      (c) => callerOf(c) === "mestor:council:draft",
    );
    expect(draftCalls).toHaveLength(0);
  });
});
