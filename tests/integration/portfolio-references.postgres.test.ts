/** Disposable PostgreSQL only. No provider calls or client corpus. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/brand-node/inheritance", () => ({ invalidateNodeAndDescendants: vi.fn() }));
import { db } from "@/lib/db";
import { updateBrandNode } from "@/server/services/brand-node";
let operatorId: string;
const nodeIds: string[] = [];
const clientIds: string[] = [], strategyIds: string[] = [], userIds: string[] = [];
const legacy = { system: "LA_BARRE" as const, kind: "brand" as const, id: "synth-br" };
const radar = { system: "RADAR" as const, kind: "brief" as const, instance: "radar-matanga", id: "491" };
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const op = await db.operator.create({ data: { name: "Recette raccordements", slug: `refs-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  operatorId = op.id;
});
afterAll(async () => {
  if (nodeIds.length) await db.brandNode.deleteMany({ where: { id: { in: nodeIds }, operatorId } });
  if (strategyIds.length) await db.strategy.deleteMany({ where: { id: { in: strategyIds } } });
  if (clientIds.length) await db.client.deleteMany({ where: { id: { in: clientIds } } });
  if (userIds.length) await db.user.deleteMany({ where: { id: { in: userIds } } });
  if (operatorId) await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
});

describe("raccordement client du dossier existant", () => {
  async function clientFixture() {
    const node = await fixture();
    const user = await db.user.create({ data: { email: `binding-${randomUUID()}@example.test`, operatorId } });
    userIds.push(user.id);
    const strategy = await db.strategy.create({ data: { name: "Marque conservée", userId: user.id,
      operatorId, countryCode: "CM", marketScale: "NATION" } });
    strategyIds.push(strategy.id);
    const linked = await db.brandNode.update({ where: { id: node.id }, data: { strategyId: strategy.id, countryCode: "CM" } });
    const client = await db.client.create({ data: { name: "Bureau régional synthétique", operatorId, country: "CI" } });
    clientIds.push(client.id);
    return { node: linked, strategy, client };
  }
  const bind = (id: string, clientId: string | null, version?: string, extra = {}) =>
    updateBrandNode(id, { clientId, ...extra } as Parameters<typeof updateBrandNode>[1], version);
  it("raccorde les deux identités sans déplacer le marché ni réécrire les sources", async () => {
    const { node, strategy, client } = await clientFixture();
    const updated = await bind(node.id, client.id, node.updatedAt.toISOString());
    expect(updated).toMatchObject({ id: node.id, strategyId: strategy.id, countryCode: "CM",
      sourceRefs: node.sourceRefs, clientId: client.id, operatorId });
    const after = await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } });
    expect(after).toEqual({ ...strategy, clientId: client.id, updatedAt: expect.any(Date) });
    const detached = await bind(node.id, null, updated.updatedAt.toISOString());
    expect(detached.clientId).toBeNull();
    expect((await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } })).clientId).toBeNull();
  });
  it("exige la version et annule les deux liens si une contrainte échoue", async () => {
    const { node, strategy, client } = await clientFixture();
    await expect(bind(node.id, client.id)).rejects.toThrow("version est requise");
    const other = await fixture();
    await expect(bind(node.id, client.id, node.updatedAt.toISOString(), { slug: other.slug })).rejects.toThrow();
    expect(await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).toEqual(node);
    expect(await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } })).toEqual(strategy);
  });
  it("refuse un client archivé et un autre opérateur sans écriture partielle", async () => {
    const { node, strategy, client } = await clientFixture();
    await db.client.update({ where: { id: client.id }, data: { status: "ARCHIVED" } });
    await expect(bind(node.id, client.id, node.updatedAt.toISOString())).rejects.toThrow("Client indisponible");
    const foreign = await db.operator.create({ data: { name: "Autre opérateur", slug: `binding-other-${randomUUID()}`,
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
    try {
      await db.client.update({ where: { id: client.id }, data: { status: "ACTIVE", operatorId: foreign.id } });
      await expect(bind(node.id, client.id, node.updatedAt.toISOString())).rejects.toThrow("Client indisponible");
      expect(await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).toEqual(node);
      expect(await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } })).toEqual(strategy);
    } finally {
      await db.client.update({ where: { id: client.id }, data: { operatorId } });
      await db.operator.delete({ where: { id: foreign.id } });
    }
  });
  it("préserve les autres dossiers partageant la plateforme et les liens incohérents", async () => {
    const { node, strategy, client } = await clientFixture();
    const shared = await fixture();
    await db.brandNode.update({ where: { id: shared.id }, data: { strategyId: strategy.id } });
    await expect(bind(node.id, client.id, node.updatedAt.toISOString())).rejects.toThrow("partagée");
    await db.brandNode.update({ where: { id: shared.id }, data: { strategyId: null } });
    const other = await db.client.create({ data: { name: "Client antérieur", operatorId } });
    clientIds.push(other.id);
    await db.strategy.update({ where: { id: strategy.id }, data: { clientId: other.id } });
    await expect(bind(node.id, client.id, node.updatedAt.toISOString())).rejects.toThrow("différents");
    expect((await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).clientId).toBeNull();
    expect((await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } })).clientId).toBe(other.id);
  });
  it("ne laisse gagner qu’un choix concurrent et conserve un raccord cohérent", async () => {
    const { node, strategy, client } = await clientFixture();
    const other = await db.client.create({ data: { name: "Autre client possible", operatorId } });
    clientIds.push(other.id);
    const outcomes = await Promise.allSettled([client.id, other.id].map((id) => bind(node.id, id, node.updatedAt.toISOString())));
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const afterNode = await db.brandNode.findUniqueOrThrow({ where: { id: node.id } });
    const afterStrategy = await db.strategy.findUniqueOrThrow({ where: { id: strategy.id } });
    expect([client.id, other.id]).toContain(afterNode.clientId);
    expect(afterStrategy.clientId).toBe(afterNode.clientId);
  });
});
async function fixture() {
  const node = await db.brandNode.create({ data: { name: "Marque synthétique", slug: `refs-${randomUUID()}`,
    operatorId, nodeKind: "STANDALONE_BRAND", nodeNature: "PRODUCT", sourceRefs: [legacy] } });
  nodeIds.push(node.id); return node;
}
describe("raccordements versionnés sur PostgreSQL", () => {
  it("refuse la réécriture sans version sans perdre les liens existants", async () => {
    const node = await fixture();
    await expect(updateBrandNode(node.id, { sourceRefs: [radar] })).rejects.toThrow("version est requise");
    expect((await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).sourceRefs).toEqual([legacy]);
  });
  it("une seule édition concurrente gagne, puis une nouvelle lecture permet de continuer", async () => {
    const node = await fixture();
    const choices = [[legacy, radar], [legacy, { ...radar, instance: "radar-personnel" }]];
    const results = await Promise.allSettled(choices.map((sourceRefs) =>
      updateBrandNode(node.id, { sourceRefs }, node.updatedAt.toISOString())));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const lost = results.find((r) => r.status === "rejected");
    expect(lost?.status === "rejected" && lost.reason.message).toContain("Ce dossier a changé");
    const current = await db.brandNode.findUniqueOrThrow({ where: { id: node.id } });
    expect(choices).toContainEqual(current.sourceRefs);
    const merged = await updateBrandNode(node.id, { sourceRefs: [legacy, radar, { ...radar, instance: "radar-personnel" }] }, current.updatedAt.toISOString());
    expect(merged.sourceRefs).toHaveLength(3);
  });
  it("refuse les états métier et une instance malformée avant toute écriture", async () => {
    const node = await fixture();
    for (const sourceRefs of [[{ ...radar, status: "Livré" }], [{ ...legacy, instance: "../barre-autre" }]]) {
      await expect(updateBrandNode(node.id, { sourceRefs }, node.updatedAt.toISOString())).rejects.toThrow();
    }
    expect((await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).sourceRefs).toEqual([legacy]);
  });
  it("conserve le même identifiant dans deux instances sans réaffecter la référence historique", async () => {
    const node = await fixture();
    const sourceRefs = [legacy, { ...legacy, instance: "barre-entreprise" }];
    await updateBrandNode(node.id, { sourceRefs }, node.updatedAt.toISOString());
    expect((await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).sourceRefs).toEqual(sourceRefs);
  });
  it("consomme une nouvelle version même dans la même milliseconde", async () => {
    const node = await fixture();
    const clock = vi.spyOn(Date, "now").mockReturnValue(node.updatedAt.getTime());
    try {
      const changed = await updateBrandNode(node.id, { sourceRefs: [legacy, radar] }, node.updatedAt.toISOString());
      expect(changed.updatedAt.getTime()).toBe(node.updatedAt.getTime() + 1);
      await expect(updateBrandNode(node.id, { sourceRefs: [legacy] }, node.updatedAt.toISOString())).rejects.toThrow("Ce dossier a changé");
    } finally { clock.mockRestore(); }
  });
  it("annule les raccordements avec les autres champs si une contrainte échoue", async () => {
    const node = await fixture(), other = await fixture();
    await expect(updateBrandNode(node.id, { sourceRefs: [radar], slug: other.slug }, node.updatedAt.toISOString())).rejects.toThrow();
    const after = await db.brandNode.findUniqueOrThrow({ where: { id: node.id } });
    expect(after.sourceRefs).toEqual([legacy]); expect(after.updatedAt).toEqual(node.updatedAt);
  });
});
