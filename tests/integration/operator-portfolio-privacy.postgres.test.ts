import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { assertOwnedPostgresTarget } from "../support/owned-postgres-target";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));

import { db } from "@/lib/db";
import { canAccessClient, canAccessStrategy, canAccessMission, getOperatorContext, scopeClients, scopeStrategies } from "@/server/services/operator-isolation";
import { clientRouter } from "@/server/trpc/routers/client";
import { cockpitRouter } from "@/server/trpc/routers/cockpit-router";
import { missionRouter } from "@/server/trpc/routers/mission";

const operators = [randomUUID(), randomUUID()];
const clients = [randomUUID(), randomUUID(), randomUUID()]; // parent, client A, client B
const brands = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()]; // own A, sister A, client-chain A, two foreign B
const missionId = randomUUID();
const users: string[] = [];
const actors: Record<string, { id: string; role: string; operatorId: string | null }> = {};
const ordinaryRoles = ["USER", "CLIENT_RETAINER", "CLIENT_STATIC", "FREELANCE", "CREATOR", "BRAND_MANAGER", "FOUNDER"];
const staffRoles = ["OPERATOR", "AGENCY", "PARTNER"];
const context = (actor: typeof actors[string]) => ({ db, session: { user: actor, expires: "2099-01-01" } }) as never;

beforeAll(async () => {
  assertOwnedPostgresTarget();
  vi.stubGlobal("fetch", async () => { throw new Error("NETWORK_FORBIDDEN_IN_OWNED_FIXTURE"); });
  for (const id of operators) await db.operator.create({ data: {
    id, name: "Privacy fixture", slug: `privacy-${id}`, status: "ACTIVE", licenseType: "TRIAL",
    licensedAt: new Date(), licenseExpiry: new Date("2099-01-01"),
  } });
  for (const role of [...ordinaryRoles, ...staffRoles, "ADMIN", "OTHER", "UNLINKED"]) {
    const id = randomUUID(); users.push(id);
    const actor = { id, role: ["OTHER", "UNLINKED"].includes(role) ? "USER" : role,
      operatorId: role === "OTHER" ? operators[1]! : role === "UNLINKED" ? null : operators[0]! };
    await db.user.create({ data: { ...actor, email: `privacy-${id}@example.invalid` } });
    actors[role] = actor;
  }
  await db.client.create({ data: { id: clients[0], operatorId: operators[0]!, name: "Private parent", status: "REFERENCE" } });
  await db.client.create({ data: { id: clients[1], operatorId: operators[0]!, name: "Private client A", parentClientId: clients[0],
    contactName: "Private contact", contactEmail: "private@example.invalid", contactPhone: "private-phone", notes: "Private notes",
    billingInfo: { private: true }, organizationKey: `private-${clients[1]}`, organizationSourceRefs: [{ private: true }] } });
  await db.client.create({ data: { id: clients[2], operatorId: operators[1]!, name: "Private client B", contactEmail: "foreign@example.invalid",
    organizationKey: `private-${clients[2]}`, billingInfo: { private: true } } });
  for (let i = 0; i < brands.length; i++) await db.strategy.create({ data: {
    id: brands[i], name: `Privacy brand ${i}`, userId: i === 0 ? actors.CLIENT_RETAINER!.id : actors.OTHER!.id,
    operatorId: i === 2 ? null : operators[i >= 3 ? 1 : 0], clientId: clients[i >= 3 ? 2 : 1],
  } });
  await db.strategyCollaborator.createMany({ data: [
    { strategyId: brands[1]!, userId: actors.FREELANCE!.id, role: "SOCIAL_MANAGER", status: "ACTIVE" },
    { strategyId: brands[0]!, userId: actors.FREELANCE!.id, role: "SOCIAL_MANAGER", status: "REVOKED" },
  ] });
  await db.mission.create({ data: { id: missionId, strategyId: brands[3]!, title: "Private assigned mission", assigneeId: actors.FREELANCE!.id } });
});

