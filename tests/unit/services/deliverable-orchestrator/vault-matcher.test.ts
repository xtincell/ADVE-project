import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    brandAsset: {
      findMany: findManyMock,
    },
  },
}));

import {
  matchVault,
  extractToGenerate,
  extractToReuse,
} from "@/server/services/deliverable-orchestrator/vault-matcher";

describe("deliverable-orchestrator/vault-matcher", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  describe("matchVault", () => {
    it("returns empty array when requiredKinds is empty (no DB call)", async () => {
      const result = await matchVault("strategy_xxx", []);
      expect(result).toEqual([]);
      expect(findManyMock).not.toHaveBeenCalled();
    });

    it("filters strictly by strategyId + state=ACTIVE + kind IN list", async () => {
      findManyMock.mockResolvedValueOnce([]);

      await matchVault("strategy_42", ["BIG_IDEA", "CHROMATIC_STRATEGY"]);

      expect(findManyMock).toHaveBeenCalledTimes(1);
      const where = findManyMock.mock.calls[0]![0].where;
      expect(where.strategyId).toBe("strategy_42");
      expect(where.state).toBe("ACTIVE");
      expect(where.kind).toEqual({ in: ["BIG_IDEA", "CHROMATIC_STRATEGY"] });
    });

    it("returns ACTIVE_REUSE for a kind with non-stale ACTIVE asset", async () => {
      const future = new Date(Date.now() + 1_000_000);
      findManyMock.mockResolvedValueOnce([
        { id: "asset_1", kind: "BIG_IDEA", state: "ACTIVE", staleAt: future },
      ]);

      const result = await matchVault("strategy_xxx", ["BIG_IDEA"]);
      expect(result).toEqual([
        {
          kind: "BIG_IDEA",
          status: "ACTIVE_REUSE",
          assetId: "asset_1",
          assetState: "ACTIVE",
          staleAt: future,
        },
      ]);
    });

    it("returns ACTIVE_REUSE when staleAt is null (no expiration)", async () => {
      findManyMock.mockResolvedValueOnce([
        { id: "asset_2", kind: "BIG_IDEA", state: "ACTIVE", staleAt: null },
      ]);

      const result = await matchVault("strategy_xxx", ["BIG_IDEA"]);
      expect(result[0]!.status).toBe("ACTIVE_REUSE");
    });

    it("returns STALE_REFRESH when ACTIVE asset has staleAt in the past", async () => {
      const past = new Date(Date.now() - 1_000_000);
      findManyMock.mockResolvedValueOnce([
        { id: "asset_3", kind: "BIG_IDEA", state: "ACTIVE", staleAt: past },
      ]);

      const result = await matchVault("strategy_xxx", ["BIG_IDEA"]);
      expect(result[0]!.status).toBe("STALE_REFRESH");
      expect(result[0]!.assetId).toBe("asset_3");
    });

    it("returns MISSING_GENERATE for kinds with no ACTIVE asset", async () => {
      findManyMock.mockResolvedValueOnce([]);

      const result = await matchVault("strategy_xxx", ["BIG_IDEA", "CHROMATIC_STRATEGY"]);

      expect(result).toEqual([
        { kind: "BIG_IDEA", status: "MISSING_GENERATE", assetId: null, assetState: null, staleAt: null },
        { kind: "CHROMATIC_STRATEGY", status: "MISSING_GENERATE", assetId: null, assetState: null, staleAt: null },
      ]);
    });

    it("preserves the order of requiredKinds in the output", async () => {
      findManyMock.mockResolvedValueOnce([]);

      const result = await matchVault("strategy_xxx", ["CHROMATIC_STRATEGY", "BIG_IDEA", "TONE_CHARTER"]);
      expect(result.map((r) => r.kind)).toEqual(["CHROMATIC_STRATEGY", "BIG_IDEA", "TONE_CHARTER"]);
    });

    it("picks the most recent ACTIVE asset when multiple exist for same kind", async () => {
      // findMany retourne ordered desc by updatedAt — donc le 1er est le plus récent.
      findManyMock.mockResolvedValueOnce([
        { id: "asset_recent", kind: "BIG_IDEA", state: "ACTIVE", staleAt: null },
        { id: "asset_older", kind: "BIG_IDEA", state: "ACTIVE", staleAt: null },
      ]);

      const result = await matchVault("strategy_xxx", ["BIG_IDEA"]);
      expect(result[0]!.assetId).toBe("asset_recent");
    });
  });

  describe("extractToGenerate", () => {
    it("returns kinds with status MISSING_GENERATE or STALE_REFRESH", () => {
      const matches = [
        { kind: "BIG_IDEA", status: "ACTIVE_REUSE", assetId: "a", assetState: "ACTIVE", staleAt: null },
        { kind: "TONE_CHARTER", status: "STALE_REFRESH", assetId: "b", assetState: "ACTIVE", staleAt: new Date(0) },
        { kind: "CHROMATIC_STRATEGY", status: "MISSING_GENERATE", assetId: null, assetState: null, staleAt: null },
      ] as const;

      const toGen = extractToGenerate(matches);
      expect(toGen).toEqual(["TONE_CHARTER", "CHROMATIC_STRATEGY"]);
    });
  });

  describe("extractToReuse", () => {
    it("returns only ACTIVE_REUSE entries with assetId", () => {
      const matches = [
        { kind: "BIG_IDEA", status: "ACTIVE_REUSE", assetId: "a1", assetState: "ACTIVE", staleAt: null },
        { kind: "TONE_CHARTER", status: "STALE_REFRESH", assetId: "b1", assetState: "ACTIVE", staleAt: new Date(0) },
        { kind: "CHROMATIC_STRATEGY", status: "MISSING_GENERATE", assetId: null, assetState: null, staleAt: null },
      ] as const;

      const reuse = extractToReuse(matches);
      expect(reuse).toEqual([{ kind: "BIG_IDEA", assetId: "a1" }]);
    });
  });
});
