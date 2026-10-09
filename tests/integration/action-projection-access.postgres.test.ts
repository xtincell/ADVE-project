/** Actual tRPC access decisions and projection effects on a disposable database. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { actionsRouter } from "@/server/trpc/routers/actions";

const operatorIds: string[] = [], userIds: string[] = [], strategyIds: string[] = [];
let operatorA: string, operatorB: string, actorId: string, peerId: string, foreignId: string, adminId: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  vi.stubGlobal("fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_LOCAL_FIXTURE"); });
  for (const name of ["A", "B"]) {
    const row = await db.operator.create({ data: { name: `Projection access ${name}`, slug: `projection-${randomUUID()}`,
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
    operatorIds.push(row.id);
  }
  [operatorA, operatorB] = operatorIds as [string, string];
  for (const [operatorId, role] of [[operatorA, "USER"], [operatorA, "USER"], [operatorB, "USER"], [operatorA, "ADMIN"]] as const) {
    const row = await db.user.create({ data: { email: `projection-access-${randomUUID()}@example.invalid`, role, operatorId } });
    userIds.push(row.id);
  }
  [actorId, peerId, foreignId, adminId] = userIds as [string, string, string, string];
});
afterAll(async () => {
  await db.brandAction.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.strategyCollaborator.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.strategy.deleteMany({ where: { id: { in: strategyIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.operator.deleteMany({ where: { id: { in: operatorIds } } });
  vi.unstubAllGlobals(); await db.$disconnect();
});
const caller = (id = actorId, role: "USER" | "ADMIN" = "USER") => actionsRouter.createCaller({ db, headers: undefined,
  session: { user: { id, role }, expires: new Date(Date.now() + 60000).toISOString() } });
async function fixture(userId = foreignId, operatorId = operatorB) {
  const strategy = await db.strategy.create({ data: { name: "Projection access — synthetic", userId, operatorId } });
  strategyIds.push(strategy.id);
  const initiativeId = randomUUID();
  await db.pillar.create({ data: { strategyId: strategy.id, key: "i", content: { catalogueParCanal: { DIGITAL: [
    { id: initiativeId, action: "Synthetic action", format: "Text", objectif: "Access receipt", budget: 1000,
      status: "RECOMMENDED", timeframe: "SPRINT_90" },
  ] } } } });
  const action = await db.brandAction.create({ data: { strategyId: strategy.id, sourceInitiativeId: initiativeId,
    title: "Previous synthetic choice", source: "MATERIALIZED", selected: true, status: "SCHEDULED", priority: "P0" } });
  return { strategyId: strategy.id, action };
}
async function denied(f: Awaited<ReturnType<typeof fixture>>) {
  await expect(caller().sync({ strategyId: f.strategyId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toEqual(f.action);
}
describe("actions.sync — same write boundary as the existing calendar", () => {
  it("refuses another operator before changing that brand's projection", async () => { await denied(await fixture()); });
  it("preserves a brand reached only as a read collaborator", async () => {
    const f = await fixture();
    await db.strategyCollaborator.create({ data: { strategyId: f.strategyId, userId: actorId, role: "ART_DIRECTOR", status: "ACTIVE" } });
    await denied(f);
  });
  it("preserves a brand after a calendar delegation is revoked", async () => {
    const f = await fixture();
    await db.strategyCollaborator.create({ data: { strategyId: f.strategyId, userId: actorId, role: "DIGITAL_DIRECTOR", status: "REVOKED" } });
    await denied(f);
  });
  it("reports an absent target instead of claiming a successful empty rebuild", async () => {
    await expect(caller().sync({ strategyId: `absent-${randomUUID()}` })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("keeps the owner's existing rebuild and row identity", async () => {
    const f = await fixture(actorId, operatorA);
    expect(await caller().sync({ strategyId: f.strategyId })).toMatchObject({ initiatives: 1, upserted: 1, deleted: 0 });
    expect(await db.brandAction.findUniqueOrThrow({ where: { id: f.action.id } })).toMatchObject({ strategyId: f.strategyId, title: "Synthetic action" });
  });
  it("keeps a rebuild inside the caller's own operator", async () => {
    const f = await fixture(peerId, operatorA);
    expect(await caller().sync({ strategyId: f.strategyId })).toMatchObject({ upserted: 1 });
  });
  it("keeps an existing active calendar delegation scoped to its brand", async () => {
    const f = await fixture();
    await db.strategyCollaborator.create({ data: { strategyId: f.strategyId, userId: actorId, role: "MEDIA_PLANNER", status: "ACTIVE" } });
    expect(await caller().sync({ strategyId: f.strategyId })).toMatchObject({ upserted: 1 });
    await denied(await fixture());
  });
  it("keeps the existing administrator authority", async () => {
    const f = await fixture();
    expect(await caller(adminId, "ADMIN").sync({ strategyId: f.strategyId })).toMatchObject({ upserted: 1 });
  });
});
