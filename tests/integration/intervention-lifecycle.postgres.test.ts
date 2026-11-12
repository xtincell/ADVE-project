/** Real governed router + disposable PostgreSQL; no provider or client data. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { interventionRouter } from "@/server/trpc/routers/intervention";

let ownerId: string, readerId: string, foreignUserId: string;
let brandId: string, otherBrandId: string, foreignBrandId: string;
const operatorIds: string[] = [];
const signalIds: string[] = [];
function caller(userId = ownerId, client = db) {
  return interventionRouter.createCaller({ db: client, headers: undefined, session: {
    user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
  } });
}
async function request(status = "PENDING", type = "INTERVENTION_REQUEST", strategyId = brandId) {
  const row = await db.signal.create({ data: { strategyId, type, data: {
    title: `Demande de recette ${randomUUID()}`, description: "Conserver ce besoin exact.",
    status, urgency: "medium", requestType: "one_off", requestedBy: ownerId,
    requestedAt: new Date().toISOString(), retainedEvidence: { source: "fixture" },
  } } });
  signalIds.push(row.id);
  return row;
}
function command(row: { id: string; strategyId: string; updatedAt: Date }) {
  return { signalId: row.id, strategyId: row.strategyId, expectedUpdatedAt: row.updatedAt.toISOString() };
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  for (const name of ["owner", "foreign"]) {
    operatorIds.push((await db.operator.create({ data: {
      name: `Recette intervention ${name}`, slug: `intervention-${randomUUID()}`,
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(),
      licenseExpiry: new Date(Date.now() + 86_400_000),
    } })).id);
  }
  const users = await Promise.all(["owner", "reader", "foreign"].map((role) =>
    db.user.create({ data: { email: `intervention-${role}-${randomUUID()}@example.invalid`,
      operatorId: role === "owner" ? operatorIds[0] : operatorIds[1] } })));
  ownerId = users[0]!.id; readerId = users[1]!.id; foreignUserId = users[2]!.id;
  const brands = await Promise.all([ownerId, ownerId, foreignUserId].map((userId) =>
    db.strategy.create({ data: { name: `Recette intervention ${randomUUID()}`, userId } })));
  brandId = brands[0]!.id; otherBrandId = brands[1]!.id; foreignBrandId = brands[2]!.id;
  await db.strategyCollaborator.create({ data: {
    strategyId: brandId, userId: readerId, role: "SOCIAL_MANAGER", status: "ACTIVE",
  } });
});
afterAll(async () => {
  const brands = [brandId, otherBrandId, foreignBrandId].filter(Boolean);
  // Only this run's brands/signals, including legacy emissions without strategyId.
  await db.intentEmission.deleteMany({ where: { OR: [
    { strategyId: { in: brands } },
    ...signalIds.map((id) => ({ payload: { path: ["signalId"], equals: id } })),
  ] } });
  await db.mission.deleteMany({ where: { strategyId: { in: brands } } });
  await db.driver.deleteMany({ where: { strategyId: { in: brands } } });
  await db.signal.deleteMany({ where: { strategyId: { in: brands } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: [ownerId, readerId, foreignUserId].filter(Boolean) } } });
  await db.operator.deleteMany({ where: { id: { in: operatorIds } } });
  await db.$disconnect();
});

describe.sequential("intervention request lifecycle through the governed boundary", () => {
  it("rejects a blank need before persisting a request", async () => {
    const before = await db.signal.count({ where: { strategyId: brandId } });
    await expect(caller().create({ strategyId: brandId, title: "   ", description: "   " }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.signal.count({ where: { strategyId: brandId } })).toBe(before);
  });
  it("creates exactly one draft mission under simultaneous conversion", async () => {
    const row = await request();
    const before = await db.mission.count({ where: { strategyId: brandId } });
    const results = await Promise.allSettled([
      caller().convertToMission(command(row)), caller().convertToMission(command(row)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await db.mission.count({ where: { strategyId: brandId } })).toBe(before + 1);
    const after = await db.signal.findUniqueOrThrow({ where: { id: row.id } });
    const data = after.data as Record<string, unknown>;
    const mission = await db.mission.findUniqueOrThrow({ where: { id: String(data.missionId) } });
    expect(mission).toMatchObject({ status: "DRAFT", strategyId: brandId,
      description: "Conserver ce besoin exact.", assigneeId: null, slaDeadline: null });
    expect(data).toMatchObject({ status: "CONVERTED", convertedBy: ownerId,
      retainedEvidence: { source: "fixture" } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(row.updatedAt.getTime());
    expect(await db.intentEmission.count({ where: {
      strategyId: brandId, intentKind: "LEGACY_INTERVENTION_CONVERT_TO_MISSION", status: "OK",
      payload: { path: ["signalId"], equals: row.id },
    } })).toBe(1);
  });
  it("never rejects an already converted request or loses its mission receipt", async () => {
    const row = await request();
    const mission = await caller().convertToMission(command(row));
    const converted = await db.signal.findUniqueOrThrow({ where: { id: row.id } });
    await expect(caller().dismiss({ ...command(converted), reason: "Ne pas écraser." }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect((await db.signal.findUniqueOrThrow({ where: { id: row.id } })).data)
      .toMatchObject({ status: "CONVERTED", missionId: mission.id });
  });
  it("rolls the mission back when its request receipt cannot be written", async () => {
    const row = await request();
    const before = await db.mission.count({ where: { strategyId: brandId } });
    const faulty = new Proxy(db, { get(target, key) {
      if (key === "$transaction") return (write: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        target.$transaction((tx) => write(new Proxy(tx, { get(inner, field) {
          if (field === "signal") return new Proxy(inner.signal, { get(delegate, method) {
            if (method === "updateMany") return () => { throw new Error("Fixture: request receipt unavailable"); };
            return Reflect.get(delegate, method);
          } });
          return Reflect.get(inner, field);
        } })));
      return Reflect.get(target, key);
    } });
    await expect(caller(ownerId, faulty).convertToMission(command(row))).rejects.toThrow();
    expect(await db.mission.count({ where: { strategyId: brandId } })).toBe(before);
    expect((await db.signal.findUniqueOrThrow({ where: { id: row.id } })).data).toEqual(row.data);
  });
  it("has one winner between conversion and dismissal", async () => {
    const row = await request();
    const before = await db.mission.count({ where: { strategyId: brandId } });
    const results = await Promise.allSettled([
      caller().convertToMission(command(row)), caller().dismiss({ ...command(row), reason: "Hors besoin." }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const after = await db.signal.findUniqueOrThrow({ where: { id: row.id } });
    const data = after.data as Record<string, unknown>;
    expect(["CONVERTED", "DISMISSED"]).toContain(data.status);
    expect(await db.mission.count({ where: { strategyId: brandId } }))
      .toBe(before + (data.status === "CONVERTED" ? 1 : 0));
  });
  it("refuses another signal type, even with a pending-shaped payload", async () => {
    const row = await request("PENDING", "METRIC");
    await expect(caller().convertToMission(command(row))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().dismiss({ ...command(row), reason: "Pas une demande." }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await db.signal.findUniqueOrThrow({ where: { id: row.id } })).data)
      .toMatchObject({ status: "PENDING" });
  });
  it("requires the read version and leaves a newer request intact", async () => {
    const row = await request();
    const { expectedUpdatedAt: _version, ...unversioned } = command(row);
    await expect(caller().convertToMission(unversioned as ReturnType<typeof command>))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await db.signal.update({ where: { id: row.id }, data: { updatedAt: new Date(row.updatedAt.getTime() + 10) } });
    await expect(caller().dismiss({ ...command(row), reason: "Lecture périmée." }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect((await db.signal.findUniqueOrThrow({ where: { id: row.id } })).data)
      .toMatchObject({ status: "PENDING" });
  });
  it("refuses a delivery channel from another brand, without creating a mission", async () => {
    const row = await request();
    const driver = await db.driver.create({ data: { strategyId: otherBrandId, channel: "WEBSITE",
      channelType: "DIGITAL", name: "Canal autre marque", formatSpecs: {}, constraints: {},
      briefTemplate: {}, qcCriteria: {}, pillarPriority: {} } });
    const before = await db.mission.count({ where: { strategyId: brandId } });
    await expect(caller().convertToMission({ ...command(row), driverId: driver.id }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.mission.count({ where: { strategyId: brandId } })).toBe(before);
  });
  it("does not let the submitted brand conceal a foreign request", async () => {
    const row = await request("PENDING", "INTERVENTION_REQUEST", foreignBrandId);
    await expect(caller().convertToMission({ ...command(row), strategyId: brandId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("applies the existing collaborator write firewall, beyond read access", async () => {
    const row = await request();
    expect((await caller(readerId).list({ strategyId: brandId })).find((r) => r.id === row.id))
      .toMatchObject({ canProcess: false });
    await expect(caller(readerId).convertToMission(command(row)))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(readerId).dismiss({ ...command(row), reason: "Lecture seule." }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("filters the actual request states and keeps legacy unknown states unprocessed", async () => {
    const pending = await request("pending"), dismissed = await request("DISMISSED"), unknown = await request("CUSTOM");
    const filtered = await caller().list({ strategyId: brandId, status: "PENDING" });
    expect(filtered.map((r) => r.id)).toContain(pending.id);
    expect(filtered.map((r) => r.id)).not.toContain(dismissed.id);
    expect(filtered.map((r) => r.id)).not.toContain(unknown.id);
    await expect(caller().convertToMission(command(unknown))).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("records the human dismissal reason and actor without declaring delivery", async () => {
    const row = await request();
    await expect(caller().dismiss({ ...command(row), reason: "   " }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    const result = await caller().dismiss({ ...command(row), reason: "  Besoin retiré par le demandeur.  " });
    expect(result.data).toMatchObject({ status: "DISMISSED", dismissedBy: ownerId,
      dismissReason: "Besoin retiré par le demandeur.", retainedEvidence: { source: "fixture" } });
    expect(result.data).not.toHaveProperty("resolvedAt");
  });
  it("keeps the founder request path open without granting production commands", async () => {
    const founder = await db.user.create({ data: { email: `founder-${randomUUID()}@example.invalid` } });
    try {
      await db.strategy.update({ where: { id: otherBrandId }, data: { userId: founder.id } });
      const row = await caller(founder.id).create({ strategyId: otherBrandId, title: "Besoin manuel", description: "Sans agent." });
      signalIds.push(row.id);
      expect((await caller(founder.id).list({ strategyId: otherBrandId })).find((r) => r.id === row.id)).toMatchObject({ canProcess: false });
      await expect(caller(founder.id).convertToMission(command(row))).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller(founder.id).dismiss({ ...command(row), reason: "Pas opérateur." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await db.strategy.update({ where: { id: otherBrandId }, data: { userId: ownerId } });
      await db.user.delete({ where: { id: founder.id } });
    }
  });
});
