import { expect, it, vi } from "vitest";
import { ensureNodePlatform } from "@/server/services/brand-node/ensure-platform";
vi.mock("@/server/services/brand-node/inheritance", () => ({
  invalidateNodeAndDescendants: vi.fn(),
}));
const stamp = "2026-11-06T00:00:00.000Z",
  input = { nodeId: "peak", operatorId: "team", expectedUpdatedAt: stamp };
function dbFixture() {
  const node = {
    id: "peak",
    name: "Peak",
    countryCode: "NG",
    operatorId: "team",
    clientId: "wamco",
    archivedAt: null,
    strategyId: null as string | null,
    updatedAt: new Date(stamp),
  };
  const saved: any[] = [];
  let cas = true;
  const seed = vi.fn(async (_tx, input) => ({
    id: "new",
    name: input.name,
    countryCode: input.country,
    operatorId: input.operatorId,
    clientId: input.clientId,
    archivedAt: null,
  }));
  const db = {
    async $transaction(fn: any) {
      const rows = [...saved],
        local = { ...node };
      const tx = {
        brandNode: {
          findFirst: vi.fn(async ({ where }) =>
            where.operatorId === node.operatorId ? local : null,
          ),
          updateMany: vi.fn(async ({ data }) => {
            if (cas) Object.assign(local, data);
            return { count: cas ? 1 : 0 };
          }),
        },
        strategy: {
          findFirst: vi.fn(async ({ where }) =>
            rows.find((r) =>
              Object.entries(where).every(([k, v]) => r[k] === v),
            ),
          ),
        },
        client: { findFirst: vi.fn(async () => ({ id: "wamco" })) },
        auditLog: { create: vi.fn() },
      };
      const result = await fn(tx);
      Object.assign(node, local);
      if (!rows.some((r) => r.id === result.id)) rows.push(result);
      saved.splice(0, saved.length, ...rows);
      return result;
    },
  };
  return {
    node,
    saved,
    seed,
    lose: () => {
      cas = false;
    },
    run: (args = input) =>
      ensureNodePlatform(db as any, args, { id: "u" }, seed as any),
  };
}
it("recovers the same dossier across reloads, even with a stale UI timestamp after commit", async () => {
  const f = dbFixture();
  const first = await f.run();
  const again = await f.run();
  expect(first.id).toBe(again.id);
  expect(f.seed).toHaveBeenCalledOnce();
  expect(f.saved).toHaveLength(1);
});
it("a lost race rolls the entire transaction back instead of retaining an orphan", async () => {
  const f = dbFixture();
  f.lose();
  await expect(f.run()).rejects.toThrow("autre rattachement");
  expect(f.saved).toEqual([]);
  expect(f.node.strategyId).toBeNull();
});
it("never returns a platform from a different operator or creates one from stale local scope", async () => {
  const f = dbFixture();
  await expect(f.run({ ...input, operatorId: "other" })).rejects.toThrow();
  await expect(
    f.run({ ...input, expectedUpdatedAt: "2026-01-01T00:00:00.000Z" }),
  ).rejects.toThrow();
  expect(f.seed).not.toHaveBeenCalled();
});
