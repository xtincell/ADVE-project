import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ call: vi.fn(), evidence: [] as unknown[], expertEvidence: null as unknown[] | null }));
vi.mock("@/server/services/llm-gateway", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/llm-gateway")>(),
  isTextLLMAvailable: () => true,
  callLLM: (...args: unknown[]) => state.call(...args),
}));
vi.mock("@/server/services/mestor/council/context", () => ({
  buildAssistantContext: vi.fn(async () => ({ contextBlock: "Dossier borné", ragUsed: false,
    sourcesSeen: false, evidence: state.evidence })),
  buildExpertContext: vi.fn(async () => ({ contextBlock: "Extrait indépendant", ragUsed: false,
    sourcesSeen: false, evidence: state.expertEvidence ?? state.evidence })),
}));
vi.mock("@/server/services/neteru-shared/pillar-directors", () => ({
  assessAllPillarsHealth: vi.fn(async () => []),
}));

import { deliberate } from "@/server/services/mestor/council";
import { expertCritiqueSchema, withCouncilCitations } from "@/server/services/mestor/council/schemas";
import { deriveJsonSchemaFromZod } from "@/server/services/utils/zod-to-json-schema";
const reference = { kind: "FIELD", sourceId: "pillar-spawt-e", sourceVersion: 0,
  source: "e", field: "rituels", provenance: "UNKNOWN", editedAt: "2026-07-24T09:00:00.000Z" };
const citation = { ...reference, quote: "5 questions = 5 axes" };
const draft = { position: "Il reste à confronter la description aux observations.",
  arguments: ["Description historique", "Résultat à vérifier"], risks: [], citations: [citation] };
const critique = { verdict: "CHALLENGE", critiques: [], missingAngles: [], amendments: [], citations: [citation] };
const synthesis = { finalPosition: "Réconcilier les versions sans transformer un objectif en mesure.",
  acceptedCritiques: [], rejectedCritiques: [], actionItems: [], dissent: [], citations: [citation] };

beforeEach(() => {
  state.evidence = [{ reference, text: "5 questions = 5 axes" }];
  state.expertEvidence = null;
  state.call.mockReset();
  state.call.mockImplementation(async ({ caller }: { caller: string }) => ({
    text: JSON.stringify(caller.includes(":draft") ? draft : caller.includes(":expert-") ? critique : synthesis),
  }));
});

