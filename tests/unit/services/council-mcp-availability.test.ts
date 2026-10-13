import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  available: false, tierAllowed: true, budgetAllowed: true, brandExists: true,
  ask: vi.fn(), deliberate: vi.fn(), assistantBudget: vi.fn(), deliberationBudget: vi.fn(),
  unavailable: { status: "UNAVAILABLE", reason: "Aucun fournisseur d'intelligence disponible — réessayez plus tard." },
}));
vi.mock("@/lib/db", () => ({ db: { strategy: { findUnique: vi.fn(async () =>
  state.brandExists ? { operatorId: "operator-a" } : null) } } }));
vi.mock("@/server/services/llm-gateway", () => ({ isTextLLMAvailable: () => state.available }));
vi.mock("@/server/services/glory-tools/tier-gate", () => ({ checkPaidTier: vi.fn(async () => ({ allowed: state.tierAllowed })) }));
vi.mock("@/server/services/mestor/council", () => ({
  COUNCIL_UNAVAILABLE: state.unavailable,
  askCouncilOnce: state.ask,
  deliberate: state.deliberate,
}));
vi.mock("@/server/services/mestor/council/rate-limit", () => ({
  consumeAssistantBudget: state.assistantBudget,
  consumeDeliberationBudget: state.deliberationBudget,
}));

import { tools } from "@/server/mcp/council";

async function invoke(name: "ask" | "deliberate") {
  const tool = tools.find(t => t.name === name)!;
  const input = tool.inputSchema.parse({ strategyId: "brand-a", question: "Question", topic: "Question" });
  return tool.handler(input as Record<string, unknown>);
}

beforeEach(() => {
  state.available = false; state.tierAllowed = true; state.budgetAllowed = true; state.brandExists = true;
  state.ask.mockReset(); state.deliberate.mockReset();
  state.assistantBudget.mockReset().mockImplementation(async () => state.budgetAllowed);
  state.deliberationBudget.mockReset().mockImplementation(async () => state.budgetAllowed);
  state.ask.mockImplementation(async () => { throw new Error("fixture stream empty without provider"); });
  state.deliberate.mockResolvedValue(state.unavailable);
});

describe("council MCP availability with real handlers and fixture dependencies", () => {
  it.each(["ask", "deliberate"] as const)("returns unavailability before consuming council quota (%s)", async name => {
    await expect(invoke(name)).resolves.toEqual(state.unavailable);
    expect(state.assistantBudget).not.toHaveBeenCalled();
    expect(state.deliberationBudget).not.toHaveBeenCalled();
    expect(state.ask).not.toHaveBeenCalled();
    expect(state.deliberate).not.toHaveBeenCalled();
  });

  it.each(["ask", "deliberate"] as const)("keeps the subscription guard when no provider exists (%s)", async name => {
    state.tierAllowed = false;
    expect(await invoke(name)).toHaveProperty("error", expect.stringContaining("TIER_GATE_DENIED"));
    expect(state.assistantBudget).not.toHaveBeenCalled();
    expect(state.deliberationBudget).not.toHaveBeenCalled();
  });

  it("keeps brand existence checks before an unavailability response", async () => {
    state.brandExists = false;
    expect(await invoke("ask")).toHaveProperty("error", expect.stringContaining("TIER_GATE_DENIED"));
  });

  it("preserves the existing answer contract and quota when a provider exists", async () => {
    state.available = true;
    state.ask.mockResolvedValue({ text: "Réponse de recette", provider: "fixture", model: "fixture" });
    expect(await invoke("ask")).toEqual({ strategyId: "brand-a", question: "Question", answer: "Réponse de recette" });
    expect(state.assistantBudget).toHaveBeenCalledOnce();
    expect(state.ask).toHaveBeenCalledOnce();
  });

  it.each(["ask", "deliberate"] as const)("keeps council rate limits with an available provider (%s)", async name => {
    state.available = true; state.budgetAllowed = false;
    expect(await invoke(name)).toHaveProperty("error", expect.stringContaining("RATE_LIMITED"));
    expect(state.ask).not.toHaveBeenCalled();
    expect(state.deliberate).not.toHaveBeenCalled();
  });
});
