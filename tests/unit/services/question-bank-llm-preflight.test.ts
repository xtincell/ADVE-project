/**
 * Plan 4.11.c — les questions de suivi de l'intake suivent la disponibilité
 * déclarée par le Gateway, pas une liste de clés lue à la main.
 *
 * `generateAiFollowUps` testait ANTHROPIC_API_KEY / OPENAI_API_KEY /
 * OLLAMA_BASE_URL. Deux écarts en découlaient :
 *  - relais texte OAuth seul (aucune de ces clés) : aucune question de suivi,
 *    alors que le Gateway sait servir le texte par ce relais ;
 *  - clé OpenAI réservée aux embeddings, sans relais : appel tenté vers un
 *    fournisseur texte que le Gateway refuse, avec ses délais de reprise.
 * Le préflight réutilise désormais `isTextLLMAvailable`, sans nouveau gestionnaire.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ callLLM: vi.fn() }));
vi.mock("@/server/services/llm-gateway", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/llm-gateway")>()),
  callLLM: gateway.callLLM,
}));

import { _resetProvidersForTest } from "@/server/services/llm-gateway";
import { getAdaptiveQuestions } from "@/server/services/quick-intake/question-bank";

const PROVIDER_ENV = [
  "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OLLAMA_BASE_URL", "OPENROUTER_API_KEY",
  "OPENAI_TEXT_RELAY_URL", "OPENAI_TEXT_RELAY_TOKEN", "LLM_PRIMARY_PROVIDER",
] as const;

function configure(env: Partial<Record<(typeof PROVIDER_ENV)[number], string>>) {
  for (const key of PROVIDER_ENV) vi.stubEnv(key, env[key] ?? "");
  _resetProvidersForTest();
}

const AI_REPLY = JSON.stringify([{ id: "a_ai_1", question: "Quel geste concret prouve cette promesse ?" }]);

beforeEach(() => {
  gateway.callLLM.mockReset().mockResolvedValue({ text: AI_REPLY });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  _resetProvidersForTest();
  vi.restoreAllMocks();
});

async function followUps() {
  const questions = await getAdaptiveQuestions("a", { a_mission: "Rendre la cuisine locale visible" }, { sector: "Restauration" });
  return questions.filter((q) => q.id.startsWith("a_ai_"));
}

describe("question-bank — préflight LLM du Gateway", () => {
  it("pose les questions de suivi via le relais texte OAuth seul", async () => {
    configure({
      OPENAI_TEXT_RELAY_URL: "https://relay.example.test",
      OPENAI_TEXT_RELAY_TOKEN: "synthetic-relay-token",
      LLM_PRIMARY_PROVIDER: "openai",
    });
    const asked = await followUps();
    expect(gateway.callLLM).toHaveBeenCalledOnce();
    expect(gateway.callLLM.mock.calls[0]![0]).toMatchObject({ caller: "quick-intake:question-bank" });
    expect(asked).toEqual([expect.objectContaining({ id: "a_ai_1", pillar: "a", required: false })]);
  });

  it("n'appelle aucun fournisseur texte avec la seule clé réservée aux embeddings", async () => {
    configure({ OPENAI_API_KEY: "synthetic-embedding-key" });
    expect(await followUps()).toEqual([]);
    expect(gateway.callLLM).not.toHaveBeenCalled();
  });

  it("retombe sur la banque statique sans aucun fournisseur", async () => {
    configure({});
    const questions = await getAdaptiveQuestions("a", {}, undefined);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q) => q.id.startsWith("a_ai_"))).toBe(false);
    expect(gateway.callLLM).not.toHaveBeenCalled();
  });
});
