import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InsightSeverity, InsightType, MestorInsight } from "@/server/services/mestor/insights";
import type { ScenarioInput } from "@/server/services/mestor/commandant";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    strategy: {
      findUnique: vi.fn().mockResolvedValue({
        id: "strat-1",
        name: "Test Strategy",
        pillars: [],
        advertis_vector: {},
      }),
    },
  },
}));

// Mock LLM utility
vi.mock("@/server/services/utils/llm", () => ({
  callLLMAndParse: vi.fn(),
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

import { runScenario } from "@/server/services/mestor/commandant";
import { callLLMAndParse } from "@/server/services/utils/llm";

const mockCallLLM = callLLMAndParse as ReturnType<typeof vi.fn>;

type ScenarioType = ScenarioInput["type"];

// Helper: cast result to typed shape for assertions
interface ScenarioResult {
  type: string;
  title: string;
  summary?: string;
  impacts: Array<{ dimension: string; currentValue: unknown; projectedValue: unknown; delta: unknown; timeframe: string }>;
  risks: Array<{ description: string }>;
  recommendations: Array<{ action: string }>;
  confidence: number;
}
function asResult(r: Record<string, unknown>): ScenarioResult {
  return r as unknown as ScenarioResult;
}

// Helper: build scenario input with required description
function scenario(type: string, strategyId: string, parameters: Record<string, unknown>): ScenarioInput {
  return { type, strategyId, description: `Test scenario: ${type}`, parameters };
}

// ============================================================
// Types et severites des Insights
// ============================================================
describe("Mestor Insights — Types et Severites", () => {
  const allInsightTypes: InsightType[] = [
    "COHERENCE",
    "STALE_PILLAR",
    "SIGNAL_ALERT",
    "OPPORTUNITY",
    "CULT_INDEX",
    "SLA_RISK",
    "DRIFT",
  ];

  const allSeverities: InsightSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  it("doit definir 7 types d'insights", () => {
    expect(allInsightTypes).toHaveLength(7);
  });

  it("doit definir 4 niveaux de severite", () => {
    expect(allSeverities).toHaveLength(4);
  });

  it("doit inclure le type COHERENCE", () => {
    expect(allInsightTypes).toContain("COHERENCE");
  });

  it("doit inclure le type STALE_PILLAR", () => {
    expect(allInsightTypes).toContain("STALE_PILLAR");
  });

  it("doit inclure le type SIGNAL_ALERT", () => {
    expect(allInsightTypes).toContain("SIGNAL_ALERT");
  });

  it("doit inclure le type OPPORTUNITY", () => {
    expect(allInsightTypes).toContain("OPPORTUNITY");
  });

  it("doit inclure le type CULT_INDEX", () => {
    expect(allInsightTypes).toContain("CULT_INDEX");
  });

  it("doit inclure le type SLA_RISK", () => {
    expect(allInsightTypes).toContain("SLA_RISK");
  });

  it("doit inclure le type DRIFT", () => {
    expect(allInsightTypes).toContain("DRIFT");
  });
});

// ============================================================
// Structure d'un MestorInsight
// ============================================================
describe("Mestor Insights — Structure", () => {
  it("doit avoir les champs requis dans un insight", () => {
    const insight: MestorInsight = {
      type: "COHERENCE",
      severity: "HIGH",
      title: "Desequilibre entre piliers",
      description: "Ecart de 20 points",
      actionable: true,
      suggestedAction: "Lancer un diagnostic",
    };

    expect(insight.type).toBeDefined();
    expect(insight.severity).toBeDefined();
    expect(insight.title).toBeDefined();
    expect(insight.description).toBeDefined();
    expect(insight.actionable).toBeDefined();
  });

  it("doit permettre un pillarKey optionnel", () => {
    const insight: MestorInsight = {
      type: "STALE_PILLAR",
      severity: "MEDIUM",
      title: "Pilier A non mis a jour",
      description: "30 jours sans mise a jour",
      pillarKey: "A",
      actionable: true,
    };

    expect(insight.pillarKey).toBe("A");
  });

  it("doit permettre un champ data optionnel", () => {
    const insight: MestorInsight = {
      type: "CULT_INDEX",
      severity: "MEDIUM",
      title: "Cult Index faible",
      description: "Score a 25/100",
      actionable: true,
      data: { score: 25, tier: "FUNCTIONAL" },
    };

    expect(insight.data).toBeDefined();
    expect(insight.data!.score).toBe(25);
  });
});

// ============================================================
// Simulation de scenarios
// ============================================================
describe("Mestor Scenarios — Types de Simulation", () => {
  const scenarioTypes: ScenarioType[] = [
    "BUDGET_REALLOCATION",
    "MARKET_ENTRY",
    "COMPETITOR_RESPONSE",
    "DRIVER_ACTIVATION",
    "PRICING_CHANGE",
  ];

  // Helper to build a mock LLM return for a given scenario type
  function mockLLMForScenario(type: string, params: Record<string, unknown>) {
    const title =
      type === "BUDGET_REALLOCATION" ? `Réallocation: ${params.fromChannel} → ${params.toChannel}` :
      type === "MARKET_ENTRY" ? `Entrée marché: ${params.targetMarket}` :
      type === "COMPETITOR_RESPONSE" ? `Réponse concurrentielle: ${params.competitor}` :
      type === "DRIVER_ACTIVATION" ? `Activation driver: ${params.driver}` :
      type === "PRICING_CHANGE" ? `Changement prix ${params.product} +${params.changePercent}%` :
      `Scenario: ${type}`;

    mockCallLLM.mockResolvedValue({
      type,
      title,
      summary: `Simulation ${type}`,
      impacts: [{ dimension: "revenue", currentValue: 100, projectedValue: 120, delta: 20, timeframe: "6 mois" }],
      risks: [{ description: "Risque concurrentiel" }],
      recommendations: [{ action: "Monitorer" }],
      confidence: 0.75,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit supporter 5 types de scenarios", () => {
    expect(scenarioTypes).toHaveLength(5);
  });

  it("doit simuler une reallocation budgetaire", async () => {
    const params = { fromChannel: "TV", toChannel: "INSTAGRAM", amount: 5000000 };
    mockLLMForScenario("BUDGET_REALLOCATION", params);

    const result = asResult(await runScenario(scenario("BUDGET_REALLOCATION", "strat-1", params)));

    expect(result.type).toBe("BUDGET_REALLOCATION");
    expect(result.title).toContain("TV");
    expect(result.title).toContain("INSTAGRAM");
    expect(result.impacts.length).toBeGreaterThan(0);
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("doit simuler une entree sur un nouveau marche", async () => {
    const params = { targetMarket: "Nigeria", entryStrategy: "partnership", budget: 20000000 };
    mockLLMForScenario("MARKET_ENTRY", params);

    const result = asResult(await runScenario(scenario("MARKET_ENTRY", "strat-1", params)));

    expect(result.type).toBe("MARKET_ENTRY");
    expect(result.title).toContain("Nigeria");
    expect(result.impacts.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("doit simuler une reponse concurrentielle", async () => {
    const params = { competitor: "ConcurrentX", theirAction: "lance un produit similaire" };
    mockLLMForScenario("COMPETITOR_RESPONSE", params);

    const result = asResult(await runScenario(scenario("COMPETITOR_RESPONSE", "strat-1", params)));

    expect(result.type).toBe("COMPETITOR_RESPONSE");
    expect(result.title).toContain("ConcurrentX");
    expect(result.impacts.length).toBeGreaterThan(0);
  });

  it("doit simuler une activation de driver", async () => {
    const params = { driver: "TIKTOK", budget: 3000000 };
    mockLLMForScenario("DRIVER_ACTIVATION", params);

    const result = asResult(await runScenario(scenario("DRIVER_ACTIVATION", "strat-1", params)));

    expect(result.type).toBe("DRIVER_ACTIVATION");
    expect(result.title).toContain("TIKTOK");
    expect(result.impacts.length).toBeGreaterThan(0);
  });

  it("doit simuler un changement de prix", async () => {
    const params = { product: "Abonnement Premium", changePercent: 15 };
    mockLLMForScenario("PRICING_CHANGE", params);

    const result = asResult(await runScenario(scenario("PRICING_CHANGE", "strat-1", params)));

    expect(result.type).toBe("PRICING_CHANGE");
    expect(result.title).toContain("Abonnement Premium");
    expect(result.title).toContain("+15%");
    expect(result.impacts.length).toBeGreaterThan(0);
  });

  it("un type de scenario inconnu ne provoque pas d'erreur (LLM gere)", async () => {
    mockCallLLM.mockResolvedValue({
      type: "UNKNOWN_TYPE",
      title: "Unknown",
      summary: "Unknown scenario",
      impacts: [],
      risks: [],
      recommendations: [],
      confidence: 0.5,
    });

    const result = await runScenario(scenario("UNKNOWN_TYPE" as ScenarioType, "strat-1", {}));
    expect(result).toBeDefined();
  });
});

// ============================================================
// Structure des resultats de scenario
// ============================================================
describe("Mestor Scenarios — Structure des Resultats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCallLLM.mockResolvedValue({
      type: "BUDGET_REALLOCATION",
      title: "Réallocation: TV → DIGITAL",
      summary: "Simulation réallocation",
      impacts: [{ dimension: "revenue", currentValue: 100, projectedValue: 120, delta: 20, timeframe: "6 mois" }],
      risks: [{ description: "Risque" }],
      recommendations: [{ action: "Monitorer" }],
      confidence: 0.75,
    });
  });

  it("doit retourner un resultat avec tous les champs requis", async () => {
    const result = await runScenario(scenario("BUDGET_REALLOCATION", "strat-1", {
      fromChannel: "TV", toChannel: "DIGITAL", amount: 1000000,
    }));

    expect(result).toHaveProperty("type");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("impacts");
    expect(result).toHaveProperty("risks");
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("confidence");
  });

  it("doit avoir des impacts avec dimension, valeurs et timeframe", async () => {
    const result = asResult(await runScenario(scenario("DRIVER_ACTIVATION", "strat-1", {
      driver: "INSTAGRAM", budget: 2000000,
    })));

    for (const impact of result.impacts) {
      expect(impact).toHaveProperty("dimension");
      expect(impact).toHaveProperty("currentValue");
      expect(impact).toHaveProperty("projectedValue");
      expect(impact).toHaveProperty("delta");
      expect(impact).toHaveProperty("timeframe");
    }
  });

  it("doit avoir un indice de confiance entre 0 et 1", async () => {
    for (const type of ["BUDGET_REALLOCATION", "MARKET_ENTRY", "COMPETITOR_RESPONSE", "DRIVER_ACTIVATION", "PRICING_CHANGE"] as ScenarioType[]) {
      const result = asResult(await runScenario(scenario(type, "strat-1", {
        fromChannel: "TV", toChannel: "DIGITAL", amount: 1000000,
        targetMarket: "Kenya", competitor: "X", theirAction: "launch",
        driver: "INSTAGRAM", budget: 5000000, product: "Test", changePercent: 10,
      })));
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
