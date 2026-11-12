/** Real source changes must reach the last deliverable without generating it. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { markPillarsStale } from "@/server/services/pillar-gateway/review-invalidation";
import { acquireGenerationLock, getSection, recordGenerationSuccess } from "@/server/services/oracle-section";
let owner: string, neighbor: string, user: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  user = (await db.user.create({ data: { email: `freshness-${randomUUID()}@example.test` } })).id;
  for (const name of ["Owner", "Neighbor"]) {
    const s = await db.strategy.create({ data: { name: `Synthetic ${name}`, userId: user } });
    if (name === "Owner") owner = s.id; else neighbor = s.id;
    await db.pillar.create({ data: { strategyId: s.id, key: "a", content: { missionStatement: "Original decision" } } });
  }
});
afterAll(async () => {
  if (owner && neighbor) await db.pillar.deleteMany({ where: { strategyId: { in: [owner, neighbor] } } });
  if (owner && neighbor) await db.strategy.deleteMany({ where: { id: { in: [owner, neighbor] }, userId: user } });
  if (user) await db.user.delete({ where: { id: user } });
  await db.$disconnect();
});
async function section(strategyId: string, sectionId: number, status: "COMPLETE" | "PENDING" | "FAILED" = "COMPLETE") {
  return db.oracleSection.create({ data: { strategyId, sectionId, tier: "CORE", status,
    payload: { original: true }, version: 3, generationCount: 2 } });
}
describe.sequential("Oracle freshness follows the source transaction", () => {
  it("invalidates completed sections of the changed brand, preserves payload/history and isolates neighbors", async () => {
    await Promise.all([section(owner, 1), section(owner, 2, "PENDING"), section(owner, 3, "FAILED"), section(neighbor, 1)]);
    await db.$transaction(tx => markPillarsStale(tx, owner, ["A"]));
    expect(await getSection(owner, 1)).toMatchObject({ status: "STALE", payload: { original: true }, version: 3, generationCount: 2 });
    expect((await getSection(owner, 1))?.staleAt).not.toBeNull();
    expect((await getSection(neighbor, 1))?.status).toBe("COMPLETE");
    expect((await getSection(owner, 2))?.status).toBe("PENDING");
    expect((await getSection(owner, 3))?.status).toBe("FAILED");
  });
  it("rolls back document freshness with its source edit", async () => {
    await section(owner, 4);
    await expect(db.$transaction(async tx => {
      await markPillarsStale(tx, owner, ["a"]);
      throw new Error("Source edit rolled back");
    })).rejects.toThrow("rolled back");
    expect((await getSection(owner, 4))?.status).toBe("COMPLETE");
  });
  it("refuses the old running result after its source changed, retaining the previous payload", async () => {
    await section(owner, 5);
    const lock = await acquireGenerationLock(owner, 5);
    expect(lock.ok).toBe(true);
    await db.$transaction(tx => markPillarsStale(tx, owner, ["a"]));
    const result = await recordGenerationSuccess(owner, 5, lock.lockToken!, { wrongSnapshot: true }, 0.9);
    expect(result).toMatchObject({ ok: false, reason: "SOURCE_CHANGED" });
    expect(await getSection(owner, 5)).toMatchObject({ status: "STALE", payload: { original: true }, version: 3, lockToken: null });
  });
  it("can resume the stale section explicitly and store a fresh result without another source edit", async () => {
    const lock = await acquireGenerationLock(owner, 5);
    expect(lock.ok).toBe(true);
    expect(await recordGenerationSuccess(owner, 5, lock.lockToken!, { currentSnapshot: true }, 0.5)).toMatchObject({ ok: true });
    expect(await getSection(owner, 5)).toMatchObject({ status: "COMPLETE", payload: { currentSnapshot: true }, version: 4, staleAt: null });
  });
});
