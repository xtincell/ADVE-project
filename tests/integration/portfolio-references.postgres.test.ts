/** Disposable PostgreSQL only. No provider calls or client corpus. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/server/services/brand-node/inheritance", () => ({ invalidateNodeAndDescendants: vi.fn() }));
import { db } from "@/lib/db";
import { updateBrandNode } from "@/server/services/brand-node";
let operatorId: string;
const nodeIds: string[] = [];
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
  if (operatorId) await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
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
  it("refuse les états métier et un autre dépôt Barre avant toute écriture", async () => {
    const node = await fixture();
    for (const sourceRefs of [[{ ...radar, status: "Livré" }], [{ ...legacy, instance: "barre-autre" }]]) {
      await expect(updateBrandNode(node.id, { sourceRefs }, node.updatedAt.toISOString())).rejects.toThrow();
    }
    expect((await db.brandNode.findUniqueOrThrow({ where: { id: node.id } })).sourceRefs).toEqual([legacy]);
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
