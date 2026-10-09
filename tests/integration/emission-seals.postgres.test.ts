/** Actual PostgreSQL JSONB and serialized chronology; isolated synthetic rows only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { closeEmission, openEmission } from "@/server/governance/emission-spine";
import { computeSelfHash, verifyChain, verifyEmissionSeal } from "@/server/governance/hash-chain";
const scopes: string[] = [];
function scope() { const id = "synthetic-seal-" + randomUUID(); scopes.push(id); return id; }
beforeAll(() => {
  const connection = new URL(process.env.DATABASE_URL!);
  expect(connection.hostname).toBe("127.0.0.1"); expect(connection.pathname).toBe("/shinkiro_verify");
});
afterAll(async () => {
  await db.intentEmission.deleteMany({ where: { strategyId: { in: scopes } } });
  await db.$disconnect();
});
describe("persisted emission seals", () => {
  it("retains the seal after JSONB reorders nested objects and completion writes a result", async () => {
    const strategyId = scope();
    const id = await openEmission({ kind: "SYNTHETIC_SEAL", strategyId,
      payload: { zLast: "test", aFirst: "test", nested: { z: 1, a: 2 }, array: [{ z: 4, a: 3 }] }, caller: "test" });
    await db.intentEmission.update({ where: { id }, data: { result: { late: true }, status: "OK" } });
    const row = await db.intentEmission.findUniqueOrThrow({ where: { id } });
    expect(computeSelfHash({ ...row, result: null })).toBe(row.selfHash);
    expect(verifyChain([{ ...row, selfHash: row.selfHash! }]).ok).toBe(true);
  });
  it("serializes timestamps as well as links when the predecessor is ahead of the clock", async () => {
    const strategyId = scope();
    const id = await openEmission({ kind: "SYNTHETIC_SEAL", strategyId, payload: {}, caller: "test" });
    const row = await db.intentEmission.findUniqueOrThrow({ where: { id } });
    const emittedAt = new Date(Date.now() + 60_000);
    // Fixture clock skew; never rewrite real historical rows.
    await db.intentEmission.update({ where: { id }, data: { emittedAt,
      selfHash: computeSelfHash({ ...row, result: null, emittedAt }) } });
    const startedBefore = Date.now();
    const secondId = await openEmission({ kind: "SYNTHETIC_SEAL", strategyId, payload: {}, caller: "test" });
    const startedAfter = Date.now();
    await closeEmission({ intentId: secondId, result: { completed: true }, status: "OK" });
    const rows = await db.intentEmission.findMany({ where: { strategyId }, orderBy: { emittedAt: "asc" } });
    expect(rows[0]!.id).toBe(id);
    expect(verifyChain(rows.map(r => ({ ...r, selfHash: r.selfHash! }))).ok).toBe(true);
    expect(rows[1]!.emittedAt.getTime()).toBeGreaterThan(emittedAt.getTime());
    // Journal ordering may be logical; execution timing must stay on the actual clock.
    expect(rows[1]!.startedAt!.getTime()).toBeGreaterThanOrEqual(startedBefore);
    expect(rows[1]!.startedAt!.getTime()).toBeLessThanOrEqual(startedAfter);
    expect(rows[1]!.completedAt!.getTime() - rows[1]!.startedAt!.getTime()).toBeGreaterThanOrEqual(0);
  });
  it("keeps 24 concurrent emissions in one strictly ordered chain", async () => {
    const strategyId = scope();
    await Promise.all(Array.from({ length: 24 }, (_, i) => openEmission({ kind: "SYNTHETIC_SEAL", strategyId,
      payload: { nested: { z: i, a: "value" } }, caller: "test" })));
    const rows = await db.intentEmission.findMany({ where: { strategyId }, orderBy: { emittedAt: "asc" } });
    expect(rows).toHaveLength(24); expect(new Set(rows.map(r => r.emittedAt.getTime())).size).toBe(24);
    expect(verifyChain(rows.map(r => ({ ...r, selfHash: r.selfHash! }))).ok).toBe(true);
  });
  it("rejects an altered v2 body without interpreting late completion as alteration", async () => {
    const strategyId = scope();
    const id = await openEmission({ kind: "SYNTHETIC_SEAL", strategyId, payload: { a: 1 }, caller: "test" });
    await db.intentEmission.update({ where: { id }, data: { payload: { a: 2 } } });
    const row = await db.intentEmission.findUniqueOrThrow({ where: { id } });
    expect(verifyEmissionSeal(row)).toMatchObject({ ok: false, state: "INVALID" });
  });
  it("retains an unrecomputable legacy seal and does not claim the whole mixed chain verified", async () => {
    const strategyId = scope(), id = "synthetic-legacy-" + randomUUID();
    const original = { id, strategyId, intentKind: "SYNTHETIC_SEAL", version: 1,
      payload: { nested: { z: 1, a: 2 } }, result: null, caller: "test", emittedAt: new Date(), prevHash: null };
    const selfHash = computeSelfHash(original);
    await db.intentEmission.create({ data: { ...original, result: undefined, selfHash } });
    await openEmission({ kind: "SYNTHETIC_SEAL", strategyId, payload: {}, caller: "test" });
    const rows = await db.intentEmission.findMany({ where: { strategyId }, orderBy: { emittedAt: "asc" } });
    expect(rows[0]!.selfHash).toBe(selfHash); expect(rows[0]!.version).toBe(1);
    expect(verifyEmissionSeal(rows[0]!)).toMatchObject({ ok: false, state: "UNVERIFIABLE_LEGACY" });
    expect(verifyEmissionSeal(rows[1]!).ok).toBe(true);
    expect(verifyChain(rows.map(r => ({ ...r, selfHash: r.selfHash! })))).toMatchObject({ ok: false,
      unverifiableAt: { id, state: "UNVERIFIABLE_LEGACY" } });
  });

});