describe("Council references — actual structured validator, model fixture only", () => {
  it("shows the model the exact offered claims as a closed output choice", async () => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":expert-") ? { ...critique, critiques: [{ claim: "Argument exact à conserver",
        evidence: "Champ", severity: "LOW" }] } : synthesis),
    }));
    await deliberate({ strategyId: "spawt", topic: "Question", draft: "Position" });
    const system = state.call.mock.calls.find(([options]) => options.caller.includes(":synthesis"))![0].system;
    expect(system).toContain('"enum"');
    expect(system).toContain("Argument exact à conserver");
  });

  it("lets the existing queue finish its allowed wait before aborting an expert", async () => {
    vi.useFakeTimers();
    try {
      state.call.mockImplementation(({ caller }: { caller: string }) => caller.includes(":expert-")
        ? new Promise(resolve => setTimeout(() => resolve({ text: JSON.stringify(critique) }), 100_000))
        : Promise.resolve({ text: JSON.stringify(synthesis) }));
      const pending = deliberate({ strategyId: "spawt", topic: "Question", draft: "Position" });
      await vi.advanceTimersByTimeAsync(100_000);
      const result = await pending;
      expect(result.status).toBe("OK");
      if (result.status === "OK") {
        expect(result.deliberated).toBe(true);
        for (const key of ["a", "d", "v", "e"] as const) expect(result.critiques[key]).not.toHaveProperty("failed");
      }
    } finally { vi.useRealTimers(); }
  });

  it("supplies the entire bounded submitted position to each expert and synthesis", async () => {
    const position = "Contexte détaillé. ".repeat(300) + "DÉCISION_FINALE_À_CONFRONTER";
    await deliberate({ strategyId: "spawt", topic: "Question", draft: position });
    expect(state.call).toHaveBeenCalledTimes(5);
    for (const [options] of state.call.mock.calls) expect(options.prompt).toContain("DÉCISION_FINALE_À_CONFRONTER");
  });
  it.each(["invented claim", "wrong expert"])("does not attribute an %s to an expert in the synthesis", async (fault) => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":draft") ? draft : caller.includes(":expert-") ? {
        ...critique, critiques: [{ claim: caller.includes(":expert-a") ? "Argument réel A" : "Autre argument",
          evidence: "Champ", severity: "LOW" }],
      } : { ...synthesis, acceptedCritiques: [{ from: fault === "wrong expert" ? "V" : "A",
        claim: fault === "invented claim" ? "Argument jamais formulé" : "Argument réel A", resolution: "Explication" }] }),
    }));
    const result = await deliberate({ strategyId: "spawt", topic: "Question" });
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.synthesis).toBeNull();
      expect(result.critiques.a).toHaveProperty("citations", [citation]);
    }
  });

  it("retains an exact received claim and its expert in the synthesis", async () => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":draft") ? draft : caller.includes(":expert-") ? {
        ...critique, critiques: [{ claim: "Argument réel", evidence: "Champ", severity: "LOW" }],
      } : { ...synthesis, acceptedCritiques: [{ from: "A", claim: "Argument réel", resolution: "Explication" }] }),
    }));
    const result = await deliberate({ strategyId: "spawt", topic: "Question" });
    if (result.status !== "OK") throw new Error("Council unavailable");
    expect(result.synthesis?.acceptedCritiques[0]?.claim).toBe("Argument réel");
  });

  it("actually supplies all four received critiques instead of cutting the synthesis JSON", async () => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":draft") ? draft : caller.includes(":expert-") ? {
        ...critique, critiques: [{ claim: caller, evidence: "Élément détaillé. ".repeat(900), severity: "LOW" }],
      } : synthesis),
    }));
    await deliberate({ strategyId: "spawt", topic: "Question" });
    const input = state.call.mock.calls.find(([options]) => options.caller.includes(":synthesis"))![0].prompt;
    for (const key of ["a", "d", "v", "e"]) expect(input).toContain(`mestor:council:expert-${key}:struct`);
    expect(input).not.toContain("…[tronqué]");
  });
  it("uses the existing retry feedback to repair stitched quotations without accepting them", async () => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":draft") ? { ...draft, citations: [{ ...citation,
        quote: caller.includes(":retry1") ? citation.quote : "5 questions ... 5 axes" }] }
        : caller.includes(":expert-") ? critique : synthesis),
    }));
    const result = await deliberate({ strategyId: "spawt", topic: "Quiz ?" });
    expect(result.status).toBe("OK");
    expect(state.call.mock.calls[1]![0].prompt).toContain("passage continu");
    if (result.status === "OK") expect(result.draft.citations).toEqual([citation]);
    expect(state.call).toHaveBeenCalledTimes(7);
  });
  it("gives the model one compatible object contract for both its opinion and citations", () => {
    const schema = deriveJsonSchemaFromZod(withCouncilCitations(expertCritiqueSchema, [])) as {
      type: string; properties: Record<string, unknown>; required: string[];
    };
    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("verdict");
    expect(schema.properties).toHaveProperty("citations");
    expect(schema.required).toEqual(expect.arrayContaining(["verdict", "critiques", "citations"]));
  });
  it("forwards the expert deadline to the existing Gateway rather than leaving timed-out calls running", async () => {
    vi.useFakeTimers();
    const signals: Array<AbortSignal | undefined> = [];
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Expert timeout", "AbortError")), ms);
      return controller.signal;
    });
    try {
      state.call.mockImplementation(({ signal }: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
        signals.push(signal);
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      }));
      const pending = deliberate({ strategyId: "spawt", topic: "Avis ?", draft: "Position soumise" });
      await vi.advanceTimersByTimeAsync(0);
      expect(signals).toHaveLength(4);
      await vi.advanceTimersByTimeAsync(90_000);
      expect(signals.every(signal => !signal?.aborted)).toBe(true);
      await vi.advanceTimersByTimeAsync(120_000);
      const result = await pending;
      expect(result.status).toBe("OK");
      if (result.status === "OK") expect(result.deliberated).toBe(false);
      expect(signals.every(signal => signal?.aborted)).toBe(true);
      expect(state.call).toHaveBeenCalledTimes(4);
    } finally {
      timeout.mockRestore(); vi.useRealTimers();
    }
  });
  it.each([
    ["foreign source", { sourceId: "foreign-pillar" }],
    ["invented edition", { sourceVersion: 1 }],
    ["foreign field", { field: "traction" }],
    ["promoted origin", { provenance: "HUMAN" }],
    ["invented editing date", { editedAt: "2026-10-14T00:00:00.000Z" }],
    ["fabricated quotation", { quote: "6 questions ont été validées par 1200 clients" }],
  ])("rejects a draft with %s through existing retries", async (_name, change) => {
    state.call.mockResolvedValue({ text: JSON.stringify({ ...draft, citations: [{ ...citation, ...change }] }) });
    await expect(deliberate({ strategyId: "spawt", topic: "Quiz ?" })).rejects.toThrow(/Zod validation/);
    expect(state.call).toHaveBeenCalledTimes(3);
    expect(state.call.mock.calls[1]![0].prompt).toContain("citations");
  });

  it("does not silently discard valid citations or convert UNKNOWN into a declaration", async () => {
    const result = await deliberate({ strategyId: "spawt", topic: "Quiz ?" });
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.draft).toHaveProperty("citations", [citation]);
    expect(result.critiques.e).toHaveProperty("citations", [citation]);
    expect(result.synthesis).toHaveProperty("citations", [citation]);
    expect(state.call).toHaveBeenCalledTimes(6);
  });

  it("requires an explicit citation list rather than accepting an omitted proof contract", async () => {
    state.call.mockResolvedValue({ text: JSON.stringify({ position: "Position", arguments: ["A", "B"], risks: [] }) });
    await expect(deliberate({ strategyId: "spawt", topic: "Quiz ?" })).rejects.toThrow(/Zod validation/);
  });

  it("does not lend the coordinator's evidence to an independent expert", async () => {
    state.expertEvidence = [];
    const result = await deliberate({ strategyId: "spawt", topic: "Question" });
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.deliberated).toBe(false);
    expect(result.synthesis).toBeNull();
    expect(Object.values(result.critiques).every(item => "failed" in item)).toBe(true);
    expect(state.call).toHaveBeenCalledTimes(13);
  });

  it("retains received critiques when the synthesis invents a quotation", async () => {
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({ text: JSON.stringify(
      caller.includes(":draft") ? draft : caller.includes(":expert-") ? critique
        : { ...synthesis, citations: [{ ...citation, quote: "Succès commercial certifié" }] }),
    }));
    const result = await deliberate({ strategyId: "spawt", topic: "Question" });
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.synthesis).toBeNull();
    expect(result.critiques.e).toHaveProperty("citations", [citation]);
    expect(state.call).toHaveBeenCalledTimes(8);
  });

  it("allows an explicit empty list when no citable excerpt was supplied", async () => {
    state.evidence = [];
    state.call.mockImplementation(async ({ caller }: { caller: string }) => ({
      text: JSON.stringify({ ...(caller.includes(":draft") ? draft : caller.includes(":expert-") ? critique : synthesis), citations: [] }),
    }));
    const result = await deliberate({ strategyId: "spawt", topic: "Avis sans source ?" });
    expect(result.status).toBe("OK");
    if (result.status === "OK") expect(result.draft).toHaveProperty("citations", []);
    expect(state.call).toHaveBeenCalledTimes(6);
  });
});
