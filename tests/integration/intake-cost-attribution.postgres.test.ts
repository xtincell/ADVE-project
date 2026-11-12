import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { trackCost, withIntakeCostContext, bindIntakeCostStrategy } from "@/server/services/llm-gateway";
const scope = `owned-cost-${randomUUID()}`;
const markers = [scope, scope + "-a", scope + "-b", scope + "-late"];
const brands: string[] = [];
let owner = "";
const fixtureUsage = (caller: string, count: number) => trackCost({ caller }, { inputTokens: count, outputTokens: 1 },
  "owned-cost-fixture", { provider: "OWNED_TEST", costUsd: 0, estimated: false }, "openai");
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  owner = (await db.user.create({ data: { email: scope + "@shinkiro.invalid", name: "Attribution détenue" } })).id;
  for (const name of ["A", "B"]) brands.push((await db.strategy.create({ data: { userId: owner, name: scope + name } })).id);
});
afterAll(async () => {
  await db.aICostLog.deleteMany({ where: { OR: markers.map(id => ({ context: { contains: `:intake[${id}]` } })) } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  if (owner) await db.user.delete({ where: { id: owner } });
  await db.$disconnect();
});

describe.sequential("owned PostgreSQL intake cost attribution, no provider invocation", () => {
  it("keeps pre-brand usage, then binds those exact receipts to the real Strategy", async () => {
    await withIntakeCostContext(scope, async () => {
      await fixtureUsage("extract-owned", 10);
      const before = await db.aICostLog.findMany({ where: { context: { contains: `:intake[${scope}]` } } });
      expect(before).toHaveLength(1); expect(before[0]!.strategyId).toBeNull();
      await bindIntakeCostStrategy(brands[0]!);
      const after = await db.aICostLog.findUniqueOrThrow({ where: { id: before[0]!.id } });
      expect(after.strategyId).toBe(brands[0]); expect(after.inputTokens).toBe(10);
      expect(after.provider).toBe("OWNED_TEST"); expect(after.cost).toBe(0);
    });
  });

  it("cannot mix two concurrent intake receipts or rebind an already scoped operation", async () => {
    await Promise.all([0, 1].map(n => withIntakeCostContext(markers[n + 1]!, async () => {
      await fixtureUsage("concurrent-owned", 20 + n);
      await bindIntakeCostStrategy(brands[n]!);
      await fixtureUsage("after-bind-owned", 30 + n);
      await expect(bindIntakeCostStrategy(brands[1 - n]!)).rejects.toThrow("INTAKE_COST_STRATEGY_MISMATCH");
    })));
    for (let n = 0; n < 2; n++) {
      const rows = await db.aICostLog.findMany({ where: { context: { contains: `:intake[${markers[n + 1]}]` } } });
      expect(rows).toHaveLength(2); expect(rows.every(r => r.strategyId === brands[n])).toBe(true);
      expect(rows.map(r => r.inputTokens).sort()).toEqual([20 + n, 30 + n]);
    }
  });

  it("keeps the deferred child's original owner after the operation returns", async () => {
    let release!: () => void, child!: Promise<void>;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await withIntakeCostContext(markers[3]!, async () => {
      await bindIntakeCostStrategy(brands[0]!);
      child = gate.then(() => fixtureUsage("deferred-owned", 40));
    });
    await withIntakeCostContext(markers[2]!, async () => { await bindIntakeCostStrategy(brands[1]!); release(); await child; });
    const row = await db.aICostLog.findFirstOrThrow({ where: { context: { contains: `:intake[${markers[3]}]` } } });
    expect(row.strategyId).toBe(brands[0]); expect(row.inputTokens).toBe(40);
  });
});
