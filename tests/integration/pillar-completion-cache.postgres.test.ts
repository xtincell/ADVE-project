/** Canonical cache writes and concurrent reconciliation on isolated PostgreSQL. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
vi.mock("@/server/services/advertis-scorer", () => ({ scoreObject: vi.fn(async () => null) }));

import { db } from "@/lib/db";
import { reconcileCompletionLevelCache, writePillar } from "@/server/services/pillar-gateway";
import { evaluatePillarReadiness } from "@/server/governance/pillar-readiness";
import { advanceConsoleIntake, completeConsoleIntake } from "@/server/services/notoria/intake";
import { transitionPillarStatus } from "@/server/services/pillar-gateway/validation-status";

const brands: string[] = [];
let userId: string;
beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(target.hostname);
  expect(target.pathname).toBe("/shinkiro_verify");
  userId = (await db.user.create({ data: { email: `cache-${randomUUID()}@example.invalid`, role: "ADMIN" } })).id;
});
afterAll(async () => {
  await db.recommendation.deleteMany({ where: { strategyId: { in: brands } } });
  await db.recommendationBatch.deleteMany({ where: { strategyId: { in: brands } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
async function fixture() {
  const strategy = await db.strategy.create({ data: { name: "Synthetic cache receipt", userId } });
  brands.push(strategy.id);
  const pillar = await db.pillar.create({ data: {
    strategyId: strategy.id, key: "v", validationStatus: "AI_PROPOSED",
    content: { promesseDeValeur: "Synthetic initial value" }, completionLevel: "COMPLET",
  } });
  return { strategy, pillar };
}
function request(strategyId: string) {
  return {
    strategyId, pillarKey: "v" as const,
    operation: { type: "SET_FIELDS" as const, fields: [{ path: "promesseDeValeur", value: "Synthetic revised value" }] },
    author: { system: "MESTOR" as const, reason: "Local synthetic cache receipt" },
    options: { expectedVersion: 1, skipValidation: true },
  };
}
async function waitForBlockedBy(pid: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const rows = await db.$queryRaw<Array<{ pid: number }>>`
      SELECT pid FROM pg_stat_activity
      WHERE datname = current_database() AND ${pid} = ANY(pg_blocking_pids(pid))
    `;
    if (rows.length) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("Reconciliation never reached the controlled concurrent write");
}

describe("canonical pillar completion cache", () => {
  it("updates the cache through a plain gateway write without approving the proposal", async () => {
    const f = await fixture();
    const result = await writePillar(request(f.strategy.id));
    expect(result.success, result.error).toBe(true);
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(row.completionLevel).toBe("INCOMPLET");
    expect(evaluatePillarReadiness(row, "V").cacheConsistent).toBe(true);
    expect(row.validationStatus).toBe("AI_PROPOSED");
    expect(row.currentVersion).toBe(2);
    expect(row.content).toMatchObject({ promesseDeValeur: "Synthetic revised value" });
  });

  it("persists content and cache together, including transaction rollback", async () => {
    const f = await fixture();
    await expect(db.$transaction(async tx => {
      const result = await writePillar(request(f.strategy.id), tx);
      expect(result.success, result.error).toBe(true);
      const row = await tx.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
      expect(row.completionLevel).toBe("INCOMPLET");
      expect(row.currentVersion).toBe(2);
      throw new Error("fixture rollback");
    })).rejects.toThrow("fixture rollback");
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(row.content).toEqual(f.pillar.content);
    expect(row.currentVersion).toBe(1);
    expect(row.completionLevel).toBe("COMPLET");
    expect(await db.pillarVersion.count({ where: { pillarId: row.id } })).toBe(0);
  });

  it("reconciles the committed state after a competing write, never its obsolete read", async () => {
    const f = await fixture();
    let pending: Promise<void> | undefined;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Pillar" WHERE id = ${f.pillar.id} FOR UPDATE`;
      const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      pending = reconcileCompletionLevelCache(f.strategy.id, "V");
      await waitForBlockedBy(backend!.pid);
      await tx.pillar.update({ where: { id: f.pillar.id }, data: {
        validationStatus: "LOCKED", currentVersion: { increment: 1 },
        content: { promesseDeValeur: "Concurrent synthetic decision" },
      } });
    });
    await pending;
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(row.completionLevel).toBe("FULL");
    expect(row.validationStatus).toBe("LOCKED");
    expect(row.currentVersion).toBe(2);
    expect(row.content).toEqual({ promesseDeValeur: "Concurrent synthetic decision" });
    expect(await db.pillarVersion.count({ where: { pillarId: row.id } })).toBe(0);
  });

  it("repairs only the cache and is idempotent without creating authored versions", async () => {
    const f = await fixture();
    await reconcileCompletionLevelCache(f.strategy.id, "v");
    const first = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    await reconcileCompletionLevelCache(f.strategy.id, "V");
    const second = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(second.completionLevel).toBe("INCOMPLET");
    expect(second.content).toEqual(f.pillar.content);
    expect(second.validationStatus).toBe(f.pillar.validationStatus);
    expect(second.currentVersion).toBe(1);
    expect(second.updatedAt).toEqual(first.updatedAt);
    expect(await db.pillarVersion.count({ where: { pillarId: second.id } })).toBe(0);
  });

  it("lock and unlock decisions update only their canonical cache, not content or version", async () => {
    const f = await fixture();
    await db.pillar.update({ where: { id: f.pillar.id }, data: {
      validationStatus: "VALIDATED", completionLevel: "INCOMPLET", confidence: 0.9,
    } });
    for (const [targetStatus, expectedCache] of [["LOCKED", "FULL"], ["DRAFT", "INCOMPLET"]] as const) {
      await transitionPillarStatus({ strategyId: f.strategy.id, key: "v", userId, targetStatus, expectedVersion: 1 });
      const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
      expect(row.validationStatus).toBe(targetStatus);
      expect(row.completionLevel).toBe(expectedCache);
      expect(row.content).toEqual(f.pillar.content);
      expect(row.currentVersion).toBe(1);
      expect(row.confidence).toBe(0.9);
    }
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillar.id } })).toBe(0);
  });

  it("finishing a partial console intake cannot promote it to complete or erase a lock", async () => {
    const f = await fixture();
    for (const key of ["a", "d", "e"]) await db.pillar.create({ data: {
      strategyId: f.strategy.id, key, content: { fixtureOnly: "Not a canonical field" },
      validationStatus: key === "e" ? "LOCKED" : "DRAFT", completionLevel: key === "e" ? "FULL" : "COMPLET",
    } });
    const before = await db.pillar.findMany({ where: { strategyId: f.strategy.id } });
    await completeConsoleIntake(f.strategy.id);
    const after = await db.pillar.findMany({ where: { strategyId: f.strategy.id } });
    for (const row of after) {
      const original = before.find(item => item.id === row.id)!;
      expect(row.completionLevel).toBe(row.key === "e" ? "FULL" : "INCOMPLET");
      expect(row.content).toEqual(original.content);
      expect(row.validationStatus).toBe(original.validationStatus);
      expect(row.currentVersion).toBe(original.currentVersion);
    }
  });

  it("advancing the wizard keeps the gateway's canonical result for a partial pillar", async () => {
    const f = await fixture();
    await advanceConsoleIntake(f.strategy.id, "v", { promesseDeValeur: "Synthetic partial wizard value" });
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillar.id } });
    expect(row.completionLevel).toBe("INCOMPLET");
    expect(evaluatePillarReadiness(row, "V").cacheConsistent).toBe(true);
    expect(row.currentVersion).toBe(2);
  });
});
