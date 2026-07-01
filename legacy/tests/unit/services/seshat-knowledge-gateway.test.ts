import { describe, it, expect, beforeEach } from "vitest";
import { queryKnowledge } from "@/server/services/seshat/knowledge-gateway";
import { _resetProvidersForTest, isTextLLMAvailable } from "@/server/services/llm-gateway";
import { formatReferenceDossiers } from "@/server/services/seshat/reference-context";

/**
 * Knowledge Gateway (ADR-0108) — la doctrine « DB d'abord, LLM ensuite et
 * skippable » est testée ICI sans aucun mock : on contrôle la disponibilité
 * réelle des providers via `_resetProvidersForTest`, et on passe des fonctions
 * pures comme `retrieve`/`enrich`. Le LLM ne doit JAMAIS pouvoir casser une
 * requête de connaissance.
 */

const ALL_OFF = {
  anthropic: { available: false },
  openai: { available: false },
  ollama: { available: false },
  openrouter: { available: false },
} as const;

describe("seshat/knowledge-gateway — queryKnowledge", () => {
  beforeEach(() => _resetProvidersForTest());

  it("retrieve seul (pas d'enrich) → DB pure, étage LLM non sollicité", async () => {
    const res = await queryKnowledge<string[]>({ retrieve: async () => ["a", "b"] });
    expect(res.facts).toEqual(["a", "b"]);
    expect(res.enrichment).toBeNull();
    expect(res.llmStep).toBe("SKIPPED_NO_ENRICHER");
    expect(res.source).toBe("DB");
  });

  it("enrich + skipLlm → l'étage LLM est sauté par choix, facts servis", async () => {
    _resetProvidersForTest({ anthropic: { available: true } });
    const res = await queryKnowledge<string[], string>({
      retrieve: async () => ["x"],
      enrich: async () => "NE DOIT PAS COURIR",
      skipLlm: true,
    });
    expect(res.facts).toEqual(["x"]);
    expect(res.enrichment).toBeNull();
    expect(res.llmStep).toBe("SKIPPED_BY_CALLER");
  });

  it("enrich mais AUCUN provider texte → étage LLM ignoré, DB conservée", async () => {
    _resetProvidersForTest(ALL_OFF);
    expect(isTextLLMAvailable()).toBe(false);
    let enrichCalled = false;
    const res = await queryKnowledge<number, string>({
      retrieve: async () => 42,
      enrich: async () => {
        enrichCalled = true;
        return "synthèse";
      },
    });
    expect(res.facts).toBe(42);
    expect(res.enrichment).toBeNull();
    expect(res.llmStep).toBe("SKIPPED_UNAVAILABLE");
    expect(res.source).toBe("DB");
    expect(enrichCalled).toBe(false); // le step est court-circuité, pas tenté
  });

  it("enrich + provider dispo → étage LLM appliqué (DB+LLM)", async () => {
    _resetProvidersForTest({ anthropic: { available: true } });
    expect(isTextLLMAvailable()).toBe(true);
    const res = await queryKnowledge<string, string>({
      retrieve: async () => "facts",
      enrich: async (f) => `${f}+synth`,
    });
    expect(res.facts).toBe("facts");
    expect(res.enrichment).toBe("facts+synth");
    expect(res.llmStep).toBe("APPLIED");
    expect(res.source).toBe("DB+LLM");
  });

  it("enrich qui lève → l'erreur LLM est ABSORBÉE, facts toujours servis", async () => {
    _resetProvidersForTest({ anthropic: { available: true } });
    const res = await queryKnowledge<string, string>({
      retrieve: async () => "safe",
      enrich: async () => {
        throw new Error("LLM 503");
      },
    });
    expect(res.facts).toBe("safe");
    expect(res.enrichment).toBeNull();
    expect(res.llmStep).toBe("FAILED");
    expect(res.source).toBe("DB");
  });
});

describe("seshat/reference-context — formatReferenceDossiers (pur)", () => {
  it("liste vide → chaîne vide", () => {
    expect(formatReferenceDossiers([])).toBe("");
  });

  it("formate marque/campagne/secteur + extrait voix/axes/key-phrases/codes du dna", () => {
    const out = formatReferenceDossiers([
      {
        brand: "Burger King",
        campaign: "Wrap Croustillant",
        sector: "QSR",
        market: "FR",
        dna: {
          voice: "irrévérent",
          axes: ["provocation", "humour"],
          keyPhrases: ["croustillant", "audacieux"],
          visualCodes: ["flammes", "gros plan"],
        },
        editorial: "ton décalé",
      },
    ]);
    expect(out).toContain("Burger King");
    expect(out).toContain("Wrap Croustillant");
    expect(out).toContain("QSR");
    expect(out).toContain("irrévérent");
    expect(out).toContain("provocation");
    expect(out).toContain("croustillant");
    expect(out).toContain("flammes");
    expect(out).toContain("RÉFÉRENCES DE CAMPAGNES RÉELLES");
  });

  it("ignore les champs dna non-string / absents sans planter", () => {
    const out = formatReferenceDossiers([
      { brand: "X", campaign: null, sector: null, market: null, dna: { axes: [1, 2, "ok"] }, editorial: 123 },
    ]);
    expect(out).toContain("X");
    expect(out).toContain("ok");
    expect(out).not.toContain("Voix :"); // pas de voice → pas de ligne
  });
});