afterAll(async () => {
  try {
    assertOwnedPostgresTarget();
    await db.$transaction(async tx => {
      await tx.mission.deleteMany({ where: { id: missionId } });
      await tx.strategyCollaborator.deleteMany({ where: { strategyId: { in: brands } } });
      await tx.strategy.deleteMany({ where: { id: { in: brands } } });
      await tx.client.deleteMany({ where: { id: { in: clients.slice(1) } } });
      await tx.client.deleteMany({ where: { id: clients[0] } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
      await tx.operator.deleteMany({ where: { id: { in: operators } } });
    });
  } finally { vi.unstubAllGlobals(); await db.$disconnect(); }
});

const visibleBrands = async (actor: typeof actors[string]) => db.strategy.findMany({
  where: { AND: [scopeStrategies({ ...actor, userId: actor.id }), { id: { in: brands } }] }, select: { id: true },
}).then(rows => rows.map(row => row.id).sort());

describe("operator link is not portfolio authority on PostgreSQL", () => {
  it("rejects the known sister-brand ID at the direct guard and real dashboard endpoint", async () => {
    const actor = actors.CLIENT_RETAINER!;
    expect(await canAccessStrategy(brands[1]!, await getOperatorContext(actor.id))).toBe(false);
  });

  it("refuses a linked client at the real dashboard endpoint before returning a sister brand", async () => {
    await expect(cockpitRouter.createCaller(context(actors.CLIENT_RETAINER!)).dashboard({ strategyId: brands[1]! }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(ordinaryRoles)("limits linked %s to ownership and ACTIVE brand grants, including direct dashboard access", async role => {
    const actor = actors[role]!;
    const expected = role === "CLIENT_RETAINER" ? [brands[0]!] : role === "FREELANCE" ? [brands[1]!] : [];
    expect(await visibleBrands(actor)).toEqual(expected);
    const opCtx = await getOperatorContext(actor.id);
    for (const brandId of brands) {
      const allowed = expected.includes(brandId);
      expect(await canAccessStrategy(brandId, opCtx)).toBe(allowed);
      const read = cockpitRouter.createCaller(context(actor)).dashboard({ strategyId: brandId });
      if (allowed) await expect(read).resolves.toHaveProperty("name");
      else await expect(read).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it.each(staffRoles)("keeps %s access to its operator portfolio, including the Client chain, but denies the other operator", async role => {
    const actor = actors[role]!;
    expect(await visibleBrands(actor)).toEqual(brands.slice(0, 3).sort());
    const opCtx = await getOperatorContext(actor.id);
    for (const brandId of brands.slice(0, 3)) expect(await canAccessStrategy(brandId, opCtx)).toBe(true);
    expect(await canAccessStrategy(brands[3]!, opCtx)).toBe(false);
    await expect(cockpitRouter.createCaller(context(actor)).dashboard({ strategyId: brands[2]! })).resolves.toHaveProperty("name");
  });

  it("preserves global ADMIN and private ownership outside the linked operator, but grants nothing to an unlinked stranger", async () => {
    expect(await visibleBrands(actors.ADMIN!)).toEqual([...brands].sort());
    expect(await visibleBrands(actors.OTHER!)).toEqual(brands.slice(1).sort());
    expect(await visibleBrands(actors.UNLINKED!)).toEqual([]);
    expect(await canAccessStrategy(randomUUID(), await getOperatorContext(actors.UNLINKED!.id))).toBe(false);
  });

  it("filters sibling brands and matching counts, redacts client PII and parent metadata for a linked owner", async () => {
    const actor = actors.CLIENT_RETAINER!;
    const api = clientRouter.createCaller(context(actor));
    const listed = (await api.list({})).items;
    expect(listed.map(row => row.id)).toEqual([clients[1]]);
    expect(listed[0]!.strategies.map(row => row.id)).toEqual([brands[0]]);
    expect(listed[0]!._count.strategies).toBe(1);
    const direct = await api.get({ id: clients[1]! });
    expect(direct.strategies.map(row => row.id)).toEqual([brands[0]]);
    for (const row of [listed[0]!, direct]) expect(row).toMatchObject({
      contactName: null, contactEmail: null, contactPhone: null, notes: null, billingInfo: null,
      parentClientId: null, organizationKey: null, organizationSourceRefs: null,
    });
    expect(direct.parentClient).toBeNull();
    await expect(api.get({ id: clients[0]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.get({ id: clients[2]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.getPnL({ clientId: clients[1]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("never widens a delegated brand grant into access to the Client or its other brands", async () => {
    const actor = actors.FREELANCE!;
    const opCtx = await getOperatorContext(actor.id);
    expect(await db.client.findMany({ where: scopeClients(opCtx), select: { id: true } })).toEqual([]);
    expect(await canAccessClient(clients[1]!, opCtx)).toBe(false);
    const api = clientRouter.createCaller(context(actor));
    expect((await api.list({})).items).toEqual([]);
    await expect(api.get({ id: clients[1]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps operator client metadata and all its brands visible only to that operator's staff", async () => {
    const api = clientRouter.createCaller(context(actors.OPERATOR!));
    const row = (await api.list({})).items.find(item => item.id === clients[1])!;
    expect(row.contactEmail).toBe("private@example.invalid");
    expect(row.strategies.map(item => item.id).sort()).toEqual(brands.slice(0, 3).sort());
    expect(row._count.strategies).toBe(3);
    expect((await api.get({ id: clients[1]! })).parentClient?.id).toBe(clients[0]);
    await expect(api.get({ id: clients[2]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("redacts a foreign Client even for portfolio staff owning one of its brands, without granting management", async () => {
    const actor = actors.OPERATOR!;
    await db.strategy.update({ where: { id: brands[3] }, data: { userId: actor.id } });
    try {
      const opCtx = await getOperatorContext(actor.id);
      expect(await canAccessClient(clients[2]!, opCtx)).toBe(true);
      expect(await canAccessClient(clients[2]!, opCtx, "MANAGE")).toBe(false);
      const api = clientRouter.createCaller(context(actor));
      const listed = (await api.list({})).items.find(item => item.id === clients[2])!;
      const direct = await api.get({ id: clients[2]! });
      for (const row of [listed, direct]) {
        expect(row.strategies.map(item => item.id)).toEqual([brands[3]]);
        expect(row).toMatchObject({ contactEmail: null, billingInfo: null, organizationKey: null, organizationSourceRefs: null, parentClientId: null });
      }
      expect(listed._count.strategies).toBe(1);
      expect(direct.parentClient).toBeNull();
      await expect(api.getPnL({ clientId: clients[2]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally { await db.strategy.update({ where: { id: brands[3] }, data: { userId: actors.OTHER!.id } }); }
  });

  it("keeps an assigned mission accessible to a freelance without granting its brand", async () => {
    const actor = actors.FREELANCE!;
    const opCtx = await getOperatorContext(actor.id);
    expect(await canAccessStrategy(brands[3]!, opCtx)).toBe(false);
    expect(await canAccessMission(missionId, opCtx)).toBe(true);
    const api = missionRouter.createCaller(context(actor));
    expect((await api.list({})).map(row => row.id)).toContain(missionId);
    expect((await api.get({ id: missionId })).id).toBe(missionId);
  });
});
