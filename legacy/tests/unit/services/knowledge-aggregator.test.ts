import { describe, it, expect } from "vitest";
import {
  generateSourceHash,
  anonymizeEntry,
} from "@/server/services/knowledge-aggregator/anonymizer";

describe("Knowledge Aggregator — Anonymizer", () => {
  describe("generateSourceHash", () => {
    it("retourne une chaine hexadecimale de 16 caracteres", () => {
      const hash = generateSourceHash("strategy-123");
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
      expect(hash).toHaveLength(16);
    });

    it("des strategyIds differents produisent des hashes differents", () => {
      const hash1 = generateSourceHash("strategy-aaa");
      const hash2 = generateSourceHash("strategy-bbb");
      expect(hash1).not.toBe(hash2);
    });

    it("le meme strategyId produit toujours le meme hash (deterministe)", () => {
      const hash1 = generateSourceHash("strategy-xyz", "salt-fixe");
      const hash2 = generateSourceHash("strategy-xyz", "salt-fixe");
      expect(hash1).toBe(hash2);
    });

    it("un salt different produit un hash different", () => {
      const hash1 = generateSourceHash("strategy-123", "salt-a");
      const hash2 = generateSourceHash("strategy-123", "salt-b");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("anonymizeEntry", () => {
    const sensitiveData: Record<string, unknown> = {
      strategyId: "strat-001",
      userId: "user-001",
      clientName: "Acme Corp",
      brandName: "SuperBrand",
      companyName: "Acme Inc",
      contactName: "Jean Dupont",
      contactEmail: "jean@acme.com",
      contactPhone: "+33612345678",
      operatorId: "op-001",
      sector: "tech",
      score: 85,
      insights: ["insight-a", "insight-b"],
    };

    it("supprime tous les champs sensibles", () => {
      const result = anonymizeEntry(sensitiveData, "strat-001");
      expect(result).not.toHaveProperty("strategyId");
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("clientName");
      expect(result).not.toHaveProperty("brandName");
      expect(result).not.toHaveProperty("companyName");
      expect(result).not.toHaveProperty("contactName");
      expect(result).not.toHaveProperty("contactEmail");
      expect(result).not.toHaveProperty("contactPhone");
      expect(result).not.toHaveProperty("operatorId");
    });

    it("ajoute sourceHash au resultat", () => {
      const result = anonymizeEntry(sensitiveData, "strat-001");
      expect(result).toHaveProperty("sourceHash");
      expect(typeof result.sourceHash).toBe("string");
      expect((result.sourceHash as string)).toHaveLength(16);
    });

    it("preserve les donnees non sensibles", () => {
      const result = anonymizeEntry(sensitiveData, "strat-001");
      expect(result.sector).toBe("tech");
      expect(result.score).toBe(85);
      expect(result.insights).toEqual(["insight-a", "insight-b"]);
    });

    it("ne modifie pas l'objet original", () => {
      const original = { ...sensitiveData };
      anonymizeEntry(sensitiveData, "strat-001");
      expect(sensitiveData.strategyId).toBe(original.strategyId);
    });

    it("gere l'objet strategy imbrique en supprimant les champs identifiants", () => {
      const dataWithStrategy: Record<string, unknown> = {
        score: 90,
        strategy: {
          name: "Strategie Secrete",
          description: "Description confidentielle",
          userId: "user-hidden",
          sector: "retail",
          maturity: "growth",
        },
      };

      const result = anonymizeEntry(dataWithStrategy, "strat-002");
      const strat = result.strategy as Record<string, unknown>;
      expect(strat).not.toHaveProperty("name");
      expect(strat).not.toHaveProperty("description");
      expect(strat).not.toHaveProperty("userId");
      expect(strat.sector).toBe("retail");
      expect(strat.maturity).toBe("growth");
    });

    it("gere une entree sans champs sensibles sans erreur", () => {
      const cleanData = { score: 75, sector: "food" };
      const result = anonymizeEntry(cleanData, "strat-003");
      expect(result.score).toBe(75);
      expect(result.sector).toBe("food");
      expect(result).toHaveProperty("sourceHash");
    });
  });
});
