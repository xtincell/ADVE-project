/** Read projection against disposable PostgreSQL. No brand corpus or providers. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getPortfolioWorkspace } from "@/server/services/brand-node/workspace";
let operatorId: string, userId: string, foreignUserId: string;
const strategies: string[] = [], nodes: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const op = await db.operator.create({ data: { name: "Recette historique", slug: `history-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  operatorId = op.id;
  userId = (await db.user.create({ data: { email: `own-${randomUUID()}@example.test`, operatorId } })).id;
  foreignUserId = (await db.user.create({ data: { email: `foreign-${randomUUID()}@example.test` } })).id;
});
afterAll(async () => {
  if (nodes.length) await db.brandNode.deleteMany({ where: { id: { in: nodes }, operatorId } });
  if (strategies.length) {
    await db.pillar.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (userId && foreignUserId) await db.user.deleteMany({ where: { id: { in: [userId, foreignUserId] } } });
  if (operatorId) await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
});
async function fixture() {
  const own = await db.strategy.create({ data: { name: "Dossier propre", userId, operatorId } });
  const foreign = await db.strategy.create({ data: { name: "Dossier externe", userId: foreignUserId } });
  strategies.push(own.id, foreign.id);
  const pillar = await db.pillar.create({ data: { strategyId: own.id, key: "a", currentVersion: 3, validationStatus: "VALIDATED",
    content: { secretFixture: "Le contenu ne fait pas partie de cette projection" } } });
  await db.pillarVersion.createMany({ data: [
    { pillarId: pillar.id, version: 1, author: "seed-fixture", content: { previous: 1 } },
    { pillarId: pillar.id, version: 3, author: "OPERATOR:fixture", content: { previous: 2 } },
    { pillarId: pillar.id, version: 2, author: "AUTO_FILLER", content: { previous: 3 } },
  ] });
  const node = await db.brandNode.create({ data: { name: "Marque de recette", slug: `history-${randomUUID()}`,
    operatorId, strategyId: own.id, nodeKind: "STANDALONE_BRAND", nodeNature: "PRODUCT",
    sourceRefs: [{ system: "LA_FUSEE", kind: "strategy", id: foreign.id }] } });
  nodes.push(node.id); return { own, foreign, node };
}
describe("dernière écriture dans le dossier de marque", () => {
  it("lit la version la plus haute, sans recopier le contenu ni accorder l’accès par un lien", async () => {
    const { own, foreign, node } = await fixture();
    const before = await db.pillar.findMany({ where: { strategyId: own.id } });
    const view = await getPortfolioWorkspace(node, { allowBarre: false, actor: { userId, operatorId, role: "USER" } });
    expect(view.strategies.map((s) => s.id)).toEqual([own.id]);
    expect(view.strategies.map((s) => s.id)).not.toContain(foreign.id);
    const p = view.strategies[0]!.pillars[0]!;
    expect(p.currentVersion).toBe(3);
    expect(p.validationStatus).toBe("VALIDATED");
    expect(p.versions).toHaveLength(1);
    expect(p.versions[0]).toEqual({ version: 3, author: "OPERATOR:fixture", createdAt: expect.any(Date) });
    expect(p).not.toHaveProperty("content");
    expect(await db.pillar.findMany({ where: { strategyId: own.id } })).toEqual(before);
  });
  it("conserve l’absence d’historique et l’état importé sans reçu inventé", async () => {
    const { own, node } = await fixture();
    await db.pillar.create({ data: { strategyId: own.id, key: "d", validationStatus: "VALIDATED" } });
    const view = await getPortfolioWorkspace(node, { allowBarre: false, actor: { userId, operatorId, role: "USER" } });
    expect(view.strategies[0]!.pillars.find((p) => p.key === "d")?.versions).toEqual([]);
  });
});
