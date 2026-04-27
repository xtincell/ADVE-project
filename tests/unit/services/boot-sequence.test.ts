import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
vi.mock("@/lib/db", () => {
  const mockDb = {
    pillar: {
      upsert: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    strategy: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ businessContext: {} }),
    },
  };
  return { db: mockDb };
});

vi.mock("@/server/services/advertis-scorer", () => ({
  scoreObject: vi.fn(),
}));

vi.mock("@/lib/types/advertis-vector", () => ({
  classifyBrand: vi.fn(),
}));

// Mock llm-gateway (used by generateQuestions inside start/advance)
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: vi.fn().mockResolvedValue({ text: "[]" }),
}));

// Mock pillar-gateway (used by advance via dynamic import)
vi.mock("@/server/services/pillar-gateway", () => ({
  writePillar: vi.fn().mockResolvedValue({}),
}));

// Mock pillar-normalizer (used by complete via dynamic import)
vi.mock("@/server/services/pillar-normalizer", () => ({
  normalizePillarForIntake: vi.fn((key: string, content: Record<string, unknown>) => content),
}));

// Mock variable-bible (used by generateQuestions)
vi.mock("@/lib/types/variable-bible", () => ({
  getFormatInstructions: vi.fn().mockReturnValue(""),
}));

// Mock pillar-schemas (used by generateQuestions)
vi.mock("@/lib/types/pillar-schemas", () => ({
  PILLAR_SCHEMAS: {
    A: { field1: {} },
    D: { field1: {} },
    V: { field1: {} },
    E: { field1: {} },
    R: { field1: {} },
    T: { field1: {} },
    I: { field1: {} },
    S: { field1: {} },
  },
}));

// Mock notoria (used by complete via dynamic import, non-blocking)
vi.mock("@/server/services/notoria", () => ({
  generateBatch: vi.fn().mockResolvedValue({}),
}));

import { db } from "@/lib/db";
import { scoreObject } from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { start, advance, complete } from "@/server/services/boot-sequence";

const mockDb = db as unknown as {
  pillar: {
    upsert: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  strategy: {
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};
const mockScoreObject = scoreObject as ReturnType<typeof vi.fn>;
const mockClassifyBrand = classifyBrand as ReturnType<typeof vi.fn>;

describe("Boot Sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for strategy.findUnique (used by persistBootState)
    mockDb.strategy.findUnique.mockResolvedValue({ businessContext: {} });
    mockDb.strategy.update.mockResolvedValue({});
  });

  describe("start", () => {
    it("retourne un BootState initial avec step 0", async () => {
      const state = await start("strat-1");

      expect(state.strategyId).toBe("strat-1");
      expect(state.currentStep).toBe(0);
      expect(state.completed).toBe(false);
    });

    it("le premier pilier est 'a' (Authenticite)", async () => {
      const state = await start("strat-1");

      expect(state.currentPillar).toBe("a");
    });

    it("contient 8 etapes au total", async () => {
      const state = await start("strat-1");

      expect(state.totalSteps).toBe(8);
    });

    it("les reponses sont un objet vide au demarrage", async () => {
      const state = await start("strat-1");

      expect(state.responses).toEqual({});
    });
  });

  describe("advance", () => {
    it("incremente le step de 1", async () => {
      const state = await advance("strat-1", 0, { q1: "reponse" });

      expect(state.currentStep).toBe(1);
    });

    it("sauvegarde le pilier via writePillar (pillar-gateway)", async () => {
      const { writePillar } = await import("@/server/services/pillar-gateway");
      const mockWritePillar = writePillar as ReturnType<typeof vi.fn>;

      await advance("strat-1", 0, { q1: "valeur" });

      expect(mockWritePillar).toHaveBeenCalledTimes(1);
      const call = mockWritePillar.mock.calls[0]![0];
      expect(call.strategyId).toBe("strat-1");
      expect(call.pillarKey).toBe("a"); // step 0 = pillar "a"
    });

    it("le pilier suivant est 'd' apres le step 0", async () => {
      const state = await advance("strat-1", 0, {});

      expect(state.currentPillar).toBe("d");
    });

    it("marque completed = true au dernier step", async () => {
      const state = await advance("strat-1", 7, { q1: "derniere reponse" });

      expect(state.completed).toBe(true);
      expect(state.currentStep).toBe(8);
    });

    it("currentPillar est null quand completed", async () => {
      const state = await advance("strat-1", 7, {});

      expect(state.currentPillar).toBeNull();
    });

    it("le step 2 sauvegarde le pilier 'v'", async () => {
      const { writePillar } = await import("@/server/services/pillar-gateway");
      const mockWritePillar = writePillar as ReturnType<typeof vi.fn>;

      await advance("strat-1", 2, { pricing: "premium" });

      const call = mockWritePillar.mock.calls[0]![0];
      expect(call.pillarKey).toBe("v");
    });
  });

  describe("complete", () => {
    it("appelle scoreObject avec le type et strategyId", async () => {
      mockScoreObject.mockResolvedValue({ composite: 150 });
      mockClassifyBrand.mockReturnValue("FORTE");

      await complete("strat-1");

      expect(mockScoreObject).toHaveBeenCalledWith("strategy", "strat-1");
    });

    it("appelle classifyBrand avec le score composite", async () => {
      mockScoreObject.mockResolvedValue({ composite: 185 });
      mockClassifyBrand.mockReturnValue("ICONE");

      await complete("strat-1");

      expect(mockClassifyBrand).toHaveBeenCalledWith(185);
    });

    it("passe la strategie en status ACTIVE", async () => {
      mockScoreObject.mockResolvedValue({ composite: 100 });
      mockClassifyBrand.mockReturnValue("ORDINAIRE");

      await complete("strat-1");

      expect(mockDb.strategy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "strat-1" },
          data: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });

    it("retourne le vector et la classification", async () => {
      const mockVector = { composite: 170, a: 20, d: 22 };
      mockScoreObject.mockResolvedValue(mockVector);
      mockClassifyBrand.mockReturnValue("CULTE");

      const result = await complete("strat-1");

      expect(result.vector).toEqual(mockVector);
      expect(result.classification).toBe("CULTE");
    });
  });
});
