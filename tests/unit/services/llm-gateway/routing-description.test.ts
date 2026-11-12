import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetProvidersForTest, buildProviderModel, describeTextRouting,
  DEFAULT_OPENROUTER_MODEL,
} from "@/server/services/llm-gateway";

const sdk = vi.hoisted(() => ({
  model: vi.fn((modelId: string) => ({ modelId })),
  createOpenAI: vi.fn(),
  createAnthropic: vi.fn(),
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: sdk.model,
  createOpenAI: sdk.createOpenAI.mockImplementation(() => Object.assign(sdk.model, { chat: sdk.model })),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: sdk.model,
  createAnthropic: sdk.createAnthropic.mockImplementation(() => sdk.model),
}));

const policy = {
  anthropicModel: "policy-anthropic", ollamaModel: "policy-ollama",
  allowOllamaSubstitution: true, version: 7,
};

beforeEach(() => {
  for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OLLAMA_BASE_URL", "OLLAMA_API_KEY",
    "OLLAMA_MODEL", "OPENROUTER_API_KEY", "OPENAI_TEXT_RELAY_URL", "OPENAI_TEXT_RELAY_TOKEN",
    "HEADROOM_PROXY_URL", "LLM_PRIMARY_PROVIDER", "LLM_PREMIUM_MODE"]) vi.stubEnv(key, undefined);
  _resetProvidersForTest({ anthropic: { available: true }, openai: { available: false },
    ollama: { available: true }, openrouter: { available: true } });
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllEnvs(); _resetProvidersForTest(); });

describe("existing Gateway routing description — read only", () => {
  it("shows the selected subscription instead of legacy models without constructing an SDK", async () => {
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://fixture.invalid/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "fixture-private-token");
    vi.stubEnv("OLLAMA_MODEL", "legacy-pin");
    _resetProvidersForTest({ openai: { available: true } });
    const result = describeTextRouting(policy);
    expect(result).toMatchObject({ explicitPrimary: "openai", subscriptionOnly: true, policyVersion: 7,
      attempts: [{ provider: "openai", model: "gpt-5.6-luna", eligible: true }] });
    expect(result.attempts).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(/fixture\.invalid|fixture-private-token/);
    expect(sdk.model).not.toHaveBeenCalled();
    expect(sdk.createOpenAI).not.toHaveBeenCalled();
    expect(sdk.createAnthropic).not.toHaveBeenCalled();
    const built = await buildProviderModel("openai", policy.anthropicModel);
    expect(built.servedModel).toBe(result.attempts[0]?.model);
    expect(built.aiModel).toEqual({ modelId: "gpt-5.6-luna" });
  });

  it.each(["OPENAI_TEXT_RELAY_URL", "OPENAI_TEXT_RELAY_TOKEN"])(
    "shows no attempted fallback when the selected subscription is missing %s", (missing) => {
      vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
      vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://fixture.invalid/v1");
      vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "fixture-private-token");
      vi.stubEnv(missing, "");
      _resetProvidersForTest({ openai: { available: true } });
      expect(describeTextRouting(policy).attempts).toEqual([]);
    },
  );

  it("shows refusal while the selected subscription circuit is open", () => {
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
    vi.stubEnv("OPENAI_TEXT_RELAY_URL", "http://fixture.invalid/v1");
    vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "fixture-private-token");
    _resetProvidersForTest({ openai: { available: true, circuitOpenUntil: Date.now() + 60_000 } });
    expect(describeTextRouting(policy).attempts).toEqual([]);
  });

  it("retains the real default provider order and reports fallback admission honestly", () => {
    expect(describeTextRouting(policy).attempts.map((a) => a.provider))
      .toEqual(["ollama", "openrouter", "anthropic"]);
    _resetProvidersForTest({ anthropic: { available: false }, openai: { available: false },
      ollama: { available: false }, openrouter: { available: false } });
    expect(describeTextRouting(policy).attempts)
      .toEqual([{ provider: "anthropic", model: "policy-anthropic", eligible: false }]);
  });

  it("retains explicit priority and premium behavior rather than a separate console matrix", () => {
    vi.stubEnv("LLM_PRIMARY_PROVIDER", "anthropic");
    expect(describeTextRouting(policy).attempts[0]?.provider).toBe("anthropic");
    vi.stubEnv("LLM_PRIMARY_PROVIDER", ""); vi.stubEnv("LLM_PREMIUM_MODE", "1");
    expect(describeTextRouting({ ...policy, allowOllamaSubstitution: false }).attempts[0]?.provider)
      .toBe("anthropic");
  });

  it("does not present an embeddings API key as text subscription access", () => {
    vi.stubEnv("OPENAI_API_KEY", "fixture-embedding-key");
    _resetProvidersForTest({ anthropic: { available: false }, ollama: { available: false },
      openrouter: { available: false } });
    expect(describeTextRouting(policy).attempts.map((a) => a.provider)).not.toContain("openai");
    expect(JSON.stringify(describeTextRouting(policy))).not.toContain("fixture-embedding-key");
  });

  it.each([
    { provider: "anthropic" as const, model: "policy-anthropic" },
    { provider: "ollama" as const, model: "policy-ollama" },
    { provider: "openrouter" as const, model: DEFAULT_OPENROUTER_MODEL },
  ])("describes the same model constructed by the existing SDK path: $provider", async ({ provider, model }) => {
    const route = describeTextRouting(policy).attempts.find((a) => a.provider === provider);
    const built = await buildProviderModel(provider, policy.anthropicModel, { policyOllamaModel: policy.ollamaModel });
    expect(route?.model).toBe(model);
    expect(built.servedModel).toBe(model);
    expect(built.aiModel).toEqual({ modelId: model });
  });

  it("keeps Ollama deployment pins ahead of call and saved-policy overrides", async () => {
    vi.stubEnv("OLLAMA_MODEL", "deployment-pin");
    expect(describeTextRouting(policy).attempts[0]?.model).toBe("deployment-pin");
    expect((await buildProviderModel("ollama", "policy-anthropic", {
      policyOllamaModel: "policy-ollama", ollamaCallOverride: "local-alias",
    })).servedModel).toBe("deployment-pin");
    expect((await buildProviderModel("ollama", "policy-anthropic", {
      exactModel: "vision-exact", policyOllamaModel: "policy-ollama",
    })).servedModel).toBe("vision-exact");
  });

  it("preserves non-default call model choices outside the default console projection", async () => {
    expect((await buildProviderModel("ollama", "policy-anthropic", { ollamaCallOverride: "call-alias" }))
      .servedModel).toBe("call-alias");
    expect((await buildProviderModel("ollama", "policy-anthropic")).servedModel).toBe("policy-anthropic");
    expect((await buildProviderModel("openrouter", "policy-anthropic", { exactModel: "vision-exact" }))
      .servedModel).toBe("vision-exact");
    expect((await buildProviderModel("openai", "claude-haiku-4-5")).servedModel).toBe("gpt-4o-mini");
    expect((await buildProviderModel("openai", "policy-anthropic")).servedModel).toBe("gpt-4o");
  });
});
