import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const mockDb = {
    pillar: {
      upsert: vi.fn(),
    },
    strategy: {
      update: vi.fn(),
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

import { db } from "@/lib/db";
import { scoreObject } from "@/server/services/advertis-scorer";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { start, advance, complete } from "@/server/services/boot-sequence";

const mockDb = db as unknown as {
  pillar: { upsert: ReturnType<typeof vi.fn> };
  strategy: { update: ReturnType<typeof vi.fn> };
};
const mockScoreObject = scoreObject as ReturnType<typeof vi.fn>;
const mockClassifyBrand = classifyBrand as ReturnType<typeof vi.fn>;

describe("Boot Sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockDb.pillar.upsert.mockResolvedValue({});

      const state = await advance("strat-1", 0, { q1: "reponse" });

      expect(state.currentStep).toBe(1);
    });

    it("sauvegarde le pilier via db.pillar.upsert", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      await advance("strat-1", 0, { q1: "valeur" });

      expect(mockDb.pillar.upsert).toHaveBeenCalledTimes(1);
      const call = mockDb.pillar.upsert.mock.calls[0]![0];
      expect(call.where.strategyId_key.strategyId).toBe("strat-1");
      expect(call.where.strategyId_key.key).toBe("a"); // step 0 = pillar "a"
    });

    it("le pilier suivant est 'd' apres le step 0", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      const state = await advance("strat-1", 0, {});

      expect(state.currentPillar).toBe("d");
    });

    it("marque completed = true au dernier step", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      const state = await advance("strat-1", 7, { q1: "derniere reponse" });

      expect(state.completed).toBe(true);
      expect(state.currentStep).toBe(8);
    });

    it("currentPillar est null quand completed", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      const state = await advance("strat-1", 7, {});

      expect(state.currentPillar).toBeNull();
    });

    it("le step 2 sauvegarde le pilier 'v'", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      await advance("strat-1", 2, { pricing: "premium" });

      const call = mockDb.pillar.upsert.mock.calls[0]![0];
      expect(call.where.strategyId_key.key).toBe("v");
    });

    it("la confidence est fixee a 0.7", async () => {
      mockDb.pillar.upsert.mockResolvedValue({});

      await advance("strat-1", 0, { q1: "test" });

      const call = mockDb.pillar.upsert.mock.calls[0]![0];
      expect(call.update.confidence).toBe(0.7);
      expect(call.create.confidence).toBe(0.7);
    });
  });

  describe("complete", () => {
    it("appelle scoreObject avec le type et strategyId", async () => {
      mockScoreObject.mockResolvedValue({ composite: 150 });
      mockClassifyBrand.mockReturnValue("FORTE");
      mockDb.strategy.update.mockResolvedValue({});

      await complete("strat-1");

      expect(mockScoreObject).toHaveBeenCalledWith("strategy", "strat-1");
    });

    it("appelle classifyBrand avec le score composite", async () => {
      mockScoreObject.mockResolvedValue({ composite: 185 });
      mockClassifyBrand.mockReturnValue("ICONE");
      mockDb.strategy.update.mockResolvedValue({});

      await complete("strat-1");

      expect(mockClassifyBrand).toHaveBeenCalledWith(185);
    });

    it("passe la strategie en status ACTIVE", async () => {
      mockScoreObject.mockResolvedValue({ composite: 100 });
      mockClassifyBrand.mockReturnValue("ORDINAIRE");
      mockDb.strategy.update.mockResolvedValue({});

      await complete("strat-1");

      expect(mockDb.strategy.update).toHaveBeenCalledWith({
        where: { id: "strat-1" },
        data: { status: "ACTIVE" },
      });
    });

    it("retourne le vector et la classification", async () => {
      const mockVector = { composite: 170, a: 20, d: 22 };
      mockScoreObject.mockResolvedValue(mockVector);
      mockClassifyBrand.mockReturnValue("CULTE");
      mockDb.strategy.update.mockResolvedValue({});

      const result = await complete("strat-1");

      expect(result.vector).toEqual(mockVector);
      expect(result.classification).toBe("CULTE");
    });
  });
});
