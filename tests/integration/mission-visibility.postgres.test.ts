/** Real mission router and PostgreSQL: listing must agree with existing access rules. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { missionRouter } from "@/server/trpc/routers/mission";

const userIds: string[] = [], brandIds: string[] = [], operatorIds: string[] = [];
let adminId: string, ownerId: string, colleagueId: string, collaboratorId: string, outsiderId: string;
let localBrandId: string, foreignBrandId: string;
let localMissionId: string, foreignMissionId: string, assignedMissionId: string, guildMissionId: string;
function caller(userId: string) {
  return missionRouter.createCaller({ db, headers: undefined, session: {
    user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
  } });
}
function ownIds(rows: Array<{ id: string }>) {
  return rows.map((row) => row.id).filter((id) =>
    [localMissionId, foreignMissionId, assignedMissionId, guildMissionId].includes(id));
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const operator = await db.operator.create({ data: {
    name: "Mission visibility fixture", slug: `mission-visibility-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(),
    licenseExpiry: new Date(Date.now() + 86_400_000),
  } });
  operatorIds.push(operator.id);
  for (const role of ["admin", "owner", "colleague", "collaborator", "outsider"]) {
    const user = await db.user.create({ data: {
      email: `mission-visibility-${role}-${randomUUID()}@example.invalid`,
      role: role === "admin" ? "ADMIN" : "USER",
      operatorId: ["owner", "colleague"].includes(role) ? operator.id : null,
    } });
    userIds.push(user.id);
  }
  [adminId, ownerId, colleagueId, collaboratorId, outsiderId] = userIds as [string, string, string, string, string];
  for (const userId of [ownerId, outsiderId]) {
    const brand = await db.strategy.create({ data: {
      name: `Visibility ${randomUUID()}`, userId,
      operatorId: userId === ownerId ? operator.id : null, isDummy: false,
    } });
    brandIds.push(brand.id);
  }
  [localBrandId, foreignBrandId] = brandIds as [string, string];
  await db.strategyCollaborator.create({ data: {
    strategyId: localBrandId, userId: collaboratorId, role: "SOCIAL_MANAGER", status: "ACTIVE",
  } });
  const missions = await Promise.all([
    { strategyId: localBrandId, title: "Unassigned request draft", status: "DRAFT" },
    { strategyId: foreignBrandId, title: "Foreign draft", status: "DRAFT" },
    { strategyId: foreignBrandId, title: "Assigned to admin", status: "IN_PROGRESS", assigneeId: adminId },
    { strategyId: foreignBrandId, title: "Published guild draft", status: "DRAFT", guildPublished: true,
      briefData: { contactEmail: "fixture@example.invalid", objective: "Keep the public need" } },
  ].map((data) => db.mission.create({ data })));
  [localMissionId, foreignMissionId, assignedMissionId, guildMissionId] = missions.map((row) => row.id) as [string, string, string, string];
});
afterAll(async () => {
  await db.mission.deleteMany({ where: { strategyId: { in: brandIds } } });
  await db.strategy.deleteMany({ where: { id: { in: brandIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.operator.deleteMany({ where: { id: { in: operatorIds } } });
  await db.$disconnect();
});

describe.sequential("mission visibility through PostgreSQL", () => {
  it("lists the unassigned draft an admin can already open", async () => {
    expect((await caller(adminId).get({ id: localMissionId })).id).toBe(localMissionId);
    expect(ownIds(await caller(adminId).list({ limit: 1000 })))
      .toEqual(expect.arrayContaining([localMissionId, foreignMissionId, assignedMissionId, guildMissionId]));
    expect(ownIds(await caller(adminId).list({ strategyId: localBrandId, status: "DRAFT" })))
      .toEqual([localMissionId]);
  });
  it("preserves assigned-to-me and published guild restrictions for an admin", async () => {
    expect(ownIds(await caller(adminId).list({ assignedToMe: true, limit: 1000 })))
      .toEqual([assignedMissionId]);
    const guild = await caller(adminId).list({ guildOnly: true, limit: 1000 });
    expect(ownIds(guild)).toEqual([guildMissionId]);
    expect(guild.find((row) => row.id === guildMissionId)?.briefData)
      .toEqual({ objective: "Keep the public need" });
  });
  it("keeps owner, same-operator and active collaborator inside their brands", async () => {
    for (const userId of [ownerId, colleagueId, collaboratorId]) {
      expect(ownIds(await caller(userId).list({ limit: 1000 }))).toEqual([localMissionId]);
      await expect(caller(userId).list({ strategyId: foreignBrandId }))
        .rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
  it("does not disclose the local brand to an outsider", async () => {
    expect(ownIds(await caller(outsiderId).list({ limit: 1000 })))
      .not.toContain(localMissionId);
    await expect(caller(outsiderId).get({ id: localMissionId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(outsiderId).list({ strategyId: localBrandId }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
