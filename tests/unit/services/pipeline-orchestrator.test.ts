import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db avant l'import du module
vi.mock("@/lib/db", () => {
  const mockDb = {
    strategy: {
      findUniqueOrThrow: vi.fn(),
    },
    process: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    scoreSnapshot: {
      create: vi.fn(),
    },
    signal: {
      create: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "@/lib/db";
import {
  executeFirstValueProtocol,
  handlePostScoring,
  executePendingProcesses,
} from "@/server/services/pipeline-orchestrator";

const mockDb = db as unknown as {
  strategy: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
  process: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  scoreSnapshot: { create: ReturnType<typeof vi.fn> };
  signal: { create: ReturnType<typeof vi.fn> };
};

describe("Pipeline Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeFirstValueProtocol", () => {
    it("cree 8 enregistrements process (J+0 a J+30)", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        drivers: [],
      });
      mockDb.process.create.mockResolvedValue({});

      await executeFirstValueProtocol("strat-1");

      expect(mockDb.process.create).toHaveBeenCalledTimes(8);
    });

    it("le premier process est J+0 avec status COMPLETED", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        drivers: [],
      });
      mockDb.process.create.mockResolvedValue({});

      await executeFirstValueProtocol("strat-1");

      const firstCall = mockDb.process.create.mock.calls[0]![0];
      expect(firstCall.data.name).toBe("first-value-j0-diagnostic");
      expect(firstCall.data.status).toBe("COMPLETED");
    });

    it("les process suivants ont le status RUNNING", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        drivers: [],
      });
      mockDb.process.create.mockResolvedValue({});

      await executeFirstValueProtocol("strat-1");

      for (let i = 1; i < 8; i++) {
        const call = mockDb.process.create.mock.calls[i]![0];
        expect(call.data.status).toBe("RUNNING");
      }
    });

    it("chaque process reference le strategyId correct", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-42",
        drivers: [],
      });
      mockDb.process.create.mockResolvedValue({});

      await executeFirstValueProtocol("strat-42");

      for (let i = 0; i < 8; i++) {
        const call = mockDb.process.create.mock.calls[i]![0];
        expect(call.data.strategyId).toBe("strat-42");
      }
    });
  });

  describe("handlePostScoring", () => {
    it("cree toujours un ScoreSnapshot", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: { a: 15, d: 18 },
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});

      await handlePostScoring("strat-1", 100, 98);

      expect(mockDb.scoreSnapshot.create).toHaveBeenCalledTimes(1);
      const call = mockDb.scoreSnapshot.create.mock.calls[0]![0];
      expect(call.data.strategyId).toBe("strat-1");
      expect(call.data.trigger).toBe("pipeline_orchestrator");
    });

    it("cree un Signal quand le delta depasse 5 points (amelioration)", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: { a: 20 },
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});
      mockDb.signal.create.mockResolvedValue({});

      await handlePostScoring("strat-1", 110, 100);

      expect(mockDb.signal.create).toHaveBeenCalledTimes(1);
      const call = mockDb.signal.create.mock.calls[0]![0];
      expect(call.data.type).toBe("SCORE_IMPROVEMENT");
      expect(call.data.data.delta).toBe(10);
    });

    it("cree un Signal de type SCORE_DECLINE quand le delta est negatif et > 5", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: { a: 10 },
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});
      mockDb.signal.create.mockResolvedValue({});

      await handlePostScoring("strat-1", 80, 90);

      expect(mockDb.signal.create).toHaveBeenCalledTimes(1);
      const call = mockDb.signal.create.mock.calls[0]![0];
      expect(call.data.type).toBe("SCORE_DECLINE");
    });

    it("ne cree pas de Signal quand le delta est inferieur ou egal a 5", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: { a: 15 },
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});

      await handlePostScoring("strat-1", 100, 97);

      expect(mockDb.signal.create).not.toHaveBeenCalled();
    });

    it("le ScoreSnapshot contient la classification correcte", async () => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: {},
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});

      // score 75 => ZOMBIE
      await handlePostScoring("strat-1", 75, 74);

      const call = mockDb.scoreSnapshot.create.mock.calls[0]![0];
      expect(call.data.classification).toBe("ZOMBIE");
    });
  });

  describe("executePendingProcesses", () => {
    it("retourne 0 quand aucun process n'est en attente", async () => {
      mockDb.process.findMany.mockResolvedValue([]);

      const result = await executePendingProcesses();

      expect(result.executed).toBe(0);
    });

    it("execute et marque les process en attente comme COMPLETED", async () => {
      mockDb.process.findMany.mockResolvedValue([
        { id: "p1", runCount: 0, playbook: null, strategyId: null },
        { id: "p2", runCount: 1, playbook: null, strategyId: null },
      ]);
      mockDb.process.update.mockResolvedValue({});

      const result = await executePendingProcesses();

      expect(result.executed).toBe(2);
      expect(mockDb.process.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("classification indirecte (via handlePostScoring)", () => {
    beforeEach(() => {
      mockDb.strategy.findUniqueOrThrow.mockResolvedValue({
        id: "strat-1",
        advertis_vector: {},
      });
      mockDb.scoreSnapshot.create.mockResolvedValue({});
    });

    const cases: Array<[number, string]> = [
      [0, "ZOMBIE"],
      [80, "ZOMBIE"],
      [81, "ORDINAIRE"],
      [120, "ORDINAIRE"],
      [121, "FORTE"],
      [160, "FORTE"],
      [161, "CULTE"],
      [180, "CULTE"],
      [181, "ICONE"],
      [200, "ICONE"],
    ];

    for (const [score, expected] of cases) {
      it(`score ${score} => classification ${expected}`, async () => {
        await handlePostScoring("strat-1", score, score);

        const call = mockDb.scoreSnapshot.create.mock.calls[0]![0];
        expect(call.data.classification).toBe(expected);
      });
    }
  });
});
