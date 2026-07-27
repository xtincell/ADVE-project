/**
 * Anti-drift — matrice de routage du LLM Gateway (v5).
 *
 * Deux questions distinctes, deux fonctions, deux blocs de tests :
 *
 *   • `idealModel(ctx)` — la DÉCISION de routage : quel modèle la matrice
 *     choisit pour ce tier / cette latence / ce budget. Indépendante des clés
 *     posées sur la machine → déterministe en CI comme en local.
 *   • `routeModel(ctx)` — le CHOIX RUNTIME : la décision, puis la descente dans
 *     le catalogue tant que le provider préféré n'est pas configuré.
 *
 * Ce test asseyait auparavant la matrice sur `routeModel` : sur une machine où
 * seule `OPENAI_API_KEY` est posée, « tier S → opus » retombait légitimement sur
 * `gpt-4o-mini` par indisponibilité, et trois cas échouaient — un test vert ou
 * rouge selon l'environnement, pas selon le code.
 */

import { describe, it, expect } from "vitest";
import { idealModel, routeModel } from "@/server/services/llm-gateway/router";

describe("LLM Gateway v5 — décision de routage (indépendante des providers configurés)", () => {
  it("S → Opus", () => {
    expect(idealModel({ qualityTier: "S" }).model).toContain("opus");
  });

  it("A → Sonnet", () => {
    expect(idealModel({ qualityTier: "A" }).model).toContain("sonnet");
  });

  it("B → provider moins cher", () => {
    expect(["gpt-4o-mini", "claude-haiku-4-5-20251001"]).toContain(
      idealModel({ qualityTier: "B" }).model,
    );
  });

  it("budget de latence serré → Haiku, même en tier S", () => {
    expect(idealModel({ qualityTier: "S", latencyBudgetMs: 1500 }).model).toContain("haiku");
  });

  it("budget épuisé → repli Ollama", () => {
    expect(idealModel({ qualityTier: "A", costRemainingUsd: 0.001 }).provider).toBe("ollama");
  });

  it("downgrade Thot → descend d'un cran", () => {
    expect(idealModel({ qualityTier: "S", downgrade: true }).model).toContain("sonnet");
  });
});

describe("LLM Gateway v5 — choix runtime (descente sur indisponibilité)", () => {
  it("rend toujours un modèle, et ne remonte jamais au-dessus de la décision", () => {
    const runtime = routeModel({ intentKind: "RANK_PEERS", qualityTier: "A" });
    expect(runtime.model).toBeTruthy();
    // Soit le provider idéal est configuré ici, soit on est descendu — mais
    // jamais REMONTÉ vers un modèle plus cher que la décision de routage.
    expect(runtime.costPerMTokensUsd).toBeLessThanOrEqual(
      idealModel({ qualityTier: "A" }).costPerMTokensUsd,
    );
  });
});
