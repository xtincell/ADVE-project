import { describe, it, expect } from "vitest";
import { routeModel } from "@/server/services/llm-gateway/router";

describe("LLM Gateway v5 routing matrix", () => {
  it("S → Opus", () => {
    expect(routeModel({ intentKind: "FILL_ADVE", qualityTier: "S" }).model).toContain(
      "opus",
    );
  });

  it("A → Sonnet", () => {
    expect(routeModel({ intentKind: "RANK_PEERS", qualityTier: "A" }).model).toContain(
      "sonnet",
    );
  });

  it("B → cheaper provider", () => {
    const r = routeModel({ intentKind: "JEHUTY_FEED_REFRESH", qualityTier: "B" });
    expect(["gpt-4o-mini", "claude-haiku-4-5-20251001"]).toContain(r.model);
  });

  it("tight latency budget → Haiku", () => {
    expect(
      routeModel({
        intentKind: "RANK_PEERS",
        qualityTier: "S",
        latencyBudgetMs: 1500,
      }).model,
    ).toContain("haiku");
  });

  it("budget exhausted → Ollama fallback", () => {
    expect(
      routeModel({
        intentKind: "RANK_PEERS",
        qualityTier: "A",
        costRemainingUsd: 0.001,
      }).provider,
    ).toBe("ollama");
  });
});
